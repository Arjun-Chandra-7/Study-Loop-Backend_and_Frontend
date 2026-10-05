import { z } from "zod";
import type { PhysioState } from "../../sensors/classify";

export const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export const INSTRUMENTS = ["piano", "rhodes", "acoustic_guitar", "electric_guitar", "synth", "sitar", "flute", "strings", "pad", "bells"] as const;
export const DRUM_FEELS = ["lofi", "dholak_groove", "boom_bap", "trap", "four_on_floor", "funk", "rock", "reggaeton", "downtempo", "ambient"] as const;

const grid = (what: string) =>
  z.string().max(40).describe(`${what} over one bar as 16 characters, one per sixteenth note: x = hit, o = soft hit, . = rest. E.g. "x.......x.x....."`);

const hookLine = (what: string) =>
  z
    .string()
    .max(400)
    .describe(
      `${what}, as notes in order: scale degree 1–7 of the key (# or b for a chromatic note, ' an octave up, , an octave down) and its length in sixteenths, e.g. "1:6 1:2 3:3 1:3 7,:2 6,:8 5,:8"; r:4 is a rest.`,
    );

export const DEGREES = [1, 2, 3, 4, 5, 6, 7] as const;

export const VibeProfileSchema = z.object({
  summary: z.string().max(160).describe("One short line a listener would recognise as their playlist's feel, e.g. 'Warm Hindi indie with acoustic guitar and soft Punjabi grooves'."),
  moods: z.array(z.string().max(24)).min(1).max(4).describe("2–4 single-word moods, e.g. romantic, nostalgic, uplifting."),
  tempoBpm: z.number().int().min(60).max(180).describe("Tempo in BPM: a song's real tempo, or for a playlist the typical tempo nudged towards a calm study pace."),
  key: z.enum(KEYS),
  mode: z.enum(["major", "minor"]),
  progression: z.array(z.number().int().min(1).max(7)).min(2).max(8).describe("The chord loop as scale degrees (1–7) in order, 2–8 chords, e.g. [1,5,6,4] or [6,4,1,5]."),
  harmonicRhythm: z.number().int().min(1).max(4).optional().describe("Chords per bar: 1 = one chord a bar, 2 = two a bar."),
  drumFeel: z
    .enum(DRUM_FEELS)
    .describe(
      "dholak_groove for Punjabi/Bollywood/folk, boom_bap for classic hip-hop, trap for modern rap with 808s, four_on_floor for dance/disco/house/synth-pop, funk, rock, reggaeton for dembow/latin, lofi for indie/pop, downtempo for slow ballads, ambient for very calm.",
    ),
  groove: z
    .object({ kick: grid("Kick drum"), snare: grid("Snare or clap"), hat: grid("Hi-hat") })
    .optional()
    .describe("The drum pattern that defines the song's groove."),
  bassRhythm: grid("Bass notes on the chord root").optional(),
  melody: hookLine("The chorus's sung melody (the line everyone hums), played on an instrument").optional(),
  riff: hookLine("The song's signature instrumental riff").optional(),
  bassLine: hookLine("The song's bass line, when it's part of what makes the song recognisable").optional(),
  comp: grid("Chord stabs (the rhythm the keys or guitar play the chords in)").optional(),
  sevenths: z.boolean().optional().describe("true for jazzy 7th chords, false for plain triads."),
  palette: z.array(z.enum(INSTRUMENTS)).min(1).max(3).describe("1–3 instruments that carry the sound, most important first."),
  energy: z.number().min(0).max(1).describe("0 = very calm, 1 = very energetic, for a study setting."),
  warmth: z.number().min(0).max(1).describe("0 = bright and airy, 1 = warm and mellow."),
  swing: z.number().min(0).max(0.6).describe("Groove swing: 0 straight, ~0.3 lofi, 0.5 heavy."),
});
export type VibeProfile = z.infer<typeof VibeProfileSchema>;

export const VibeProfileModelSchema = z.object({
  summary: z.string().describe("One short line describing the sound, e.g. 'Disco-funk: choppy guitar, four-on-the-floor'."),
  moods: z.array(z.string()).describe("2–4 single-word moods."),
  tempoBpm: z.number().describe("Tempo in BPM, the recording's real tempo."),
  key: z.string().describe("Tonic of the key, e.g. 'F#' or 'Bb'."),
  mode: z.string().describe("'major' or 'minor'."),
  progression: z.array(z.number()).describe("The chord loop as scale degrees 1–7 in order, 2–8 chords, e.g. [1,5,6,4]."),
  harmonicRhythm: z.number().nullable().describe("Chords per bar: 1, 2 or 4."),
  drumFeel: z.string().describe(`One of: ${DRUM_FEELS.join(", ")}.`),
  groove: z
    .object({ kick: z.string(), snare: z.string(), hat: z.string() })
    .nullable()
    .describe('The defining drum pattern, each as 16 characters for one bar of sixteenths: x = hit, o = soft hit, . = rest. E.g. kick "x.......x.x.....".'),
  bassRhythm: z.string().nullable().describe("Bass notes over one bar, 16 characters: x = note, . = rest."),
  palette: z.array(z.string()).describe(`1–3 instruments that carry the sound, most important first, from: ${INSTRUMENTS.join(", ")}.`),
  energy: z.number().describe("0 = very calm … 1 = very energetic."),
  warmth: z.number().describe("0 = bright and airy … 1 = warm and mellow."),
  swing: z.number().describe("0 straight, ~0.3 lofi, 0.5 heavy."),
});

const FLATS: Record<string, (typeof KEYS)[number]> = { DB: "C#", EB: "D#", GB: "F#", AB: "G#", BB: "A#", CB: "B", FB: "E", "E#": "F", "B#": "C" };
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(x) ? x : lo));

export function fromModel(p: z.infer<typeof VibeProfileModelSchema>): VibeProfile {
  const raw = p.key.trim().replace(/♯/g, "#").replace(/♭/g, "b").replace(/\s*(major|minor|maj|min|m)$/i, "");
  const acc = raw.charAt(1);
  const name = raw.charAt(0).toUpperCase() + (acc === "#" ? "#" : acc.toLowerCase() === "b" ? "b" : "");
  const key = (KEYS as readonly string[]).includes(name) ? (name as (typeof KEYS)[number]) : (FLATS[name.toUpperCase()] ?? "C");
  let bpm = Math.round(p.tempoBpm);
  while (bpm > 180) bpm = Math.round(bpm / 2);
  while (bpm > 0 && bpm < 60) bpm *= 2;
  const progression = p.progression.map(Math.round).filter((d) => d >= 1 && d <= 7).slice(0, 8);
  const feel = p.drumFeel.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const palette = [...new Set(p.palette.map((i) => i.trim().toLowerCase().replace(/[\s-]+/g, "_")))].filter((i): i is (typeof INSTRUMENTS)[number] => (INSTRUMENTS as readonly string[]).includes(i)).slice(0, 3);
  const hr = Math.round(p.harmonicRhythm ?? 1);
  const gridOrNull = (g: string | null | undefined) => (g && /[xXoO]/.test(g) ? g.slice(0, 40) : undefined);
  const groove = p.groove && gridOrNull(p.groove.kick) ? { kick: gridOrNull(p.groove.kick)!, snare: gridOrNull(p.groove.snare) ?? "................", hat: gridOrNull(p.groove.hat) ?? "................" } : undefined;
  const bassRhythm = gridOrNull(p.bassRhythm);
  return {
    summary: p.summary.trim().slice(0, 160) || "Instrumental beat",
    moods: p.moods.map((m) => m.trim().slice(0, 24)).filter(Boolean).slice(0, 4).concat(p.moods.length ? [] : ["focused"]),
    tempoBpm: clamp(bpm, 60, 180),
    key,
    mode: /min/i.test(p.mode) ? "minor" : "major",
    progression: progression.length >= 2 ? progression : [1, 5, 6, 4],
    ...(hr === 2 || hr === 4 ? { harmonicRhythm: hr } : {}),
    drumFeel: (DRUM_FEELS as readonly string[]).includes(feel) ? (feel as VibeProfile["drumFeel"]) : "lofi",
    ...(groove ? { groove } : {}),
    ...(bassRhythm ? { bassRhythm } : {}),
    palette: palette.length ? palette : ["piano"],
    energy: clamp(p.energy, 0, 1),
    warmth: clamp(p.warmth, 0, 1),
    swing: clamp(p.swing, 0, 0.6),
  };
}

export interface BeatParams {
  bpm: number;

  drumDensity: number;

  melodyDensity: number;

  cutoffHz: number;

  gainDb: number;

  space: number;

  label: string;
}

export function beatParams(p: VibeProfile, state: PhysioState): BeatParams {
  const baseCutoff = 1400 + (1 - p.warmth) * 3600;
  const base: BeatParams = {
    bpm: p.tempoBpm,
    drumDensity: p.drumFeel === "ambient" ? 0.15 : 0.45 + p.energy * 0.5,
    melodyDensity: 0.12 + p.energy * 0.18,
    cutoffHz: baseCutoff,
    gainDb: -12,
    space: 0.25 + (1 - p.energy) * 0.15,
    label: "Following the song's feel",
  };
  switch (state) {
    case "elevated":
      return {
        ...base,
        bpm: Math.max(58, Math.round(p.tempoBpm * 0.82)),
        drumDensity: base.drumDensity * 0.3,
        melodyDensity: base.melodyDensity * 0.5,
        cutoffHz: base.cutoffHz * 0.55,
        gainDb: base.gainDb - 3,
        space: Math.min(0.6, base.space + 0.2),
        label: "Stress is up: slowing down and softening",
      };
    case "recovering":
      return {
        ...base,
        bpm: Math.round(p.tempoBpm * 0.9),
        drumDensity: base.drumDensity * 0.6,
        melodyDensity: base.melodyDensity * 0.75,
        cutoffHz: base.cutoffHz * 0.75,
        gainDb: base.gainDb - 1.5,
        space: base.space + 0.1,
        label: "Settling back down",
      };
    case "changing":
      return { ...base, bpm: Math.round(p.tempoBpm * 0.95), drumDensity: base.drumDensity * 0.85, label: "Easing off a little" };
    default:
      return base;
  }
}

export function stepGrid(g: string | undefined): number[] | null {
  if (!g) return null;
  const v = g
    .replace(/[\s|]/g, "")
    .slice(0, 16)
    .padEnd(16, ".")
    .split("")
    .map((c) => (/[xX1]/.test(c) ? 1 : /[oO]/.test(c) ? 0.55 : 0));
  return v.some((x) => x > 0) ? v : null;
}

export function scale(key: VibeProfile["key"], mode: VibeProfile["mode"], octave = 4): number[] {
  const root = 12 * (octave + 1) + KEYS.indexOf(key);
  const steps = mode === "major" ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  return steps.map((s) => root + s);
}

export function chord(key: VibeProfile["key"], mode: VibeProfile["mode"], degree: number, octave = 3): number[] {
  const sc = [...scale(key, mode, octave), ...scale(key, mode, octave + 1)];
  const i = degree - 1;
  return [sc[i], sc[i + 2], sc[i + 4], sc[i + 6]];
}

export const usesSevenths = (p: VibeProfile) => p.sevenths ?? (p.drumFeel === "lofi" || p.drumFeel === "boom_bap" || p.drumFeel === "ambient");

export interface HookNote {
  step: number;
  len: number;
  degree: number;

  shift: number;

  octave: number;
}

export interface Hook {
  notes: HookNote[];
  steps: number;
}

const HOOK_TOKEN = /^([#b]?)(r|[1-7])([#b]?)([',]*):(\d{1,2})$/;

const HOOK_MAX_STEPS = 128;

export function parseHook(text: string | null | undefined): Hook | null {
  if (!text) return null;
  const notes: HookNote[] = [];
  let step = 0;
  for (const tok of text.trim().split(/[\s|]+/)) {
    if (!tok) continue;
    const m = tok.match(HOOK_TOKEN);
    if (!m) return null;
    const len = Number(m[5]);
    if (len < 1 || len > 32) return null;
    if (m[2] !== "r") {
      const acc = m[1] || m[3];
      const marks = m[4];
      notes.push({ step, len, degree: Number(m[2]), shift: acc === "#" ? 1 : acc === "b" ? -1 : 0, octave: (marks.match(/'/g)?.length ?? 0) - (marks.match(/,/g)?.length ?? 0) });
    }
    step += len;
    if (step > HOOK_MAX_STEPS) return null;
  }
  return notes.length >= 2 ? { notes, steps: Math.ceil(step / 16) * 16 } : null;
}

export const hookMidi = (key: VibeProfile["key"], mode: VibeProfile["mode"], n: HookNote, octave: number) => scale(key, mode, octave + n.octave)[n.degree - 1] + n.shift;

export function hookFields(f: { melody?: unknown; riff?: unknown; bass?: unknown; comp?: unknown; sevenths?: unknown }): Pick<VibeProfile, "melody" | "riff" | "bassLine" | "comp" | "sevenths"> {
  const line = (v: unknown) => (typeof v === "string" && parseHook(v) ? v.trim().replace(/\s+/g, " ") : undefined);
  const melody = line(f.melody);
  const riff = line(f.riff);
  const bassLine = line(f.bass);
  const comp = typeof f.comp === "string" && stepGrid(f.comp) ? f.comp.trim().slice(0, 40) : undefined;
  const sevenths = typeof f.sevenths === "boolean" ? f.sevenths : undefined;
  return { ...(melody ? { melody } : {}), ...(riff ? { riff } : {}), ...(bassLine ? { bassLine } : {}), ...(comp ? { comp } : {}), ...(sevenths !== undefined ? { sevenths } : {}) };
}
