import { requireUser } from "@/lib/music/server/auth";
import { route } from "@/lib/music/server/http";
import { spotifyClientId } from "@/lib/music/server/spotify";

export const GET = route("spotify.config", async (req) => {
  await requireUser(req);
  return Response.json({ clientId: spotifyClientId() });
});
