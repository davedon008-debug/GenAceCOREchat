import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Image, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Linking, AppState
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio, ImagePicker, DocumentPicker } from '../config/safeMedia';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import api, { getMediaUrl } from '../config/api';
import { colors } from '../theme/colors';
import PasscodeModal from '../components/PasscodeModal';
import AIToolbarModal from '../components/AIToolbarModal';
import SpaceCanvasModal from '../components/SpaceCanvasModal';
import MessageActionModal from '../components/MessageActionModal';
import SpaceDetailsModal from '../components/SpaceDetailsModal';
import ImageViewerModal from '../components/ImageViewerModal';
import AttachmentPickerModal from '../components/AttachmentPickerModal';
import AvatarViewerModal from '../components/AvatarViewerModal';
import PrivacyModeModal from '../components/PrivacyModeModal';
import {
  ArrowLeft, Bot, Zap, Info, Lock, Flame, Plus,
  Image as ImageIcon, Mic, Send, Play, Pause, CheckCheck, Check, X,
  FileText, Download, Camera
} from 'lucide-react-native';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

// Sub-component for rendering audio player inside chat bubbles
function AudioMessagePlayer({ audioUrl, isMe }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const togglePlayback = async () => {
    if (!audioUrl) return;

    if (!Audio || typeof Audio.Sound?.createAsync !== 'function') {
      Alert.alert('Voice Note', 'Audio playback is unavailable on this Expo Go build.');
      return;
    }

    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      try {
        setLoadingAudio(true);
        const fullUrl = getMediaUrl(audioUrl);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: fullUrl },
          { shouldPlay: true }
        );

        setSound(newSound);
        setIsPlaying(true);

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      } catch (err) {
        console.error('Failed to load audio:', err);
        Alert.alert('Error', 'Could not play voice note');
      } finally {
        setLoadingAudio(false);
      }
    }
  };

  return (
    <TouchableOpacity
      style={[styles.audioBubble, isMe ? styles.audioMeBubble : styles.audioOtherBubble]}
      onPress={togglePlayback}
      disabled={loadingAudio}
    >
      {loadingAudio ? (
        <ActivityIndicator size="small" color={colors.white} />
      ) : isPlaying ? (
        <Pause size={16} color="#ffffff" />
      ) : (
        <Play size={16} color="#ffffff" style={{ marginLeft: 2 }} />
      )}
      <View style={styles.audioWaveform}>
        <View style={styles.audioWaveBar} />
        <View style={[styles.audioWaveBar, { height: 16 }]} />
        <View style={[styles.audioWaveBar, { height: 10 }]} />
        <View style={[styles.audioWaveBar, { height: 20 }]} />
        <View style={styles.audioWaveBar} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Mic size={12} color="#ffffff" />
        <Text style={styles.audioText}>Voice Note</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ConversationScreen({ route, navigation }) {
  const rawConvId = route.params?.conversationId;
  const rawSpaceId = route.params?.spaceId;
  const conversationId = (typeof rawConvId === 'object' && rawConvId) ? (rawConvId._id || rawConvId.id) : (rawConvId && rawConvId !== 'null' && rawConvId !== 'undefined' ? String(rawConvId) : null);
  const spaceId = (typeof rawSpaceId === 'object' && rawSpaceId) ? (rawSpaceId._id || rawSpaceId.id) : (rawSpaceId && rawSpaceId !== 'null' && rawSpaceId !== 'undefined' ? String(rawSpaceId) : null);
  const title = route.params?.title;
  const avatar = route.params?.avatar;
  const otherPersonaId = route.params?.otherPersonaId;
  const isLocked = route.params?.isLocked;

  const { activePersona } = useAuth();
  const { socket, joinRoom, leaveRoom, sendMessage, sendTyping, onlinePersonaIds = [], personaStatuses = {} } = useSocket() || {};
  const { colors: dynamicColors, isLight } = useTheme();
  const { markAsRead, setActiveRoomId } = useNotification();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  // Voice note recording states
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const recordTimerRef = useRef(null);

  // New Modals & Web Feature states
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [canvasModalVisible, setCanvasModalVisible] = useState(false);
  const [spaceDetailsVisible, setSpaceDetailsVisible] = useState(false);
  const [spaceData, setSpaceData] = useState(null);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [viewImageUrl, setViewImageUrl] = useState(null);
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ visible: false, avatarUrl: '', name: '', handle: '', bio: '', customStatus: '' });
  const [actionModalMessage, setActionModalMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [privacyMode, setPrivacyMode] = useState('normal');
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  // Lock passcode verification state
  const [currentIsLocked, setCurrentIsLocked] = useState(!!isLocked);
  const [passcodeUnlocked, setPasscodeUnlocked] = useState(!isLocked);

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isPickingRef = useRef(false);

  const targetRoomId = conversationId || spaceId;

  useEffect(() => {
    if (targetRoomId && setActiveRoomId) {
      setActiveRoomId(targetRoomId);
      markAsRead(targetRoomId);
    }
    return () => {
      if (setActiveRoomId) setActiveRoomId(null);
    };
  }, [targetRoomId]);
  const safeOnlineIds = Array.isArray(onlinePersonaIds) ? onlinePersonaIds.map(String) : [];
  const rawPartnerId = typeof otherPersonaId === 'object' ? (otherPersonaId?._id || otherPersonaId?.id) : otherPersonaId;
  const targetPartnerId = rawPartnerId || (() => {
    const otherMsg = messages.find(m => {
      const sId = String(m.senderPersonaId?._id || m.senderPersonaId || '');
      return sId && sId !== String(activePersona?._id);
    });
    if (!otherMsg) return null;
    const s = otherMsg.senderPersonaId;
    return typeof s === 'object' ? (s._id || s.id) : s;
  })();
  const partnerIdStr = targetPartnerId ? String(targetPartnerId) : null;
  const isOtherOnline = !!(partnerIdStr && safeOnlineIds.includes(partnerIdStr));

  const safeStatuses = personaStatuses || {};
  const partnerStatus = partnerIdStr ? (safeStatuses[partnerIdStr] || (isOtherOnline ? 'online' : 'offline')) : 'offline';
  const partnerStatusColor = partnerStatus === 'away' ? '#f59e0b' : partnerStatus === 'dnd' ? '#ef4444' : isOtherOnline ? (dynamicColors.success || '#10b981') : null;
  const partnerSubtitleText = partnerStatus === 'away' ? '🟡 Away' : partnerStatus === 'dnd' ? '🔴 Do Not Disturb' : isOtherOnline ? '🟢 Online' : 'Offline';

  const handleOpenProfile = (personaObj) => {
    const p = (personaObj && typeof personaObj === 'object') ? personaObj : {};
    const pId = p._id || p.id || partnerIdStr || otherPersonaId;
    setAvatarViewerTarget({
      visible: true,
      avatarUrl: p.avatar || avatar,
      name: p.displayName || p.username || title || 'User Profile',
      handle: p.username || '',
      bio: p.bio || route.params?.bio || '',
      customStatus: p.customStatus || '',
      targetPersonaId: pId
    });
  };

  const handleSelectPrivacyMode = async (nextMode) => {
    const targetId = conversationId || spaceId;
    if (!targetId) {
      Alert.alert('Notice', 'No active chat or space selected.');
      return;
    }
    try {
      const endpoint = conversationId
        ? `/conversations/${conversationId}/privacy`
        : `/spaces/${spaceId}/privacy`;
      const res = await api.patch(endpoint, { privacyMode: nextMode });
      if (res.data?.success) {
        setPrivacyMode(nextMode);
        if (socket) {
          socket.emit('conversation:privacy:update', { roomId: targetId, privacyMode: nextMode });
        }
        Alert.alert('Privacy Vector', `Privacy set to: ${nextMode.toUpperCase()}`);
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update privacy mode');
    }
  };

  const handleToggleLockThisChat = async () => {
    const targetId = conversationId || spaceId;
    if (!targetId) return;
    try {
      const res = await api.post('/auth/toggle-lock-chat', { conversationId, spaceId });
      if (res.data?.success) {
        const nextState = res.data.isLocked;
        setCurrentIsLocked(nextState);
        if (!nextState) {
          setPasscodeUnlocked(true);
        }
        Alert.alert(
          nextState ? `${spaceId ? 'Space' : 'Chat'} Locked 🔒` : `${spaceId ? 'Space' : 'Chat'} Unlocked 🔓`,
          nextState ? `This ${spaceId ? 'space' : 'conversation'} is now locked with your 4-digit PIN.` : `Passcode lock removed.`
        );
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to toggle lock status');
    }
  };

  const handleReactMessage = async (messageId, emoji) => {
    const targetId = typeof messageId === 'object' ? (messageId?._id || messageId?.id) : messageId;
    if (!targetId || targetId === 'undefined' || targetId === 'null') return;

    try {
      const res = await api.post(`/messages/${targetId}/reaction`, { emoji });
      if (res.data?.success) {
        setMessages(prev => prev.map(m => String(m._id || m.id) === String(targetId) ? res.data.message : m));
      }
    } catch (err) {
      const isNotFound = err?.response?.status === 404 || String(err?.response?.data?.message || '').toLowerCase().includes('not found');
      if (isNotFound) {
        setMessages(prev => prev.filter(m => String(m._id || m.id) !== String(targetId)));
      } else {
        console.error('Reaction error:', err?.response?.data?.message || err?.message || err);
      }
    }
  };

  const [revealedBurnMsgs, setRevealedBurnMsgs] = useState({});
  const burnTimersRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(burnTimersRef.current).forEach(t => clearInterval(t));
    };
  }, []);

  const handleStartRevealBurn = (msgId) => {
    const idStr = String(msgId);
    setRevealedBurnMsgs(prev => ({ ...prev, [idStr]: 10 }));

    if (burnTimersRef.current[idStr]) clearInterval(burnTimersRef.current[idStr]);
    burnTimersRef.current[idStr] = setInterval(() => {
      setRevealedBurnMsgs(prev => {
        const current = prev[idStr];
        if (current <= 1) {
          clearInterval(burnTimersRef.current[idStr]);
          delete burnTimersRef.current[idStr];
          const { [idStr]: _, ...rest } = prev;
          handleBurnMessage(idStr);
          return rest;
        }
        return { ...prev, [idStr]: current - 1 };
      });
    }, 1000);
  };

  const handleForceBurnNowMobile = (msgId) => {
    const idStr = String(msgId);
    if (burnTimersRef.current[idStr]) {
      clearInterval(burnTimersRef.current[idStr]);
      delete burnTimersRef.current[idStr];
    }
    setRevealedBurnMsgs(prev => {
      const { [idStr]: _, ...rest } = prev;
      return rest;
    });
    handleBurnMessage(idStr);
  };

  const handleBurnMessage = async (messageId) => {
    const targetId = typeof messageId === 'object' ? (messageId?._id || messageId?.id) : messageId;
    if (!targetId || targetId === 'undefined' || targetId === 'null') return;

    try {
      const res = await api.post(`/messages/${targetId}/burn`);
      if (res.data?.success) {
        setMessages(prev => prev.map(m => String(m._id || m.id) === String(targetId) ? res.data.message : m));
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setMessages(prev => prev.filter(m => String(m._id || m.id) !== String(targetId)));
      }
      console.error('Burn error:', err?.response?.data?.message || err?.message || err);
    }
  };

  const handleDeleteMessage = async (messageId, mode = 'everyone') => {
    const targetId = typeof messageId === 'object' ? (messageId?._id || messageId?.id) : messageId;
    if (!targetId || targetId === 'undefined' || targetId === 'null') return;

    try {
      const res = await api.delete(`/messages/${targetId}?mode=${mode}`);
      if (res.data?.success) {
        setMessages(prev => prev.filter(m => String(m._id || m.id) !== String(targetId)));
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setMessages(prev => prev.filter(m => String(m._id || m.id) !== String(targetId)));
      } else {
        Alert.alert('Delete Failed', err?.response?.data?.message || 'Failed to delete message');
      }
      console.error('Delete message error:', err?.response?.data?.message || err?.message || err);
    }
  };

  const fetchMessages = async () => {
    if (!targetRoomId || targetRoomId === 'null' || targetRoomId === 'undefined' || targetRoomId === '[object Object]') return;
    try {
      setLoading(true);
      const url = conversationId
        ? `/messages/conversation/${conversationId}`
        : `/messages/space/${spaceId}`;
      const res = await api.get(url);
      if (res.data?.success) {
        setMessages(res.data.messages || []);
      }
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.message || 'Failed to fetch messages';
      if (status === 403 || status === 404) {
        console.warn(`[ConversationScreen] ${status === 403 ? 'Access Restricted' : 'Target Not Found'} (${status}) for Target ID: ${targetRoomId} - ${msg}`);
        setMessages([]);
      } else {
        console.error('[ConversationScreen] Fetch error:', msg, 'Target ID:', targetRoomId);
      }
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    let isMounted = true;
    if (conversationId) {
      api.get(`/conversations/${conversationId}`).then(res => {
        if (isMounted && res.data?.success) {
          const conv = res.data.conversation;
          if (conv) {
            if (conv.privacyMode) {
              setPrivacyMode(conv.privacyMode);
            }
            if (isLocked === undefined) {
              const lockedInDb = !!conv.isLocked;
              setCurrentIsLocked(lockedInDb);
              if (lockedInDb) {
                setPasscodeUnlocked(false);
              }
            }
          }
        }
      }).catch(() => {});
    } else if (spaceId) {
      api.get(`/spaces/${spaceId}`).then(res => {
        if (isMounted && res.data?.success) {
          const space = res.data.space;
          if (space) {
            setSpaceData(space);
            if (space.privacyMode) {
              setPrivacyMode(space.privacyMode);
            }
            if (isLocked === undefined) {
              const lockedInDb = !!space.isLocked;
              setCurrentIsLocked(lockedInDb);
              if (lockedInDb) {
                setPasscodeUnlocked(false);
              }
            }
          }
        }
      }).catch(() => {});
    }
    return () => { isMounted = false; };
  }, [conversationId, spaceId, isLocked]);

  useEffect(() => {
    if (passcodeUnlocked) {
      fetchMessages();

      if (targetRoomId) {
        joinRoom(targetRoomId);
        markAsRead(targetRoomId);
        if (conversationId) markAsRead(conversationId);
        if (spaceId) markAsRead(spaceId);

        if (socket) {
          socket.emit('message:read', { roomId: targetRoomId, conversationId, spaceId });
        }
        api.post('/messages/read', { conversationId, spaceId }).catch(() => {});
      }
    }

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && passcodeUnlocked && targetRoomId) {
        joinRoom(targetRoomId);
        fetchMessages();
        if (socket && socket.connected) {
          socket.emit('message:read', { roomId: targetRoomId, conversationId, spaceId });
        }
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSub?.remove();
      if (targetRoomId) {
        leaveRoom(targetRoomId);
      }
    };
  }, [targetRoomId, passcodeUnlocked, conversationId, spaceId, socket]);

  // Handle incoming real-time socket events
  useEffect(() => {
    if (!socket || !passcodeUnlocked) return;

    const handleNewMessage = (msg) => {
      const rawConvId = msg.conversationId?._id || msg.conversationId;
      const rawSpaceId = msg.spaceId?._id || msg.spaceId;
      const msgConvId = rawConvId ? String(rawConvId) : null;
      const msgSpaceId = rawSpaceId ? String(rawSpaceId) : null;

      const targetConvId = conversationId ? String(conversationId) : null;
      const targetSpaceId = spaceId ? String(spaceId) : null;

      const senderPersonaObj = msg.senderPersonaId || msg.sender;
      const senderId = typeof senderPersonaObj === 'object'
        ? String(senderPersonaObj._id || senderPersonaObj.id || '')
        : String(senderPersonaObj || '');
      const isFromMe = activePersona && senderId === String(activePersona._id);

      if (!isFromMe && activePersona?.status === 'dnd') {
        return;
      }

      const isForThisChat = (targetSpaceId && msgSpaceId && msgSpaceId === targetSpaceId) ||
                            (!targetSpaceId && targetConvId && msgConvId && msgConvId === targetConvId);

      if (isForThisChat) {
        setMessages(prev => {
          const msgIdStr = String(msg._id || msg.id || '');
          if (prev.some(m => String(m._id || m.id || '') === msgIdStr)) return prev;

          if (isFromMe) {
            const tempIndex = prev.findIndex(m => m.pending || (typeof m._id === 'string' && m._id.startsWith('temp_')));
            if (tempIndex !== -1) {
              const copy = [...prev];
              copy[tempIndex] = msg;
              return copy;
            }
          }
          return [...prev, msg];
        });

        socket.emit('message:read', { roomId: targetRoomId, conversationId, spaceId });
        api.post('/messages/read', { conversationId, spaceId }).catch(() => {});
      }
    };

    const handleMessagesRead = ({ conversationId: readConvId, spaceId: readSpaceId, readerPersonaId }) => {
      setMessages(prev => prev.map(m => {
        const mConvId = String(m.conversationId?._id || m.conversationId || '');
        const mSpaceId = String(m.spaceId?._id || m.spaceId || '');
        const isMatch = (readConvId && String(readConvId) === String(conversationId)) ||
                        (readSpaceId && String(readSpaceId) === String(spaceId)) ||
                        mConvId === String(conversationId) ||
                        mSpaceId === String(spaceId);

        if (isMatch) {
          return {
            ...m,
            status: 'read',
            read: true,
            isRead: true,
            readBy: Array.from(new Set([...(m.readBy || []), readerPersonaId].filter(Boolean)))
          };
        }
        return m;
      }));
    };

    const handleTypingStart = ({ personaId, personaName }) => {
      if (String(personaId) !== String(activePersona?._id)) {
        setTypingUsers(prev => Array.from(new Set([...prev, personaName || 'Someone'])));
      }
    };

    const handleTypingStop = ({ personaId, personaName }) => {
      setTypingUsers(prev => prev.filter(name => name !== (personaName || 'Someone')));
    };

    const handlePrivacyUpdated = ({ roomId, privacyMode: nextMode }) => {
      if (String(roomId) === String(conversationId) || (spaceId && String(roomId) === String(spaceId))) {
        setPrivacyMode(nextMode);
      }
    };

    const handleMessageBurned = ({ messageId, content }) => {
      setMessages(prev => prev.map(m => String(m._id || m.id) === String(messageId) ? { ...m, content, isBurned: true, mediaUrl: '' } : m));
    };

    const handleSpaceKicked = ({ spaceId: kickedSpaceId, spaceTitle }) => {
      if (spaceId && String(spaceId) === String(kickedSpaceId)) {
        Alert.alert('Removed from Space', `You were removed from ${spaceTitle || 'this space'} by an admin.`);
        navigation.goBack();
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('messages:read', handleMessagesRead);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('conversation:privacy:updated', handlePrivacyUpdated);
    socket.on('message:burned', handleMessageBurned);
    socket.on('space:kicked', handleSpaceKicked);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('messages:read', handleMessagesRead);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('conversation:privacy:updated', handlePrivacyUpdated);
      socket.off('message:burned', handleMessageBurned);
      socket.off('space:kicked', handleSpaceKicked);
    };
  }, [socket, conversationId, spaceId, activePersona?._id, passcodeUnlocked, targetRoomId]);

  const handleTextChange = (val) => {
    setInputText(val);
    if (!targetRoomId) return;

    sendTyping(targetRoomId, activePersona?.displayName || activePersona?.username, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(targetRoomId, activePersona?.displayName || activePersona?.username, false);
    }, 2000);
  };

  const handlePickImage = async () => {
    if (isPickingRef.current) return;
    if (!ImagePicker || typeof ImagePicker.requestMediaLibraryPermissionsAsync !== 'function') {
      Alert.alert('Notice', 'Image picker module is unavailable on this Expo Go build.');
      return;
    }

    try {
      isPickingRef.current = true;
      await new Promise((resolve) => setTimeout(resolve, 200));

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Access to media library is required to send photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        await uploadAndSendMedia(selectedAsset.uri, 'image/jpeg', 'image');
      }
    } catch (err) {
      if (err?.code !== 'ERR_PICKER_CANCELLED' && !String(err?.message || '').toLowerCase().includes('cancel')) {
        console.error('Image picker error:', err);
      }
    } finally {
      isPickingRef.current = false;
    }
  };

  const handlePickDocument = async () => {
    if (isPickingRef.current) return;
    if (!DocumentPicker || typeof DocumentPicker.getDocumentAsync !== 'function') {
      Alert.alert('Notice', 'Document picker module is unavailable on this Expo Go sandbox.');
      return;
    }

    isPickingRef.current = true;
    try {
      let result;
      try {
        result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
      } catch (firstErr) {
        const errStr = String(firstErr?.message || firstErr || '');
        if (errStr.includes('PickingInProgressException') || errStr.includes('picking in progress')) {
          console.warn('[DocumentPicker] Native picker busy, retrying in 400ms...');
          await new Promise((resolve) => setTimeout(resolve, 400));
          result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true,
          });
        } else {
          throw firstErr;
        }
      }

      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        const doc = result.assets[0];
        const mimeType = doc.mimeType || 'application/pdf';
        const fileName = doc.name || 'document.pdf';
        await uploadAndSendMedia(doc.uri, mimeType, 'document', fileName);
      }
    } catch (err) {
      const errStr = String(err?.message || err || '');
      if (err?.code !== 'ERR_PICKER_CANCELLED' && !errStr.toLowerCase().includes('cancel') && !errStr.includes('canceled')) {
        console.error('Document picker error:', err);
      }
    } finally {
      isPickingRef.current = false;
    }
  };

  const handleTakePhoto = async () => {
    if (isPickingRef.current) return;
    if (!ImagePicker || typeof ImagePicker.requestCameraPermissionsAsync !== 'function') {
      Alert.alert('Notice', 'Camera module is unavailable on this Expo Go sandbox.');
      return;
    }

    try {
      isPickingRef.current = true;
      await new Promise((resolve) => setTimeout(resolve, 200));

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Camera permission is required to capture photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        await uploadAndSendMedia(selectedAsset.uri, 'image/jpeg', 'image');
      }
    } catch (err) {
      if (err?.code !== 'ERR_PICKER_CANCELLED' && !String(err?.message || '').toLowerCase().includes('cancel')) {
        console.error('Camera error:', err);
      }
    } finally {
      isPickingRef.current = false;
    }
  };

  const startVoiceRecording = async () => {
    if (!Audio || typeof Audio.requestPermissionsAsync !== 'function') {
      Alert.alert(
        'Voice Recording Notice',
        'Voice recording native module is not included in this generic Expo Go sandbox. Building a standalone Android APK includes full native mic recording.'
      );
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Microphone access is required to record voice notes');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordTime(0);

      recordTimerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopAndSendVoiceRecording = async () => {
    if (!recording || !Audio) return;

    try {
      clearInterval(recordTimerRef.current);
      setIsRecording(false);

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();

      setRecording(null);

      if (uri) {
        await uploadAndSendMedia(uri, 'audio/m4a', 'audio');
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  };

  const uploadAndSendMedia = async (fileUri, mimeType, contentType, originalName = '') => {
    setUploading(true);
    try {
      const filename = originalName || fileUri.split('/').pop() || (contentType === 'image' ? 'photo.jpg' : contentType === 'document' ? 'document.pdf' : 'voice.m4a');
      let uploadRes = null;

      // Strategy 1: Multipart FormData Upload (without hardcoding Content-Type header which strips boundary)
      try {
        const formData = new FormData();
        const formattedUri = Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri;

        formData.append('file', {
          uri: formattedUri,
          name: filename,
          type: mimeType || 'application/octet-stream',
        });

        uploadRes = await api.post('/upload', formData, {
          timeout: 60000,
          headers: {
            'Accept': 'application/json',
          },
          transformRequest: (data, headers) => {
            if (headers) {
              delete headers['Content-Type'];
              delete headers['content-type'];
            }
            return data;
          },
        });
      } catch (formDataErr) {
        console.warn('[Upload] FormData upload failed, attempting Base64 fallback:', formDataErr?.message || formDataErr);

        // Strategy 2: Base64 Data URL Upload (100% reliable on Expo Go & Android content:// URIs)
        try {
          const fetchRes = await fetch(fileUri);
          const blob = await fetchRes.blob();
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });

          uploadRes = await api.post('/upload', {
            fileData: base64Data,
            fileName: filename
          }, { timeout: 60000 });
        } catch (base64Err) {
          console.error('[Upload] Base64 fallback also failed:', base64Err);
          throw formDataErr;
        }
      }

      if (uploadRes && uploadRes.data?.success) {
        const mediaUrl = uploadRes.data.url;
        const textContent = contentType === 'document' ? filename : '';
        await dispatchMessage(textContent, contentType, mediaUrl);
      }
    } catch (err) {
      console.error('Media upload error:', err);
      Alert.alert('Upload Failed', 'Could not upload attachment. Please check connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const dispatchMessage = async (content, contentType = 'text', mediaUrl = '') => {
    if (!content && !mediaUrl) return;
    setSending(true);
    if (contentType === 'text') {
      setInputText('');
    }

    const activeReplyId = replyingTo?._id;
    const activeReplyObj = replyingTo;
    setReplyingTo(null);

    sendTyping(targetRoomId, activePersona?.displayName || activePersona?.username, false);

    // Create Optimistic Message for 0ms Instant Feedback
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const optimisticMsg = {
      _id: tempId,
      conversationId,
      spaceId,
      senderPersonaId: activePersona,
      content,
      contentType,
      mediaUrl,
      replyTo: activeReplyObj,
      privacyMode,
      createdAt: new Date().toISOString(),
      status: 'pending',
      pending: true
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const payload = {
        content,
        contentType,
        mediaUrl,
        privacyMode
      };
      if (conversationId) payload.conversationId = conversationId;
      if (spaceId) payload.spaceId = spaceId;
      if (activeReplyId) payload.replyTo = activeReplyId;

      const res = await api.post('/messages', payload);

      if (res.data?.success) {
        const newMsg = res.data.message;
        setMessages(prev => {
          const existsByRealId = prev.some(m => String(m._id || m.id || '') === String(newMsg._id || newMsg.id || ''));
          if (existsByRealId) {
            return prev.filter(m => m._id !== tempId);
          }
          return prev.map(m => (m._id === tempId ? newMsg : m));
        });
        sendMessage({
          conversationId,
          spaceId,
          message: newMsg
        });
      }
    } catch (e) {
      console.error('Failed to send message:', e);
      setMessages(prev => prev.filter(m => m._id !== tempId));
      Alert.alert('Send Error', 'Failed to send message. Please check your connection.');
    } finally {
      setSending(false);
    }
  };

  const renderMessageItem = ({ item }) => {
    if (item.isBurned) {
      return (
        <View style={{ width: '100%', alignItems: 'center', marginVertical: 6 }}>
          <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#fca5a5', fontSize: 11, fontStyle: 'italic' }}>🔥 This message was burned and destroyed.</Text>
          </View>
        </View>
      );
    }

    const senderId = item.senderPersonaId?._id || item.senderPersonaId;
    const isAnonymous = item.privacyMode === 'anonymous';
    const senderName = isAnonymous
      ? '👻 Anonymous'
      : (item.senderPersonaId?.displayName || item.senderPersonaId?.username || 'Member');
    const isMe = String(senderId) === String(activePersona?._id);
    const timeString = item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    // Group reactions by emoji
    const reactionCounts = {};
    if (Array.isArray(item.reactions)) {
      item.reactions.forEach(r => {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
      });
    }

    const msgKey = String(item._id || item.id || '');
    const isBurnRevealed = !!revealedBurnMsgs[msgKey];
    const burnSecondsLeft = revealedBurnMsgs[msgKey];

    return (
      <View style={[styles.msgWrapper, isMe ? styles.msgMeWrapper : styles.msgOtherWrapper]}>
        {!isMe && (
          <TouchableOpacity
            onPress={() => !isAnonymous && handleOpenProfile(item.senderPersonaId)}
            activeOpacity={0.8}
            style={{ marginRight: 6, alignSelf: 'flex-end', marginBottom: 4 }}
          >
            <Image
              source={{ uri: getMediaUrl(isAnonymous ? null : (item.senderPersonaId?.avatar || item.senderPersonaId), senderName) }}
              style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)' }}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => setActionModalMessage(item)}
          style={[
            styles.msgBubble,
            isMe
              ? [styles.msgMeBubble, { backgroundColor: dynamicColors.bubbleSentBg || dynamicColors.primary }]
              : [styles.msgOtherBubble, { backgroundColor: dynamicColors.bubbleReceivedBg, borderColor: dynamicColors.bubbleReceivedBorder, borderWidth: 1 }]
          ]}
        >
          {/* Threaded Reply Quote */}
          {item.replyTo ? (
            <View style={[styles.replyQuoteBox, isMe ? styles.replyQuoteMe : [styles.replyQuoteOther, { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }]]}>
              <Text style={[styles.replyQuoteAuthor, { color: dynamicColors.primary }]}>
                {item.replyTo.senderPersonaId?.displayName || 'Replying to message'}
              </Text>
              <Text style={[styles.replyQuoteText, { color: isMe ? 'rgba(255,255,255,0.85)' : dynamicColors.textSecondary }]} numberOfLines={1}>
                {item.replyTo.content || 'Attachment'}
              </Text>
            </View>
          ) : null}

          {/* Group / Space / Anonymous sender handle */}
          {!isMe && (spaceId || isAnonymous) && (
            <TouchableOpacity onPress={() => !isAnonymous && handleOpenProfile(item.senderPersonaId)}>
              <Text style={[styles.senderHandleText, { color: isAnonymous ? '#9ca3af' : dynamicColors.primary }]}>{senderName}</Text>
            </TouchableOpacity>
          )}

          {/* Burn Countdown Header Banner when Revealed */}
          {item.privacyMode === 'burn' && !isMe && isBurnRevealed && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.4)', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6 }}>
              <Text style={{ color: '#fca5a5', fontSize: 10, fontWeight: 'bold' }}>🔥 Burning in {burnSecondsLeft}s...</Text>
              <TouchableOpacity onPress={() => handleForceBurnNowMobile(msgKey)} style={{ backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: 'bold' }}>Burn Now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Message Content */}
          {item.privacyMode === 'burn' && !isMe && !isBurnRevealed ? (
            <View style={{ paddingVertical: 4, minWidth: 180 }}>
              <Text style={{ color: '#fca5a5', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>🔥 Confidential Burn Message</Text>
              <TouchableOpacity
                onPress={() => handleStartRevealBurn(msgKey)}
                style={{ backgroundColor: '#ef4444', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>Tap to Reveal Message</Text>
              </TouchableOpacity>
            </View>
          ) : item.contentType === 'image' && (item.mediaUrl || item.content) ? (
            <TouchableOpacity onPress={() => setViewImageUrl(getMediaUrl(item.mediaUrl || item.content))}>
              <Image
                source={{ uri: getMediaUrl(item.mediaUrl || item.content) }}
                style={styles.msgImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : item.contentType === 'audio' && (item.mediaUrl || item.content) ? (
            <AudioMessagePlayer audioUrl={item.mediaUrl || item.content} isMe={isMe} />
          ) : (item.contentType === 'document' || item.contentType === 'file') && (item.mediaUrl || item.content) ? (
            <TouchableOpacity
              style={[
                styles.documentCard,
                { backgroundColor: isMe ? 'rgba(255,255,255,0.12)' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)') }
              ]}
              onPress={() => {
                const url = getMediaUrl(item.mediaUrl || item.content);
                Linking.openURL(url).catch(err => Alert.alert('Notice', 'Opening link: ' + url));
              }}
            >
              <View style={[styles.docIconPill, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(168, 85, 247, 0.2)' }]}>
                <FileText size={22} color={isMe ? '#ffffff' : '#c084fc'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.docNameText, { color: isMe ? '#ffffff' : dynamicColors.text }]} numberOfLines={1}>
                  {item.content || (item.mediaUrl ? item.mediaUrl.split('/').pop() : 'Document')}
                </Text>
                <Text style={[styles.docSubText, { color: isMe ? 'rgba(255,255,255,0.75)' : dynamicColors.textMuted }]}>
                  Tap to view document
                </Text>
              </View>
              <Download size={16} color={isMe ? '#ffffff' : dynamicColors.primary} />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.msgText, isMe ? styles.msgMeText : [styles.msgOtherText, { color: dynamicColors.bubbleReceivedText || dynamicColors.text }]]}>
              {item.content}
            </Text>
          )}

          {/* Emoji Reactions Row */}
          {Object.keys(reactionCounts).length > 0 && (
            <View style={styles.reactionsRow}>
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <View key={emoji} style={styles.reactionBadge}>
                  <Text style={{ fontSize: 10 }}>{emoji} {count}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Message Footer */}
          <View style={[styles.msgFooterRow, isMe ? styles.msgMeFooter : styles.msgOtherFooter]}>
            {item.privacyMode && item.privacyMode !== 'normal' && (
              <Text style={{ fontSize: 9, marginRight: 3 }}>
                {item.privacyMode === 'burn' ? '🔥' : item.privacyMode === 'disappearing' ? '⏱️' : item.privacyMode === 'private' ? '🔒' : item.privacyMode === 'vault' ? '🛡️' : item.privacyMode === 'anonymous' ? '👻' : ''}
              </Text>
            )}
            <Text style={[styles.msgTimeText, isMe ? styles.msgMeTime : [styles.msgOtherTime, { color: dynamicColors.textMuted }]]}>
              {timeString}
            </Text>
            {isMe && (() => {
              const isPending = item.pending === true || item.sending === true || item.status === 'pending' || (!item._id && !item.id);
              if (isPending) return null; // 0 ticks ("if not no tick")

              const isRead = item.status === 'read' ||
                             item.read === true ||
                             item.isRead === true ||
                             (Array.isArray(item.readBy) && item.readBy.some(pId => {
                               const idStr = typeof pId === 'object' ? (pId._id || pId.id) : pId;
                               return idStr && String(idStr) !== String(activePersona?._id);
                             }));

              if (isRead) {
                // 2 ticks ("it should only tick two when the person has seen the message")
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 3 }}>
                    <CheckCheck size={13} color="#38bdf8" />
                  </View>
                );
              }

              // 1 tick ("if its has gone it should show one")
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 3 }}>
                  <Check size={13} color="rgba(255, 255, 255, 0.65)" />
                </View>
              );
            })()}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (!passcodeUnlocked) {
    return (
      <SafeAreaView style={[styles.safeContainer, { backgroundColor: dynamicColors.background }]}>
        <PasscodeModal
          visible={true}
          title={title ? `Locked: ${title}` : 'Locked Conversation'}
          onClose={() => navigation.goBack()}
          onSuccess={() => setPasscodeUnlocked(true)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: dynamicColors.background }]}>
      {/* Web-Style Chat Header */}
      <View style={[styles.header, { backgroundColor: dynamicColors.card, borderBottomColor: dynamicColors.cardBorder }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={dynamicColors.primary} />
        </TouchableOpacity>

        {spaceId ? (
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => setSpaceDetailsVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.spaceHeaderBadge}>
              <Text style={styles.spaceHeaderBadgeText}>
                {route.params?.icon || spaceData?.icon || '⚡'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => {
              const partnerObj = messages.find(m => {
                const sId = String(m.senderPersonaId?._id || m.senderPersonaId || '');
                return sId && sId !== String(activePersona?._id);
              })?.senderPersonaId;
              handleOpenProfile(partnerObj || { avatar, displayName: title, bio: route.params?.bio });
            }}
            activeOpacity={0.8}
          >
            <Image source={{ uri: getMediaUrl(avatar) || DEFAULT_AVATAR }} style={styles.avatarImg} />
            {partnerStatusColor ? <View style={[styles.onlineDot, { backgroundColor: partnerStatusColor }]} /> : null}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.headerTextCol}
          onPress={() => {
            if (spaceId) {
              setSpaceDetailsVisible(true);
            } else {
              const partnerObj = messages.find(m => {
                const sId = String(m.senderPersonaId?._id || m.senderPersonaId || '');
                return sId && sId !== String(activePersona?._id);
              })?.senderPersonaId;
              handleOpenProfile(partnerObj || { avatar, displayName: title, bio: route.params?.bio });
            }
          }}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.headerTitle, { color: dynamicColors.text }]} numberOfLines={1}>
              {spaceData?.title || title || (spaceId ? 'Fluid Space' : 'Conversation')}
            </Text>
            {currentIsLocked && (
              <TouchableOpacity style={styles.headerLockBadge} onPress={handleToggleLockThisChat}>
                <Lock size={12} color="#f59e0b" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.headerSubtitle, { color: dynamicColors.textSecondary }]}>
            {typingUsers.length > 0
              ? `💬 ${typingUsers.join(', ')} typing...`
              : (spaceId ? (spaceData?.description || 'Synchronized room canvas') : partnerSubtitleText)}
          </Text>
        </TouchableOpacity>

        {/* Action Quick Icons & Web Toolbars */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.05)' }]}
            onPress={() => setAiModalVisible(true)}
          >
            <Bot size={18} color={dynamicColors.primary} />
          </TouchableOpacity>

          {spaceId && (
            <>
              <TouchableOpacity
                style={[styles.headerActionBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.05)' }]}
                onPress={() => setCanvasModalVisible(true)}
              >
                <Zap size={18} color={dynamicColors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.headerActionBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.05)' }]}
                onPress={() => setSpaceDetailsVisible(true)}
              >
                <Info size={18} color={dynamicColors.primary} />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.05)' }, privacyMode !== 'normal' && styles.headerActionBtnActive]}
            onPress={() => setPrivacyModalVisible(true)}
          >
            {privacyMode === 'burn' ? (
              <Flame size={18} color="#ef4444" />
            ) : (
              <Lock size={18} color={dynamicColors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages Feed */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <ActivityIndicator color={dynamicColors.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m, index) => String(m._id || m.id || index) + '_' + index}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Media Upload Indicator */}
        {uploading ? (
          <View style={styles.uploadingBox}>
            <ActivityIndicator size="small" color={dynamicColors.primary} />
            <Text style={styles.uploadingText}>Uploading media attachment...</Text>
          </View>
        ) : null}

        {/* Reply Preview Banner */}
        {replyingTo ? (
          <View style={[styles.replyBanner, { backgroundColor: isLight ? 'rgba(79, 70, 229, 0.1)' : 'rgba(99, 102, 241, 0.1)', borderTopColor: dynamicColors.cardBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.replyBannerTitle, { color: dynamicColors.primary }]}>
                Replying to {replyingTo.senderPersonaId?.displayName || 'message'}:
              </Text>
              <Text style={[styles.replyBannerText, { color: dynamicColors.textSecondary }]} numberOfLines={1}>
                {replyingTo.content || 'Attachment'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ padding: 4 }}>
              <Text style={{ color: dynamicColors.textMuted, fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Voice Recording Overlay */}
        {isRecording ? (
          <View style={styles.recordingBar}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTimer}>
              Recording 00:0{recordTime}s
            </Text>
            <TouchableOpacity style={styles.sendRecordBtn} onPress={stopAndSendVoiceRecording}>
              <Text style={styles.sendRecordText}>Send Voice Note ➔</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Input Composer matching Web App design */
          <View style={[styles.composerContainer, { backgroundColor: dynamicColors.card, borderTopColor: dynamicColors.cardBorder }]}>
            <View style={[styles.composerPill, { backgroundColor: dynamicColors.inputBg, borderColor: dynamicColors.inputBorder }]}>
              {/* Left Plus Attachment Icon Button */}
              <TouchableOpacity
                style={styles.pillPlusBtn}
                onPress={() => setAttachmentModalVisible(true)}
              >
                <Plus size={18} color={dynamicColors.textMuted} />
              </TouchableOpacity>

              {/* Input Text */}
              <TextInput
                style={[styles.composerInput, { color: dynamicColors.text }]}
                placeholder={privacyMode === 'burn' ? "Type burn message..." : "Type a message..."}
                placeholderTextColor={dynamicColors.textMuted}
                value={inputText}
                onChangeText={handleTextChange}
                multiline
              />

              {/* Right Media Icons & Send Action */}
              <View style={styles.composerRightActions}>
                <TouchableOpacity style={styles.mediaIconBtn} onPress={handlePickImage}>
                  <ImageIcon size={19} color={dynamicColors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.mediaIconBtn} onPress={startVoiceRecording}>
                  <Mic size={19} color={dynamicColors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sendCircleBtn,
                    { backgroundColor: dynamicColors.primary },
                    !inputText.trim() && styles.sendCircleBtnDisabled
                  ]}
                  onPress={() => dispatchMessage(inputText.trim(), 'text')}
                  disabled={!inputText.trim() || sending}
                >
                  <Send size={15} color="#ffffff" style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Web Tool Modals */}
      <AIToolbarModal
        visible={aiModalVisible}
        conversationId={conversationId}
        spaceId={spaceId}
        onClose={() => setAiModalVisible(false)}
      />

      <SpaceCanvasModal
        visible={canvasModalVisible}
        spaceId={spaceId}
        onClose={() => setCanvasModalVisible(false)}
      />

      <MessageActionModal
        visible={!!actionModalMessage}
        message={actionModalMessage}
        isMe={String(actionModalMessage?.senderPersonaId?._id || actionModalMessage?.senderPersonaId) === String(activePersona?._id)}
        onClose={() => setActionModalMessage(null)}
        onReact={handleReactMessage}
        onReply={(msg) => setReplyingTo(msg)}
        onBurn={handleBurnMessage}
        onDelete={handleDeleteMessage}
      />

      <SpaceDetailsModal
        visible={spaceDetailsVisible}
        spaceId={spaceId}
        onClose={() => setSpaceDetailsVisible(false)}
      />

      <ImageViewerModal
        visible={!!viewImageUrl}
        imageUrl={viewImageUrl}
        onClose={() => setViewImageUrl(null)}
      />

      <AttachmentPickerModal
        visible={attachmentModalVisible}
        onClose={() => setAttachmentModalVisible(false)}
        onPickImage={handlePickImage}
        onPickDocument={handlePickDocument}
        onRecordVoice={startVoiceRecording}
        onTakePhoto={handleTakePhoto}
      />

      <AvatarViewerModal
        visible={avatarViewerTarget.visible}
        onClose={() => setAvatarViewerTarget(prev => ({ ...prev, visible: false }))}
        avatarUrl={avatarViewerTarget.avatarUrl}
        name={avatarViewerTarget.name}
        handle={avatarViewerTarget.handle}
        bio={avatarViewerTarget.bio}
        customStatus={avatarViewerTarget.customStatus}
        targetPersonaId={avatarViewerTarget.targetPersonaId || partnerIdStr}
        onBlockUser={() => navigation.goBack()}
        onDeleteContact={() => navigation.goBack()}
      />

      <PrivacyModeModal
        visible={privacyModalVisible}
        currentMode={privacyMode}
        onClose={() => setPrivacyModalVisible(false)}
        onSelectMode={handleSelectPrivacyMode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.card,
    gap: 12,
  },
  backBtn: {
    paddingRight: 6,
    paddingVertical: 4,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  spaceHeaderBadge: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceHeaderBadgeText: {
    fontSize: 18,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.card,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  headerLockBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  headerActionText: {
    fontSize: 14,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'space-between',
  },
  replyBannerTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
  },
  replyBannerText: {
    fontSize: 11,
    color: colors.white,
  },
  senderHandleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  replyQuoteBox: {
    padding: 6,
    borderRadius: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  replyQuoteMe: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderLeftColor: colors.white,
  },
  replyQuoteOther: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderLeftColor: colors.primary,
  },
  replyQuoteAuthor: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  replyQuoteText: {
    fontSize: 10,
    color: colors.white,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  chatArea: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    gap: 10,
  },
  msgWrapper: {
    width: '100%',
    marginVertical: 2,
  },
  msgMeWrapper: {
    alignItems: 'flex-end',
  },
  msgOtherWrapper: {
    alignItems: 'flex-start',
  },
  msgBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderRadius: 18,
    overflow: 'hidden',
  },
  msgMeBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  msgOtherBubble: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderBottomLeftRadius: 4,
  },
  msgImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  msgMeText: {
    color: colors.white,
  },
  msgOtherText: {
    color: colors.text,
  },
  msgFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  msgMeFooter: {
    justifyContent: 'flex-end',
  },
  msgOtherFooter: {
    justifyContent: 'flex-start',
  },
  msgTimeText: {
    fontSize: 9,
  },
  msgMeTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  msgOtherTime: {
    color: colors.textMuted,
  },
  msgCheckmarks: {
    fontSize: 10,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  audioBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  audioMeBubble: {},
  audioOtherBubble: {},
  audioIcon: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  audioWaveBar: {
    width: 3,
    height: 12,
    backgroundColor: colors.white,
    borderRadius: 2,
    opacity: 0.8,
  },
  audioText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  uploadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
  },
  uploadingText: {
    color: colors.primary,
    fontSize: 11,
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'space-between',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  recordingTimer: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: 'bold',
  },
  sendRecordBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  sendRecordText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  composerContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  composerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 6,
  },
  pillPlusBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxHeight: 90,
  },
  composerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mediaIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCircleBtnDisabled: {
    opacity: 0.4,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    gap: 10,
    minWidth: 200,
    maxWidth: 260,
    marginVertical: 2,
  },
  docIconPill: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docNameText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  docSubText: {
    fontSize: 10,
    marginTop: 2,
  },
});
