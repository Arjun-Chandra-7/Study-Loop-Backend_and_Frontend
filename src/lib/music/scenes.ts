import type { BeatBandId } from "./gamma";

type NoiseColor = "brown" | "pink";

interface SceneSpec {
  chords: number[][];
  chordSeconds: number;
  glideSeconds: number;
  padWave: OscillatorType;
  padLevel: number;
  padCutoff: number;
  cutoffDrift: number;
  noise: NoiseColor;
  noiseLevel: number;
  noiseCutoff: number;
  breathHz: number;
  breathDepth: number;
  binaural?: { carrierHz: number; beatHz: number; level: number };
  shimmer?: { hz: number; depth: number; level: number; fromHz: number };
}

export const SCENES: Record<BeatBandId, SceneSpec> = {
  theta: {
    chords: [
      [73.42, 146.83, 220.0, 349.23],
      [65.41, 130.81, 196.0, 329.63],
      [58.27, 116.54, 174.61, 293.66],
    ],
    chordSeconds: 34,
    glideSeconds: 9,
    padWave: "sine",
    padLevel: 0.24,
    padCutoff: 380,
    cutoffDrift: 90,
    noise: "brown",
    noiseLevel: 0.34,
    noiseCutoff: 420,
    breathHz: 1 / 12,
    breathDepth: 0.35,
    binaural: { carrierHz: 100, beatHz: 7.5, level: 0.035 },
  },
  alpha: {
    chords: [
      [87.31, 174.61, 261.63, 329.63, 440.0],
      [98.0, 196.0, 293.66, 392.0, 493.88],
      [73.42, 146.83, 220.0, 369.99, 440.0],
    ],
    chordSeconds: 28,
    glideSeconds: 7,
    padWave: "triangle",
    padLevel: 0.2,
    padCutoff: 850,
    cutoffDrift: 250,
    noise: "pink",
    noiseLevel: 0.14,
    noiseCutoff: 2400,
    breathHz: 1 / 10,
    breathDepth: 0.18,
    binaural: { carrierHz: 180, beatHz: 10, level: 0.03 },
  },
  gamma: {
    chords: [
      [65.41, 130.81, 196.0, 293.66],
      [73.42, 146.83, 220.0, 329.63],
      [61.74, 123.47, 185.0, 277.18],
    ],
    chordSeconds: 30,
    glideSeconds: 8,
    padWave: "triangle",
    padLevel: 0.15,
    padCutoff: 1100,
    cutoffDrift: 300,
    noise: "pink",
    noiseLevel: 0.2,
    noiseCutoff: 5000,
    breathHz: 1 / 16,
    breathDepth: 0.08,
    shimmer: { hz: 40, depth: 0.3, level: 0.12, fromHz: 1800 },
  },
};

const noiseCache = new WeakMap<BaseAudioContext, Partial<Record<NoiseColor, AudioBuffer>>>();

function noiseBuffer(ctx: BaseAudioContext, color: NoiseColor) {
  const cache = noiseCache.get(ctx) ?? {};
  noiseCache.set(ctx, cache);
  const hit = cache[color];
  if (hit) return hit;
  const len = ctx.sampleRate * 8;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    if (color === "brown") {
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
    } else {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
    const fade = Math.floor(ctx.sampleRate * 0.25);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[i] *= k;
      d[len - 1 - i] *= k;
    }
  }
  cache[color] = buf;
  return buf;
}

export interface Scene {
  stop(when: number): void;
}

export function buildScene(ctx: BaseAudioContext, out: AudioNode, id: BeatBandId): Scene {
  const spec = SCENES[id];
  const now = ctx.currentTime;
  const sources: AudioScheduledSourceNode[] = [];
  const start = <T extends AudioScheduledSourceNode>(n: T) => {
    n.start(now);
    sources.push(n);
    return n;
  };
  const lfo = (hz: number, amount: number, target: AudioParam) => {
    const o = ctx.createOscillator();
    o.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.value = amount;
    o.connect(g).connect(target);
    start(o);
  };

  const body = ctx.createGain();
  body.gain.value = 1 - spec.breathDepth / 2;
  lfo(spec.breathHz, spec.breathDepth / 2, body.gain);
  body.connect(out);

  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = spec.padCutoff;
  padFilter.Q.value = 0.4;
  lfo(1 / 41, spec.cutoffDrift, padFilter.frequency);
  padFilter.connect(body);

  const notes = Math.max(...spec.chords.map((c) => c.length));
  const voiceLevel = spec.padLevel / Math.sqrt(notes * 2);
  const voices: OscillatorNode[][] = [];
  for (let n = 0; n < notes; n++) {
    const hz = spec.chords[0][n] ?? spec.chords[0][0] * 4;
    const pair: OscillatorNode[] = [];
    for (const [cents, pan] of [
      [-5, -0.35],
      [5, 0.35],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = spec.padWave;
      o.frequency.value = hz;
      o.detune.value = cents;
      const g = ctx.createGain();
      g.gain.value = voiceLevel;
      lfo(0.05 + n * 0.013, voiceLevel * 0.25, g.gain);
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      o.connect(g).connect(p).connect(padFilter);
      start(o);
      pair.push(o);
    }
    voices.push(pair);
  }

  let chord = 0;
  const timer = setInterval(() => {
    chord = (chord + 1) % spec.chords.length;
    const t = ctx.currentTime;
    const next = spec.chords[chord];
    voices.forEach((pair, n) => {
      const hz = next[n] ?? next[0] * 4;
      for (const o of pair) o.frequency.setTargetAtTime(hz, t, spec.glideSeconds / 3);
    });
  }, spec.chordSeconds * 1000);

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx, spec.noise);
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = spec.noiseCutoff;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = spec.noiseLevel;
  noise.connect(noiseFilter).connect(noiseGain).connect(body);
  start(noise);

  if (spec.shimmer) {
    const sh = spec.shimmer;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = sh.fromHz;
    const am = ctx.createGain();
    am.gain.value = 1 - sh.depth / 2;
    lfo(sh.hz, sh.depth / 2, am.gain);
    const lvl = ctx.createGain();
    lvl.gain.value = sh.level;
    noise.connect(hp).connect(am).connect(lvl).connect(body);
  }

  if (spec.binaural) {
    const b = spec.binaural;
    for (const [hz, pan] of [
      [b.carrierHz, -1],
      [b.carrierHz + b.beatHz, 1],
    ] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = hz;
      const g = ctx.createGain();
      g.gain.value = b.level;
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      o.connect(g).connect(p).connect(out);
      start(o);
    }
  }

  return {
    stop(when: number) {
      clearInterval(timer);
      for (const s of sources) {
        try {
          s.stop(when);
        } catch {}
      }
    },
  };
}
