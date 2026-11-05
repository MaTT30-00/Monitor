// Monitor – funzionamento anche senza rete.
// Quando pubblichi una nuova versione dell'app, cambia il numero qui sotto (v1 -> v2).
const CACHE = 'monitor-v1';
const FONTS = 'monitor-fonts';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('monitor-') && k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // La pagina: prima la rete (così gli aggiornamenti arrivano subito), se manca la rete la copia salvata.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return r; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Caratteri di Google: salvati la prima volta e poi riusati anche offline.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONTS).then(c =>
        c.match(req).then(hit => {
          const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // Gli altri file dell'app (icone, manifest): dalla copia salvata.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
