/* WordRun service worker.
   Network-first so a new version reaches the phone as soon as it is online,
   cache fallback so the game still runs in the metro. */
const VERSION = "wordrun-2026-07-28e";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./words.txt",
  "./prepositions.txt",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(err => console.warn("precache", err))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* The page, the word lists and the worker itself must never come from the HTTP
   cache: GitHub Pages serves them with a max-age, which is exactly how a phone
   ends up running last week's build. Assets keep the normal path. */
const ALWAYS_FRESH = /\.(html|txt|json|js|webmanifest)$/;

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;
  const path = new URL(req.url).pathname;
  const bust = req.mode === "navigate" || path.endsWith("/") || ALWAYS_FRESH.test(path);
  const wire = bust ? new Request(req.url, { cache: "no-store", credentials: "same-origin" }) : req;
  e.respondWith(
    fetch(wire)
      .then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(m => m || caches.match("./index.html")))
  );
});
