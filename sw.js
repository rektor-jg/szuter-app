// Service worker Szuter Rally: gra działa offline po pierwszym uruchomieniu.
const VERSION = 'szuter-938945e72a';
const FILES = ["./", "./LICENSES.txt", "./apple-touch-icon.png", "./assets/orkan/license.txt", "./assets/orkan/lite.glb", "./assets/orkan/scene.bin", "./assets/orkan/scene.gltf", "./assets/orkan/textures/MAT_Alpha_01_baseColor.png", "./assets/orkan/textures/MAT_Details_EXT_baseColor.png", "./assets/orkan/textures/MAT_Details_EXT_normal.png", "./assets/orkan/textures/MAT_Details_Grid_02_baseColor.png", "./assets/orkan/textures/MAT_Details_Grid_02_normal.png", "./assets/orkan/textures/MAT_Details_Grid_04_baseColor.png", "./assets/orkan/textures/MAT_Details_Grid_04_normal.png", "./assets/orkan/textures/MAT_Details_INT_baseColor.png", "./assets/orkan/textures/MAT_Details_INT_normal.png", "./assets/orkan/textures/MAT_Details_MAT_baseColor.png", "./assets/orkan/textures/MAT_Glass_baseColor.png", "./assets/orkan/textures/MAT_Glass_transmission.png", "./assets/orkan/textures/MAT_Lights_baseColor.png", "./assets/orkan/textures/MAT_Lights_metallicRoughness.png", "./assets/orkan/textures/phong1_baseColor.png", "./fonts/IBMPlexMono-500-latin.woff2", "./fonts/IBMPlexMono-600-latin.woff2", "./fonts/MartianMono-normal-latin-ext.woff2", "./fonts/MartianMono-normal-latin.woff2", "./fonts/Saira-italic-latin-ext.woff2", "./fonts/Saira-italic-latin.woff2", "./fonts/Saira-normal-latin-ext.woff2", "./fonts/Saira-normal-latin.woff2", "./fonts/fonts.css", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./index.html", "./manifest.webmanifest", "./vendor/88ec09cb/addons/csm/CSMFrustum.js", "./vendor/88ec09cb/addons/csm/CSMShadowNode.js", "./vendor/88ec09cb/addons/loaders/GLTFLoader.js", "./vendor/88ec09cb/addons/tsl/display/BloomNode.js", "./vendor/88ec09cb/addons/tsl/display/ChromaticAberrationNode.js", "./vendor/88ec09cb/addons/tsl/display/FSR1Node.js", "./vendor/88ec09cb/addons/tsl/display/FXAANode.js", "./vendor/88ec09cb/addons/tsl/display/FilmNode.js", "./vendor/88ec09cb/addons/tsl/display/MotionBlur.js", "./vendor/88ec09cb/addons/tsl/display/SSAONode.js", "./vendor/88ec09cb/addons/tsl/display/depthAwareBlur.js", "./vendor/88ec09cb/addons/tsl/display/radialBlur.js", "./vendor/88ec09cb/addons/utils/BufferGeometryUtils.js", "./vendor/88ec09cb/addons/utils/SkeletonUtils.js", "./vendor/88ec09cb/three.core.js", "./vendor/88ec09cb/three.tsl.min.js", "./vendor/88ec09cb/three.webgpu.min.js"];
const NET_WAIT = 3000; // tyle czekamy na sieć przy starcie gry, potem gra z pamięci
const SCOPE = new URL(self.registration.scope).pathname;

self.addEventListener('install', (e) => {
  // cache: 'reload' — z pominięciem pamięci HTTP przeglądarki, żeby nowa wersja nie dostała starych plików
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  // sprzątamy tylko własne stare wersje (i dawny szuter-fonts z Google) — na rektor-jg.github.io pamięć dzielą też inne strony
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('szuter-') && k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// strona gry: sieć (świeża wersja), ale najwyżej NET_WAIT — przy słabym zasięgu gra z pamięci,
// a świeża wersja i tak dociera do pamięci w tle. Zapisujemy tylko poprawne odpowiedzi (r.ok).
function game(e) {
  const net = fetch(e.request).then((r) => [r, r.ok ? r.clone() : null]);
  e.waitUntil(net.then(([, copy]) => copy && caches.open(VERSION).then((c) => c.put('./', copy))).catch(() => {}));
  const fromNet = net.then(([r]) => r);
  return caches.open(VERSION).then((c) => c.match('./')).then((hit) => {
    if (!hit) return fromNet; // pierwsze uruchomienie: tylko sieć
    const late = new Promise((res) => setTimeout(() => res(hit), NET_WAIT));
    return Promise.race([fromNet.then((r) => (r.ok ? r : hit), () => hit), late]);
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // fonty są lokalne (fonts/), poza własnym adresem gra nic nie pobiera
  if (req.mode === 'navigate') {
    // tylko gra ('./' lub index.html); inne strony (privacy.html, 404) idą zwykłą siecią i nie nadpisują gry w pamięci
    if (url.pathname === SCOPE || url.pathname === SCOPE + 'index.html') e.respondWith(game(e));
    return;
  }
  // pliki: z pamięci tej wersji (three.js w katalogu z hashem, więc nowa strona nie dostanie starego)
  e.respondWith(caches.open(VERSION).then((c) => c.match(req)).then((hit) => hit || fetch(req)));
});
