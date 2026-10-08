"use client";

import { useSyncExternalStore } from "react";

export type BeatBandId = "theta" | "alpha" | "gamma";

export type BeatMethod = "binaural" | "isochronic";

export interface BeatBand {
  id: BeatBandId;
  label: string;

  sub: string;

  beatHz: number;

  carrierHz: number;

  method: BeatMethod;
}

export const BEAT_BANDS: BeatBand[] = [
  { id: "theta", label: "Theta", sub: "7.5 Hz binaural · calm", beatHz: 7.5, carrierHz: 110, method: "binaural" },
  { id: "alpha", label: "Alpha", sub: "10 Hz binaural · relaxed focus", beatHz: 10, carrierHz: 136, method: "binaural" },
  { id: "gamma", label: "40 Hz", sub: "40 Hz isochronic · attention", beatHz: 40, carrierHz: 200, method: "isochronic" },
];

export const needsHeadphones = (ids: BeatBandId[]) =>
  ids.some((id) => BEAT_BANDS.find((b) => b.id === id)?.method === "binaural");

const MASTER = 0.16;
const FADE_IN = 2.0;
const DEFAULT: BeatBandId[] = ["gamma"];

interface Layer {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
}

interface BeatsState {
  playing: boolean;
  active: BeatBandId[];

  auto: boolean;
}
const EMPTY: BeatsState = { playing: false, active: [], auto: false };

class Beats {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers = new Map<BeatBandId, Layer>();
  private state: BeatsState = EMPTY;
  private auto = false;
  private fading = false;
  private listeners = new Set<() => void>();

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = () => this.state.playing;

  getState = () => this.state;

  private emit() {
    const playing = this.layers.size > 0;
    const active = [...this.layers.keys()];
    const auto = playing && this.auto;
    const s = this.state;
    if (s.playing === playing && s.auto === auto && s.active.length === active.length && active.every((id, i) => s.active[i] === id)) return;
    this.state = { playing, active, auto };
    this.listeners.forEach((l) => l());
  }

  private ensure(): AudioContext {
    const ctx = (this.ctx ??= new AudioContext());
    if (!this.master) {
      const m = ctx.createGain();
      m.gain.value = MASTER;
      m.connect(ctx.destination);
      this.master = m;
    }
    return ctx;
  }

  private build(id: BeatBandId, fadeIn = FADE_IN) {
    const band = BEAT_BANDS.find((b) => b.id === id);
    if (!band || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.connect(this.master);

    const tone = (hz: number, pan: number, level: number) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = hz;
      const g = ctx.createGain();
      g.gain.value = level;
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      osc.connect(g).connect(p).connect(gain);
      osc.start(now);
      return osc;
    };
    let sources: AudioScheduledSourceNode[];
    if (band.method === "binaural") {
      sources = [tone(band.carrierHz, -1, 0.5), tone(band.carrierHz + band.beatHz, 1, 0.5)];
    } else {
      const carrier = ctx.createOscillator();
      carrier.frequency.value = band.carrierHz;
      const am = ctx.createGain();
      am.gain.value = 0.35;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = band.beatHz;
      const depth = ctx.createGain();
      depth.gain.value = 0.35;
      lfo.connect(depth).connect(am.gain);
      carrier.connect(am).connect(gain);
      carrier.start(now);
      lfo.start(now);
      sources = [carrier, lfo];
    }

    this.layers.set(id, { gain, sources });
    this.rebalance(fadeIn);
  }

  private rebalance(fade = 0.4) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const per = 1 / Math.sqrt(Math.max(1, this.layers.size));
    for (const { gain } of this.layers.values()) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(per, now + fade);
    }
  }

  private teardown(id: BeatBandId, fade = 0.5) {
    const layer = this.layers.get(id);
    if (!layer || !this.ctx) return;
    const now = this.ctx.currentTime;
    layer.gain.gain.cancelScheduledValues(now);
    layer.gain.gain.setValueAtTime(layer.gain.gain.value, now);
    layer.gain.gain.linearRampToValueAtTime(0, now + fade);
    for (const s of layer.sources) s.stop(now + fade + 0.05);
    const g = layer.gain;
    setTimeout(() => g.disconnect(), (fade + 0.1) * 1000);
    this.layers.delete(id);
  }

  async start(ids?: BeatBandId[]) {
    const want = ids && ids.length ? ids : this.state.active.length ? this.state.active : DEFAULT;
    await this.setBands(want);
  }

  async setBands(ids: BeatBandId[], fade?: number) {
    const want = new Set(ids);
    if (want.size === 0) return this.stop();
    const ctx = this.ensure();
    await ctx.resume();
    if (this.fading) this.restoreMaster();
    for (const id of this.layers.keys()) if (!want.has(id)) this.teardown(id, fade);
    for (const id of want) if (!this.layers.has(id)) this.build(id, fade);
    this.rebalance(fade);
    this.emit();
  }

  setAuto(on: boolean) {
    this.auto = on;
    this.emit();
  }

  async crossfadeTo(id: BeatBandId, seconds: number) {
    const a = this.state.active;
    if (a.length === 1 && a[0] === id) return;
    await this.setBands([id], seconds);
  }

  fadeOut(seconds: number) {
    if (!this.ctx || !this.master || this.fading) return;
    this.fading = true;
    const now = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + Math.max(1, seconds));
  }

  private restoreMaster() {
    this.fading = false;
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(MASTER, now + 1);
  }

  async toggleBand(id: BeatBandId) {
    const next = new Set(this.state.active);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    await this.setBands([...next]);
  }

  stop() {
    if (!this.ctx || !this.master) {
      if (this.layers.size) this.emit();
      return;
    }
    for (const id of [...this.layers.keys()]) this.teardown(id, 0.6);
    this.auto = false;
    if (this.fading) this.restoreMaster();
    this.emit();
  }

  async toggle() {
    if (this.state.playing) this.stop();
    else await this.start();
  }
}

export const beats = new Beats();

export const gammaBeats = beats;

export function useGammaBeats() {
  return useSyncExternalStore(beats.subscribe, beats.getSnapshot, () => false);
}

export function useBeats(): BeatsState {
  return useSyncExternalStore(beats.subscribe, beats.getState, () => EMPTY);
}
