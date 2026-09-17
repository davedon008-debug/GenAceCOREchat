'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api, { getMediaUrl } from '../../lib/api';

import Sidebar from '../../components/Sidebar';
import ChatHeader from '../../components/ChatHeader';
import MessageItem from '../../components/MessageItem';
import MessageInput from '../../components/MessageInput';
import SpaceCanvas from '../../components/SpaceCanvas';
import AIToolbar from '../../components/AIToolbar';
import PersonaModal from '../../components/PersonaModal';
import CreateSpaceModal from '../../components/CreateSpaceModal';
import InviteMemberModal from '../../components/InviteMemberModal';
import WelcomeScreen from '../../components/WelcomeScreen';
import NotificationToast from '../../components/NotificationToast';
import ConfirmModal from '../../components/ConfirmModal';
import ToastAlert from '../../components/ToastAlert';
import CosmicHeroBanner from '../../components/CosmicHeroBanner';
import UserProfileBanner from '../../components/UserProfileBanner';
import RightMembersPanel from '../../components/RightMembersPanel';
import SpacesGridView from '../../components/SpacesGridView';
import FriendsView from '../../components/FriendsView';
import SettingsView from '../../components/SettingsView';
import DiscoverView from '../../components/DiscoverView';
import AdminView from '../../components/AdminView';
import PasscodeModal from '../../components/PasscodeModal';
import MobileBottomNav from '../../components/MobileBottomNav';
import { playNotificationSound, getNotifPrefs } from '../../lib/sound';

import { Plus, Search, User, X, Bell, UserX } from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const { token, user, activePersona, loading, logout } = useAuth();
  const socketContext = useSocket() || {};
  const socket = socketContext.socket;
  const onlineUserIds = socketContext.onlineUserIds || [];
  const joinRoom = socketContext.joinRoom || (() => {});
  const leaveRoom = socketContext.leaveRoom || (() => {});
  const emitTyping = socketContext.emitTyping || (() => {});

  // State management
  const [conversations, setConversations] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [blockedUserIds, setBlockedUserIds] = useState([]);
  
  const [activeId, setActiveId] = useState(null);
  const [activeType, setActiveType] = useState('conversation');
  const [activeNotification, setActiveNotification] = useState(null);
  
  const [activeObject, setActiveObject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [polls, setPolls] = useState([]);
  const [replyingToMessage, setReplyingToMessage] = useState(null);

  const [activeNavView, setActiveNavView] = useState('chats'); // 'chats' | 'spaces' | 'friends' | 'discover' | 'settings'
  const [spaceTab, setSpaceTab] = useState('chat'); // 'chat' | 'tasks' | 'polls'
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState(null);
  const [toastAlertConfig, setToastAlertConfig] = useState(null);
  const [dismissedBannerIds, setDismissedBannerIds] = useState([]);
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Chat Lock State Management
  const [passcodeStatus, setPasscodeStatus] = useState({ hasPasscode: false, chatLockEnabled: false, lockedConversations: [], lockedSpaces: [] });
  const [unlockedChats, setUnlockedChats] = useState([]);
  const [pendingUnlockTarget, setPendingUnlockTarget] = useState(null);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeModalMode, setPasscodeModalMode] = useState('unlock');

  const showToast = (message, type = 'info') => {
    setToastAlertConfig({ message, type });
  };

  const [typingUser, setTypingUser] = useState(null);
  const [searchUsersQuery, setSearchUsersQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);

  const messageEndRef = useRef(null);

  const fetchPasscodeStatus = async () => {
    try {
      const res = await api.get('/auth/passcode-status');
      if (res.data.success) {
        setPasscodeStatus({
          hasPasscode: res.data.hasPasscode,
          chatLockEnabled: res.data.chatLockEnabled,
          lockedConversations: (res.data.lockedConversations || []).map(String),
          lockedSpaces: (res.data.lockedSpaces || []).map(String)
        });
      }
    } catch (err) {
      console.error('Failed to fetch passcode status:', err);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations');
      if (res.data.success) {
        setConversations(res.data.conversations);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const fetchSpaces = async () => {
    try {
      const res = await api.get('/spaces');
      if (res.data.success) {
        setSpaces(res.data.spaces);
      }
    } catch (err) {
      console.error('Failed to fetch spaces:', err);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await api.get('/personas/all');
      if (res.data.success) {
        setAllContacts(res.data.contacts);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const res = await api.get('/personas/blocked');
      if (res.data.success) {
        const ids = (res.data.blockedPersonas || []).map(p => String(p._id));
        setBlockedUserIds(ids);
      }
    } catch (err) {
      console.error('Failed to fetch blocked users:', err);
    }
  };

  useEffect(() => {
    if (activePersona) {
      fetchConversations();
      fetchSpaces();
      fetchContacts();
      fetchBlockedUsers();
      fetchPasscodeStatus();
    }
  }, [activePersona]);

  useEffect(() => {
    if (socket && Array.isArray(conversations) && conversations.length > 0) {
      conversations.forEach(c => {
        if (c?._id) joinRoom(c._id);
      });
    }
  }, [socket, conversations]);

  useEffect(() => {
    if (socket && Array.isArray(spaces) && spaces.length > 0) {
      spaces.forEach(s => {
        if (s?._id) joinRoom(s._id);
      });
    }
  }, [socket, spaces]);

  // Real-time Notification Sound & Toast Listener
  const triggerNotification = (senderName, senderAvatar, content, targetId, targetType, isSpace = false, privacyMode = 'normal') => {
    const prefs = getNotifPrefs();
    const relevantPref = isSpace ? prefs.spaceMentions : prefs.messageNotifications;
    if (!relevantPref) return; // silenced by user preference

    playNotificationSound(); // sound.js checks soundEffects pref internally
    
    // Update Document Title
    if (typeof document !== 'undefined') {
      const docTitleStr = privacyMode === 'burn'
        ? `(1) 🔥 Secret Burn message from ${senderName}`
        : `(1) 💬 New message from ${senderName}`;
      document.title = docTitleStr;
      setTimeout(() => {
        document.title = 'GenAce Web v1.0.0';
      }, 5000);
    }

    setActiveNotification({
      senderName: senderName || 'Contact',
      senderAvatar,
      content: content || 'Sent you a message',
      isSpace,
      privacyMode,
      targetId,
      targetType
    });

    // Dispatch Native Browser Notification (if granted and tab is in background)
    try {
      if (typeof window !== 'undefined' && typeof window.Notification !== 'undefined' && window.Notification) {
        if (window.Notification.permission === 'granted') {
          const notifTitle = isSpace ? `[Space] ${senderName}` : senderName || 'New Message';
          const notifBody = privacyMode === 'burn' ? '🔥 Burn on read message' : (content || 'Sent a message');
          const n = new window.Notification(notifTitle, {
            body: notifBody,
            icon: getMediaUrl(senderAvatar),
          });
          n.onclick = () => {
            if (typeof window !== 'undefined') window.focus();
            if (targetId) {
              if (targetType === 'space') selectSpace(targetId);
              else selectConversation(targetId);
            }
          };
        } else if (window.Notification.permission === 'default' && typeof window.Notification.requestPermission === 'function') {
          window.Notification.requestPermission().catch(() => {});
        }
      }
    } catch {
      // Notification API restricted or not available on device
    }
  };

  const handleTestNotification = () => {
    triggerNotification(
      activePersona?.displayName || 'System',
      activePersona?.avatar || null,
      'Notification sound & toast test.',
      conversations[0]?._id,
      'conversation',
      false,
      'normal'
    );
  };

  const markActiveRoomAsRead = async (targetId, targetType) => {
    if (!targetId) return;
    const isConv = targetType === 'conversation';
    const isSpc = targetType === 'space';

    if (socket) {
      socket.emit('message:read', {
        roomId: targetId,
        conversationId: isConv ? targetId : null,
        spaceId: isSpc ? targetId : null
      });
    }

    try {
      await api.post('/messages/read', {
        conversationId: isConv ? targetId : null,
        spaceId: isSpc ? targetId : null
      });
      fetchConversations();
    } catch (err) {
      console.error('Failed to mark room messages as read:', err);
    }
  };

  // Real-time Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    if (activeId) {
      joinRoom(activeId);
      markActiveRoomAsRead(activeId, activeType);
    }

    const handleNewMessage = (newMsg) => {
      const msgSpaceId = newMsg.spaceId?._id || newMsg.spaceId;
      const msgConvId = newMsg.conversationId?._id || newMsg.conversationId;

      const isForCurrentSpace = activeType === 'space' && msgSpaceId && String(msgSpaceId) === String(activeId);
      const isForCurrentConv = activeType === 'conversation' && !msgSpaceId && msgConvId && String(msgConvId) === String(activeId);

      const senderId = newMsg.senderPersonaId?._id || newMsg.senderPersonaId;
      const isFromMe = activePersona && String(senderId) === String(activePersona._id);
      const isSenderBlocked = senderId && blockedUserIds.includes(String(senderId));

      // Ignore notifications/toasts if sender is blocked or active persona is on DND status
      if (isSenderBlocked || (!isFromMe && activePersona?.status === 'dnd')) return;

      if (isForCurrentSpace || isForCurrentConv) {
        setMessages(prev => {
          const msgIdStr = String(newMsg._id || newMsg.id || '');
          if (prev.some(m => String(m._id || m.id || '') === msgIdStr)) return prev;

          if (isFromMe) {
            const tempIndex = prev.findIndex(m => m.pending || (typeof m._id === 'string' && m._id.startsWith('temp_')));
            if (tempIndex !== -1) {
              const copy = [...prev];
              copy[tempIndex] = newMsg;
              return copy;
            }
          }
          return [...prev, newMsg];
        });

        if (!isFromMe) {
          playNotificationSound();
          markActiveRoomAsRead(activeId, activeType);
        }
      }

      // Trigger notification toast & sound chime if message is from someone else AND not in current open chat
      if (!isFromMe && !isForCurrentSpace && !isForCurrentConv) {
        const senderName = newMsg.senderPersonaId?.displayName || 'Someone';
        const senderAvatar = newMsg.senderPersonaId?.avatar;
        const targetId = msgSpaceId || msgConvId;
        const targetType = msgSpaceId ? 'space' : 'conversation';
        const pMode = newMsg.privacyMode || 'normal';

        let contentStr = '';
        if (pMode === 'burn') {
          contentStr = '🔥 Burn on read message received (click to reveal)';
        } else if (pMode === 'vault') {
          contentStr = '🛡️ Vault encrypted message received';
        } else if (pMode === 'disappearing') {
          contentStr = '⏱️ Disappearing message received';
        } else if (pMode === 'anonymous') {
          contentStr = '👻 Anonymous message received';
        } else if (pMode === 'private') {
          contentStr = '🔒 Private message received';
        } else {
          contentStr = newMsg.content || (newMsg.contentType === 'voice' ? '🎙️ Voice note' : newMsg.contentType === 'image' ? '📷 Photo' : 'Sent a message');
        }

        triggerNotification(senderName, senderAvatar, contentStr, targetId, targetType, !!msgSpaceId, pMode);
      }

      fetchConversations();
      if (msgSpaceId) {
        fetchSpaces();
      }
    };

    const handleTypingStart = ({ personaName }) => {
      setTypingUser(personaName);
    };

    const handleTypingStop = () => {
      setTypingUser(null);
    };

    const handleReactionUpdate = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
      fetchConversations();
    };

    const handleMessagesRead = ({ conversationId: readConvId, spaceId: readSpaceId, readerPersonaId }) => {
      setMessages(prev => prev.map(m => {
        const mConvId = m.conversationId?._id || m.conversationId;
        const mSpaceId = m.spaceId?._id || m.spaceId;
        const isMatch = (readConvId && String(mConvId) === String(readConvId)) ||
                        (readSpaceId && String(mSpaceId) === String(readSpaceId));

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

    const handlePrivacyUpdated = ({ roomId, privacyMode }) => {
      if (String(roomId) === String(activeId)) {
        setActiveObject(prev => prev ? { ...prev, privacyMode } : prev);
      }
      setConversations(prev => prev.map(c => String(c._id) === String(roomId) ? { ...c, privacyMode } : c));
      setSpaces(prev => prev.map(s => String(s._id) === String(roomId) ? { ...s, privacyMode } : s));
    };

    const handleMessageBurned = ({ messageId, content, isBurned }) => {
      setMessages(prev => prev.map(m => String(m._id || m.id) === String(messageId) ? { ...m, content, isBurned: true, mediaUrl: '' } : m));
    };

    const handleSpaceCreated = () => {
      fetchSpaces();
      fetchConversations();
    };

    const handleSpaceUpdated = (updatedSpace) => {
      fetchSpaces();
      fetchConversations();
      if (activeType === 'space' && updatedSpace?._id && String(updatedSpace._id) === String(activeId)) {
        setActiveObject(updatedSpace);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('reaction:update', handleReactionUpdate);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('messages:read', handleMessagesRead);
    socket.on('conversation:privacy:updated', handlePrivacyUpdated);
    socket.on('message:burned', handleMessageBurned);
    socket.on('space:created', handleSpaceCreated);
    socket.on('space:updated', handleSpaceUpdated);

    return () => {
      if (activeId) leaveRoom(activeId);
      socket.off('message:new', handleNewMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('reaction:update', handleReactionUpdate);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('messages:read', handleMessagesRead);
      socket.off('conversation:privacy:updated', handlePrivacyUpdated);
      socket.off('message:burned', handleMessageBurned);
      socket.off('space:created', handleSpaceCreated);
      socket.off('space:updated', handleSpaceUpdated);
    };
  }, [socket, activeId, activeType, activePersona]);

  // Auto-scroll message feed
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = async (convId, preloadedConv = null) => {
    if (!convId) return false;

    try {
      let conv = preloadedConv;
      if (!conv && Array.isArray(conversations)) {
        conv = conversations.find(c => String(c._id) === String(convId));
      }
      
      if (!conv) {
        const singleRes = await api.get(`/conversations/${convId}`);
        if (singleRes.data.success) {
          conv = singleRes.data.conversation;
        }
      }

      if (!conv) {
        console.warn(`Conversation ${convId} not found.`);
        return false;
      }

      setActiveId(convId);
      setActiveType('conversation');
      setSpaceTab('chat');
      setActiveObject(conv);

      if (typeof window !== 'undefined') {
        localStorage.setItem('donchat_active_id', convId);
        localStorage.setItem('donchat_active_type', 'conversation');
      }

      const msgRes = await api.get(`/messages/conversation/${convId}`);
      if (msgRes.data.success) {
        setMessages(msgRes.data.messages);
      }
      markActiveRoomAsRead(convId, 'conversation');
      return true;
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
      return false;
    }
  };

  const handleSelectConversationWithLock = (convId, preloadedConv = null) => {
    const convIdStr = String(convId);
    const isLocked = passcodeStatus.chatLockEnabled && passcodeStatus.lockedConversations.includes(convIdStr);
    const isUnlockedInSession = unlockedChats.includes(convIdStr);

    // Re-lock previous active chat when switching away from it
    if (activeId && String(activeId) !== convIdStr) {
      setUnlockedChats(prev => prev.filter(id => id !== String(activeId)));
    }

    if (isLocked && !isUnlockedInSession) {
      setPendingUnlockTarget({ id: convId, preloaded: preloadedConv });
      setPasscodeModalMode('unlock');
      setShowPasscodeModal(true);
      return;
    }
    selectConversation(convId, preloadedConv);
  };

  const handleCloseActiveChat = () => {
    if (activeId) {
      setUnlockedChats(prev => prev.filter(id => id !== String(activeId)));
    }
    setActiveId(null);
  };

  const handleToggleLockActiveChat = async () => {
    if (!activeId) return;
    const activeIdStr = String(activeId);
    if (!passcodeStatus.hasPasscode) {
      showToast('Please set a special passcode in Settings first.', 'info');
      setPasscodeModalMode('setup');
      setShowPasscodeModal(true);
      return;
    }

    try {
      const isSpace = activeType === 'space';
      const res = await api.post('/auth/toggle-lock-chat', {
        conversationId: !isSpace ? activeId : null,
        spaceId: isSpace ? activeId : null
      });
      if (res.data.success) {
        const isLockedNow = res.data.isLocked;
        setPasscodeStatus(prev => ({
          ...prev,
          chatLockEnabled: res.data.chatLockEnabled !== undefined ? res.data.chatLockEnabled : prev.chatLockEnabled,
          lockedConversations: (res.data.lockedConversations || []).map(String),
          lockedSpaces: (res.data.lockedSpaces || []).map(String)
        }));
        if (isLockedNow) {
          setUnlockedChats(prev => prev.filter(id => id !== activeIdStr));
          showToast(`${isSpace ? 'Space' : 'Chat'} locked with passcode 🔒`, 'success');
        } else {
          showToast(`${isSpace ? 'Space' : 'Chat'} unlocked 🔓`, 'info');
        }
        fetchSpaces();
        fetchConversations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to lock item', 'error');
    }
  };

  const handleSelectSpaceWithLock = (spaceId) => {
    const spaceIdStr = String(spaceId);
    const spaceObj = spaces.find(s => String(s._id) === spaceIdStr);
    const isLocked = passcodeStatus.chatLockEnabled && (
      (passcodeStatus.lockedSpaces && passcodeStatus.lockedSpaces.includes(spaceIdStr)) ||
      (spaceObj && spaceObj.isLocked)
    );
    const isUnlockedInSession = unlockedChats.includes(spaceIdStr);

    if (activeId && String(activeId) !== spaceIdStr) {
      setUnlockedChats(prev => prev.filter(id => id !== String(activeId)));
    }

    if (isLocked && !isUnlockedInSession) {
      setPendingUnlockTarget({ id: spaceId, isSpace: true });
      setPasscodeModalMode('unlock');
      setShowPasscodeModal(true);
      return;
    }
    selectSpace(spaceId);
  };

  const selectSpace = async (spaceId) => {
    if (!spaceId) return false;

    try {
      const res = await api.get(`/spaces/${spaceId}`);
      if (res.data.success && res.data.space) {
        setActiveId(spaceId);
        setActiveType('space');
        setActiveObject(res.data.space);
        setTasks(res.data.tasks || []);
        setPolls(res.data.polls || []);

        if (typeof window !== 'undefined') {
          localStorage.setItem('donchat_active_id', spaceId);
          localStorage.setItem('donchat_active_type', 'space');
        }

        const rawConvId = res.data.space.conversationId;
        const convId = (typeof rawConvId === 'object' && rawConvId ? (rawConvId._id || rawConvId.id) : rawConvId) || 'none';

        const msgRes = await api.get(`/messages/conversation/${convId}?spaceId=${spaceId}`);
        if (msgRes.data.success) {
          setMessages(msgRes.data.messages);
        }
        markActiveRoomAsRead(spaceId, 'space');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to load space details:', err);
      return false;
    }
  };

  const handleSendMessage = async ({ content, contentType, mediaUrl, voiceDuration, replyTo }) => {
    if (!activeId || (!content && !mediaUrl)) return;

    const rawConvId = activeType === 'conversation' ? activeId : activeObject?.conversationId;
    const convId = (typeof rawConvId === 'object' && rawConvId ? (rawConvId._id || rawConvId.id) : rawConvId) || null;

    // Create Optimistic Message for 0ms Instant Feedback
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const optimisticMsg = {
      _id: tempId,
      conversationId: convId,
      spaceId: activeType === 'space' ? activeId : null,
      senderPersonaId: activePersona,
      content,
      contentType,
      mediaUrl: mediaUrl || '',
      voiceDuration,
      replyTo: replyTo || null,
      privacyMode: activeObject?.privacyMode || 'normal',
      createdAt: new Date().toISOString(),
      status: 'pending',
      pending: true
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await api.post('/messages', {
        conversationId: convId,
        spaceId: activeType === 'space' ? activeId : null,
        content,
        contentType,
        mediaUrl: mediaUrl || '',
        voiceDuration,
        replyTo: replyTo || null,
        privacyMode: activeObject?.privacyMode || 'normal'
      });

      if (res.data.success) {
        const sentMsg = res.data.message;
        setMessages(prev => {
          const existsByRealId = prev.some(m => String(m._id || m.id || '') === String(sentMsg._id || sentMsg.id || ''));
          if (existsByRealId) {
            return prev.filter(m => m._id !== tempId);
          }
          return prev.map(m => (m._id === tempId ? sentMsg : m));
        });

        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => prev.filter(m => m._id !== tempId));
    }
  };

  const handleUpdatePrivacy = async (privacyMode) => {
    if (!activeId) return;

    try {
      if (activeType === 'space') {
        const res = await api.patch(`/spaces/${activeId}/privacy`, { privacyMode });
        if (res.data?.success) {
          const updated = res.data.space;
          setActiveObject(updated);
          setSpaces(prev => prev.map(s => String(s._id) === String(activeId) ? updated : s));
          showToast(`Space Privacy Mode set to ${privacyMode.toUpperCase()}`, 'success');
          if (socket) {
            socket.emit('conversation:privacy:update', { roomId: activeId, privacyMode });
          }
        }
      } else {
        const res = await api.patch(`/conversations/${activeId}/privacy`, { privacyMode });
        if (res.data?.success) {
          const updated = res.data.conversation;
          setActiveObject(updated);
          setConversations(prev => prev.map(c => String(c._id) === String(activeId) ? updated : c));
          showToast(`Privacy mode set to ${privacyMode.toUpperCase()}`, 'success');
          if (socket) {
            socket.emit('conversation:privacy:update', { roomId: activeId, privacyMode });
          }
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update privacy mode', 'error');
    }
  };

  const handleUpgradeToSpace = async () => {
    try {
      const res = await api.post('/spaces', {
        conversationId: activeId,
        title: `${activeObject?.name || 'Fluid Space'}`
      });

      if (res.data.success) {
        fetchSpaces();
        selectSpace(res.data.space._id);
      }
    } catch (err) {
      console.error('Failed to upgrade space:', err);
    }
  };

  const handleToggleReaction = async (messageId, emoji) => {
    try {
      const res = await api.post(`/messages/${messageId}/reaction`, { emoji });
      if (res.data.success) {
        setMessages(prev => prev.map(m => m._id === messageId ? res.data.message : m));
        if (socket) {
          socket.emit('reaction:toggle', { roomId: activeId, messageId, reactions: res.data.message.reactions });
        }
      }
    } catch (err) {
      console.error('Failed to reaction:', err);
    }
  };

  const handleBurnMessage = async (messageId) => {
    try {
      const res = await api.post(`/messages/${messageId}/burn`);
      if (res.data.success) {
        setMessages(prev => prev.map(m => m._id === messageId ? res.data.message : m));
      }
    } catch (err) {
      console.error('Failed to burn message:', err);
    }
  };

  const handleDeleteMessage = async (messageId, mode = 'everyone') => {
    try {
      const res = await api.delete(`/messages/${messageId}?mode=${mode}`);
      if (res.data.success) {
        setMessages(prev => prev.filter(m => m._id !== messageId));
        fetchConversations();
        if (socket && mode === 'everyone') {
          socket.emit('message:delete', { roomId: activeId, messageId });
        }
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleAddTask = async (title) => {
    try {
      const res = await api.post(`/spaces/${activeId}/tasks`, { title });
      if (res.data.success) {
        setTasks(prev => [...prev, res.data.task]);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleToggleTask = async (taskId, status) => {
    try {
      const res = await api.patch(`/spaces/tasks/${taskId}`, { status });
      if (res.data.success) {
        setTasks(prev => prev.map(t => t._id === taskId ? res.data.task : t));
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleAddPoll = async ({ question, options }) => {
    try {
      const res = await api.post(`/spaces/${activeId}/polls`, { question, options });
      if (res.data.success) {
        setPolls(prev => [...prev, res.data.poll]);
      }
    } catch (err) {
      console.error('Failed to create poll:', err);
    }
  };

  const handleVotePoll = async (pollId, optionIndex) => {
    try {
      const res = await api.post(`/spaces/polls/${pollId}/vote`, { optionIndex });
      if (res.data.success) {
        setPolls(prev => prev.map(p => p._id === pollId ? res.data.poll : p));
      }
    } catch (err) {
      console.error('Failed to vote poll:', err);
    }
  };

  useEffect(() => {
    if (showNewChatModal) {
      setSearchUsersQuery('');
      setFoundUsers([]);
    }
  }, [showNewChatModal]);

  const handleSearchUsers = async (query = '') => {
    setSearchUsersQuery(query);
    if (!query.trim()) {
      setFoundUsers([]);
      return;
    }

    try {
      const res = await api.get(`/personas/search?query=${encodeURIComponent(query.trim())}`);
      if (res.data.success) {
        setFoundUsers(res.data.personas);
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const startNewDirectMessage = async (targetPersonaId) => {
    try {
      const res = await api.post('/conversations', { targetPersonaId, type: 'direct' });
      if (res.data.success) {
        const conv = res.data.conversation;
        await fetchConversations();
        await fetchContacts();
        selectConversation(conv._id, conv);
        setShowNewChatModal(false);
      }
    } catch (err) {
      console.error('Failed to start DM:', err);
    }
  };

  useEffect(() => {
    if (!loading && (!token || !activePersona)) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }, [loading, token, activePersona]);

  const rawTargetParticipant = activeType === 'conversation'
    ? activeObject?.participants?.find(p => {
        const idStr = typeof p === 'object' && p ? (p._id || p.id) : p;
        return idStr && String(idStr) !== String(activePersona?._id);
      }) || activeObject?.participants?.[0]
    : null;

  const rawTargetId = typeof rawTargetParticipant === 'object' && rawTargetParticipant ? (rawTargetParticipant._id || rawTargetParticipant.id) : rawTargetParticipant;

  const currentTargetParticipant = (typeof rawTargetParticipant === 'object' && rawTargetParticipant?.displayName)
    ? rawTargetParticipant
    : ((allContacts || []).find(ac => String(ac._id) === String(rawTargetId)) || rawTargetParticipant);

  const currentTargetPersonaId = rawTargetId ? String(rawTargetId) : null;
  const isCurrentTargetBlocked = currentTargetPersonaId && blockedUserIds.includes(String(currentTargetPersonaId));

  const headerTitle = activeType === 'space'
    ? activeObject?.title
    : activeObject?.name || currentTargetParticipant?.displayName || (currentTargetParticipant?.username ? `@${currentTargetParticipant.username}` : 'Conversation');

  const headerSubtitle = activeType === 'space'
    ? 'Synchronized room canvas'
    : (currentTargetParticipant?.bio || currentTargetParticipant?.customStatus || (currentTargetParticipant?.username ? `@${currentTargetParticipant.username}` : 'Direct Message'));

  const headerAvatar = activeType === 'conversation' ? getMediaUrl(currentTargetParticipant?.avatar, headerTitle) : null;

  const handleToggleBlockUser = () => {
    if (activeType !== 'conversation' || !activeObject || !currentTargetPersonaId) return;

    const targetName = currentTargetParticipant?.displayName || currentTargetParticipant?.username || 'this user';

    if (isCurrentTargetBlocked) {
      setConfirmModalConfig({
        isOpen: true,
        title: `Unblock ${targetName}?`,
        message: `${targetName} will be able to message you and see when you are online again.`,
        confirmText: 'Unblock User',
        cancelText: 'Cancel',
        type: 'success',
        onConfirm: async () => {
          try {
            setConfirmModalConfig(prev => prev ? { ...prev, isLoading: true } : null);
            const res = await api.delete(`/personas/block/${currentTargetPersonaId}`);
            if (res.data.success) {
              showToast(`${targetName} has been unblocked.`, 'success');
              fetchBlockedUsers();
              fetchConversations();
              fetchContacts();
            }
          } catch (err) {
            showToast(err.response?.data?.message || 'Failed to unblock user', 'error');
          } finally {
            setConfirmModalConfig(null);
          }
        }
      });
    } else {
      setConfirmModalConfig({
        isOpen: true,
        title: `Block ${targetName}?`,
        message: `Are you sure you want to block ${targetName}? They will no longer be able to message you.`,
        confirmText: 'Block User',
        cancelText: 'Cancel',
        type: 'danger',
        onConfirm: async () => {
          try {
            setConfirmModalConfig(prev => prev ? { ...prev, isLoading: true } : null);
            const res = await api.post(`/personas/block/${currentTargetPersonaId}`);
            if (res.data.success) {
              showToast(`${targetName} has been blocked.`, 'success');
              fetchBlockedUsers();
              fetchConversations();
              fetchContacts();
            }
          } catch (err) {
            showToast(err.response?.data?.message || 'Failed to block user', 'error');
          } finally {
            setConfirmModalConfig(null);
          }
        }
      });
    }
  };

  const handleRemoveContact = (targetPersonaId) => {
    if (!targetPersonaId) return;
    const targetName = currentTargetParticipant?.displayName || currentTargetParticipant?.username || 'this user';
    setConfirmModalConfig({
      isOpen: true,
      title: `Remove ${targetName}?`,
      message: `Are you sure you want to remove ${targetName} from your contacts?`,
      confirmText: 'Remove Contact',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          setConfirmModalConfig(prev => prev ? { ...prev, isLoading: true } : null);
          const res = await api.delete(`/personas/contacts/remove/${targetPersonaId}`);
          if (res.data.success) {
            showToast(`${targetName} removed from contacts.`, 'success');
            fetchContacts();
            fetchConversations();
          }
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to remove contact', 'error');
        } finally {
          setConfirmModalConfig(null);
        }
      }
    });
  };

  const handleDeleteConversation = () => {
    if (!activeId) return;

    const titleName = activeType === 'space' ? (activeObject?.title || activeObject?.name) : headerTitle;
    
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Conversation?',
      message: `Are you sure you want to delete ${titleName}? This chat will be removed from your conversation list.`,
      confirmText: 'Delete Chat',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          setConfirmModalConfig(prev => prev ? { ...prev, isLoading: true } : null);
          const res = await api.delete(`/conversations/${activeId}`);
          if (res.data.success) {
            showToast('Conversation deleted.', 'info');
            setActiveId(null);
            setActiveObject(null);
            fetchConversations();
          }
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to delete conversation', 'error');
        } finally {
          setConfirmModalConfig(null);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-[#090c15]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-xs text-cyan-400 font-semibold tracking-wider">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  if (!token || !activePersona) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-[#090c15]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-xs text-cyan-400 font-semibold tracking-wider">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex overflow-hidden bg-background select-none relative">
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Navigation Sidebar Wrapper: Permanent column on desktop (>= md), Slide-over drawer on mobile (< md) */}
      <div className={`
        h-full transition-all duration-300 shrink-0 z-50
        md:relative md:translate-x-0 md:w-60 lg:w-64 md:block
        ${mobileSidebarOpen ? 'fixed inset-y-0 left-0 w-64 translate-x-0 bg-[#090d18] shadow-2xl block' : 'hidden md:block'}
      `}>
        <Sidebar
          conversations={conversations}
          spaces={spaces}
          allContacts={allContacts}
          lockedConversations={passcodeStatus.chatLockEnabled ? (passcodeStatus.lockedConversations || []) : []}
          lockedSpaces={passcodeStatus.chatLockEnabled ? (passcodeStatus.lockedSpaces || []) : []}
          activeId={activeId}
          activeType={activeType}
          activeNav={activeNavView}
          onSelectNav={(nav) => {
            setActiveNavView(nav);
            if (nav !== 'chats') setActiveId(null);
            setMobileSidebarOpen(false);
          }}
          onSelectConversation={(id, conv) => {
            setActiveNavView('chats');
            handleSelectConversationWithLock(id, conv);
            setMobileSidebarOpen(false);
          }}
          onSelectSpace={(id) => {
            setActiveNavView('chats');
            handleSelectSpaceWithLock(id);
            setMobileSidebarOpen(false);
          }}
          onStartDM={(id) => {
            setActiveNavView('chats');
            startNewDirectMessage(id);
            setMobileSidebarOpen(false);
          }}
          onOpenNewChat={() => setShowNewChatModal(true)}
          onOpenCreateSpace={() => setShowCreateSpaceModal(true)}
          onOpenNewPersona={() => setShowPersonaModal(true)}
          onResetActive={() => {
            setActiveId(null);
            setMobileSidebarOpen(false);
          }}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onOpenCameraModal={() => setShowCameraModal(true)}
          onTestNotification={handleTestNotification}
        />
      </div>

      {/* Main Workspace Viewport: Always flex and visible across all screen sizes */}
      <main className="flex-1 flex h-full overflow-hidden relative w-full bg-[#080b14]">
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {activeId ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Header Bar */}
              <ChatHeader
                title={headerTitle}
                subtitle={headerSubtitle}
                avatar={headerAvatar}
                icon={activeObject?.icon}
                privacyMode={activeObject?.privacyMode || 'normal'}
                onUpdatePrivacy={handleUpdatePrivacy}
                onUpgradeToSpace={handleUpgradeToSpace}
                onToggleAIPanel={() => setShowAIPanel(!showAIPanel)}
                showAIPanel={showAIPanel}
                isSpace={activeType === 'space'}
                onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
                onOpenInviteModal={() => setShowInviteModal(true)}
                onCloseActive={handleCloseActiveChat}
                onBlockUser={handleToggleBlockUser}
                onDeleteConversation={handleDeleteConversation}
                isBlocked={isCurrentTargetBlocked}
                onToggleRightPanel={() => setShowRightPanel(prev => !prev)}
                showRightPanel={showRightPanel}
                onToggleLockChat={activeType === 'conversation' ? handleToggleLockActiveChat : undefined}
                isChatLocked={passcodeStatus.chatLockEnabled && passcodeStatus.lockedConversations.includes(String(activeId))}
              />

              {/* Fluid Space Canvas / Chat Stream */}
              {activeType === 'space' ? (
                <SpaceCanvas
                  activeTab={spaceTab}
                  onTabChange={setSpaceTab}
                  tasks={tasks}
                  polls={polls}
                  onAddTask={handleAddTask}
                  onToggleTask={handleToggleTask}
                  onAddPoll={handleAddPoll}
                  onVotePoll={handleVotePoll}
                >
                  {/* Cosmic Planet Hero Banner */}
                  <CosmicHeroBanner title={headerTitle} memberCount={`${activeObject?.members?.length || 0}`} />

                  {/* Chat Feed */}
                  <div className="flex-1 overflow-y-auto px-4 md:px-6 space-y-2 bg-[#090c15]">
                    {messages.map(m => (
                      <MessageItem
                        key={m._id}
                        message={m}
                        currentPersonaId={activePersona?._id}
                        activePersona={activePersona}
                        onReaction={handleToggleReaction}
                        onBurnMessage={handleBurnMessage}
                        onDeleteMessage={handleDeleteMessage}
                        onReplyMessage={(msg) => setReplyingToMessage(msg)}
                      />
                    ))}
                    {typingUser && (
                      <p className="text-[11px] text-cyan-400 italic animate-pulse">
                        ✍️ {typingUser} is typing...
                      </p>
                    )}
                    <div ref={messageEndRef} />
                  </div>
                </SpaceCanvas>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden bg-[#090c15]">
                  {/* Target User Profile Banner */}
                  {!dismissedBannerIds.includes(String(activeId)) && (
                    <UserProfileBanner
                      participant={currentTargetParticipant}
                      onClose={() => setDismissedBannerIds(prev => [...prev, String(activeId)])}
                      onBlockUser={handleToggleBlockUser}
                      onRemoveContact={() => handleRemoveContact(currentTargetPersonaId)}
                      isBlocked={isCurrentTargetBlocked}
                    />
                  )}

                  <div className="flex-1 overflow-y-auto p-4 pt-6 md:p-6 md:pt-8 space-y-3 bg-[#090c15]">
                    {messages.map(m => (
                      <MessageItem
                        key={m._id}
                        message={m}
                        currentPersonaId={activePersona?._id}
                        activePersona={activePersona}
                        onReaction={handleToggleReaction}
                        onBurnMessage={handleBurnMessage}
                        onDeleteMessage={handleDeleteMessage}
                        onReplyMessage={(msg) => setReplyingToMessage(msg)}
                      />
                    ))}
                    {typingUser && (
                      <p className="text-[11px] text-cyan-400 italic animate-pulse">
                        ✍️ {typingUser} is typing...
                      </p>
                    )}
                    <div ref={messageEndRef} />
                  </div>
                </div>
              )}

              {/* Message Input Composer or Blocked Banner */}
              {isCurrentTargetBlocked ? (
                <div className="p-4 bg-[#090c15] border-t border-rose-500/30 text-center text-xs text-rose-300 font-semibold flex items-center justify-center gap-2 select-none shrink-0">
                  <UserX className="w-4 h-4 text-rose-400" />
                  <span>You have blocked this user. Unblock them to send messages.</span>
                  <button
                    onClick={handleToggleBlockUser}
                    className="ml-2 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition"
                  >
                    Unblock User
                  </button>
                </div>
              ) : (
                <MessageInput
                  onSendMessage={handleSendMessage}
                  onTyping={(isTyping) => emitTyping(activeId, isTyping)}
                  replyingTo={replyingToMessage}
                  onCancelReply={() => setReplyingToMessage(null)}
                  onFocus={() => messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                />
              )}
            </div>
          ) : activeNavView === 'spaces' ? (
            <SpacesGridView
              spaces={spaces}
              onSelectSpace={(id) => selectSpace(id)}
              onOpenCreateSpace={() => setShowCreateSpaceModal(true)}
              onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
              onBack={() => setActiveNavView('chats')}
            />
          ) : activeNavView === 'discover' ? (
            <DiscoverView
              spaces={spaces}
              allContacts={allContacts}
              onSelectSpace={(id) => selectSpace(id)}
              onStartDM={(id) => startNewDirectMessage(id)}
              onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
              onBack={() => setActiveNavView('chats')}
            />
          ) : activeNavView === 'friends' ? (
            <FriendsView
              allContacts={allContacts}
              onStartDM={(id) => startNewDirectMessage(id)}
              onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
              onBack={() => setActiveNavView('chats')}
              onRefreshContacts={fetchContacts}
            />
          ) : activeNavView === 'settings' || activeNavView === 'notifications' ? (
            <SettingsView onBack={() => setActiveNavView('chats')} defaultSection={activeNavView === 'notifications' ? 'notifications' : undefined} />
          ) : activeNavView === 'admin' && user?.role === 'admin' ? (
            <AdminView
              onBack={() => setActiveNavView('chats')}
              onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
              onInspectSpace={async (spaceId) => {
                await selectSpace(spaceId);
                setActiveNavView('chats');
              }}
            />
          ) : activeNavView === 'chats' ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Desktop WelcomeScreen */}
              <div className="hidden md:block flex-1 h-full overflow-hidden">
                <WelcomeScreen
                  onOpenNewChat={() => setShowNewChatModal(true)}
                  onOpenCreateSpace={() => setShowCreateSpaceModal(true)}
                  onOpenNewPersona={() => setShowPersonaModal(true)}
                  activePersona={activePersona}
                  onLogout={logout}
                  onSelectNav={(nav) => setActiveNavView(nav)}
                  onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
                  conversations={conversations}
                  spaces={spaces}
                  onSelectConversation={(id) => handleSelectConversationWithLock(id)}
                  onSelectSpace={(id) => selectSpace(id)}
                  onStartDM={(id) => startNewDirectMessage(id)}
                />
              </div>

              {/* Mobile Full-Screen Main Tab List View matching MainTabScreen.js */}
              <div className="block md:hidden flex-1 h-full overflow-hidden pb-14">
                <Sidebar
                  conversations={conversations}
                  spaces={spaces}
                  allContacts={allContacts}
                  lockedConversations={passcodeStatus.chatLockEnabled ? (passcodeStatus.lockedConversations || []) : []}
                  lockedSpaces={passcodeStatus.chatLockEnabled ? (passcodeStatus.lockedSpaces || []) : []}
                  activeId={activeId}
                  activeType={activeType}
                  activeNav={activeNavView}
                  onSelectNav={(nav) => setActiveNavView(nav)}
                  onSelectConversation={(id, conv) => handleSelectConversationWithLock(id, conv)}
                  onSelectSpace={(id) => handleSelectSpaceWithLock(id)}
                  onStartDM={(id) => startNewDirectMessage(id)}
                  onOpenNewChat={() => setShowNewChatModal(true)}
                  onOpenCreateSpace={() => setShowCreateSpaceModal(true)}
                  onOpenNewPersona={() => setShowPersonaModal(true)}
                  onResetActive={() => setActiveId(null)}
                  isMobileView={true}
                />
              </div>
            </div>
          ) : (
            <WelcomeScreen
              onOpenNewChat={() => setShowNewChatModal(true)}
              onOpenCreateSpace={() => setShowCreateSpaceModal(true)}
              onOpenNewPersona={() => setShowPersonaModal(true)}
              activePersona={activePersona}
              onLogout={logout}
              onSelectNav={(nav) => setActiveNavView(nav)}
              onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
              conversations={conversations}
              spaces={spaces}
              onSelectConversation={(id) => handleSelectConversationWithLock(id)}
              onSelectSpace={(id) => selectSpace(id)}
              onStartDM={(id) => startNewDirectMessage(id)}
            />
          )}
        </div>

        {/* Mobile Fixed Bottom Navigation Bar matching MainTabScreen */}
        {!activeId && (
          <MobileBottomNav
            activeTab={activeNavView}
            onSelectTab={(tab) => {
              setActiveNavView(tab);
              setActiveId(null);
            }}
            unreadChatsCount={(conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
            onlineFriendsCount={(allContacts || []).filter(c => onlineUserIds.includes(String(c._id))).length}
          />
        )}

        {/* Floating Members Panel Button — visible on mobile/tablet for non-chat views */}
        {!activeId && (
          <button
            onClick={() => setShowRightPanel(prev => !prev)}
            className="hidden sm:flex xl:hidden fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-2xl shadow-indigo-500/30 transition active:scale-95"
          >
            <span>👥</span>
            <span>{showRightPanel ? 'Hide' : 'Members'}</span>
          </button>
        )}

        {/* Permanent Right Sidebar matching reference screenshot */}
        <RightMembersPanel
          allContacts={allContacts}
          onlineUserIds={onlineUserIds}
          activePersona={activePersona}
          onStartDM={(id) => { startNewDirectMessage(id); setShowRightPanel(false); }}
          onOpenCreateSpace={() => { setShowCreateSpaceModal(true); setShowRightPanel(false); }}
          onOpenNewChat={() => { setShowNewChatModal(true); setShowRightPanel(false); }}
          isOpen={showRightPanel}
          onClose={() => setShowRightPanel(false)}
        />
      </main>

      {/* Camera / Story Capture Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-between p-4 z-50 animate-fadeIn">
          <div className="w-full flex items-center justify-between pt-2 px-2 text-white">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-mono">
              📷 Camera & Media Snap
            </span>
            <button onClick={() => setShowCameraModal(false)} className="p-2 text-gray-400 hover:text-white rounded-full bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full max-w-sm aspect-[3/4] bg-slate-900 border border-white/20 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center shadow-2xl my-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
            <p className="text-sm font-semibold text-gray-300 z-10 text-center px-6">
              📷 Viewfinder Ready
            </p>
            <p className="text-xs text-cyan-400 z-10 text-center mt-1 font-mono">
              Tap shutter to capture photo or record story
            </p>

            {/* Simulated Shutter Button */}
            <div className="absolute bottom-6 flex items-center gap-6 z-10">
              <button 
                onClick={() => {
                  showToast('Photo captured! Posted to your Status Story.', 'success');
                  setShowCameraModal(false);
                }}
                className="w-16 h-16 rounded-full border-4 border-white bg-emerald-500/80 hover:bg-emerald-400 active:scale-90 transition-all shadow-xl" 
              />
            </div>
          </div>

          <p className="text-[11px] text-gray-400 pb-2">GenAce Encrypted Snap Engine</p>
        </div>
      )}

      {/* AI Context Toolbar Drawer */}
      {showAIPanel && (
        <AIToolbar
          conversationId={activeType === 'conversation' ? activeId : activeObject?.conversationId}
          spaceId={activeType === 'space' ? activeId : null}
          onClose={() => setShowAIPanel(false)}
        />
      )}

      {/* Persona Creation Modal */}
      {showPersonaModal && (
        <PersonaModal onClose={() => setShowPersonaModal(false)} />
      )}

      {/* Create Fluid Space Modal */}
      {showCreateSpaceModal && (
        <CreateSpaceModal
          onClose={() => setShowCreateSpaceModal(false)}
          onSuccess={async (newSpace) => {
            await fetchSpaces();
            selectSpace(newSpace._id);
          }}
        />
      )}

      {/* Invite Member to Space Modal */}
      {showInviteModal && activeType === 'space' && activeObject && (
        <InviteMemberModal
          space={activeObject}
          onClose={() => setShowInviteModal(false)}
          onSuccess={async (updatedSpace) => {
            setActiveObject(updatedSpace);
            await fetchSpaces();
          }}
        />
      )}

      {/* New Conversation Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Start New Conversation</h3>
              <button onClick={() => setShowNewChatModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search handle (@username only)..."
                value={searchUsersQuery}
                onChange={e => handleSearchUsers(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {foundUsers.map(u => (
                <button
                  key={u._id}
                  onClick={() => startNewDirectMessage(u._id)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-left text-xs transition"
                >
                  <div className="flex items-center gap-3">
                    <img src={u.avatar} alt={u.displayName} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-white">{u.displayName}</p>
                      <p className="text-[10px] text-gray-400">@{u.username}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 capitalize">{u.type}</span>
                </button>
              ))}
              {searchUsersQuery && foundUsers.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No matching user handles found.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Dynamic Action Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmModalConfig?.isOpen}
        onClose={() => setConfirmModalConfig(null)}
        onConfirm={confirmModalConfig?.onConfirm}
        title={confirmModalConfig?.title}
        message={confirmModalConfig?.message}
        confirmText={confirmModalConfig?.confirmText}
        cancelText={confirmModalConfig?.cancelText}
        type={confirmModalConfig?.type}
        isLoading={confirmModalConfig?.isLoading}
      />

      {/* Modern In-App Toast Feedback Banner */}
      <ToastAlert
        toast={toastAlertConfig}
        onClose={() => setToastAlertConfig(null)}
      />

      {/* Floating In-App Notification Toast */}
      <NotificationToast
        notification={activeNotification}
        onClose={() => setActiveNotification(null)}
        onClick={() => {
          if (activeNotification?.targetId) {
            if (activeNotification.targetType === 'space') {
              selectSpace(activeNotification.targetId);
            } else {
              selectConversation(activeNotification.targetId);
            }
          }
        }}
      />

      {/* Passcode Unlock / Setup Modal */}
      <PasscodeModal
        isOpen={showPasscodeModal}
        mode={passcodeModalMode}
        chatTitle={(() => {
          if (!pendingUnlockTarget?.id) return '';
          if (pendingUnlockTarget.isSpace) {
            const spc = spaces.find(s => String(s._id) === String(pendingUnlockTarget.id));
            return spc?.title || 'Fluid Space';
          }
          const conv = conversations.find(c => String(c._id) === String(pendingUnlockTarget.id));
          if (!conv) return pendingUnlockTarget.preloaded?.name || '';
          const partner = conv.participants?.find(p => String(p._id || p) !== String(activePersona?._id)) || conv.participants?.[0];
          return conv.name || partner?.displayName || (partner?.username ? `@${partner.username}` : '');
        })()}
        onSuccess={(data) => {
          if (passcodeModalMode === 'unlock') {
            const unlockedId = String(pendingUnlockTarget?.id);
            setUnlockedChats(prev => [...prev, unlockedId]);
            setShowPasscodeModal(false);
            if (pendingUnlockTarget?.id) {
              if (pendingUnlockTarget.isSpace) {
                selectSpace(pendingUnlockTarget.id);
              } else {
                selectConversation(pendingUnlockTarget.id, pendingUnlockTarget.preloaded);
              }
            }
            setPendingUnlockTarget(null);
          } else if (passcodeModalMode === 'setup') {
            fetchPasscodeStatus();
            setShowPasscodeModal(false);
            showToast('Passcode created! Lock is ready 🔒', 'success');
          }
        }}
        onClose={() => {
          setShowPasscodeModal(false);
          setPendingUnlockTarget(null);
        }}
      />
    </div>
  );
}
