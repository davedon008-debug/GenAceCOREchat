// Service Worker for Donchat / GenAce Web Push Notifications & PWA Support
const CACHE_NAME = 'genace-pwa-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      }),
      clients.claim()
    ])
  );
});

// Fetch handler required for PWA installability & offline resiliency
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass API routes, socket.io, and cross-origin calls
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  // Network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          // Cache icons, manifest, and essential static assets
          if (
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.jpg') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.ico') ||
            url.pathname.includes('/manifest.json')
          ) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {});
            });
          }
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return Response.error();
        });
      })
  );
});

self.addEventListener('push', (event) => {
  try {
    const rawPayload = event.data ? event.data.json() : {};
    const notifData = rawPayload.data || {};
    const isCall = notifData.type === 'call';
    const title = rawPayload.title || (isCall ? '📞 Incoming Call' : 'GenAce');
    const options = {
      body: rawPayload.body || (isCall ? 'Incoming call on GenAce' : 'New message received'),
      icon: rawPayload.icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: isCall ? ('call-' + (notifData.callId || Date.now())) : (rawPayload.tag || 'genace-notification'),
      requireInteraction: isCall, // Keep visible on screen for calls
      silent: false,
      vibrate: isCall ? [1000, 500, 1000, 500, 1000, 500, 1000] : [200, 100, 200],
      data: {
        url: rawPayload.url || '/chat',
        type: notifData.type || 'message',
        callId: notifData.callId
      },
      actions: isCall ? [
        { action: 'answer', title: '📞 Answer' },
        { action: 'decline', title: '✕ Decline' }
      ] : []
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Service worker push error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const isCall = notifData.type === 'call';
  const targetUrl = notifData.url || '/chat';

  // If user tapped 'Decline' on an incoming call
  if (event.action === 'decline') {
    if (notifData.callId) {
      // 1. Tell backend to reject the call immediately (notifies caller without reloading app)
      const rejectPromise = fetch('https://genacecorechat.onrender.com/api/calls/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: notifData.callId,
          reason: 'declined'
        })
      }).catch(err => console.warn('[SW] Call reject fetch error:', err));

      // 2. Notify any open client tab to dismiss incoming call modal
      const notifyTabsPromise = clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'GENACE_CALL_DISMISSED',
            callId: notifData.callId
          });
        }
      });

      event.waitUntil(Promise.all([rejectPromise, notifyTabsPromise]));
    }
    return;
  }

  // Answer action or clicking anywhere on the notification
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Search for any existing open app tab
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'GENACE_NOTIFICATION_CLICK',
            action: event.action || 'open',
            callId: notifData.callId
          });
          return client.focus();
        }
      }

      // If no tab is open at all, open a new window pointing to the target URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
