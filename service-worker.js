const CACHE_NAME = 'sutimetracker-cache-v3';
const APP_SHELL = [
  '/activity_log_app.html',
  '/manifest.webmanifest',
  '/offline.html',
  '/print.css',
  '/_redirects',
  '/icons/app-icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/app-icon-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

// SWR strategy for same-origin GET, cache-first for app shell
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === location.origin && APP_SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(request).then(c => c || fetch(request)));
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((network) => {
        if (network && network.ok) {
          const copy = network.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return network;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Offline fallback: if navigation fails, return offline page
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
  }
});

