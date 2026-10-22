// public/sw.js
const CACHE_NAME = 'csm-trumpet-v1';

// Instalación limpia
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptación de peticiones
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // EXCLUSIÓN ESTRICTA: No cachear APIs, autenticación ni enlaces firmados externos (R2)
  if (
    url.pathname.startsWith('/api/') || 
    url.pathname.startsWith('/login') || 
    url.pathname.startsWith('/register') ||
    url.hostname.includes('r2.cloudflarestorage.com')
  ) {
    return; // Dejar pasar la petición directamente a la red sin caché
  }

  // Para assets estáticos públicos (CSS, fuentes, iconos)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).then((response) => {
        return response;
      });
    })
  );
});