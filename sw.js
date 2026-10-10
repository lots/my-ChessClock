/*!
 * sw.js - offline cache.
 *
 * The clock has to work in a school hall with no usable wifi, so every asset is
 * precached on first load. The cache name is versioned; bump it when you change
 * any file and the old cache is dropped on the next activation.
 */
const CACHE = 'coq-chess-clock-v3';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './vendor/framework7/framework7-bundle.min.css',
  './vendor/framework7/framework7-bundle.min.js',
  './js/i18n.js',
  './js/themes.js',
  './js/platform.js',
  './js/clock.js',
  './js/views.js',
  './js/app.js',
  './icons/icon-48.png',
  './icons/icon-96.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations always resolve to the shell, so a bookmarked deep link still
  // opens the clock offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
