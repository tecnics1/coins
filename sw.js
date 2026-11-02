const SHELL = "coins-shell-v1";
const IMG = "coins-img-v1"; // la mateixa memòria cau que omple la pàgina amb les imatges
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== IMG).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fitxers de l'aplicació: xarxa primer (així s'agafen les actualitzacions) i còpia local si no hi ha connexió
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(r => { if (r.ok) { const cp = r.clone(); caches.open(SHELL).then(c => c.put(req, cp)); } return r; })
        .catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Imatges de Google: primer la còpia guardada, i si no n'hi ha, la xarxa
  if (/(^|\.)googleusercontent\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.open(IMG).then(async c => {
        const hit = await c.match(req.url);
        if (hit) return hit;
        try {
          const r = await fetch(req);
          if (r.ok && r.type !== "opaque") c.put(req.url, r.clone());
          return r;
        } catch (_) { return Response.error(); }
      })
    );
  }
});
