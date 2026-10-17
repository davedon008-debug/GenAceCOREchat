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
      vibrate: isCall ? [400, 200, 400, 200, 600] : [200, 100, 200],
      data: {
        url: rawPayload.url || (isCall ? `/chat?callId=${notifData.callId}&action=call` : '/chat'),
        type: notifData.type || 'message',
        callId: notifData.callId,
        callerName: notifData.callerName,
        callerPersonaId: notifData.callerPersonaId,
        callerPersona: notifData.callerPersona,
        roomId: notifData.roomId,
        isVideo: notifData.isVideo
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
      const rejectPromise = fetch('/api/calls/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: notifData.callId,
          reason: 'declined',
          responderPersonaId: notifData.callerPersonaId
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
          // CRITICAL FIX: Do NOT call client.navigate(targetUrl)!
          // Navigating an existing client forces a hard reload, destroying React state and disconnecting the socket.
          // Instead, simply postMessage with the call info and focus the tab!
          client.postMessage({
            type: 'GENACE_NOTIFICATION_CLICK',
            action: event.action || 'open',
            data: notifData
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
