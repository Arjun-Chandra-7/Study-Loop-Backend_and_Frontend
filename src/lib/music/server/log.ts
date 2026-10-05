import "server-only";

export function log(event: string, fields: Record<string, unknown> = {}) {
  if (process.env.MUSIC_LOG === "off") return;
  const line = JSON.stringify({ ts: Date.now() / 1000, svc: "music-api", event, ...fields });
  if (event.endsWith("_failed") || event === "error") console.error(line);
  else console.log(line);
}
