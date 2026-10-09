import { describe, expect, it } from "vitest";
import { initialLoop, LOOP_AUDIO, LOOP_RULES, stepLoop, type LoopSample, type LoopState } from "../loop/switch";

const MIN = 60_000;
const SESSION = 45 * MIN;
const SMOOTH = LOOP_RULES.smoothMs;

type Signal = (atMs: number) => { hr: number | null; eda: number | null; quality?: LoopSample["quality"] };

function run(signal: Signal, untilMs: number, state: LoopState = initialLoop(), samples: LoopSample[] = []) {
  const modes: { at: number; mode: string }[] = [];
  const start = samples.length ? samples[samples.length - 1].at + 1000 : 0;
  for (let at = start; at <= untilMs; at += 1000) {
    const v = signal(at);
    samples.push({ at, hr: v.hr, eda: v.eda, quality: v.quality ?? "good" });
    const next = stepLoop(state, { elapsedMs: at, remainingMs: SESSION - at, samples, baseline: { hr: 72, eda: 4 } });
    if (next.mode !== state.mode) modes.push({ at, mode: next.mode });
    state = next;
  }
  return { state, modes, samples };
}

const calm: Signal = () => ({ hr: 72, eda: 4 });

describe("Loop audio switch", () => {
  it("maps each mode to the spec's band", () => {
    expect(LOOP_AUDIO.settling.state).toBe("alpha");
    expect(LOOP_AUDIO.focus.state).toBe("gamma");
    expect(LOOP_AUDIO.relief.state).toBe("theta");
    expect(LOOP_AUDIO.winddown.state).toBe("winddown");
  });

  it("settles into focus at 5 minutes when the body is steady", () => {
    const { modes, state } = run(calm, 6 * MIN);
    expect(modes).toEqual([{ at: 5 * MIN, mode: "focus" }]);
    expect(state.settled).toEqual({ hr: 72, eda: 4 });
  });

  it("waits while skin conductance is still rising, then switches at the 15 minute cap", () => {
    const rising: Signal = (at) => ({ hr: 72, eda: 4 + (at / MIN) * 0.2 });
    const { modes } = run(rising, 16 * MIN);
    expect(modes).toEqual([{ at: 15 * MIN, mode: "focus" }]);
  });

  it("moves to focus at 5 minutes when there is no band at all", () => {
    const { modes } = run(() => ({ hr: null, eda: null, quality: "none" }), 6 * MIN);
    expect(modes).toEqual([{ at: 5 * MIN, mode: "focus" }]);
  });

  it("needs 30 s of stress before stress relief, and respects the 3 minute minimum per mode", () => {
    const stress: Signal = (at) => (at >= 6 * MIN ? { hr: 72, eda: 4.8 } : calm(at));
    const { modes } = run(stress, 9 * MIN);
    expect(modes[0]).toEqual({ at: 5 * MIN, mode: "focus" });
    expect(modes[1]).toEqual({ at: 8 * MIN, mode: "relief" });
  });

  it("ignores a brief stress spike shorter than the hold time", () => {
    const blip: Signal = (at) => (at >= 10 * MIN && at < 10 * MIN + 20_000 ? { hr: 90, eda: 5 } : calm(at));
    const { modes } = run(blip, 12 * MIN);
    expect(modes.map((m) => m.mode)).toEqual(["focus"]);
  });

  it("reacts to heart rate +10 bpm alone after 30 s", () => {
    const hr: Signal = (at) => (at >= 10 * MIN ? { hr: 83, eda: 4 } : calm(at));
    const { modes } = run(hr, 11 * MIN);
    expect(modes[1].mode).toBe("relief");
    expect(modes[1].at).toBeGreaterThanOrEqual(10 * MIN + 30_000);
    expect(modes[1].at).toBeLessThanOrEqual(10 * MIN + 30_000 + SMOOTH);
  });

  it("returns to focus after 60 s of calm once theta has played 3 minutes", () => {
    const episode: Signal = (at) => (at >= 10 * MIN && at < 11 * MIN ? { hr: 72, eda: 5 } : calm(at));
    const { modes } = run(episode, 16 * MIN);
    expect(modes.map((m) => m.mode)).toEqual(["focus", "relief", "focus"]);
    const [, relief, back] = modes;
    expect(relief.at - 10 * MIN).toBeGreaterThanOrEqual(30_000);
    expect(relief.at - 10 * MIN).toBeLessThanOrEqual(30_000 + SMOOTH);
    expect(back.at - relief.at).toBe(3 * MIN);
  });

  it("ignores poor-contact readings and motion jumps", () => {
    const noisy: Signal = (at) => {
      if (at >= 10 * MIN && at % 4000 === 0) return { hr: 140, eda: 9, quality: "poor" };
      if (at >= 10 * MIN && at % 7000 === 0) return { hr: 130, eda: 4 };
      return calm(at);
    };
    const { modes } = run(noisy, 14 * MIN);
    expect(modes.map((m) => m.mode)).toEqual(["focus"]);
  });

  it("winds down in the final two minutes and stays there", () => {
    const { modes } = run(calm, SESSION);
    expect(modes.at(-1)).toEqual({ at: SESSION - 2 * MIN, mode: "winddown" });
  });
});
