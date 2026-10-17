// Service Worker for Donchat / GenAce Web Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  try {
    const rawPayload = event.data ? event.data.json() : {};
    const notifData = rawPayload.data || {};
    const isCall = notifData.type === 'call';
    const title = rawPayload.title || (isCall ? '📞 Incoming Call' : 'GenAce');
    const options = {
      body: rawPayload.body || (isCall ? 'Incoming call on GenAce' : 'New message received'),
      icon: rawPayload.icon || '/icon.png',
      badge: '/icon.png',
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
