const CACHE_NAME = 'wallyatkins-nfl-pwa-v2.1.1';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/maskable-icon-512.png',
  '/apple-touch-icon.png',
  '/nfl-logo-vector.svg',
  '/offline.html',
  '/robots.txt'
];

// Install: pre-cache application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: purge outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: Network-first for navigation, Stale-While-Revalidate for static assets, network-only for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests and http/https schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Bypass cache for dynamic backend PHP proxies and live sockets
  if (
    url.pathname.endsWith('.php') ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/live/')
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const cachedHome = await caches.match('/');
          if (cachedHome) {
            return cachedHome;
          }
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // 2. Static assets (JS, CSS, images, fonts, wasm, swf)
  if (
    url.origin === self.location.origin &&
    (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      request.destination === 'font' ||
      url.pathname.match(/\.(?:js|css|png|jpg|jpeg|gif|svg|webp|woff2?|wasm|swf)$/))
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Stale-while-revalidate for local origin requests
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(request).then((response) => {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
        );
      })
    );
  }
});

// Skip waiting if client prompts update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push: receive Web Push notification from server
self.addEventListener('push', (event) => {
  let showPromise;

  if (event.data) {
    try {
      const data = event.data.json();
      showPromise = self.registration.showNotification(data.title || "Wally's NFL Pick'em", {
        body: data.body || 'New pick reminder or pool alert!',
        icon: data.icon || '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: data.url || '/pickem' },
        vibrate: [100, 50, 100],
        requireInteraction: true
      });
    } catch (e) {
      showPromise = self.registration.showNotification("Wally's NFL Pick'em", {
        body: event.data.text() || 'New pick reminder or pool alert!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: '/pickem' },
        vibrate: [100, 50, 100],
        requireInteraction: true
      });
    }
  } else {
    // If payload is empty (Apple APNs data-less push tickle), fetch latest unread notification from backend
    showPromise = fetch('/football_api.php?action=get_latest_unread_notification')
      .then((res) => res.json())
      .then((notif) => {
        const title = notif?.title || "Wally's NFL Pick'em";
        const body = notif?.message || "Hey Derek! 👋 Commissioner Wally says test push successful! 🏈";
        const link = notif?.link || '/pickem';
        return self.registration.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: { url: link },
          vibrate: [100, 50, 100],
          requireInteraction: true
        });
      })
      .catch(() => {
        return self.registration.showNotification("Wally's NFL Pick'em", {
          body: "Hey Derek! 👋 Commissioner Wally says test push successful! 🏈",
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: { url: '/pickem' },
          vibrate: [100, 50, 100],
          requireInteraction: true
        });
      });
  }

  event.waitUntil(showPromise);
});

// Notification Click: focus or open the window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/pickem';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
