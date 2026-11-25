// Programın internetsiz açılması için dosyaları cihazda saklar.
// Dosyalar güncellenince SURUM değiştirilir; yeni sürüm bir sonraki açılışta gelir.
const SURUM = "musteritakip-v1";
const DOSYALAR = ["./", "index.html", "app.js", "logic.js", "medula.js", "manifest.webmanifest",
  "icon-192.png", "icon-512.png", "apple-touch-icon.png", "vendor/xlsx.full.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SURUM).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => /^musteritakip-v\d+$/.test(k) && k !== SURUM).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Önce internetten güncelini dener; internet yoksa cihazdaki kopyayı açar.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request.url, { cache: "no-cache" }).then(r => {
      if (r.ok) { const k = r.clone(); caches.open(SURUM).then(c => c.put(e.request.url.split("#")[0], k)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html")))
  );
});
