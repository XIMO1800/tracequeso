// Service Worker para TraceQueso
// Versión: cambiar CACHE en cada nueva versión del HTML
const CACHE = 'tracequeso-v125';

// Recursos que forman el "núcleo" de la app. Se cachean en la instalación para
// que la app arranque SIEMPRE desde el móvil, sin depender de internet.
const ASSETS = [
  '/tracequeso/',
  '/tracequeso/index.html'
];

// Dominios de recursos externos que queremos cachear la primera vez que se
// cargan (fuentes de Google, CDNs del escáner QR). Una vez cacheados, la app
// ya no depende de internet para ellos en los siguientes arranques.
function esRecursoCacheable(url) {
  return url.indexOf('fonts.googleapis.com') >= 0
      || url.indexOf('fonts.gstatic.com')    >= 0
      || url.indexOf('cdn.jsdelivr.net')      >= 0
      || url.indexOf('cdnjs.cloudflare.com')  >= 0
      || url.indexOf('unpkg.com')             >= 0;
}

// INSTALACIÓN: cachear el núcleo de la app
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS).catch(function(){});
    }).then(function() {
      return self.skipWaiting();   // activar la nueva versión de inmediato
    })
  );
});

// ACTIVACIÓN: borrar cachés viejos y tomar control de las pestañas abiertas
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

// ══════════════════════════════════════════════════════════════════════
// ESTRATEGIA: "stale-while-revalidate" para el HTML.
//
// El problema de antes: la app pedia el index.html a internet ANTES de
// arrancar. Con senal mala/intermitente (secadero, nave), esa peticion se
// quedaba a medias y la pantalla se quedaba en blanco esperando.
//
// Ahora: se sirve SIEMPRE y AL INSTANTE la copia guardada en el movil (la app
// arranca sin depender de nada), y EN PARALELO, sin bloquear, se intenta bajar
// la version mas reciente para dejarla lista en el proximo arranque. Si no hay
// red, no pasa nada: la app ya ha arrancado.
// ══════════════════════════════════════════════════════════════════════
function esHTML(url) {
  return url.indexOf('/tracequeso/index.html') >= 0
      || url.endsWith('/tracequeso/')
      || url.endsWith('/tracequeso');
}

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Solo gestionamos peticiones GET (las de datos a Apps Script van por POST y
  // deben ir SIEMPRE a la red, sin tocar cache).
  if (e.request.method !== 'GET') return;

  // -- HTML de la app: stale-while-revalidate --
  if (esHTML(url)) {
    e.respondWith(
      caches.open(CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          // Lanzar la actualizacion en segundo plano (no bloquea la respuesta)
          var red = fetch(e.request).then(function(resp) {
            if (resp && resp.ok) cache.put(e.request, resp.clone()).catch(function(){});
            return resp;
          }).catch(function(){ return null; });

          // Si hay copia guardada -> devolverla YA (arranque instantaneo).
          // Si no la hay (primerisima vez) -> esperar a la red.
          return cached || red || caches.match('/tracequeso/index.html');
        });
      })
    );
    return;
  }

  // -- Fuentes y CDNs: cache-first, y si no esta, se baja y se guarda --
  if (esRecursoCacheable(url)) {
    e.respondWith(
      caches.open(CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(resp) {
            if (resp && (resp.ok || resp.type === 'opaque')) {
              cache.put(e.request, resp.clone()).catch(function(){});
            }
            return resp;
          }).catch(function(){ return cached; });
        });
      })
    );
    return;
  }

  // -- Resto: cache-first con red de reserva --
  e.respondWith(
    caches.match(e.request).then(function(r) {
      return r || fetch(e.request);
    })
  );
});
