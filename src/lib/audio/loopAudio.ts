"use client";

import { useSyncExternalStore } from "react";
import { loopableNoise, NOISE_COLORS, type NoiseColor } from "./noise";

export type { NoiseColor } from "./noise";
export type BeatState = "alpha" | "gamma" | "theta" | "winddown";
export type BeatType = "binaural" | "isochronic";

export const AUDIO = {
  binauralCarrierHz: 200,
  isochronicCarrierHz: 350,
  beatHz: { alpha: 10, gamma: 40, theta: 7.5, winddown: 7.5 } as Record<BeatState, number>,
  isochronicDepth: 1,
  beatAmplitude: 0.35,
  stateCrossfadeS: 30,
  noiseCrossfadeS: 3,
  startFadeS: 5,
  windDownFadeS: 90,
  masterCap: 0.4,
  mixRampS: 0.08,
  noiseSeconds: 15,
  noiseSeamS: 0.5,
  earTestHz: 440,
  earTestS: 1.2,
};

export const BEAT_INFO: Record<BeatState, { label: string; type: BeatType }> = {
  alpha: { label: "Alpha", type: "binaural" },
  gamma: { label: "Gamma", type: "isochronic" },
  theta: { label: "Theta", type: "binaural" },
  winddown: { label: "Wind down", type: "binaural" },
};

export const BEAT_STATES: BeatState[] = ["alpha", "gamma", "theta", "winddown"];

export interface Mix {
  noise: number;
  beat: number;
  master: number;
}

export const DEFAULT_MIX: Mix = { noise: 0.6, beat: 0.3, master: 0.5 };

export interface AudioLogEntry {
  at: number;
  kind: "start" | "stop" | "state" | "noise";
  value: string;
}

export interface LoopAudioSnapshot {
  playing: boolean;
  state: BeatState | null;
  noise: NoiseColor;
  mix: Mix;
  muted: boolean;
}

export function beatDescription(state: BeatState) {
  const hz = AUDIO.beatHz[state];
  if (BEAT_INFO[state].type === "isochronic") return `isochronic ${hz} Hz on ${AUDIO.isochronicCarrierHz} Hz`;
  return `binaural ${hz} Hz · L ${AUDIO.binauralCarrierHz} / R ${AUDIO.binauralCarrierHz + hz} Hz`;
}

const SETTINGS_KEY = "sl-loop-sound";
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function loadSettings(): { noise: NoiseColor; mix: Mix } {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<{ noise: NoiseColor; mix: Partial<Mix> }>;
    const noise = raw.noise && NOISE_COLORS.includes(raw.noise) ? raw.noise : "pink";
    const m = raw.mix ?? {};
    const pick = (k: keyof Mix) => (typeof m[k] === "number" ? clamp01(m[k]!) : DEFAULT_MIX[k]);
    return { noise, mix: { noise: pick("noise"), beat: pick("beat"), master: pick("master") } };
  } catch {
    return { noise: "pink", mix: { ...DEFAULT_MIX } };
  }
}

function equalPower(from: number, to: number, steps = 64) {
  const c = new Float32Array(steps);
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    c[i] = to > from ? from + (to - from) * Math.sin((t * Math.PI) / 2) : to + (from - to) * Math.cos((t * Math.PI) / 2);
  }
  return c;
}

function rampTo(param: AudioParam, value: number, now: number, seconds: number) {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + Math.max(0.01, seconds));
}

function curveTo(param: AudioParam, to: number, now: number, seconds: number) {
  const from = param.value;
  param.cancelScheduledValues(now);
  param.setValueCurveAtTime(equalPower(from, to), now, Math.max(0.05, seconds));
}

interface Voice {
  type: BeatType;
  gain: GainNode;
  right: OscillatorNode | null;
  sources: AudioScheduledSourceNode[];
}

interface NoiseVoice {
  color: NoiseColor;
  gain: GainNode;
  src: AudioBufferSourceNode;
}

type StateListener = (state: BeatState | null, prev: BeatState | null) => void;
type LogListener = (entry: AudioLogEntry) => void;

class LoopAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBus: GainNode | null = null;
  private beatBus: GainNode | null = null;
  private voice: Voice | null = null;
  private noiseVoice: NoiseVoice | null = null;
  private buffers = new Map<NoiseColor, AudioBuffer>();
  private windDownTimer: ReturnType<typeof setTimeout> | null = null;
  private loaded = false;

  private snap: LoopAudioSnapshot = { playing: false, state: null, noise: "pink", mix: { ...DEFAULT_MIX }, muted: false };
  private listeners = new Set<() => void>();
  private stateListeners = new Set<StateListener>();
  private logListeners = new Set<LogListener>();
  private entries: AudioLogEntry[] = [];

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = () => {
    this.load();
    return this.snap;
  };

  onStateChange(cb: StateListener) {
    this.stateListeners.add(cb);
    return () => {
      this.stateListeners.delete(cb);
    };
  }

  onLog(cb: LogListener) {
    this.logListeners.add(cb);
    return () => {
      this.logListeners.delete(cb);
    };
  }

  getLog = () => this.entries;

  private load() {
    if (this.loaded || typeof window === "undefined") return;
    this.loaded = true;
    const s = loadSettings();
    this.snap = { ...this.snap, noise: s.noise, mix: s.mix };
  }

  private save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ noise: this.snap.noise, mix: this.snap.mix }));
    } catch {}
  }

  private set(p: Partial<LoopAudioSnapshot>) {
    this.snap = { ...this.snap, ...p };
    this.listeners.forEach((l) => l());
  }

  private log(kind: AudioLogEntry["kind"], value: string) {
    const entry = { at: Date.now(), kind, value };
    this.entries = [...this.entries.slice(-199), entry];
    this.logListeners.forEach((l) => l(entry));
  }

  private masterTarget() {
    return this.snap.muted ? 0 : this.snap.mix.master * AUDIO.masterCap;
  }

  private ensure(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext({ latencyHint: "playback" });
    return this.ctx;
  }

  private buffer(color: NoiseColor) {
    const ctx = this.ensure();
    const hit = this.buffers.get(color);
    if (hit) return hit;
    const len = Math.floor(ctx.sampleRate * AUDIO.noiseSeconds);
    const seam = Math.floor(ctx.sampleRate * AUDIO.noiseSeamS);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    buf.copyToChannel(loopableNoise(color, len, seam) as Float32Array<ArrayBuffer>, 0);
    buf.copyToChannel(loopableNoise(color, len, seam) as Float32Array<ArrayBuffer>, 1);
    this.buffers.set(color, buf);
    return buf;
  }

  async start(state: BeatState | null = null) {
    this.load();
    const ctx = this.ensure();
    await ctx.resume();
    if (this.snap.playing) {
      if (state) this.setState(state);
      return;
    }
    this.clearWindDown();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(this.masterTarget(), now + AUDIO.startFadeS);
    master.connect(ctx.destination);
    const noiseBus = ctx.createGain();
    noiseBus.gain.value = this.snap.mix.noise;
    noiseBus.connect(master);
    const beatBus = ctx.createGain();
    beatBus.gain.value = this.snap.mix.beat;
    beatBus.connect(master);
    this.master = master;
    this.noiseBus = noiseBus;
    this.beatBus = beatBus;

    this.noiseVoice = this.buildNoise(this.snap.noise);
    this.noiseVoice.gain.gain.setValueAtTime(1, now);

    this.set({ playing: true, state: null });
    this.log("start", this.snap.noise);
    if (state) this.setState(state, AUDIO.startFadeS);
  }

  setState(state: BeatState, fadeS = AUDIO.stateCrossfadeS) {
    const prev = this.snap.state;
    if (state === prev) return;
    this.set({ state });
    this.log("state", state);
    this.stateListeners.forEach((l) => l(state, prev));

    const ctx = this.ctx;
    if (!ctx || !this.snap.playing || !this.beatBus) return;
    const now = ctx.currentTime;
    const type = BEAT_INFO[state].type;
    const cur = this.voice;

    if (cur && cur.type === "binaural" && type === "binaural" && cur.right) {
      rampTo(cur.right.frequency, AUDIO.binauralCarrierHz + AUDIO.beatHz[state], now, fadeS);
    } else {
      if (cur) this.retire(cur, fadeS);
      const next = this.buildBeat(state);
      curveTo(next.gain.gain, 1, now, fadeS);
      this.voice = next;
    }

    if (state === "winddown") this.windDown();
  }

  setNoiseColor(color: NoiseColor) {
    this.load();
    if (color === this.snap.noise) return;
    this.set({ noise: color });
    this.save();
    this.log("noise", color);
    const ctx = this.ctx;
    if (!ctx || !this.snap.playing) return;
    const now = ctx.currentTime;
    const old = this.noiseVoice;
    const next = this.buildNoise(color);
    curveTo(next.gain.gain, 1, now, AUDIO.noiseCrossfadeS);
    if (old) {
      curveTo(old.gain.gain, 0, now, AUDIO.noiseCrossfadeS);
      old.src.stop(now + AUDIO.noiseCrossfadeS + 0.1);
      setTimeout(() => old.gain.disconnect(), (AUDIO.noiseCrossfadeS + 0.3) * 1000);
    }
    this.noiseVoice = next;
  }

  setMix(patch: Partial<Mix>) {
    this.load();
    const mix = { ...this.snap.mix };
    for (const k of Object.keys(patch) as (keyof Mix)[]) if (typeof patch[k] === "number") mix[k] = clamp01(patch[k]!);
    this.set({ mix });
    this.save();
    const ctx = this.ctx;
    if (!ctx || !this.snap.playing) return;
    const now = ctx.currentTime;
    this.noiseBus?.gain.setTargetAtTime(mix.noise, now, AUDIO.mixRampS);
    this.beatBus?.gain.setTargetAtTime(mix.beat, now, AUDIO.mixRampS);
    if (this.snap.state !== "winddown") this.master?.gain.setTargetAtTime(this.masterTarget(), now, AUDIO.mixRampS);
  }

  setMuted(muted: boolean) {
    this.set({ muted });
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.snap.playing) return;
    if (this.snap.state === "winddown" && !muted) return;
    rampTo(this.master.gain, this.masterTarget(), ctx.currentTime, 0.3);
  }

  stop(fadeS = 1.5) {
    const ctx = this.ctx;
    this.clearWindDown();
    if (!this.snap.playing) return;
    const prev = this.snap.state;
    const master = this.master;
    const voices = [this.voice, this.noiseVoice];
    if (ctx && master) {
      const now = ctx.currentTime;
      rampTo(master.gain, 0, now, fadeS);
      for (const v of voices) {
        if (!v) continue;
        if ("sources" in v) v.sources.forEach((s) => s.stop(now + fadeS + 0.05));
        else v.src.stop(now + fadeS + 0.05);
      }
      setTimeout(() => master.disconnect(), (fadeS + 0.2) * 1000);
    }
    this.voice = this.noiseVoice = null;
    this.master = this.noiseBus = this.beatBus = null;
    this.set({ playing: false, state: null, muted: false });
    this.log("stop", prev ?? "");
    if (prev) this.stateListeners.forEach((l) => l(null, prev));
  }

  async testEar(side: "left" | "right") {
    const ctx = this.ensure();
    await ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.frequency.value = AUDIO.earTestHz;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.05);
    g.gain.setValueAtTime(0.12, now + AUDIO.earTestS - 0.1);
    g.gain.linearRampToValueAtTime(0, now + AUDIO.earTestS);
    const merger = ctx.createChannelMerger(2);
    osc.connect(g).connect(merger, 0, side === "left" ? 0 : 1);
    merger.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + AUDIO.earTestS + 0.05);
    osc.onended = () => merger.disconnect();
  }

  private windDown() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    rampTo(this.master.gain, 0, ctx.currentTime, AUDIO.windDownFadeS);
    this.clearWindDown();
    this.windDownTimer = setTimeout(() => this.stop(0.2), AUDIO.windDownFadeS * 1000);
  }

  private clearWindDown() {
    if (this.windDownTimer) clearTimeout(this.windDownTimer);
    this.windDownTimer = null;
  }

  private retire(v: Voice, fadeS: number) {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    curveTo(v.gain.gain, 0, now, fadeS);
    v.sources.forEach((s) => s.stop(now + fadeS + 0.1));
    setTimeout(() => v.gain.disconnect(), (fadeS + 0.3) * 1000);
  }

  private buildNoise(color: NoiseColor): NoiseVoice {
    const ctx = this.ensure();
    const src = ctx.createBufferSource();
    src.buffer = this.buffer(color);
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain).connect(this.noiseBus!);
    src.start(ctx.currentTime, Math.random() * AUDIO.noiseSeconds);
    return { color, gain, src };
  }

  private buildBeat(state: BeatState): Voice {
    const ctx = this.ensure();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.beatBus!);
    const hz = AUDIO.beatHz[state];

    if (BEAT_INFO[state].type === "binaural") {
      const merger = ctx.createChannelMerger(2);
      const ear = (freq: number, ch: 0 | 1) => {
        const osc = ctx.createOscillator();
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = AUDIO.beatAmplitude;
        osc.connect(g).connect(merger, 0, ch);
        osc.start(now);
        return osc;
      };
      const left = ear(AUDIO.binauralCarrierHz, 0);
      const right = ear(AUDIO.binauralCarrierHz + hz, 1);
      merger.connect(gain);
      return { type: "binaural", gain, right, sources: [left, right] };
    }

    const d = AUDIO.isochronicDepth;
    const carrier = ctx.createOscillator();
    carrier.frequency.value = AUDIO.isochronicCarrierHz;
    const level = ctx.createGain();
    level.gain.value = AUDIO.beatAmplitude;
    const am = ctx.createGain();
    am.gain.value = 1 - d / 2;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = hz;
    const depth = ctx.createGain();
    depth.gain.value = d / 2;
    lfo.connect(depth).connect(am.gain);
    carrier.connect(level).connect(am).connect(gain);
    carrier.start(now);
    lfo.start(now);
    return { type: "isochronic", gain, right: null, sources: [carrier, lfo] };
  }
}

export const loopAudio = new LoopAudio();

const SERVER_SNAP: LoopAudioSnapshot = { playing: false, state: null, noise: "pink", mix: DEFAULT_MIX, muted: false };

export function useLoopAudio(): LoopAudioSnapshot {
  return useSyncExternalStore(loopAudio.subscribe, loopAudio.getSnapshot, () => SERVER_SNAP);
}
