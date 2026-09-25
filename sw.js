// Service worker Szuter Rally: gra działa offline po pierwszym uruchomieniu.
const VERSION = 'szuter-a2c844e31d';
const FILES = ["./", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./index.html", "./manifest.webmanifest", "./vendor/LICENSES.txt", "./vendor/addons/csm/CSMFrustum.js", "./vendor/addons/csm/CSMShadowNode.js", "./vendor/addons/tsl/display/BloomNode.js", "./vendor/addons/tsl/display/ChromaticAberrationNode.js", "./vendor/addons/tsl/display/FilmNode.js", "./vendor/addons/tsl/display/MotionBlur.js", "./vendor/addons/tsl/display/SSAONode.js", "./vendor/addons/tsl/display/depthAwareBlur.js", "./vendor/fonts/MartianMono-normal-latin-ext.woff2", "./vendor/fonts/MartianMono-normal-latin.woff2", "./vendor/fonts/Saira-italic-latin-ext.woff2", "./vendor/fonts/Saira-italic-latin.woff2", "./vendor/fonts/Saira-normal-latin-ext.woff2", "./vendor/fonts/Saira-normal-latin.woff2", "./vendor/fonts/fonts.css", "./vendor/three.core.js", "./vendor/three.tsl.min.js", "./vendor/three.webgpu.min.js"];
const FONTS = 'szuter-fonts';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // fonty Google: z pamięci, w tle odświeżane
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // strona: najpierw sieć (świeża wersja gry), bez sieci z pamięci
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put('./', copy)); return r; })
      .catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
