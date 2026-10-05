export type StudyMode = "original" | "no_lyrics" | "vocals_only" | "beats_only";

export const STUDY_MODES: { id: StudyMode; label: string; hint: string }[] = [
  { id: "original", label: "Original", hint: "The track as you uploaded it" },
  { id: "no_lyrics", label: "No Lyrics", hint: "Everything except the voice" },
  { id: "vocals_only", label: "Vocals Only", hint: "Just the voice" },
  { id: "beats_only", label: "Beats Only", hint: "Just the drums" },
];

export const VERSION_STEMS: Record<StudyMode, readonly Stem[] | null> = {
  original: null,
  no_lyrics: ["drums", "bass", "other"],
  vocals_only: ["vocals"],
  beats_only: ["drums"],
};

export type Stem = "vocals" | "drums" | "bass" | "other";

export type JobStatus = "queued" | "processing" | "finalizing" | "completed" | "failed";

export interface JobView {
  id: string;
  status: JobStatus;

  progress: number | null;

  cached?: boolean;
  error: { code: string; message: string } | null;

  workerOnline?: boolean;
  device?: string | null;
}

export interface TrackView {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  durationMs: number | null;
  spotifyUrl: string | null;
  playlistName: string | null;

  audio: { durationS: number | null; sizeBytes: number; container: string } | null;
  job: JobView | null;
}

export interface VersionsView {
  trackId: string;

  versions: Partial<Record<StudyMode, { url: string; durationS: number }>>;
  expiresAt: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
