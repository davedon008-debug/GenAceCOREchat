import Persona from '../models/Persona.js';
import PushSubscription from '../models/PushSubscription.js';
import webpush from 'web-push';

import fs from 'fs';
import path from 'path';

// Persist fallback VAPID keys to file if process.env keypair is omitted
let fallbackVapidKeys = null;
const vapidFilePath = path.resolve(process.cwd(), 'config', 'vapid.json');

if (fs.existsSync(vapidFilePath)) {
  try {
    fallbackVapidKeys = JSON.parse(fs.readFileSync(vapidFilePath, 'utf8'));
  } catch (e) {}
}

if (!fallbackVapidKeys || !fallbackVapidKeys.publicKey || !fallbackVapidKeys.privateKey) {
  fallbackVapidKeys = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(vapidFilePath, JSON.stringify(fallbackVapidKeys, null, 2));
  } catch (e) {}
}

const getVapidPublicKeyInternal = () => process.env.VAPID_PUBLIC_KEY || fallbackVapidKeys.publicKey;
const getVapidPrivateKeyInternal = () => process.env.VAPID_PRIVATE_KEY || fallbackVapidKeys.privateKey;
const getVapidSubjectInternal = () => process.env.VAPID_SUBJECT || 'mailto:support@genace.app';

try {
  webpush.setVapidDetails(
    getVapidSubjectInternal(),
    getVapidPublicKeyInternal(),
    getVapidPrivateKeyInternal()
  );
} catch (e) {
  console.warn('[Push] VAPID setup warning:', e.message);
}

export const getVapidPublicKey = () => getVapidPublicKeyInternal();

export const sendPushNotifications = async (recipientPersonaIds = [], title, body, data = {}) => {
  if (!recipientPersonaIds || !recipientPersonaIds.length) return;

  try {
    const validIds = recipientPersonaIds.map(id => String(id)).filter(Boolean);

    // Filter out personas in DND status
    const activePersonas = await Persona.find({ 
      _id: { $in: validIds },
      status: { $ne: 'dnd' }
    }).select('_id pushTokens');

    const activePersonaIds = activePersonas.map(p => p._id);
    if (!activePersonaIds.length) return;

    // 1. Fetch Web Push Subscriptions from PushSubscription MongoDB collection
    const mongoSubscriptions = await PushSubscription.find({
      personaId: { $in: activePersonaIds }
    });

    // 2. Fetch legacy & Expo push tokens stored on Persona documents
    const expoTokens = [];
    const legacyWebSubscriptions = [];

    activePersonas.forEach(p => {
      (p.pushTokens || []).forEach(tokenStr => {
        if (!tokenStr) return;
        if (tokenStr.startsWith('ExponentPushToken[') || tokenStr.startsWith('ExpoPushToken[')) {
          expoTokens.push(tokenStr);
        } else if (tokenStr.startsWith('{') && tokenStr.includes('endpoint')) {
          try {
            const parsed = JSON.parse(tokenStr);
            if (parsed.endpoint) legacyWebSubscriptions.push(parsed);
          } catch {}
        }
      });
    });

    // Merge Web Push subscriptions by unique endpoint
    const subscriptionMap = new Map();
    mongoSubscriptions.forEach(sub => {
      if (sub.endpoint && sub.keys?.p256dh && sub.keys?.auth) {
        subscriptionMap.set(sub.endpoint, {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          _dbId: sub._id
        });
      }
    });

    legacyWebSubscriptions.forEach(sub => {
      if (sub.endpoint && !subscriptionMap.has(sub.endpoint)) {
        subscriptionMap.set(sub.endpoint, sub);
      }
    });

    const webSubscriptions = Array.from(subscriptionMap.values());

    // 1. Dispatch Expo Push Notifications for React Native Mobile Apps
    if (expoTokens.length > 0) {
      const expoMessages = expoTokens.map(token => ({
        to: token,
        sound: 'default',
        title: title || 'GenAce',
        body: body || 'You received a new message',
        data: data || {},
        priority: 'high'
      }));

      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(expoMessages),
        });
        console.log(`[Push] Dispatched Expo Push notification to ${expoTokens.length} devices.`);
      } catch (expoErr) {
        console.error('[Push] Expo push dispatch error:', expoErr);
      }
    }

    // 2. Dispatch Web Push Notifications for Web Browsers (Closed Tab / PWA Background)
    if (webSubscriptions.length > 0) {
      let targetUrl = '/chat';
      if (data.conversationId) {
        targetUrl = `/chat?conversationId=${data.conversationId}`;
      } else if (data.spaceId) {
        targetUrl = `/chat?spaceId=${data.spaceId}`;
      }

      const payload = JSON.stringify({
        title: title || 'GenAce',
        body: body || 'You received a message on GenAce',
        icon: '/icon.png',
        badge: '/icon.png',
        url: targetUrl,
        data
      });

      const sendPromises = webSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: sub.keys
          }, payload);
        } catch (err) {
          const statusCode = err?.statusCode;
          console.warn(`[Push] Web push delivery warning (status ${statusCode}):`, err?.message || err);
          
          // Remove expired / invalid subscriptions (404 Not Found, 410 Gone)
          if (statusCode === 404 || statusCode === 410) {
            try {
              await PushSubscription.deleteOne({ endpoint: sub.endpoint });
              await Persona.updateMany(
                { pushTokens: { $regex: sub.endpoint } },
                { $pull: { pushTokens: { $regex: sub.endpoint } } }
              );
              console.log(`[Push] Removed expired Web Push subscription endpoint: ${sub.endpoint}`);
            } catch (cleanupErr) {
              console.error('[Push] Error cleaning up expired subscription:', cleanupErr);
            }
          }
        }
      });

      await Promise.allSettled(sendPromises);
      console.log(`[Push] Dispatched Web Push notification to ${webSubscriptions.length} browser endpoints.`);
    }
  } catch (err) {
    console.error('[Push] Push notification service error:', err);
  }
};

