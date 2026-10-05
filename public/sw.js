const VERSION = "v1";
const STATIC = `sl-static-${VERSION}`;
const PAGES = `sl-pages-${VERSION}`;
const KEEP = new Set([STATIC, PAGES]);

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>StudyLoop — offline</title>
<style>html,body{height:100%;margin:0}body{display:grid;place-items:center;background:#0c0b08;color:#f4f1ea;
font:500 16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:24px}
.c{max-width:22rem}h1{font-size:1.25rem;margin:0 0 .5rem}p{opacity:.75;margin:0}
button{margin-top:1.25rem;padding:.6rem 1.1rem;border-radius:999px;border:0;background:#f4f1ea;color:#0c0b08;font:inherit;font-weight:600}</style>
</head><body><div class="c"><h1>You're offline</h1>
<p>StudyLoop needs a connection to load. Your saved sessions are still on your device.</p>
<button onclick="location.reload()">Try again</button></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((n) => (KEEP.has(n) ? null : caches.delete(n))));
      await self.clients.claim();
    })(),
  );
});

const isStatic = (url) => url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (isStatic(url)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const cache = await caches.open(PAGES);
            cache.put(request, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(PAGES);
          return (await cache.match(request)) || (await cache.match("/")) || new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }
      })(),
    );
    return;
  }

});
