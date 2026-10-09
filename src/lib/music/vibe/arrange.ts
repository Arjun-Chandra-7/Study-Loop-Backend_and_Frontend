import { KEYS, type VibeProfile } from "./profile";
import type { BeatPlaylist, SongBeat } from "./songs";

export interface Camelot {

  hour: number;

  letter: "A" | "B";
}

export function camelot(key: VibeProfile["key"], mode: VibeProfile["mode"]): Camelot {
  const pc = KEYS.indexOf(key);
  const major = mode === "major" ? pc : (pc + 3) % 12;
  return { hour: ((major * 7 + 7) % 12) + 1, letter: mode === "major" ? "B" : "A" };
}

export function keyDistance(a: Camelot, b: Camelot): number {
  const d = Math.min((a.hour - b.hour + 12) % 12, (b.hour - a.hour + 12) % 12);
  const sameLetter = a.letter === b.letter;
  if (d === 0) return sameLetter ? 0 : 1;
  if (d === 1) return sameLetter ? 1 : 2;
  if (d === 2 && sameLetter) return 2.5;
  return 3 + d * 0.5 + (sameLetter ? 0 : 0.5);
}

export function tempoDistance(a: number, b: number): number {
  const best = Math.min(...[1, 2, 0.5].map((f) => Math.abs(Math.log((b * f) / a))));
  return best / Math.log(1.06);
}

export function pulseMatch(from: number, to: number): number {
  return [to, to * 2, to / 2].reduce((best, t) => (Math.abs(Math.log(t / from)) < Math.abs(Math.log(best / from)) ? t : best), to);
}

const FEEL_FAMILY: Record<VibeProfile["drumFeel"], string> = {
  lofi: "chill",
  boom_bap: "chill",
  downtempo: "chill",
  ambient: "chill",
  funk: "groove",
  four_on_floor: "groove",
  reggaeton: "groove",
  rock: "drive",
  trap: "trap",
  dholak_groove: "dholak",
};

export function transitionCost(a: VibeProfile, b: VibeProfile): number {
  const key = keyDistance(camelot(a.key, a.mode), camelot(b.key, b.mode));
  const tempo = Math.min(4, tempoDistance(a.tempoBpm, b.tempoBpm));
  const energy = Math.abs(a.energy - b.energy) * 4;
  const feel = a.drumFeel === b.drumFeel ? 0 : FEEL_FAMILY[a.drumFeel] === FEEL_FAMILY[b.drumFeel] ? 0.3 : 0.8;
  return key * 1.0 + tempo * 1.2 + energy + feel;
}

function arcTarget(i: number, n: number, lo: number, hi: number) {
  if (n < 3) return (lo + hi) / 2;
  return lo + (hi - lo) * Math.sin((Math.PI * i) / (n - 1));
}

function totalCost(order: number[], songs: VibeProfile[], lo: number, hi: number) {
  let c = 0;
  for (let i = 0; i < order.length; i++) {
    c += Math.abs(songs[order[i]].energy - arcTarget(i, order.length, lo, hi)) * 2;
    if (i) c += transitionCost(songs[order[i - 1]], songs[order[i]]);
  }
  return c;
}

export function arrangeOrder(profiles: VibeProfile[]): number[] {
  const n = profiles.length;
  if (n < 3) return profiles.map((_, i) => i);
  const energies = profiles.map((p) => p.energy);
  const lo = Math.min(...energies);
  const hi = Math.max(...energies);

  let best: number[] = [];
  let bestCost = Infinity;
  for (let start = 0; start < n; start++) {
    const order = [start];
    const left = new Set(profiles.map((_, i) => i).filter((i) => i !== start));
    while (left.size) {
      const last = order[order.length - 1];
      const pos = order.length;
      let pick = -1;
      let pickCost = Infinity;
      for (const j of left) {
        const c = transitionCost(profiles[last], profiles[j]) + Math.abs(profiles[j].energy - arcTarget(pos, n, lo, hi)) * 2;
        if (c < pickCost) [pick, pickCost] = [j, c];
      }
      order.push(pick);
      left.delete(pick);
    }
    const c = totalCost(order, profiles, lo, hi);
    if (c < bestCost) [best, bestCost] = [order, c];
  }

  for (let improved = true, passes = 0; improved && passes < 50; passes++) {
    improved = false;
    for (let i = 0; i < n - 1; i++)
      for (let j = i + 1; j < n; j++) {
        const next = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        const c = totalCost(next, profiles, lo, hi);
        if (c < bestCost - 1e-9) {
          [best, bestCost] = [next, c];
          improved = true;
        }
      }
  }
  return best;
}

export function transpose(p: VibeProfile, semitones: number): VibeProfile {
  if (!semitones) return p;
  return { ...p, key: KEYS[(KEYS.indexOf(p.key) + semitones + 12) % 12] };
}

export interface ArrangedSong extends SongBeat {

  keyShift: number;
}

export function arrangeSongs(songs: SongBeat[]): ArrangedSong[] {
  const order = arrangeOrder(songs.map((s) => s.profile));
  const out: ArrangedSong[] = [];
  for (const i of order) {
    const song = songs[i];
    const prev = out[out.length - 1]?.profile;
    let shift = 0;
    if (prev) {
      const here = keyDistance(camelot(prev.key, prev.mode), camelot(song.profile.key, song.profile.mode));
      if (here >= 3) {
        for (const s of [1, -1]) {
          const moved = transpose(song.profile, s);
          if (keyDistance(camelot(prev.key, prev.mode), camelot(moved.key, moved.mode)) <= 1) {
            shift = s;
            break;
          }
        }
      }
    }
    out.push({ ...song, profile: transpose(song.profile, shift), keyShift: shift });
  }
  return out;
}

const arranged = new WeakMap<BeatPlaylist, BeatPlaylist>();

export function arrangePlaylist(p: BeatPlaylist): BeatPlaylist {
  let a = arranged.get(p);
  if (!a) arranged.set(p, (a = { ...p, songs: arrangeSongs(p.songs) }));
  return a;
}
