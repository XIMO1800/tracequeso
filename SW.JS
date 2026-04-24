// TraceQueso Service Worker v26
const CACHE = 'tracequeso-v26';
const ASSETS = ['/tracequeso/','/tracequeso/index.html'];
self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(cache) { return cache.addAll(ASSETS); }));
  self.skipWaiting();
});
self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener('fetch', function(e) {
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).then(function(response) {
    if (response && response.status === 200) {
      var clone = response.clone();
      caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
    }
    return response;
  }).catch(function() {
    return caches.match(e.request).then(function(cached) {
      return cached || caches.match('/tracequeso/index.html');
    });
  }));
});
