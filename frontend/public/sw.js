// Service Worker for Donchat / GenAce Web Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const isCall = data.data?.type === 'call';
    const title = data.title || (isCall ? '📞 Incoming Call' : 'GenAce');
    const options = {
      body: data.body || (isCall ? 'Incoming call on GenAce' : 'New message received'),
      icon: data.icon || '/icon.png',
      badge: '/icon.png',
      tag: isCall ? ('call-' + (data.data?.callId || Date.now())) : (data.tag || 'genace-notification'),
      requireInteraction: isCall, // Keep visible on screen for calls
      vibrate: isCall ? [400, 200, 400, 200, 600] : [200, 100, 200],
      data: {
        url: data.url || '/chat',
        type: data.data?.type || 'message',
        callId: data.data?.callId
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
  const targetUrl = event.notification.data?.url || '/chat';

  if (event.action === 'decline') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
