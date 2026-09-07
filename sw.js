/**
 * NUTRIA — Service worker
 * ==================================================================
 * Strategia volutamente semplice:
 *   · navigazioni  → prima la rete, se non c'è si serve la copia in cache
 *   · risorse      → prima la cache, con aggiornamento in sottofondo
 *
 * Serve a far aprire l'app anche senza connessione. I dati dell'utente non
 * passano di qui: vivono in localStorage e non escono dal dispositivo.
 *
 * Cambiando CACHE_NAME si forza l'aggiornamento su tutti i dispositivi.
 */

const CACHE_NAME = "nutria-v1";
const OFFLINE_URL = "./index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL, "./manifest.webmanifest"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // i font esterni li gestisce il browser

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(OFFLINE_URL, copy));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
