const CACHE = 'dumpguard-v7';
const SHELL = [
  '/', '/index.html', '/styles.css', '/app.js', '/manifest.json', '/es.json', '/icon.png', '/lib/tf.min.js',
  '/lib/model.json', '/lib/model.bin',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res?.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => hit || cache.match('/index.html'));
    return hit || net;
  })());
});
