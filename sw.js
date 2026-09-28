const CACHE_NAME = 'ot-doner-v2';
const BRAND_ICON = 'https://hucevbfupkllculloiom.supabase.co/storage/v1/object/public/app/20260926_1801411.png';
const urlsToCache = [
  './',
  './index.html',
  './admin.html',
  './worker.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Rubik:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push event - server push (заготовки для будущих серверных уведомлений)
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

// Push-подписка протухла — попросить страницу перевыпустить
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      clientList.forEach(client => client.postMessage({ type: 'push-renew' }));
    })
  );
});

// Notification click - открыть/сфокусировать панель сотрудника
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './worker.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('worker.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
