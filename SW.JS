// Service Worker para TraceQueso
// Versión: v322 - cambiar este número en cada nueva versión del HTML
const CACHE = 'tracequeso-v322';
const ASSETS = ['/tracequeso/', '/tracequeso/index.html'];

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

// FETCH
// ─────────────────────────────────────────────────────────────────────────
// (v270) LA APP ARRANCA SIEMPRE DESDE EL MÓVIL. NUNCA ESPERA A LA RED.
//
// Antes esto era "red primero": para abrir la app se pedía el HTML a internet
// y solo se usaba la copia del móvil si la petición FALLABA. El problema es que
// con cobertura a medias —una raya, conexión abierta pero sin datos— la petición
// no falla: se queda colgada minutos. Y hasta que no falla, no se sirve la copia.
// Resultado: pantalla casi en blanco, app que no arranca, y con el móvil anclado
// el operario no puede ni cerrarla. Había que desanclar el móvil a mano.
//
// Ahora se sirve SIEMPRE la copia guardada, al instante, y la comprobación de si
// hay versión nueva se hace por detrás sin que nadie espere. Si hay una versión
// nueva, se guarda y entra la próxima vez que abran la app.
//
// El único caso en que se espera a la red es cuando NO hay copia guardada
// todavía: la primera vez que se instala la app en ese móvil. Y ahí, con
// un límite de 8 segundos para no quedarse colgado eternamente.
// ─────────────────────────────────────────────────────────────────────────

// fetch con límite de tiempo: si tarda más de la cuenta, se da por perdido.
function fetchConLimite(request, ms) {
  return new Promise(function(resolve, reject) {
    var listo = false;
    var t = setTimeout(function() {
      if (!listo) { listo = true; reject(new Error('timeout')); }
    }, ms);
    fetch(request).then(function(resp) {
      if (listo) return;
      listo = true; clearTimeout(t); resolve(resp);
    }).catch(function(err) {
      if (listo) return;
      listo = true; clearTimeout(t); reject(err);
    });
  });
}

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Solo se cachea GET. Un POST (guardar un registro) va siempre a la red.
  if (e.request.method !== 'GET') return;

  var esHTML = url.indexOf('/tracequeso/index.html') >= 0 ||
               url.endsWith('/tracequeso/') || url.endsWith('/tracequeso');

  if (esHTML) {
    e.respondWith(
      caches.match(e.request).then(function(cacheado) {
        // Comprobar si hay versión nueva POR DETRÁS. Nadie espera a esto.
        var actualizar = fetchConLimite(e.request, 8000).then(function(resp) {
          if (resp && resp.ok) {
            var copy = resp.clone();
            caches.open(CACHE).then(function(cache) {
              cache.put(e.request, copy).catch(function(){});
            });
          }
          return resp;
        }).catch(function() { return null; });

        // Si hay copia guardada, se sirve YA. La app abre al instante,
        // haya cobertura, no la haya, o esté a medias.
        if (cacheado) {
          e.waitUntil(actualizar);
          return cacheado;
        }

        // Primera instalación en este móvil: no hay copia, toca esperar.
        return actualizar.then(function(resp) {
          return resp || new Response(
            '<!doctype html><html lang="es"><meta charset="utf-8">' +
            '<meta name="viewport" content="width=device-width,initial-scale=1">' +
            '<body style="font-family:sans-serif;text-align:center;padding:40px 24px;background:#f5f1e8;color:#3a2f28">' +
            '<div style="font-size:2.5rem">&#128225;</div>' +
            '<h2 style="font-weight:800">Sin conexi&oacute;n</h2>' +
            '<p>La aplicaci&oacute;n todav&iacute;a no est&aacute; guardada en este m&oacute;vil y hace falta cobertura para instalarla.</p>' +
            '<p style="font-size:0.85rem;color:#7a6a5c">Ve a una zona con cobertura y vuelve a abrirla.</p>' +
            '<button onclick="location.reload()" style="margin-top:16px;padding:12px 22px;background:#8b2a2a;color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:700">Reintentar</button>' +
            '</body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
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
