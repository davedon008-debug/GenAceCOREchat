import Persona from '../models/Persona.js';

export const sendPushNotifications = async (recipientPersonaIds = [], title, body, data = {}) => {
  if (!recipientPersonaIds || !recipientPersonaIds.length) return;

  try {
    const validIds = recipientPersonaIds.map(id => String(id)).filter(Boolean);
    const personas = await Persona.find({ _id: { $in: validIds } }).select('pushTokens status');

    const expoTokens = [];
    const webSubscriptions = [];

    personas.forEach(p => {
      if (p.status === 'dnd') return; // Respect DND status
      (p.pushTokens || []).forEach(tokenStr => {
        if (!tokenStr) return;
        if (tokenStr.startsWith('ExponentPushToken[') || tokenStr.startsWith('ExpoPushToken[')) {
          expoTokens.push(tokenStr);
        } else if (tokenStr.startsWith('{') && tokenStr.includes('endpoint')) {
          try {
            const parsed = JSON.parse(tokenStr);
            if (parsed.endpoint) webSubscriptions.push(parsed);
          } catch {}
        }
      });
    });

    // 1. Dispatch Expo Push Notifications for React Native Mobile Apps
    if (expoTokens.length > 0) {
      const expoMessages = expoTokens.map(token => ({
        to: token,
        sound: 'default',
        title: title || 'New Message',
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
  } catch (err) {
    console.error('[Push] Push notification service error:', err);
  }
};
