const CACHE_NAME = 'trazaqueso-cache-v1';

// Los archivos que el móvil guardará en su memoria interna
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// 1. INSTALACIÓN: Al abrir la app con Wi-Fi, se descarga el HTML y se guarda
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Archivos guardados en caché correctamente');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. INTERCEPTOR: Al intentar cargar la app, miramos si tenemos el archivo guardado
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si no hay internet pero el archivo está en la caché, mostramos la caché
        if (response) {
          return response;
        }
        // Si hay internet, lo descargamos normal desde GitHub
        return fetch(event.request);
      })
  );
});
