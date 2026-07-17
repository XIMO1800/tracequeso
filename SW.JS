// Service Worker para TraceQueso
// Versión: cambiar CACHE en cada nueva versión del HTML
const CACHE = 'tracequeso-v124';
const ASSETS = ['/tracequeso/', '/tracequeso/index.html'];

// Tiempo máximo (ms) que esperamos a la red para el HTML antes de servir la
// copia guardada. Evita que con señal intermitente (secadero, nave) la app se
// quede en blanco esperando eternamente a GitHub. 4s es un buen equilibrio.
const NET_TIMEOUT = 4000;

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

// ACTIVACIÓN: borrar cachés viejos
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

// Descarga con límite de tiempo. Si la red no responde en NET_TIMEOUT ms,
// rechaza la promesa para que caigamos al caché en vez de colgarnos en blanco.
function fetchConTimeout(request) {
  return new Promise(function(resolve, reject) {
    var listo = false;
    var timer = setTimeout(function() {
      if (!listo) { listo = true; reject(new Error('timeout')); }
    }, NET_TIMEOUT);
    fetch(request).then(function(resp) {
      if (listo) return;      // ya habíamos hecho timeout: ignorar
      listo = true;
      clearTimeout(timer);
      resolve(resp);
    }).catch(function(err) {
      if (listo) return;
      listo = true;
      clearTimeout(timer);
      reject(err);
    });
  });
}

// FETCH: network-first CON TIMEOUT para el HTML; cache-first para el resto.
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Para el HTML: intentar red (máx NET_TIMEOUT), si no, servir del caché.
  if (url.indexOf('/tracequeso/index.html') >= 0 || url.endsWith('/tracequeso/') || url.endsWith('/tracequeso')) {
    e.respondWith(
      fetchConTimeout(e.request).then(function(resp) {
        // Guardar copia en caché para uso offline
        var copy = resp.clone();
        caches.open(CACHE).then(function(cache) {
          cache.put(e.request, copy).catch(function(){});
        });
        return resp;
      }).catch(function() {
        // Sin red o red demasiado lenta: servir la copia guardada.
        // Si por lo que sea no hay copia exacta, probar la raíz de la app.
        return caches.match(e.request).then(function(r) {
          return r || caches.match('/tracequeso/index.html') || caches.match('/tracequeso/');
        });
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
