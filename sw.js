// Estrategia RED PRIMERO: siempre intenta traer la version mas nueva y usa
// el cache solo como respaldo sin conexion. (La version anterior era "cache
// primero", que congelaba el index.html para siempre y las actualizaciones
// nunca llegaban a los telefonos.)
const CACHE_NAME = 'quintay-admin-v2';

self.addEventListener('install', e => {
  self.skipWaiting(); // activa esta version sin esperar a que cierren la app
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(['./'])));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      // Guarda copia fresca de los recursos propios para el modo offline.
      if (res && res.ok && e.request.url.startsWith(self.location.origin)) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
