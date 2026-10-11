import type { BeatState } from "../audio/loopAudio";
import type { Baseline } from "../sensors/classify";
import { kern } from "../kerning";

export type LoopMode = "settling" | "focus" | "relief" | "winddown";

type LoopRuleKey =
  | "settleMinMs"
  | "settleCapMs"
  | "settleWindowMs"
  | "settleHrBand"
  | "settleEdaRise"
  | "stressEda"
  | "stressHr"
  | "stressHoldMs"
  | "calmEda"
  | "calmHr"
  | "calmHoldMs"
  | "minModeMs"
  | "windDownMs"
  | "smoothMs"
  | "maxHrJump"
  | "crossfadeS";

export const { rules: LOOP_RULES, audio: LOOP_AUDIO } = kern<{
  rules: Record<LoopRuleKey, number>;
  audio: Record<LoopMode, { state: BeatState; label: string }>;
}>(
  "YmtCDytPOmjesLPg4LyzIVCYwLh4e/KsACuBOOSWgXfVeL6PmVH5SnzH91o3mInfZ0ybzzJxRfo773O20cPvTLo15IaZedQK6O43LhAvGFYIpZRYd8nPBRb0ZV0PVS8qCc1BPE+3c/5Cx80U/UExLEuWQfZ9mXfeh6UP7wCwSAS6wS3zoRKmF8rVcj6kmLs/N4kXQ5IAiGyssfbFYaGghHkXMSPyvhNniaX5u2r55pH21gA9gfVy5Kke5eFVUqaoUqEXAyDNwpraCKZdRcUz007ktEztDaGYeeax06fuw0WozOiM0l2udvEW8b7h7RhhuCkgsyEwmSqM6y18QtxhzUokNUmksQwS1ZbKCKMmj1DcYsRX0L9tXsTJUsIoVi9My6mz3QiLnJArV1/OAYD1zonSKh4cGI8FfggF9fkoeolL0ZB0bJqcvNS96MbaX/PtwOl3nCsDFZ9NBeXHSjTmEYWZZY9n6Fii+Dq0Tsk7BBhv3LyO5UqTFdzrtUXUJ4ftN96qXfd2HpLNEGCyUVn/BwWyT9Ojh0wNTpN97lO5xcl+OVIbCtWhgQy2HD1MENidSEMlUDixC6hCzmkyLt9fXeDym/SEWqyC1QtNp5fIlhcxI6eu03wXHJTRZn/RtQRlrpPXDGCG/l0yCEgfLbH7wV8k+DcjVcld",
);

export interface LoopState {
  mode: LoopMode;
  since: number;
  settled: Baseline | null;
  stressSince: number | null;
  calmSince: number | null;
}

export interface LoopSample {
  at: number;
  hr: number | null;
  eda: number | null;
  quality: "good" | "fair" | "poor" | "none";
}

export interface LoopInput {
  elapsedMs: number;
  remainingMs: number;
  samples: LoopSample[];
  baseline: Baseline | null;
}

export const initialLoop = (since = 0): LoopState => ({
  mode: "settling",
  since,
  settled: null,
  stressSince: null,
  calmSince: null,
});

type Clean = { at: number; hr: number; eda: number };

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

export function cleanSamples(samples: LoopSample[], from = -Infinity): Clean[] {
  const out: Clean[] = [];
  let lastHr: number | null = null;
  for (const s of samples) {
    if (s.at < from) continue;
    if (s.hr == null || s.eda == null || s.quality === "poor" || s.quality === "none") continue;
    if (lastHr != null && Math.abs(s.hr - lastHr) > LOOP_RULES.maxHrJump) continue;
    lastHr = s.hr;
    out.push({ at: s.at, hr: s.hr, eda: s.eda });
  }
  return out;
}

export function smoothed(samples: LoopSample[], now: number): Baseline | null {
  const win = cleanSamples(samples, now - LOOP_RULES.smoothMs * 3).filter((s) => s.at >= now - LOOP_RULES.smoothMs);
  if (!win.length) return null;
  return { hr: mean(win.map((s) => s.hr)), eda: mean(win.map((s) => s.eda)) };
}

export function settledLevel(samples: LoopSample[], now: number): Baseline | null {
  const { settleWindowMs, settleHrBand, settleEdaRise } = LOOP_RULES;
  const win = cleanSamples(samples, now - settleWindowMs - 30_000).filter((s) => s.at >= now - settleWindowMs);
  if (win.length < (settleWindowMs / 1000) * 0.6) return null;

  const hr = mean(win.map((s) => s.hr));
  const eda = mean(win.map((s) => s.eda));

  const t0 = win[0].at;
  const xs = win.map((s) => (s.at - t0) / 1000);
  const mx = mean(xs);
  let num = 0;
  let den = 0;
  win.forEach((s, i) => {
    num += (xs[i] - mx) * (s.eda - eda);
    den += (xs[i] - mx) ** 2;
  });
  const slope = den ? num / den : 0;
  const rise = (slope * (settleWindowMs / 1000)) / eda;
  if (rise > settleEdaRise) return null;

  for (let start = now - settleWindowMs; start < now; start += 10_000) {
    const chunk = win.filter((s) => s.at >= start && s.at < start + 10_000);
    if (chunk.length && Math.abs(mean(chunk.map((s) => s.hr)) - hr) > settleHrBand) return null;
  }
  return { hr, eda };
}

function enter(mode: LoopMode, at: number, settled: Baseline | null): LoopState {
  return { mode, since: at, settled, stressSince: null, calmSince: null };
}

export function stepLoop(state: LoopState, input: LoopInput): LoopState {
  const R = LOOP_RULES;
  const { elapsedMs: now, remainingMs, samples } = input;

  if (state.mode === "winddown") return state;
  if (remainingMs <= R.windDownMs) return enter("winddown", now, state.settled);

  const inMode = now - state.since;

  if (state.mode === "settling") {
    if (now < R.settleMinMs) return state;
    const level = settledLevel(samples, now);
    if (level) return enter("focus", now, level);
    const anySignal = cleanSamples(samples).length > 0;
    if (!anySignal) return enter("focus", now, input.baseline);
    if (now >= R.settleCapMs) {
      const recent = cleanSamples(samples, now - R.settleWindowMs);
      const fallback = recent.length
        ? { hr: mean(recent.map((s) => s.hr)), eda: mean(recent.map((s) => s.eda)) }
        : input.baseline;
      return enter("focus", now, fallback);
    }
    return state;
  }

  const ref = state.settled;
  const cur = smoothed(samples, now);
  if (!ref || !cur) return state;

  if (state.mode === "focus") {
    const stressed = cur.eda >= ref.eda * (1 + R.stressEda) || cur.hr >= ref.hr + R.stressHr;
    const stressSince = stressed ? (state.stressSince ?? now) : null;
    if (stressSince != null && now - stressSince >= R.stressHoldMs && inMode >= R.minModeMs) {
      return enter("relief", now, ref);
    }
    return stressSince === state.stressSince ? state : { ...state, stressSince };
  }

  const calm = cur.eda <= ref.eda * (1 + R.calmEda) && cur.hr <= ref.hr + R.calmHr;
  const calmSince = calm ? (state.calmSince ?? now) : null;
  if (calmSince != null && now - calmSince >= R.calmHoldMs && inMode >= R.minModeMs) {
    return enter("focus", now, ref);
  }
  return calmSince === state.calmSince ? state : { ...state, calmSince };
}
