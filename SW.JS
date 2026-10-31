// Service Worker para TraceQueso
// Versión: v422
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ EL NOMBRE DE LA CACHÉ YA NO LLEVA VERSIÓN  (v325)
// ───────────────────────────────────────────────────────────────────────────
// Antes era 'tracequeso-vNNN', un nombre distinto en cada versión. Eso abría un
// agujero por el que la app se quedaba SIN NINGUNA COPIA guardada:
//
//   1. Se sube una versión → la caché pasa a llamarse de otra forma.
//   2. install intenta descargar el HTML. Sin cobertura falla, y el error se
//      ignoraba en silencio (.catch vacío): caché nueva VACÍA.
//   3. activate borraba "las cachés viejas", entre ellas la ÚNICA que tenía la
//      copia buena.
//   4. La tablet se quedaba sin copia: necesita red obligatoriamente y, sin
//      cobertura, sale el "¡Vaya! Se ha producido un error".
//
// Es exactamente lo que pasaba en la sala de envasar: cobertura mala, la pestaña
// se recarga, no hay copia, y se pierde el registro a medias. Y empeoraba cada
// vez que subíamos una versión.
//
// Con nombre FIJO la copia guardada no se tira nunca. El HTML nuevo se escribe
// encima cuando se puede descargar; si no se puede, se sigue sirviendo el
// anterior. Nunca hay un momento sin app.
// ═══════════════════════════════════════════════════════════════════════════
const CACHE = 'tracequeso-app';   // FIJO. No poner la versión aquí nunca más.
// ═══════════════════════════════════════════════════════════════════════════
// ESTA LÍNEA HAY QUE SUBIRLA CADA VEZ QUE SE SUBE UN index.html NUEVO  (v417)
// ───────────────────────────────────────────────────────────────────────────
// Dice "solo informativo" y es mentira a medias: el navegador solo se entera de
// que hay versión nueva si el ARCHIVO SW.JS cambia de contenido. Si no cambia,
// no salta 'updatefound', no sale la barra de "Hay una versión nueva" y el
// operario no tiene manera de saberlo. El index nuevo se guarda en la copia por
// detrás y solo aparece la próxima vez que se ABRE la app de cero... que en un
// móvil en modo kiosco puede no pasar en días.
//
// Pasó con la v417 (25/09): el index estaba subido y los móviles seguían en la
// v416 sin enterarse, porque el SW.JS no se había tocado.
//
// Así que: index nuevo → subir TAMBIÉN este archivo con la versión cambiada.
// ═══════════════════════════════════════════════════════════════════════════
const VERSION = 'v495';
const ASSETS = ['/tracequeso/', '/tracequeso/index.html'];

// INSTALACIÓN: cachear archivos esenciales
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS).catch(function(){});
    })
    // (v347) YA NO SE LLAMA A skipWaiting() AQUÍ.
    //
    // Antes, al subir una versión, el service worker nuevo tomaba el mando al
    // instante mientras el operario seguía con la pantalla vieja cargada. Código
    // viejo y service worker nuevo conviviendo. En móviles anclados en modo
    // kiosco eso deja la app pillada y hay que meter el código de desanclaje,
    // cerrar y volver a abrir: cinco minutos y una llamada a Joaquín.
    //
    // Ahora el nuevo se queda ESPERANDO. La app avisa con un botón y es el
    // operario quien decide cuándo recargar, al terminar lo que esté haciendo.
    // En la primera instalación no hay ninguno anterior, así que activa directo
    // y esto no le afecta.
  );
});

// (v347) La app pide el relevo cuando el operario pulsa "Actualizar ahora".
self.addEventListener('message', function(e) {
  if (e.data === 'RELEVO') self.skipWaiting();
});

// ═══════════════════════════════════════════════════════════════════════════
// (v466) ENVÍO EN SEGUNDO PLANO DE LA LIBRETA (con la app cerrada)
// ───────────────────────────────────────────────────────────────────────────
// La app deja en IndexedDB ('tq_envio' → 'kv' → 'libreta') una copia de lo que
// tiene sin enviar y pide un envío en segundo plano ('sync-libreta'). Android
// lanza este evento cuando hay red, aunque la app esté cerrada.
//  - Si la app está abierta y a la vista, se le avisa y envía ella (como siempre).
//  - Si no, envía el service worker, uno a uno y comprobando la respuesta igual
//    que la app. Lo enviado se apunta en 'enviadosSW' para que la app lo quite
//    de su libreta al abrirse. Si algo falla, se lanza error y el sistema vuelve
//    a intentarlo más tarde él solo.
// La hoja no duplica: un registro con un ID que ya está responde "duplicado".
// ═══════════════════════════════════════════════════════════════════════════
function _swIdb(){
  return new Promise(function(res, rej){
    var rq = indexedDB.open('tq_envio', 1);
    rq.onupgradeneeded = function(){ try{ rq.result.createObjectStore('kv'); }catch(e){} };
    rq.onsuccess = function(){ res(rq.result); };
    rq.onerror = function(){ rej(rq.error); };
  });
}
function _swGet(db, k){
  return new Promise(function(res, rej){
    var r = db.transaction('kv','readonly').objectStore('kv').get(k);
    r.onsuccess = function(){ res(r.result); }; r.onerror = function(){ rej(r.error); };
  });
}
function _swPut(db, k, v){
  return new Promise(function(res, rej){
    var t = db.transaction('kv','readwrite'); t.objectStore('kv').put(v, k);
    t.oncomplete = function(){ res(); }; t.onerror = function(){ rej(t.error); };
  });
}
function _swEnviarLibreta(){
  return self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(cs){
    var visible = cs.filter(function(c){ return c.visibilityState === 'visible'; });
    if (visible.length) {
      visible.forEach(function(c){ try{ c.postMessage({tipo:'sincronizar-libreta'}); }catch(e){} });
      return;
    }
    return _swIdb().then(function(db){
      return _swGet(db, 'libreta').then(function(copia){
        var regs = (copia && Array.isArray(copia.regs)) ? copia.regs : [];
        var api = copia && copia.api;
        if (!regs.length || !api) return;
        var i = 0;
        function siguiente(){
          if (i >= regs.length) return Promise.resolve();
          var reg = regs[i];
          return fetch(api, {method:'POST', body: JSON.stringify(reg)})
            .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
            .then(function(txt){
              var j = JSON.parse(txt);
              if (!j || j.ok !== true) throw new Error('sin confirmar');
              // Apuntar como enviado y quitar de la copia, antes de seguir
              return _swGet(db, 'enviadosSW').then(function(env){
                env = Array.isArray(env) ? env : [];
                if (reg && reg.ID && env.indexOf(reg.ID) < 0) env.push(reg.ID);
                return _swPut(db, 'enviadosSW', env);
              }).then(function(){
                return _swGet(db, 'libreta').then(function(c2){
                  if (c2 && Array.isArray(c2.regs)) {
                    c2.regs = c2.regs.filter(function(x){ return !(x && reg && x.ID === reg.ID); });
                    return _swPut(db, 'libreta', c2);
                  }
                });
              });
            })
            .then(function(){ i++; return siguiente(); });
        }
        return siguiente();
      });
    });
  });
}
self.addEventListener('sync', function(e) {
  if (e.tag === 'sync-libreta') e.waitUntil(_swEnviarLibreta());
});

// ACTIVACIÓN: borrar cachés viejos
self.addEventListener('activate', function(e) {
  e.waitUntil(
    // Se limpian las cachés de nombre antiguo ('tracequeso-vNNN'), pero SOLO
    // después de comprobar que la caché fija tiene de verdad el HTML dentro.
    // Si no lo tiene, no se borra nada: antes ocupar sitio que dejar la app
    // muerta en un secadero sin cobertura.
    caches.open(CACHE).then(function(cache) {
      return cache.match('/tracequeso/index.html').then(function(hayCopia) {
        if (!hayCopia) return;
        return caches.keys().then(function(keys) {
          return Promise.all(
            keys.filter(function(k){ return k !== CACHE; })
                .map(function(k){ return caches.delete(k); })
          );
        });
      });
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
          // Solo se guarda si la respuesta es BUENA. Un error de GitHub o una
          // respuesta a medias no deben machacar la copia que ya funciona.
          if (resp && resp.ok && resp.status === 200) {
            // (v351) COMPROBAR QUE EL ARCHIVO ESTÁ ENTERO ANTES DE GUARDARLO.
            //
            // EL FALLO QUE ARREGLA: un móvil apareció en blanco con la v350 ya
            // instalada, sin llegar a mostrar siquiera el aviso de rescate. Eso
            // solo encaja si lo guardado estaba cortado: con mala cobertura la
            // descarga se interrumpe, pero la respuesta sigue siendo un 200 y
            // se daba por buena. Luego el móvil arranca desde esa copia rota y
            // no hay manera de salir sin borrar los datos a mano.
            //
            // Un HTML completo termina en </html>. Si no está, no se guarda: es
            // preferible seguir con la copia anterior, que al menos funciona.
            var copy = resp.clone();
            copy.text().then(function(txt){
              if (txt && txt.indexOf('</html>') >= 0) {
                caches.open(CACHE).then(function(cache) {
                  cache.put(e.request, new Response(txt, {
                    status: 200,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                  })).catch(function(){});
                });
              }
            }).catch(function(){});
          }
          return resp;
        }).catch(function() { return null; });

        // Si hay copia guardada, se sirve YA. La app abre al instante,
        // haya cobertura, no la haya, o esté a medias.
        if (cacheado) {
          e.waitUntil(actualizar);
          return cacheado;
        }

        // Primera instalación en este aparato: no hay copia, toca esperar.
        return actualizar.then(function(resp) {
          if (resp && resp.ok) return resp;
          // Último intento antes de rendirse: mirar si quedó copia en cualquier
          // otra caché. Mejor servir algo viejo que no servir nada.
          return caches.match('/tracequeso/index.html').then(function(alt) {
          return alt || new Response(
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
