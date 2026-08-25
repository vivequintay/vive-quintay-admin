// Service worker — RED PRIMERO.
// Siempre intenta traer la version mas nueva y usa el cache solo como respaldo sin
// conexion. (Una version antigua era "cache primero", que congelaba el index.html para
// siempre y las actualizaciones nunca llegaban a los telefonos.)
//
// SIN EL CACHE DEL NAVEGADOR PARA LO PROPIO. Aunque este SW pida por red, `fetch` respeta
// por defecto el cache HTTP del navegador — y GitHub Pages sirve los archivos con varios
// minutos de vida. Eso produjo un sintoma feo y dificil de leer: llegaba el index.html
// nuevo pero el js/app.js viejo, asi que aparecia un boton nuevo que al tocarlo no hacia
// nada, porque su funcion todavia no existia. Mezclar dos versiones es peor que quedarse
// en la vieja: al menos la vieja es coherente consigo misma.
//
// `cache: 'no-cache'` no significa "sin cache": significa preguntar SIEMPRE al servidor si
// cambio. Si no cambio, responde 304 y no baja nada. Cuesta un viaje minimo y garantiza
// que los archivos de la app viajen juntos.
const CACHE_NAME = 'quintay-admin-v3';

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
  const propio = e.request.url.startsWith(self.location.origin);
  // Para lo nuestro, revalidar siempre. Para lo de afuera (CDN, fuentes), la peticion
  // tal cual: esos si conviene que el navegador los guarde.
  const pedido = propio
    ? new Request(e.request.url, { cache: 'no-cache', credentials: 'same-origin' })
    : e.request;

  e.respondWith(
    fetch(pedido).then(res => {
      // Guarda copia fresca de los recursos propios para el modo offline.
      if (res && res.ok && propio) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
