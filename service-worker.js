/* ══════════════════════════════════════════════════
   SERVICE WORKER — RISE ICT Monitor
   Offline-first: cache-first for app shell, network-
   only for Google Apps Script sync calls.
══════════════════════════════════════════════════ */

const CACHE_NAME = 'rise-ict-v1.2.0';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './js/config.js',
  './js/counselors_data.js',
  './js/store.js',
  './js/utils.js',
  './js/reliability.js',
  './js/sync.js',
  './js/app.js',
  './js/demo.js',
  './js/ui/conselheiros.js',
  './js/ui/registar.js',
  './js/ui/entregas.js',
  './js/ui/ficha.js',
  './js/ui/historico.js',
  './js/ui/exportar.js',
  './js/ui/dashboard.js',
  './js/ui/provincial.js',
];

/* ── Install: pre-cache the app shell ─────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: delete old caches ──────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first for app shell,
         network-only for external URLs ────────── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Let Google Apps Script and CDN requests go straight to network
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Cache-first for everything else (app shell)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Only cache valid same-origin responses
        if (
          response.ok &&
          response.type === 'basic' &&
          event.request.method === 'GET'
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
