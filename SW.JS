// Service Worker UNIFICADO para TraceQueso + Partes de Fabricación
// Versión: v127 - cambiar este número (y la cadena CACHE) en cada despliegue
// Sustituye al antiguo partes-sw.js: ahora un solo SW cachea las dos apps.
const CACHE = 'tracequeso-v138';
const ASSETS = [
  '/tracequeso/',
  '/tracequeso/index.html',
  '/tracequeso/partes-fabricacion.html'
];

// INSTALACIÓN: cachear archivos esenciales
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS).catch(function(){});
    }).then(function() {
      // Activar nueva versión inmediatamente sin esperar
      return self.skipWaiting();
    })
  );
});

// ACTIVACIÓN: borrar cachés viejos (incluye los antiguos 'partes-v2-6-xx')
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// FETCH: network-first para los HTML (siempre la versión más reciente),
// cache-first para el resto.
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  var esHTML = (
    url.indexOf('/tracequeso/index.html') >= 0 ||
    url.indexOf('/tracequeso/partes-fabricacion.html') >= 0 ||
    url.endsWith('/tracequeso/') ||
    url.endsWith('/tracequeso')
  );

  if (esHTML) {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        // Guardar copia en caché para uso offline
        var copy = resp.clone();
        caches.open(CACHE).then(function(cache) {
          cache.put(e.request, copy).catch(function(){});
        });
        return resp;
      }).catch(function() {
        // Sin red, servir del caché
        return caches.match(e.request);
      })
    );
    return;
  }

  // Para el resto, cache-first
  e.respondWith(
    caches.match(e.request).then(function(r) {
      return r || fetch(e.request);
    })
  );
});
