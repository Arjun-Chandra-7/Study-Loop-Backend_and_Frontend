import { readJson, route } from "@/lib/music/server/http";
import { claim, requireWorker } from "@/lib/music/server/workerApi";

export const POST = route("worker.claim", async (req) => {
  requireWorker(req);
  return Response.json(await claim(await readJson(req)));
});
