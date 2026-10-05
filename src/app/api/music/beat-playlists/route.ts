import { requireUser } from "@/lib/music/server/auth";
import { createFromList, createFromSpotify, listBeatPlaylists } from "@/lib/music/server/beatPlaylists";
import { parseSpotifyUrl } from "@/lib/music/server/spotify";
import { readJson, route } from "@/lib/music/server/http";

export const maxDuration = 300;

export const GET = route("beatPlaylists.list", async (req) => {
  const uid = await requireUser(req);
  return Response.json({ playlists: await listBeatPlaylists(uid) }, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = route("beatPlaylists.create", async (req) => {
  const uid = await requireUser(req);
  const { url, spotifyToken } = await readJson<{ url?: unknown; spotifyToken?: unknown }>(req);

  const token = typeof spotifyToken === "string" && /^[A-Za-z0-9_-]{20,1000}$/.test(spotifyToken) ? spotifyToken : undefined;
  const single = typeof url === "string" && isSingleSpotifyLink(url);
  const { playlist, updated } = single ? await createFromSpotify(uid, url, token) : await createFromList(uid, url);
  return Response.json({ playlist, updated }, { status: updated ? 200 : 201 });
});

function isSingleSpotifyLink(text: string) {
  const t = text.trim();

  if (/\s/.test(t) || (t.match(/open\.spotify\.com|spotify:/g)?.length ?? 0) !== 1) return false;
  try {
    parseSpotifyUrl(text);
    return true;
  } catch {
    return false;
  }
}
