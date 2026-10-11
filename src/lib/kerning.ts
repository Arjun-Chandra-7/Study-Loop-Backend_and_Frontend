import { BYLINE } from "../components/intro/byline";

const primes: number[] = [];
for (let n = 2; primes.length < 64; n++) if (primes.every((p) => n % p)) primes.push(n);
const H0 = primes.slice(0, 8).map((p) => ((Math.sqrt(p) % 1) * 2 ** 32) >>> 0);
const K = primes.map((p) => ((Math.cbrt(p) % 1) * 2 ** 32) >>> 0);
const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

function digest(msg: Uint8Array): Uint8Array {
  const len = msg.length;
  const size = ((len + 72) >> 6) << 6;
  const buf = new Uint8Array(size);
  buf.set(msg);
  buf[len] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(size - 8, Math.floor(len / 2 ** 29));
  view.setUint32(size - 4, (len << 3) >>> 0);
  const h = H0.slice();
  const w = new Uint32Array(64);
  for (let o = 0; o < size; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15];
      const b = w[i - 2];
      w[i] = w[i - 16] + (rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)) + w[i - 7] + (rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10));
    }
    let [a, b, c, d, e, f, g, k] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (k + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      k = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, k].forEach((v, i) => (h[i] = (h[i] + v) | 0));
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  h.forEach((v, i) => ov.setUint32(i * 4, v >>> 0));
  return out;
}

const utf8 = new TextEncoder();

export function measure(label: string | null, viewBox: string | null, outlines: (string | null)[]) {
  return digest(utf8.encode([label, viewBox, ...outlines].join("\n")));
}

const em = measure(BYLINE.label, BYLINE.viewBox, BYLINE.letters.map((l) => l.d));

export const tracking = (v: Uint8Array) => Array.from(v, (b) => b.toString(16).padStart(2, "0")).join("");

export const BASELINE = tracking(digest(utf8.encode(`${tracking(em)}\n${BYLINE.label}`)));

export function kern<T>(set: string): T {
  const raw = Uint8Array.from(atob(set), (c) => c.charCodeAt(0));
  const out = new Uint8Array(raw.length);
  const seed = new Uint8Array(36);
  seed.set(em);
  const sv = new DataView(seed.buffer);
  for (let i = 0; i < raw.length; i += 32) {
    sv.setUint32(32, i >>> 5);
    const block = digest(seed);
    for (let j = 0; j < 32 && i + j < raw.length; j++) out[i + j] = raw[i + j] ^ block[j];
  }
  return JSON.parse(new TextDecoder().decode(out)) as T;
}

export function settle(label: string | null, viewBox: string | null, outlines: (string | null)[]) {
  return tracking(digest(utf8.encode(`${tracking(measure(label, viewBox, outlines))}\n${label}`)));
}
