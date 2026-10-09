import "server-only";
import pipelineJson from "../../../../worker/pipeline.json";

export interface Pipeline {
  pipelineVersion: number;
  model: string;
  modelVersion: string;
  modelSignatures: string[];
  params: Record<string, unknown>;
}

const mb = (name: string, fallback: number) => Number(process.env[name] ?? fallback) * 1024 * 1024;

export function musicConfig() {
  return {
    maxUploadBytes: mb("MUSIC_MAX_UPLOAD_MB", 150),
    maxDurationS: Number(process.env.MUSIC_MAX_DURATION_S ?? 15 * 60),
    urlTtlS: Number(process.env.MUSIC_URL_TTL_S ?? 2 * 60 * 60),

    workerToken: process.env.MUSIC_WORKER_TOKEN || null,

    staleAfterS: Number(process.env.MUSIC_STALE_AFTER_S ?? 120),
    maxAttempts: Number(process.env.MUSIC_MAX_ATTEMPTS ?? 2),
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID || null,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || null,
    },
  };
}

export function loadPipeline(): Pipeline {
  return pipelineJson as Pipeline;
}
