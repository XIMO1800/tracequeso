// Service Worker para Partes de Fabricación
// Versión: 1.7 - cambiar este número en cada nueva versión del HTML
const CACHE_VERSION = 'partes-v1-7';
const CACHE_FILES = [
  'partes-fabricacion.html'
];

// INSTALACIÓN: cachear archivos esenciales
self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache){
      return cache.addAll(CACHE_FILES).catch(function(){});
    }).then(function(){
      // Activar nueva versión inmediatamente sin esperar
      return self.skipWaiting();
    })
  );
});

// ACTIVACIÓN: borrar cachés viejos
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_VERSION; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// FETCH: estrategia network-first para el HTML (siempre lo más reciente)
// y cache-first para todo lo demás
self.addEventListener('fetch', function(event){
  var req = event.request;
  var url = req.url;

  // Para el HTML siempre intentar red primero (así la versión nueva llega)
  if(url.indexOf('partes-fabricacion.html') >= 0 || url.endsWith('/')){
    event.respondWith(
      fetch(req).then(function(resp){
        // Guardar copia en caché para uso offline
        var copy = resp.clone();
        caches.open(CACHE_VERSION).then(function(cache){
          cache.put(req, copy).catch(function(){});
        });
        return resp;
      }).catch(function(){
        // Si no hay red, servir del caché
        return caches.match(req);
      })
    );
    return;
  }

  // Para el resto (no debería haber mucho), cache-first
  event.respondWith(
    caches.match(req).then(function(resp){
      return resp || fetch(req);
    })
  );
});
