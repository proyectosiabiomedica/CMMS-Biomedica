/* =====================================================================
 * CMMS E.S.T.H.E.R — Service Worker
 * ---------------------------------------------------------------------
 * Su único propósito es hacer la aplicación INSTALABLE y que abra aunque
 * el teléfono se quede sin señal dentro del hospital. NO es una capa de
 * datos: los datos siguen viniendo del Apps Script en cada consulta.
 *
 * Estrategia deliberada: RED PRIMERO.
 *   - Estando en línea siempre se sirve la última versión publicada. Eso
 *     importa aquí porque el flujo de trabajo del proyecto es subir un
 *     index.html nuevo a GitHub Pages: una caché agresiva dejaría a la
 *     gente usando la revisión anterior sin saberlo, que es la falla
 *     clásica de las PWA hechas con "caché primero".
 *   - La copia guardada solo se usa cuando la red falla.
 *
 * Qué NO se cachea nunca:
 *   - Las llamadas al backend (script.google.com): son datos vivos, y
 *     además viajan por JSONP, que ni siquiera pasa por aquí.
 *   - Cualquier petición que no sea GET.
 *
 * Para forzar la limpieza de la caché en todos los equipos, sube el
 * número de VERSION: al activarse, este worker borra las cachés viejas.
 * ===================================================================== */

const VERSION = 'esther-v1';
const CACHE = 'cmms-esther-' + VERSION;

/* Lo mínimo para que la aplicación abra sin red. Se guarda en la
   instalación; si algo falla (por ejemplo un icono que aún no se ha
   subido), la instalación NO se aborta: se guarda lo que sí exista. */
const BASICOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './icon-180.png',
  './favicon.ico'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(BASICOS.map((url) =>
        cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves.filter((c) => c.startsWith('cmms-esther-') && c !== CACHE)
              .map((c) => caches.delete(c))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;

  // Solo lecturas del propio sitio. El backend y los CDN se dejan pasar
  // sin tocar: cachear el Apps Script mostraría inventario viejo.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  evento.respondWith(
    fetch(req)
      .then((resp) => {
        // Solo se guardan respuestas propias y completas
        if (resp && resp.ok && resp.type === 'basic') {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        }
        return resp;
      })
      .catch(() =>
        caches.match(req).then((guardada) =>
          guardada ||
          // Navegación sin red y sin copia exacta: se devuelve la portada
          (req.mode === 'navigate' ? caches.match('./index.html') : undefined)
        )
      )
  );
});
