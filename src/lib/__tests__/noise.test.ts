import { describe, expect, it } from "vitest";
import { loopableNoise, NOISE_COLORS, NOISE_RMS, rms } from "../audio/noise";

const SR = 48_000;

function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

describe("noise layer", () => {
  for (const color of NOISE_COLORS) {
    it(`${color}: hits its loudness target and never clips`, () => {
      const x = loopableNoise(color, SR * 4, SR / 2, seeded(11));
      expect(rms(x)).toBeCloseTo(NOISE_RMS[color], 2);
      let peak = 0;
      for (const v of x) peak = Math.max(peak, Math.abs(v));
      expect(peak).toBeLessThanOrEqual(0.95);
    });

    it(`${color}: loops without a jump at the seam`, () => {
      const x = loopableNoise(color, SR * 4, SR / 2, seeded(5));
      const steps: number[] = [];
      for (let i = 1; i < x.length; i++) steps.push(Math.abs(x[i] - x[i - 1]));
      steps.sort((a, b) => a - b);
      const p999 = steps[Math.floor(steps.length * 0.999)];
      expect(Math.abs(x[0] - x[x.length - 1])).toBeLessThanOrEqual(p999);
    });
  }

  it("left and right channels differ", () => {
    const l = loopableNoise("pink", SR, SR / 10, seeded(1));
    const r = loopableNoise("pink", SR, SR / 10, seeded(987_654_321));
    let dot = 0;
    for (let i = 0; i < l.length; i++) dot += l[i] * r[i];
    expect(Math.abs(dot / l.length) / (rms(l) * rms(r))).toBeLessThan(0.2);
  });
});
