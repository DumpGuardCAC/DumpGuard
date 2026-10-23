var CACHE = 'dumpguard-v2';
var SHELL = [
  '/', '/index.html', '/css/styles.css', '/manifest.json', '/images/logo.png',
  '/js/app.js', '/js/dumpguard-api.js', '/js/dumpguard-gov.js', '/js/dumpguard-i18n.js', '/js/dumpguard-map.js',
  '/js/dumpguard-model.js', '/js/dumpguard-report.js', '/js/pwa.js', '/js/vendor/tf.min.js',
  '/model/model.json', '/model/group1-shard1of2.bin', '/model/group1-shard2of2.bin'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.indexOf('/api/') === 0) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) c.put(req, res.clone());
        return res;
      }).catch(function () { return hit || c.match('/index.html'); });
      return hit || net;
    });
  }));
});
