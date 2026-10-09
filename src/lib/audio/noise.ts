export type NoiseColor = "white" | "pink" | "brown";

export const NOISE_COLORS: NoiseColor[] = ["white", "pink", "brown"];

export const NOISE_RMS: Record<NoiseColor, number> = {
  white: 0.11,
  pink: 0.16,
  brown: 0.21,
};

const PEAK_LIMIT = 0.95;

type Rand = () => number;

export function rawNoise(color: NoiseColor, n: number, rand: Rand = Math.random): Float32Array {
  const out = new Float32Array(n);
  if (color === "white") {
    for (let i = 0; i < n; i++) out[i] = rand() * 2 - 1;
    return out;
  }
  if (color === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = rand() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    }
    return out;
  }
  let last = 0;
  for (let i = 0; i < n; i++) {
    last = 0.996 * last + 0.04 * (rand() * 2 - 1);
    out[i] = last;
  }
  let mean = 0;
  for (let i = 0; i < n; i++) mean += out[i];
  mean /= n || 1;
  for (let i = 0; i < n; i++) out[i] -= mean;
  return out;
}

export function rms(x: Float32Array) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / (x.length || 1));
}

export function loopableNoise(color: NoiseColor, length: number, seam: number, rand: Rand = Math.random): Float32Array {
  const x = rawNoise(color, length + seam, rand);
  const out = x.slice(0, length);
  for (let i = 0; i < seam; i++) {
    const k = i / seam;
    out[i] = x[i] * Math.sqrt(k) + x[length + i] * Math.sqrt(1 - k);
  }
  let scale = NOISE_RMS[color] / (rms(out) || 1);
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak * scale > PEAK_LIMIT) scale = PEAK_LIMIT / peak;
  for (let i = 0; i < length; i++) out[i] *= scale;
  return out;
}
