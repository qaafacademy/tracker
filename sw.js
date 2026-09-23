/* Qaaf Tracker service worker: lets the app open quickly and install on phones.
 * Only the app's own files are cached. Data always comes live from the server. */
var CACHE = 'qaaf-tracker-1.3.0';
var FILES = ['./', 'index.html', 'app.css?v=1.3.0', 'config.js?v=1.3.0', 'app-core.js?v=1.3.0', 'app-views.js?v=1.3.0',
  'app-pages.js?v=1.3.0', 'app-actions.js?v=1.3.0', 'manifest.webmanifest', 'assets/logo-color.png', 'assets/logo-white.png',
  'assets/qmark-color.png', 'assets/icon-192.png', 'assets/favicon-32.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;   // API calls go straight to the network
  e.respondWith(fetch(e.request).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return res;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: false }).then(function (r) { return r || caches.match('index.html'); }); }));
});
