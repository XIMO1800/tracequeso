// TraceQueso Service Worker v1
const CACHE = 'tracequeso-v1';
const ASSETS = [
  '/tracequeso/',
  '/tracequeso/index.html',
];

// Instalar — cachear assets principales
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activar — limpiar caches antiguas
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fallback a cache
self.addEventListener('fetch', function(e) {
  // Solo interceptar mismo origen
  if (!e.request.url.startsWith(self.location.origin)) return;
  
  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        // Guardar en cache si es ok
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        // Sin red — usar cache
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/tracequeso/index.html');
        });
      })
  );
});
