import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import storage from '../config/storage';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { navigate } from '../navigation/navigationRef';
import InAppNotificationBanner from '../components/InAppNotificationBanner';
import { playChimeSound } from '../config/safeAudio';
import api from '../config/api';

const NotificationContext = createContext();

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

export const NotificationProvider = ({ children }) => {
  const { socket } = useSocket();
  const { activePersona } = useAuth();
  const [notification, setNotification] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const seenMsgIdsRef = useRef(new Set());

  // Unread message tracking map: { [conversationIdOrSpaceId]: count }
  const [unreadMap, setUnreadMap] = useState({});

  // Notification Preferences state
  const [notifMsgEnabled, setNotifMsgEnabledState] = useState(true);
  const [notifSpaceEnabled, setNotifSpaceEnabledState] = useState(true);
  const [notifSoundEnabled, setNotifSoundEnabledState] = useState(true);

  // Load preferences from safe storage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedMsg = await storage.getItem('@notif_msg_enabled');
        const storedSpace = await storage.getItem('@notif_space_enabled');
        const storedSound = await storage.getItem('@notif_sound_enabled');

        if (storedMsg !== null && storedMsg !== undefined) setNotifMsgEnabledState(JSON.parse(storedMsg));
        if (storedSpace !== null && storedSpace !== undefined) setNotifSpaceEnabledState(JSON.parse(storedSpace));
        if (storedSound !== null && storedSound !== undefined) setNotifSoundEnabledState(JSON.parse(storedSound));
      } catch (err) {
        // Fall back gracefully with defaults
      }
    })();
  }, []);

  // Register device push token for background notifications
  useEffect(() => {
    if (activePersona?._id) {
      try {
        let Notifications = null;
        try { Notifications = require('expo-notifications'); } catch (e) {}
        if (Notifications && typeof Notifications.getExpoPushTokenAsync === 'function') {
          Notifications.getPermissionsAsync().then(({ status }) => {
            if (status !== 'granted') {
              return Notifications.requestPermissionsAsync();
            }
            return { status };
          }).then(res => {
            if (res && res.status === 'granted') {
              return Notifications.getExpoPushTokenAsync();
            }
          }).then(tokenObj => {
            if (tokenObj && tokenObj.data) {
              api.post('/personas/push-token', { token: tokenObj.data }).catch(() => {});
            }
          }).catch(() => {});
        }
      } catch (err) {}
    }
  }, [activePersona?._id]);

  const setNotifMsgEnabled = (val) => {
    setNotifMsgEnabledState(val);
    storage.setItem('@notif_msg_enabled', JSON.stringify(val)).catch(() => {});
  };

  const setNotifSpaceEnabled = (val) => {
    setNotifSpaceEnabledState(val);
    storage.setItem('@notif_space_enabled', JSON.stringify(val)).catch(() => {});
  };

  const setNotifSoundEnabled = (val) => {
    setNotifSoundEnabledState(val);
    storage.setItem('@notif_sound_enabled', JSON.stringify(val)).catch(() => {});
  };

  const markAsRead = (id) => {
    if (!id) return;
    const strId = String(id);
    setUnreadMap((prev) => {
      if (!prev[strId]) return prev;
      const next = { ...prev };
      delete next[strId];
      return next;
    });
  };

  const getUnreadCount = (id) => {
    if (!id) return 0;
    return unreadMap[String(id)] || 0;
  };

  useEffect(() => {
    if (!socket || !activePersona?._id) return;

    const handleNewMessage = (msg) => {
      if (!msg) return;

      // Deduplicate incoming messages to prevent double counting
      const msgIdStr = String(msg._id || msg.id || '');
      if (msgIdStr && seenMsgIdsRef.current.has(msgIdStr)) {
        return;
      }
      if (msgIdStr) {
        seenMsgIdsRef.current.add(msgIdStr);
        if (seenMsgIdsRef.current.size > 200) {
          const arr = Array.from(seenMsgIdsRef.current);
          seenMsgIdsRef.current = new Set(arr.slice(-100));
        }
      }

      // Extract sender ID
      const senderPersonaObj = msg.senderPersonaId || msg.sender;
      const senderId = typeof senderPersonaObj === 'object'
        ? String(senderPersonaObj._id || senderPersonaObj.id || '')
        : String(senderPersonaObj || '');

      const myPersonaId = activePersona?._id ? String(activePersona._id) : null;

      // Do not notify if message was sent by myself or if current persona is on DND status
      if (senderId && myPersonaId && senderId === myPersonaId) {
        return;
      }
      if (activePersona?.status === 'dnd') {
        return;
      }

      // Check if it's a Fluid Space message or Direct Message
      const rawSpaceId = msg.spaceId?._id || msg.spaceId;
      const rawConvId = msg.conversationId?._id || msg.conversationId;

      const isSpace = !!rawSpaceId;
      const targetRoomId = String(rawSpaceId || rawConvId || '');

      // Increment unread count badge for target conversation or space if not currently active
      if (targetRoomId && (!activeRoomId || String(targetRoomId) !== String(activeRoomId))) {
        setUnreadMap((prev) => ({
          ...prev,
          [targetRoomId]: (prev[targetRoomId] || 0) + 1,
        }));
      }

      // Check notification preferences
      if (isSpace && !notifSpaceEnabled) return;
      if (!isSpace && !notifMsgEnabled) return;

      const senderName = (typeof senderPersonaObj === 'object' && (senderPersonaObj.displayName || senderPersonaObj.username))
        ? (senderPersonaObj.displayName || senderPersonaObj.username)
        : 'Someone';

      const spaceName = (typeof msg.spaceId === 'object' && msg.spaceId?.title)
        ? msg.spaceId.title
        : (msg.spaceName || msg.spaceTitle || 'Fluid Space');
      const senderAvatar = (typeof senderPersonaObj === 'object' && senderPersonaObj.avatar)
        ? senderPersonaObj.avatar
        : DEFAULT_AVATAR;

      // Format body snippet with Privacy Vector protection
      const pMode = msg.privacyMode || 'normal';
      let snippet = '';
      if (pMode === 'burn') {
        snippet = '🔥 Burn on read message received (tap to open)';
      } else if (pMode === 'vault') {
        snippet = '🛡️ Vault encrypted message received';
      } else if (pMode === 'disappearing') {
        snippet = '⏱️ Disappearing message received';
      } else if (pMode === 'anonymous') {
        snippet = '👻 Anonymous message received';
      } else if (pMode === 'private') {
        snippet = '🔒 Private message received';
      } else {
        snippet = msg.content || '';
        if (msg.contentType === 'image') snippet = '📷 Photo attachment';
        else if (msg.contentType === 'video') snippet = '🎥 Video attachment';
        else if (msg.contentType === 'document') snippet = '📄 File document';
        else if (msg.contentType === 'voice') snippet = '🎤 Voice note';
      }

      const notifItem = {
        id: msg._id || String(Date.now()),
        type: isSpace ? 'space' : 'dm',
        title: isSpace ? spaceName : senderName,
        subtitle: isSpace ? `${senderName}: ${snippet}` : snippet,
        avatar: senderAvatar,
        conversationId: isSpace ? null : rawConvId,
        spaceId: isSpace ? rawSpaceId : null,
        rawTitle: isSpace ? spaceName : senderName,
        icon: isSpace ? (msg.spaceId?.icon || '⚡') : null,
      };

      // Set banner state
      setNotification(notifItem);

      // Play notification sound chime if enabled
      if (notifSoundEnabled) {
        playChimeSound(notifItem.title, notifItem.subtitle);
      }
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [socket, activePersona?._id, notifMsgEnabled, notifSpaceEnabled, notifSoundEnabled, activeRoomId]);

  const handleBannerPress = (notif) => {
    if (!notif) return;
    const targetRoomId = String(notif.spaceId || notif.conversationId || '');
    if (targetRoomId) markAsRead(targetRoomId);

    setNotification(null);
    if (notif.type === 'space' || notif.spaceId) {
      navigate('Conversation', {
        spaceId: notif.spaceId,
        title: notif.rawTitle,
        icon: notif.icon || '⚡',
      });
    } else {
      navigate('Conversation', {
        conversationId: notif.conversationId,
        title: notif.rawTitle,
        avatar: notif.avatar,
      });
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        setNotification,
        activeRoomId,
        setActiveRoomId,
        notifMsgEnabled,
        setNotifMsgEnabled,
        notifSpaceEnabled,
        setNotifSpaceEnabled,
        notifSoundEnabled,
        setNotifSoundEnabled,
        playChimeSound,
        unreadMap,
        markAsRead,
        getUnreadCount,
      }}
    >
      {children}
      <InAppNotificationBanner
        notification={notification}
        onDismiss={() => setNotification(null)}
        onPress={handleBannerPress}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
