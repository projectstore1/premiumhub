// Premiumhub Service Worker
const CACHE_NAME = 'premiumhub-v2';

self.addEventListener('install', (event) => {
  const BASE = new URL('./', self.location).href;
  const STATIC_ASSETS = [
    new URL('index.html', BASE).href,
    new URL('search.html', BASE).href,
    new URL('settings.html', BASE).href,
    new URL('offline.html', BASE).href,
    new URL('css/style.css', BASE).href,
    new URL('css/install.css', BASE).href,
    new URL('js/firebase-config.js', BASE).href,
    new URL('js/install.js', BASE).href,
    new URL('assets/icons/premiumhub-192.png', BASE).href,
    new URL('assets/icons/premiumhub-512.png', BASE).href
  ];

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => console.warn('[PWA] Cache skip:', asset, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && !key.startsWith('phadmin-'))
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept admin pages from main service worker
  if (url.pathname.includes('/admin')) {
    return;
  }

  // Never cache Firestore API, Auth requests, Telegram, or checkout post requests
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.pathname.includes('/api/')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== 'basic'
        ) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          const BASE = new URL('./', self.location).href;
          return caches.match(new URL('offline.html', BASE).href);
        }
      });
    })
  );
});
