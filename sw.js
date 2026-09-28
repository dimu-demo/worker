const CACHE_NAME = 'ot-doner-v3';
const BRAND_ICON = 'https://hucevbfupkllculloiom.supabase.co/storage/v1/object/public/app/20260926_1801411.png';
const sameOriginToCache = ['./worker.html', './manifest.json'];

// Install: cache only what is guaranteed same-origin, never block activation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        sameOriginToCache.map(url => cache.add(url).catch(() => {}))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      )),
      clients.claim()
    ])
  );
});

// Fetch: network-first for pages (so deploys are seen), cache fallback offline
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (e) { return; }

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./worker.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => cached))
  );
});

// Push: server-delivered order notifications
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || 'Новый заказ — ОТ ДОНЕР';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: BRAND_ICON,
      badge: BRAND_ICON,
      tag: data.tag || 'otdoner-order',
      vibrate: [200, 100, 200],
      data: { url: './worker.html' }
    })
  );
});

// Subscription expired: ask the page to re-subscribe
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      clientList.forEach(client => client.postMessage({ type: 'push-renew' }));
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './worker.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.indexOf('worker.html') !== -1 && 'focus' in client) return client.focus();
      }
      return clients.openWindow ? clients.openWindow(targetUrl) : null;
    })
  );
});
