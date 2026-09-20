import api from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const enableWebPushNotifications = async () => {
  if (typeof window === 'undefined') return { success: false, message: 'Browser environment required' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { success: false, message: 'Push notifications are not supported by this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Notification permission was denied. Please allow notifications in browser site settings.' };
    }

    // Guarantee service worker registration is active
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js');
    }
    await navigator.serviceWorker.ready;

    const keyRes = await api.get('/personas/vapid-key');
    if (!keyRes.data?.success || !keyRes.data?.vapidPublicKey) {
      return { success: false, message: 'Could not fetch Web Push keys.' };
    }

    const applicationServerKey = urlBase64ToUint8Array(keyRes.data.vapidPublicKey);

    // Unsubscribe any stale subscription to clear old VAPID keys
    let subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      try {
        await subscription.unsubscribe();
      } catch (e) {
        console.warn('Could not unsubscribe stale push subscription:', e);
      }
    }

    // Subscribe cleanly with active VAPID public key
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    const subString = JSON.stringify(subscription);
    await api.post('/personas/push-token', { subscription, token: subString });

    return { success: true, message: 'Push notifications enabled successfully! You will now receive alerts even when tab is closed.' };
  } catch (err) {
    console.error('Failed to enable Web Push:', err);
    return { success: false, message: err.message || 'Failed to enable push notifications.' };
  }
};

export const disableWebPushNotifications = async () => {
  if (typeof window === 'undefined') return { success: false, message: 'Browser environment required' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, message: 'Push notifications are not supported by this browser.' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.pushManager) {
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await api.delete('/personas/push-token', { data: { endpoint } });
      }
    }
    return { success: true, message: 'Push notifications disabled for this device.' };
  } catch (err) {
    console.error('Failed to disable Web Push:', err);
    return { success: false, message: err.message || 'Failed to disable push notifications.' };
  }
};

export const getWebPushStatus = async () => {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return { supported: false, permission: 'denied', isSubscribed: false };
  }

  try {
    const permission = Notification.permission;
    let isSubscribed = false;
    if (permission === 'granted') {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.pushManager) {
        const sub = await reg.pushManager.getSubscription();
        isSubscribed = !!sub;
      }
    }
    return { supported: true, permission, isSubscribed };
  } catch (err) {
    return { supported: true, permission: Notification.permission || 'default', isSubscribed: false };
  }
};

