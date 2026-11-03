import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  FlatList, Image, TextInput, ActivityIndicator, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { useSocket } from '../context/SocketContext';
import api, { getMediaUrl } from '../config/api';
import { ImagePicker } from '../config/safeMedia';
import { colors } from '../theme/colors';
import ServerIpModal from '../components/ServerIpModal';
import CreateSpaceModal from '../components/CreateSpaceModal';
import PersonaModal from '../components/PersonaModal';
import InviteMemberModal from '../components/InviteMemberModal';
import AdminModal from '../components/AdminModal';
import FriendRequestsModal from '../components/FriendRequestsModal';
import MembersDrawerModal from '../components/MembersDrawerModal';
import SpaceDetailsModal from '../components/SpaceDetailsModal';
import SetPasscodeModal from '../components/SetPasscodeModal';
import AvatarViewerModal from '../components/AvatarViewerModal';
import IncomingCallModal from '../components/IncomingCallModal';
import InviteFriendsModal from '../components/InviteFriendsModal';
import PrivacySetupModal from '../components/PrivacySetupModal';
import StatusRail from '../components/status/StatusRail';
import StatusComposerModal from '../components/status/StatusComposerModal';
import StatusViewerModal from '../components/status/StatusViewerModal';
import StatusPrivacyModal from '../components/status/StatusPrivacyModal';
import StatusUpdatesListModal from '../components/status/StatusUpdatesListModal';
import { playIncomingRingtone, stopAllSFX } from '../lib/callSFX';
import Logo from '../components/Logo';
import {
  Menu, Search, MessageSquare, Zap, Users, Settings, Compass,
  Globe, Info, Plus, Shield, Crown, Lock, ChevronRight, X, User, Camera, Share2,
  UserPlus, UserMinus, UserX, Phone, PhoneOff, Video
} from 'lucide-react-native';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

export default function MainTabScreen({ navigation }) {
  const { activePersona, user, personas, switchPersona, logout, setActivePersona } = useAuth();
  const { themeMode, fontSizeScale, changeTheme, changeFontSize, colors: dynamicColors, fontMultiplier, scaledFont } = useTheme();
  const { socket, onlinePersonaIds = [], personaStatuses = {} } = useSocket() || {};
  const safeOnlineIds = Array.isArray(onlinePersonaIds) ? onlinePersonaIds.map(String) : [];

  const getStatusInfo = (personaId) => {
    if (!personaId) return { color: null, label: 'Offline', isOnline: false };
    const idStr = String(personaId);
    const st = personaStatuses?.[idStr];
    if (st === 'away') return { color: '#f59e0b', label: '🟡 Away', isOnline: true };
    if (st === 'dnd') return { color: '#ef4444', label: '🔴 Do Not Disturb', isOnline: true };
    if (st === 'online' || safeOnlineIds.includes(idStr)) return { color: dynamicColors.success || '#10b981', label: '🟢 Online', isOnline: true };
    return { color: '#64748b', label: 'Offline', isOnline: false };
  };

  const getStatusColor = (personaId) => getStatusInfo(personaId).color;
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'spaces' | 'friends' | 'settings'

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [publicSpaces, setPublicSpaces] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [filterCategory, setFilterCategory] = useState('all'); // 'all' | 'dms' | 'spaces' | 'locked'
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [searching, setSearching] = useState(false);

  // Modals & Passcode states
  const [passcodeStatus, setPasscodeStatus] = useState({ hasPasscode: false, chatLockEnabled: false });
  const [ipModalVisible, setIpModalVisible] = useState(false);
  const [createSpaceVisible, setCreateSpaceVisible] = useState(false);
  const [personaModalVisible, setPersonaModalVisible] = useState(false);
  const [inviteModalSpace, setInviteModalSpace] = useState(null);
  const [inviteFriendsVisible, setInviteFriendsVisible] = useState(false);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [friendRequestsVisible, setFriendRequestsVisible] = useState(false);
  const [membersDrawerVisible, setMembersDrawerVisible] = useState(false);
  const [previewSpaceId, setPreviewSpaceId] = useState(null);
  const [setPasscodeVisible, setSetPasscodeVisible] = useState(false);
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ visible: false, avatarUrl: '', name: '', handle: '', bio: '', customStatus: '', targetPersonaId: null });
  const [incomingCall, setIncomingCall] = useState(null);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  // Friends Tab Sub-tabs & Optimistic State
  const [friendsSubTab, setFriendsSubTab] = useState('suggested'); // 'suggested' | 'contacts' | 'requests'
  const [spacesSubTab, setSpacesSubTab] = useState('all'); // 'all' | 'popular' | 'my' | 'joined'
  const [addedContactIds, setAddedContactIds] = useState([]);
  const [removedContactIds, setRemovedContactIds] = useState([]);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    if (activePersona?._id) {
      if (!activePersona.privacySettings || !activePersona.privacySettings.setupCompleted) {
        setPrivacyModalVisible(true);
      }
    }
  }, [activePersona]);

  // Rich Web Settings states
  const [settingsSection, setSettingsSection] = useState('profile'); // 'profile' | 'appearance' | 'privacy'
  const [presenceStatus, setPresenceStatus] = useState('online'); // 'online' | 'away' | 'dnd' | 'offline'
  const [customStatusText, setCustomStatusText] = useState(activePersona?.customStatus || '');
  const [bioText, setBioText] = useState(activePersona?.bio || '');
  const [displayNameInput, setDisplayNameInput] = useState(activePersona?.displayName || '');
  const [usernameInput, setUsernameInput] = useState(activePersona?.username || '');

  // Privacy Controls states
  const [findHandlePerm, setFindHandlePerm] = useState('everyone');
  const [msgPerm, setMsgPerm] = useState('friends');
  const [showOnline, setShowOnline] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);

  // Password change state
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Notification Preferences states from NotificationContext
  const {
    notifMsgEnabled, setNotifMsgEnabled,
    notifSpaceEnabled, setNotifSpaceEnabled,
    notifSoundEnabled, setNotifSoundEnabled,
    playChimeSound,
    unreadMap, getUnreadCount
  } = useNotification();

  // Status Stories State
  const [statusData, setStatusData] = useState({
    myStatuses: [],
    recentStatuses: [],
    viewedStatuses: [],
    mutedStatuses: []
  });
  const [statusPrivacySettings, setStatusPrivacySettings] = useState(null);
  const [showStatusComposer, setShowStatusComposer] = useState(false);
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [activeStatusGroup, setActiveStatusGroup] = useState(null);
  const [showStatusPrivacyModal, setShowStatusPrivacyModal] = useState(false);
  const [showStatusUpdatesListModal, setShowStatusUpdatesListModal] = useState(false);

  // Instant local cache restore for statuses (0ms instant UI load)
  useEffect(() => {
    if (!activePersona?._id) return;
    const cacheKey = `@donchat_status_feed_${activePersona._id}`;
    AsyncStorage.getItem(cacheKey).then(cached => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            setStatusData(parsed);
          }
        } catch (e) {}
      }
    }).catch(() => {});
  }, [activePersona?._id]);

  const fetchStatuses = useCallback(async () => {
    try {
      const feedRes = await api.get('/statuses/feed').catch(() => ({ data: { success: false } }));

      if (feedRes.data?.success) {
        const newStatusData = {
          myStatuses: feedRes.data.myStatuses || [],
          recentStatuses: feedRes.data.recentStatuses || [],
          viewedStatuses: feedRes.data.viewedStatuses || [],
          mutedStatuses: feedRes.data.mutedStatuses || []
        };
        setStatusData(newStatusData);
        if (activePersona?._id) {
          AsyncStorage.setItem(
            `@donchat_status_feed_${activePersona._id}`,
            JSON.stringify(newStatusData)
          ).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[MainTabScreen] fetchStatuses error:', err);
    }
  }, [activePersona?._id]);

  const fetchStatusPrivacy = useCallback(async () => {
    try {
      const privacyRes = await api.get('/statuses/privacy').catch(() => ({ data: { success: false } }));
      if (privacyRes.data?.success) {
        setStatusPrivacySettings(privacyRes.data.statusPrivacy);
      }
    } catch (err) {
      console.error('[MainTabScreen] fetchStatusPrivacy error:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatusPrivacy();
  }, [fetchStatusPrivacy]);

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      fetchStatuses();
      const [convRes, spaceRes, pubSpaceRes, contactRes, passRes, searchRes] = await Promise.all([
        api.get('/conversations').catch(() => ({ data: { conversations: [] } })),
        api.get('/spaces').catch(() => ({ data: { spaces: [] } })),
        api.get('/spaces/public').catch(() => ({ data: { spaces: [] } })),
        api.get('/personas/all').catch(() => ({ data: { contacts: [] } })),
        api.get('/auth/passcode-status').catch(() => ({ data: { hasPasscode: false, chatLockEnabled: false } })),
        api.get('/personas/search?query=').catch(() => ({ data: { personas: [] } }))
      ]);

      if (convRes.data?.success) setConversations(convRes.data.conversations || []);
      if (spaceRes.data?.success) setSpaces(spaceRes.data.spaces || []);
      if (pubSpaceRes.data?.success) setPublicSpaces(pubSpaceRes.data.spaces || []);
      if (contactRes.data?.success) setContacts(contactRes.data.contacts || []);
      if (searchRes.data?.success) setFoundUsers(searchRes.data.personas || []);
      if (passRes.data?.success) {
        setPasscodeStatus({
          hasPasscode: passRes.data.hasPasscode,
          chatLockEnabled: passRes.data.chatLockEnabled
        });
      }
    } catch (err) {
      console.error('[MainTabScreen] Fetch error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleJoinPublicSpace = async (spaceId) => {
    try {
      const res = await api.post(`/spaces/${spaceId}/join`);
      if (res.data?.success) {
        Alert.alert('Joined Space!', 'You have joined this public space.');
        fetchData(true);
        navigation.navigate('Conversation', { spaceId, title: res.data.space?.title });
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to join space');
    }
  };

  useEffect(() => {
    fetchData();
  }, [activePersona]);

  useFocusEffect(
    useCallback(() => {
      fetchData(true);
    }, [activePersona])
  );

  // Listen for real-time socket events to update conversation list instantly
  useEffect(() => {
    if (!socket) return;

    const handleRealtimeUpdate = (msg) => {
      if (msg) {
        const senderPersonaObj = msg.senderPersonaId || msg.sender;
        const senderId = typeof senderPersonaObj === 'object'
          ? String(senderPersonaObj._id || senderPersonaObj.id || '')
          : String(senderPersonaObj || '');
        const isFromMe = activePersona && senderId === String(activePersona._id);

        if (!isFromMe && activePersona?.status === 'dnd') {
          return;
        }
      }
      fetchData(true);
    };

    const handleIncomingCall = (data) => {
      console.log('[MainTabScreen] Incoming call received:', data);
      playIncomingRingtone();
      setIncomingCall(data);
    };

    const handleCallEnded = (data) => {
      stopAllSFX();
      setIncomingCall(prev => (prev?.callId === data?.callId ? null : prev));
    };

    const handleAnsweredElsewhere = (data) => {
      stopAllSFX();
      setIncomingCall(prev => (prev?.callId === data?.callId ? null : prev));
    };

    socket.on('message:new', handleRealtimeUpdate);
    socket.on('conversation:new', handleRealtimeUpdate);
    socket.on('space:created', handleRealtimeUpdate);
    socket.on('space:updated', handleRealtimeUpdate);
    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:answered-elsewhere', handleAnsweredElsewhere);
    socket.on('status:created', fetchStatuses);
    socket.on('status:viewed', fetchStatuses);
    socket.on('status:deleted', fetchStatuses);

    return () => {
      socket.off('message:new', handleRealtimeUpdate);
      socket.off('conversation:new', handleRealtimeUpdate);
      socket.off('space:created', handleRealtimeUpdate);
      socket.off('space:updated', handleRealtimeUpdate);
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:answered-elsewhere', handleAnsweredElsewhere);
      socket.off('status:created', fetchStatuses);
      socket.off('status:viewed', fetchStatuses);
      socket.off('status:deleted', fetchStatuses);
    };
  }, [socket, activePersona, fetchStatuses]);

  const handleAcceptIncomingCall = (callData) => {
    stopAllSFX();
    setIncomingCall(null);
    if (!callData) return;
    navigation.navigate('Conversation', {
      conversationId: callData.roomId,
      autoAcceptCall: callData,
      title: callData.callerPersona?.displayName || callData.callerPersona?.username || 'User',
      avatar: callData.callerPersona?.avatarUrl || callData.callerPersona?.avatar,
      otherPersonaId: callData.callerPersona?._id
    });
  };

  const handleDeclineIncomingCall = (callData) => {
    stopAllSFX();
    if (socket && callData) {
      socket.emit('call:reject', {
        targetPersonaId: String(callData.callerPersona?._id),
        targetSocketId: callData.callerSocketId,
        callId: callData.callId,
        reason: 'declined'
      });
    }
    setIncomingCall(null);
  };

  const handleSearchUsers = async (text = '') => {
    setSearchQuery(text);
    const clean = text.trim().replace(/^@/, '');
    setSearching(true);
    try {
      const res = await api.get(`/personas/search?query=${encodeURIComponent(clean)}`);
      if (res.data?.success) {
        setFoundUsers(res.data.personas || []);
      }
    } catch (e) {
      setFoundUsers([]);
    } finally {
      setSearching(false);
    }
  };

  const handleStartDM = async (targetPersonaId) => {
    try {
      const res = await api.post('/conversations', { targetPersonaId, type: 'direct' });
      if (res.data?.success) {
        fetchData();
        navigation.navigate('Conversation', { conversationId: res.data.conversation._id });
      }
    } catch (e) {
      console.error('Failed to start DM:', e);
    }
  };

  const selfId = String(activePersona?._id || activePersona?.id || '');

  // Extract saved contact IDs from activePersona.contacts or contacts where isContact === true
  const mySavedContactIds = Array.isArray(activePersona?.contacts)
    ? activePersona.contacts.map(c => String(c?._id || c?.id || c))
    : [];

  const serverContactIds = new Set([
    ...mySavedContactIds,
    ...(contacts || [])
      .filter(c => c && (c.isContact === true || mySavedContactIds.includes(String(c._id || c.id))))
      .map(c => String(c._id || c.id))
  ]);

  const isUserContact = (uId) => {
    const idStr = String(uId || '');
    if (!idStr) return false;
    if (removedContactIds.includes(idStr)) return false;
    if (addedContactIds.includes(idStr)) return true;
    return serverContactIds.has(idStr);
  };

  // Combine all known personas across contacts, foundUsers, and activePersona.contacts
  const allKnownUsersMap = new Map();
  (contacts || []).forEach(u => {
    if (u && (u._id || u.id)) allKnownUsersMap.set(String(u._id || u.id), u);
  });
  (foundUsers || []).forEach(u => {
    if (u && (u._id || u.id)) {
      const id = String(u._id || u.id);
      if (!allKnownUsersMap.has(id)) allKnownUsersMap.set(id, u);
    }
  });
  if (Array.isArray(activePersona?.contacts)) {
    activePersona.contacts.forEach(u => {
      if (u && typeof u === 'object' && (u._id || u.id)) {
        const id = String(u._id || u.id);
        if (!allKnownUsersMap.has(id)) allKnownUsersMap.set(id, u);
      }
    });
  }
  const allKnownUsers = Array.from(allKnownUsersMap.values());

  const friendsList = allKnownUsers.filter(c => {
    const cId = String(c._id || c.id || '');
    return cId && cId !== selfId && isUserContact(cId);
  });

  const suggestedList = allKnownUsers.filter(u => {
    const uId = String(u._id || u.id || '');
    if (!uId || uId === selfId) return false;
    if (isUserContact(uId)) return false;
    if (!searchQuery.trim() && dismissedSuggestionIds.includes(uId)) return false;
    return true;
  });

  const filterFriendsByQuery = (list) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(item => {
      const name = (item.displayName || item.username || '').toLowerCase();
      const handle = (item.username || '').toLowerCase();
      return name.includes(q) || handle.includes(q);
    });
  };

  const handleAddFriend = async (targetPersonaId, name = 'User') => {
    const idStr = String(targetPersonaId || '');
    if (!idStr) return;
    setActionLoadingId(idStr);
    // Optimistic UI: instantly becomes contact, removed from suggestions
    setAddedContactIds(prev => [...prev.filter(x => x !== idStr), idStr]);
    setRemovedContactIds(prev => prev.filter(x => x !== idStr));
    setDismissedSuggestionIds(prev => prev.filter(x => x !== idStr));
    try {
      const res = await api.post(`/personas/contacts/add/${idStr}`);
      if (res.data?.success) {
        fetchData(true);
      }
    } catch (err) {
      setAddedContactIds(prev => prev.filter(x => x !== idStr));
      Alert.alert('Error', err?.response?.data?.message || 'Failed to add friend');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveSuggestion = (targetPersonaId) => {
    const idStr = String(targetPersonaId || '');
    if (!idStr) return;
    setDismissedSuggestionIds(prev => Array.from(new Set([...prev, idStr])));
  };

  const handleRemoveContact = (targetPersonaId, name = 'this contact') => {
    const idStr = String(targetPersonaId || '');
    if (!idStr) return;
    Alert.alert(
      'Remove Contact',
      `Remove ${name} from your friends list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(idStr);
            setRemovedContactIds(prev => [...prev.filter(x => x !== idStr), idStr]);
            setAddedContactIds(prev => prev.filter(x => x !== idStr));
            setDismissedSuggestionIds(prev => Array.from(new Set([...prev, idStr])));
            try {
              await api.post('/personas/contacts/delete', { targetPersonaId: idStr });
              fetchData(true);
            } catch (err) {
              setRemovedContactIds(prev => prev.filter(x => x !== idStr));
              Alert.alert('Error', err?.response?.data?.message || 'Failed to remove contact');
            } finally {
              setActionLoadingId(null);
            }
          }
        }
      ]
    );
  };

  const handleToggleChatLock = async () => {
    if (!passcodeStatus.hasPasscode) {
      setSetPasscodeVisible(true);
      return;
    }

    try {
      const nextState = !passcodeStatus.chatLockEnabled;
      const res = await api.post('/auth/toggle-chat-lock', { enabled: nextState });
      if (res.data?.success) {
        setPasscodeStatus(prev => ({ ...prev, chatLockEnabled: res.data.chatLockEnabled }));
        Alert.alert('Chat Lock', res.data.message);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not toggle Chat Lock status');
    }
  };

  const handleToggleLockChat = async (conversationId, spaceId) => {
    const targetId = spaceId || conversationId;
    if (!targetId) return;

    if (!passcodeStatus.hasPasscode) {
      Alert.alert(
        'Passcode Required',
        'Please set a 4-digit PIN passcode in Settings -> Privacy & Security before locking items.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set Passcode', onPress: () => { setActiveTab('settings'); setSetPasscodeVisible(true); } }
        ]
      );
      return;
    }

    try {
      const res = await api.post('/auth/toggle-lock-chat', { conversationId, spaceId });
      if (res.data?.success) {
        const nextState = !!res.data.isLocked;
        if (spaceId) {
          setSpaces(prev => prev.map(s => String(s._id) === String(spaceId) ? { ...s, isLocked: nextState } : s));
        } else {
          setConversations(prev => prev.map(c => String(c._id) === String(conversationId) ? { ...c, isLocked: nextState } : c));
        }
        Alert.alert(
          nextState ? `${spaceId ? 'Space' : 'Chat'} Locked 🔒` : `${spaceId ? 'Space' : 'Chat'} Unlocked 🔓`,
          nextState ? `This ${spaceId ? 'space' : 'conversation'} is now locked with your 4-digit PIN.` : `Lock removed from this ${spaceId ? 'space' : 'conversation'}.`
        );
        fetchData();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to toggle lock status');
    }
  };

  const handleRemovePasscode = async () => {
    Alert.alert(
      'Remove Passcode',
      'Are you sure you want to remove your 4-digit passcode? Chat Lock will be disabled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.post('/auth/chat-passcode', { passcode: '' });
              if (res.data?.success) {
                Alert.alert('Passcode Removed', 'Your 4-digit PIN has been removed.');
                fetchData();
              }
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to remove passcode');
            }
          }
        }
      ]
    );
  };

  const handlePresenceChange = async (newStatus) => {
    setPresenceStatus(newStatus);
    if (!activePersona?._id) return;
    try {
      const res = await api.patch(`/personas/${activePersona._id}`, { status: newStatus });
      if (res.data?.success && res.data.persona) {
        setActivePersona(res.data.persona);
      }
    } catch (err) {
      console.error('Failed to change presence status:', err);
    }
  };

  const handleUpdateProfile = async () => {
    if (!activePersona?._id) return;
    try {
      const res = await api.patch(`/personas/${activePersona._id}`, {
        displayName: displayNameInput.trim(),
        username: usernameInput.trim(),
        bio: bioText.trim(),
        customStatus: customStatusText.trim(),
        status: presenceStatus
      });
      if (res.data?.success) {
        if (res.data.persona) {
          setActivePersona(res.data.persona);
        }
        Alert.alert('Profile Saved!', 'Your public identity profile was updated successfully.');
        fetchData();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handlePickAvatar = async () => {
    if (!ImagePicker || typeof ImagePicker.requestMediaLibraryPermissionsAsync !== 'function') {
      Alert.alert('Notice', 'Image picker module is unavailable on this platform.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Access to media library is required to select profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        await uploadAndUpdateAvatar(selectedAsset.uri);
      }
    } catch (err) {
      console.error('Avatar picker error:', err);
    }
  };

  const uploadAndUpdateAvatar = async (fileUri) => {
    if (!activePersona?._id) return;
    setUploadingAvatar(true);
    try {
      const filename = fileUri.split('/').pop() || 'avatar.jpg';
      let uploadRes = null;

      try {
        const formData = new FormData();
        const formattedUri = Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri;
        formData.append('file', {
          uri: formattedUri,
          name: filename,
          type: 'image/jpeg',
        });
        uploadRes = await api.post('/upload', formData, {
          timeout: 60000,
          headers: { 'Accept': 'application/json' },
          transformRequest: (data, headers) => {
            if (headers) {
              delete headers['Content-Type'];
              delete headers['content-type'];
            }
            return data;
          },
        });
      } catch (formDataErr) {
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
      }

      if (uploadRes && uploadRes.data?.success) {
        const newAvatarUrl = uploadRes.data.url;
        const res = await api.patch(`/personas/${activePersona._id}`, {
          avatar: newAvatarUrl
        });

        if (res.data?.success) {
          if (setActivePersona) {
            await setActivePersona({ ...activePersona, avatar: newAvatarUrl });
          }
          Alert.alert('Success', 'Profile picture updated successfully!');
          fetchData(true);
        }
      }
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      Alert.alert('Upload Failed', 'Could not upload profile picture. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangeAccountPassword = async () => {
    if (!currPassword || !newPassword) {
      Alert.alert('Required Fields', 'Please enter your current and new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Short Password', 'New password must be at least 6 characters.');
      return;
    }
    setChangingPass(true);
    try {
      const res = await api.patch('/auth/change-password', {
        currentPassword: currPassword,
        newPassword
      });
      if (res.data?.success) {
        Alert.alert('Password Changed!', 'Your login password has been updated.');
        setCurrPassword('');
        setNewPassword('');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPass(false);
    }
  };

  const getPartnerPersona = (participants, myPersonaId) => {
    if (!Array.isArray(participants) || participants.length === 0) return null;
    const found = participants.find(p => {
      if (!p) return false;
      const pId = typeof p === 'object' ? String(p._id || p.id || '') : String(p);
      return pId !== String(myPersonaId || '');
    }) || participants[0];

    if (!found) return null;
    if (typeof found === 'string') {
      return { _id: found, displayName: 'User', username: 'user', avatar: DEFAULT_AVATAR };
    }
    return found;
  };

  const queryLower = searchQuery.toLowerCase().trim();

  const filteredConversations = (conversations || []).filter(c => {
    if (!c) return false;
    if (c.spaceId) return false;
    if (filterCategory === 'locked' && !c.isLocked) return false;
    if (!queryLower) return true;

    const partner = getPartnerPersona(c.participants, activePersona?._id);
    const name = (c.name || partner?.displayName || '').toLowerCase();
    const handle = (partner?.username || '').toLowerCase();
    const lastMsg = typeof c.lastMessage === 'string' ? c.lastMessage.toLowerCase() : (c.lastMessage?.content || '').toLowerCase();

    return name.includes(queryLower) || handle.includes(queryLower) || lastMsg.includes(queryLower);
  });

  const isOwnerOrAdminOfSpace = (space) => {
    if (!space || !activePersona?._id) return false;
    const myId = String(activePersona._id);
    const ownerId = space.ownerPersonaId
      ? String(space.ownerPersonaId._id || space.ownerPersonaId.id || space.ownerPersonaId)
      : '';
    if (ownerId && ownerId === myId) return true;

    if (Array.isArray(space.members)) {
      const memberEntry = space.members.find(m => {
        const mId = typeof m.personaId === 'object' && m.personaId
          ? String(m.personaId._id || m.personaId.id)
          : String(m.personaId || '');
        return mId === myId;
      });
      return memberEntry && ['owner', 'admin'].includes(memberEntry.role);
    }
    return false;
  };

  const filteredSpaces = (spaces || []).filter(s => {
    if (!s) return false;
    if (filterCategory === 'locked' && !s.isLocked) return false;
    if (spacesSubTab === 'my' && !isOwnerOrAdminOfSpace(s)) return false;
    if (!queryLower) return true;
    const title = (s.title || '').toLowerCase();
    const desc = (s.description || '').toLowerCase();
    return title.includes(queryLower) || desc.includes(queryLower);
  });

  const unjoinedPublicSpaces = (publicSpaces || []).filter(pub =>
    !spaces.some(my => String(my._id) === String(pub._id))
  );

  const sortedPublicSpaces = [...unjoinedPublicSpaces].sort((a, b) => {
    const countA = Array.isArray(a.members) ? a.members.length : 0;
    const countB = Array.isArray(b.members) ? b.members.length : 0;
    return countB - countA;
  });

  const filteredPublicSpaces = sortedPublicSpaces.filter(pub => {
    if (!pub) return false;
    if (!queryLower) return true;
    const title = (pub.title || '').toLowerCase();
    const desc = (pub.description || '').toLowerCase();
    const ownerHandle = (pub.ownerPersonaId?.username || '').toLowerCase();
    const ownerName = (pub.ownerPersonaId?.displayName || '').toLowerCase();
    return title.includes(queryLower) || desc.includes(queryLower) || ownerHandle.includes(queryLower) || ownerName.includes(queryLower);
  });

  const filteredContacts = (contacts || []).filter(c => {
    if (!c) return false;
    if (!queryLower) return true;
    const name = (c.displayName || '').toLowerCase();
    const handle = (c.username || '').toLowerCase();
    return name.includes(queryLower) || handle.includes(queryLower);
  });

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: dynamicColors.card, borderBottomColor: dynamicColors.cardBorder }]}>
      <View style={styles.brandContainer}>
        <TouchableOpacity
          style={styles.hamburgerBtn}
          onPress={() => setMembersDrawerVisible(true)}
          activeOpacity={0.7}
        >
          <Menu size={20} color={dynamicColors.text} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Logo variant="full" size={26} showTagline={false} />
          <View style={styles.versionPill}>
            <Text style={styles.versionPillText}>v1.0.0</Text>
          </View>
        </View>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.userBadge} onPress={() => setActiveTab('settings')}>
          <Image
            source={{ uri: getMediaUrl(activePersona?.avatar) || DEFAULT_AVATAR }}
            style={styles.avatar}
          />
          <View style={styles.statusDot} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: dynamicColors.background }]}>
      {renderHeader()}

      {/* Demo Showcase Notice on Mobile */}
      {Boolean(user?.isDemo || user?.email === 'demo@donchat.com') && (
        <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', paddingHorizontal: 12, paddingVertical: 7, marginHorizontal: 16, marginTop: 8, marginBottom: 2, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#fbbf24' }}>⚡ Demo Showcase Mode</Text>
            <Text style={{ fontSize: 10, color: dynamicColors.textSecondary, marginTop: 1 }}>
              Test chats, voice notes, calls & spaces!
            </Text>
          </View>
          <TouchableOpacity
            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: dynamicColors.primary }}
            onPress={() => {
              if (logout) logout();
              navigation.navigate('Login');
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#ffffff' }}>Register</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Body View based on Tab */}
      <View style={[styles.body, { backgroundColor: dynamicColors.background }]}>
        {/* Real-time In-App Incoming Call Banner */}
        {incomingCall && (
          <View style={{
            marginHorizontal: 16,
            marginTop: 8,
            marginBottom: 8,
            padding: 12,
            borderRadius: 20,
            backgroundColor: '#0f172a',
            borderColor: '#10b981',
            borderWidth: 1.5,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            elevation: 10,
            shadowColor: '#10b981',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <Image
                source={{ uri: getMediaUrl(incomingCall.callerPersona?.avatar || incomingCall.callerPersona?.avatarUrl, incomingCall.callerPersona?.displayName) || DEFAULT_AVATAR }}
                style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#10b981' }}
              />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>
                  {incomingCall.callerPersona?.displayName || incomingCall.callerPersona?.username || 'Incoming Call'}
                </Text>
                <Text style={{ color: '#34d399', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                  {incomingCall.isVideo ? '📹 Incoming Video Call...' : '📞 Incoming Voice Call...'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => handleDeclineIncomingCall(incomingCall)}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}
              >
                <PhoneOff size={18} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAcceptIncomingCall(incomingCall)}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' }}
              >
                {incomingCall.isVideo ? <Video size={18} color="#ffffff" /> : <Phone size={18} color="#ffffff" />}
              </TouchableOpacity>
            </View>
          </View>
        )}
        {activeTab === 'chats' && (
          <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Search Bar */}
            <View style={[styles.searchBarContainer, { backgroundColor: dynamicColors.inputBg, borderColor: dynamicColors.inputBorder }]}>
              <Search size={16} color={dynamicColors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.mainSearchInput, { color: dynamicColors.text }]}
                placeholder="Search messages, contacts, spaces..."
                placeholderTextColor={dynamicColors.textMuted}
                value={searchQuery}
                onChangeText={handleSearchUsers}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearchUsers('')}>
                  <X size={14} color={dynamicColors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Category Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView} contentContainerStyle={styles.filterContainer}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filterCategory === 'all' ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: filterCategory === 'all' ? dynamicColors.primary : dynamicColors.cardBorder
                  }
                ]}
                onPress={() => setFilterCategory('all')}
              >
                <Text style={[styles.filterChipText, { color: filterCategory === 'all' ? '#ffffff' : dynamicColors.textSecondary }]}>All Chats</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filterCategory === 'dms' ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: filterCategory === 'dms' ? dynamicColors.primary : dynamicColors.cardBorder
                  }
                ]}
                onPress={() => setFilterCategory('dms')}
              >
                <Text style={[styles.filterChipText, { color: filterCategory === 'dms' ? '#ffffff' : dynamicColors.textSecondary }]}>Direct Messages</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filterCategory === 'spaces' ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: filterCategory === 'spaces' ? dynamicColors.primary : dynamicColors.cardBorder
                  }
                ]}
                onPress={() => setFilterCategory('spaces')}
              >
                <Text style={[styles.filterChipText, { color: filterCategory === 'spaces' ? '#ffffff' : dynamicColors.textSecondary }]}>⚡ Fluid Spaces</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filterCategory === 'locked' ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: filterCategory === 'locked' ? dynamicColors.primary : dynamicColors.cardBorder
                  }
                ]}
                onPress={() => setFilterCategory('locked')}
              >
                <Text style={[styles.filterChipText, { color: filterCategory === 'locked' ? '#ffffff' : dynamicColors.textSecondary }]}>🔒 Locked Chats</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* STATUS Stories Horizontal Rail (WhatsApp & Telegram Style) */}
            {!searchQuery.trim() && (
              <StatusRail
                myStatuses={statusData.myStatuses}
                recentStatuses={statusData.recentStatuses}
                viewedStatuses={statusData.viewedStatuses}
                activePersona={activePersona}
                dynamicColors={dynamicColors}
                themeMode={themeMode}
                onPressMyStatus={() => {
                  if (statusData.myStatuses?.length > 0) {
                    setActiveStatusGroup({
                      persona: activePersona,
                      statuses: statusData.myStatuses
                    });
                    setShowStatusViewer(true);
                  } else {
                    setShowStatusComposer(true);
                  }
                }}
                onPressAddStatus={() => setShowStatusComposer(true)}
                onPressOtherStatus={(group) => {
                  setActiveStatusGroup(group);
                  setShowStatusViewer(true);
                }}
                onPressSeeAll={() => setShowStatusUpdatesListModal(true)}
              />
            )}

            {/* Web-Style Welcome Hero, 2x2 Action Cards Grid & Featured Banner */}
            {filterCategory === 'all' && !searchQuery.trim() && (
              <View style={styles.webActionContainer}>
                {/* Hero Logo & Heading Header */}
                <View style={styles.heroCenterBlock}>
                  <View style={{ marginBottom: 14 }}>
                    <Logo variant="icon" size={68} />
                  </View>
                  <Text style={[styles.heroTitle, { color: dynamicColors.text }]}>Welcome to GenAce</Text>
                  <Text style={[styles.heroSubtitle, { color: dynamicColors.textSecondary }]}>
                    Your space to chat, connect, discover and be part of amazing communities.
                  </Text>
                </View>

                {/* 2x2 Feature Action Cards Grid */}
                <View style={styles.webGrid}>
                  <TouchableOpacity style={[styles.webCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]} onPress={() => setActiveTab('friends')}>
                    <View style={[styles.webCardIconBg, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
                      <MessageSquare size={18} color="#6366f1" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.webCardTitle, { color: dynamicColors.text }]}>Start a Chat</Text>
                      <Text style={[styles.webCardSub, { color: dynamicColors.textSecondary }]} numberOfLines={1}>Message your friends & spaces...</Text>
                    </View>
                    <ChevronRight size={16} color={dynamicColors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.webCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]} onPress={() => setActiveTab('spaces')}>
                    <View style={[styles.webCardIconBg, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                      <Zap size={18} color="#a855f7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.webCardTitle, { color: dynamicColors.text }]}>Join a Space</Text>
                      <Text style={[styles.webCardSub, { color: dynamicColors.textSecondary }]} numberOfLines={1}>Find public communities...</Text>
                    </View>
                    <ChevronRight size={16} color={dynamicColors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.webCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]} onPress={() => setActiveTab('friends')}>
                    <View style={[styles.webCardIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                      <Users size={18} color="#3b82f6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.webCardTitle, { color: dynamicColors.text }]}>Meet Friends</Text>
                      <Text style={[styles.webCardSub, { color: dynamicColors.textSecondary }]} numberOfLines={1}>Search by username...</Text>
                    </View>
                    <ChevronRight size={16} color={dynamicColors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.webCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]} onPress={() => setCreateSpaceVisible(true)}>
                    <View style={[styles.webCardIconBg, { backgroundColor: 'rgba(6, 182, 212, 0.2)' }]}>
                      <Compass size={18} color="#06b6d4" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.webCardTitle, { color: dynamicColors.text }]}>Create Space</Text>
                      <Text style={[styles.webCardSub, { color: dynamicColors.textSecondary }]} numberOfLines={1}>Launch a Fluid Space...</Text>
                    </View>
                    <ChevronRight size={16} color={dynamicColors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Featured Promo Banner */}
                <View style={[styles.webBanner, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={styles.webBannerIconBg}>
                      <Text style={{ fontSize: 16 }}>⚡</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.webBannerTitle, { color: dynamicColors.text }]}>New to GenAce?</Text>
                      <Text style={[styles.webBannerSub, { color: dynamicColors.textSecondary }]} numberOfLines={2}>Explore spaces, make friends and be part of something bigger.</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.webBannerBtn, { backgroundColor: dynamicColors.primary }]} onPress={() => setActiveTab('spaces')}>
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Explore Now ›</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Fluid Spaces Vertical List Section */}
            {(filterCategory === 'all' || filterCategory === 'spaces') && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: dynamicColors.textMuted }]}>
                    {filterCategory === 'spaces' && searchQuery.trim()
                      ? `SEARCHED SPACES (${filteredSpaces.length})`
                      : `FLUID SPACES (${filteredSpaces.length})`}
                  </Text>
                </View>

                {filterCategory === 'spaces' && loading ? (
                  <ActivityIndicator color={dynamicColors.primary} style={{ marginTop: 24 }} />
                ) : filteredSpaces.length === 0 ? (
                  filterCategory === 'spaces' ? (
                    <View style={[styles.emptyCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                      <Text style={[styles.emptyTitle, { color: dynamicColors.text }]}>⚡ No Fluid Spaces Joined Yet</Text>
                      <Text style={[styles.emptySubtext, { color: dynamicColors.textMuted, marginBottom: 12 }]}>
                        {searchQuery.trim()
                          ? `No joined spaces matched "${searchQuery}"`
                          : 'You haven\'t joined any spaces yet. Discover public spaces below to join your first Fluid Space!'}
                      </Text>
                      <TouchableOpacity
                        style={[styles.webBannerBtn, { backgroundColor: dynamicColors.primary, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10 }]}
                        onPress={() => setActiveTab('spaces')}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>🌐 Discover Public Spaces</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null
                ) : (
                  filteredSpaces.map(s => {
                    const dynamicUnread = getUnreadCount ? getUnreadCount(s._id) : 0;
                    const unreadCount = dynamicUnread || 0;
                    const lastTime = s.updatedAt && !isNaN(new Date(s.updatedAt)) ? new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    const spaceIconStr = s.icon || '⚡';

                    return (
                      <TouchableOpacity
                        key={s._id}
                        style={[styles.chatCardItem, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }, s.isLocked && styles.chatCardLocked]}
                        onPress={() => navigation.navigate('Conversation', {
                          spaceId: s._id,
                          title: s.title,
                          icon: s.icon,
                          isLocked: s.isLocked || false
                        })}
                        onLongPress={() => handleToggleLockChat(null, s._id)}
                      >
                        <View style={styles.avatarWrapper}>
                          <View style={[styles.chatAvatar, { backgroundColor: s.isLocked ? 'rgba(245, 158, 11, 0.2)' : 'rgba(168, 85, 247, 0.2)', alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{ fontSize: 18 }}>{spaceIconStr}</Text>
                          </View>
                          {unreadCount > 0 && <View style={styles.unreadDotBadge} />}
                        </View>

                        <View style={styles.chatInfoMain}>
                          <View style={styles.chatHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                              <Text style={[styles.chatNameText, { color: dynamicColors.text }]} numberOfLines={1}>{s.title}</Text>
                              {s.isLocked && <Lock size={13} color="#f59e0b" />}
                            </View>
                            <Text style={[styles.chatTimeText, { color: dynamicColors.textMuted }]}>{lastTime}</Text>
                          </View>

                          <View style={styles.chatHeaderRow}>
                            <Text style={[styles.chatSnippetText, { color: s.isLocked ? '#f59e0b' : dynamicColors.textSecondary }]} numberOfLines={1}>
                              {s.isLocked ? '🔒 Passcode locked space' : (s.description || 'Public Fluid Space')}
                            </Text>
                            {unreadCount > 0 && (
                              <View style={styles.unreadCountBadge}>
                                <Text style={styles.unreadCountText}>{unreadCount}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* Conversations List */}
            {(filterCategory === 'all' || filterCategory === 'dms' || filterCategory === 'locked') && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: dynamicColors.textMuted }]}>
                    {filterCategory === 'locked'
                      ? 'LOCKED CONVERSATIONS'
                      : searchQuery.trim()
                      ? `SEARCH RESULTS (${filteredConversations.length})`
                      : 'RECENT CONVERSATIONS'}
                  </Text>
                </View>

                {loading ? (
                  <ActivityIndicator color={dynamicColors.primary} style={{ marginTop: 24 }} />
                ) : filteredConversations.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                    <Text style={[styles.emptyTitle, { color: dynamicColors.text }]}>💬 No matching conversations</Text>
                    <Text style={[styles.emptySubtext, { color: dynamicColors.textMuted }]}>
                      {searchQuery.trim()
                        ? `No conversations or messages matched "${searchQuery}"`
                        : 'Select a contact or search someone\'s handle to start chatting!'}
                    </Text>
                  </View>
                ) : (
                  filteredConversations.map(c => {
                    const partner = getPartnerPersona(c.participants, activePersona?._id);
                    const name = c.name || partner?.displayName || partner?.username || 'Chat';
                    const rawAvatar = (partner && typeof partner === 'object' && partner.avatar) ? partner.avatar : DEFAULT_AVATAR;
                    const avatar = getMediaUrl(rawAvatar) || DEFAULT_AVATAR;
                    const dynamicUnread = getUnreadCount ? getUnreadCount(c._id) : 0;
                    const unreadCount = dynamicUnread || c.unreadCount || 0;
                    const lastTime = c.updatedAt && !isNaN(new Date(c.updatedAt)) ? new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    const lastSnippet = c.isLocked ? '🔒 Passcode locked message' : (typeof c.lastMessage === 'string' ? c.lastMessage : (c.lastMessage?.content || 'Direct message'));

                    const partnerId = partner?._id ? String(partner._id) : null;
                    const partnerStatusColor = getStatusColor(partnerId);

                    // Check if DM partner has an active status story
                    const partnerRecentGroup = (statusData.recentStatuses || []).find(
                      g => String(g.persona?._id || g.persona?.id) === partnerId
                    );
                    const partnerViewedGroup = !partnerRecentGroup && (statusData.viewedStatuses || []).find(
                      g => String(g.persona?._id || g.persona?.id) === partnerId
                    );
                    const partnerStatusGroup = partnerRecentGroup || partnerViewedGroup;
                    const hasUnseenStatus = Boolean(partnerRecentGroup);
                    const hasActiveStatus = Boolean(partnerStatusGroup);

                    return (
                      <TouchableOpacity
                        key={c._id}
                        style={[styles.chatCardItem, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }, c.isLocked && styles.chatCardLocked]}
                        onPress={() => navigation.navigate('Conversation', {
                          conversationId: c._id,
                          title: name,
                          avatar,
                          otherPersonaId: partner?._id,
                          isLocked: c.isLocked || false,
                          statusGroup: partnerStatusGroup
                        })}
                        onLongPress={() => handleToggleLockChat(c._id)}
                      >
                        <TouchableOpacity
                          style={styles.avatarWrapper}
                          onPress={() => {
                            if (hasActiveStatus) {
                              setActiveStatusGroup(partnerStatusGroup);
                              setShowStatusViewer(true);
                            } else {
                              setAvatarViewerTarget({
                                visible: true,
                                avatarUrl: partner?.avatar,
                                name,
                                handle: partner?.username,
                                bio: partner?.bio,
                                customStatus: partner?.customStatus,
                                targetPersonaId: partner?._id || partner?.id
                              });
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          <View
                            style={[
                              styles.dmAvatarStoryContainer,
                              hasActiveStatus && (
                                hasUnseenStatus
                                  ? [styles.dmAvatarRingUnseen, { borderColor: dynamicColors.primary || '#6366f1' }]
                                  : [styles.dmAvatarRingViewed, { borderColor: dynamicColors.cardBorder || 'rgba(148, 163, 184, 0.45)' }]
                              )
                            ]}
                          >
                            <Image source={{ uri: avatar }} style={styles.chatAvatar} />
                          </View>
                          {hasActiveStatus ? (
                            <View style={[styles.storyActiveDot, { backgroundColor: hasUnseenStatus ? (dynamicColors.primary || '#6366f1') : '#94a3b8' }]} />
                          ) : partnerStatusColor ? (
                            <View style={[styles.onlineDot, { backgroundColor: partnerStatusColor }]} />
                          ) : null}
                          {unreadCount > 0 && <View style={styles.unreadDotBadge} />}
                        </TouchableOpacity>

                        <View style={styles.chatInfoMain}>
                          <View style={styles.chatHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                              <Text style={[styles.chatNameText, { color: dynamicColors.text }]} numberOfLines={1}>{name}</Text>
                              {hasActiveStatus && (
                                <View style={[styles.storyPillBadge, { backgroundColor: hasUnseenStatus ? 'rgba(99, 102, 241, 0.15)' : 'rgba(148, 163, 184, 0.12)' }]}>
                                  <Text style={[styles.storyPillText, { color: hasUnseenStatus ? (dynamicColors.primary || '#818cf8') : dynamicColors.textMuted }]}>
                                    {hasUnseenStatus ? 'STORY' : 'VIEWED'}
                                  </Text>
                                </View>
                              )}
                              {!hasActiveStatus && partnerStatusColor ? (
                                <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 8, fontWeight: 'bold', color: partnerStatusColor }}>ONLINE</Text>
                                </View>
                              ) : null}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.chatTimeText, { color: dynamicColors.textMuted }]}>{lastTime}</Text>
                              <TouchableOpacity
                                style={{ padding: 4 }}
                                onPress={() => handleToggleLockChat(c._id)}
                              >
                                <Lock size={15} color={c.isLocked ? '#f59e0b' : dynamicColors.textMuted} />
                              </TouchableOpacity>
                            </View>
                          </View>

                          <View style={styles.chatBodyRow}>
                            <Text style={[styles.chatSnippetText, { color: unreadCount > 0 ? dynamicColors.text : dynamicColors.textSecondary, fontWeight: unreadCount > 0 ? '600' : 'normal' }]} numberOfLines={1}>
                              {lastSnippet}
                            </Text>

                            {c.isLocked ? (
                              <View style={[styles.lockIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                                <Lock size={11} color="#f59e0b" />
                              </View>
                            ) : unreadCount > 0 ? (
                              <View style={[styles.unreadBadge, { backgroundColor: '#ef4444' }]}>
                                <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>{unreadCount}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>
        )}

        {activeTab === 'spaces' && (
          <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View>
                <Text style={[styles.screenHeader, { color: dynamicColors.text }]}>Explore & Fluid Spaces</Text>
                <Text style={{ fontSize: 11, color: dynamicColors.textSecondary, marginTop: 2 }}>
                  Discover public communities or manage your joined spaces
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.createSpaceBtn, { backgroundColor: dynamicColors.primary }]}
                onPress={() => setCreateSpaceVisible(true)}
              >
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>+ New Space</Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar for Spaces */}
            <View style={[styles.searchBarContainer, { backgroundColor: dynamicColors.inputBg, borderColor: dynamicColors.inputBorder, marginBottom: 12 }]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={[styles.mainSearchInput, { color: dynamicColors.text }]}
                placeholder="Search public spaces by name, desc or @handle..."
                placeholderTextColor={dynamicColors.textMuted}
                value={searchQuery}
                onChangeText={handleSearchUsers}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearchUsers('')}>
                  <Text style={[styles.clearSearchIcon, { color: dynamicColors.textMuted }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Spaces Sub-tabs Filter Pills: All | Popular | My Spaces | Joined */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'popular', label: '🔥 Popular' },
                { id: 'my', label: '👑 My Spaces' },
                { id: 'joined', label: '👥 Joined' }
              ].map(sub => {
                const isActive = spacesSubTab === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    onPress={() => setSpacesSubTab(sub.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: isActive ? (dynamicColors.primary || '#6366f1') : (dynamicColors.card || 'rgba(255,255,255,0.05)'),
                      borderWidth: 1,
                      borderColor: isActive ? (dynamicColors.primary || '#6366f1') : (dynamicColors.cardBorder || 'rgba(255,255,255,0.1)')
                    }}
                  >
                    <Text style={{
                      fontSize: 11,
                      fontWeight: 'bold',
                      color: isActive ? '#ffffff' : (dynamicColors.textMuted || '#94a3b8')
                    }}>
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Public Space Discovery Section */}
            {(spacesSubTab === 'all' || spacesSubTab === 'popular') && (
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={[styles.sectionTitle, { color: dynamicColors.textMuted }]}>🌐 DISCOVER PUBLIC SPACES ({filteredPublicSpaces.length})</Text>
                <Text style={{ fontSize: 10, color: dynamicColors.primary, fontWeight: 'bold' }}>Network Explore</Text>
              </View>

              {filteredPublicSpaces.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.emptyTitle, { color: dynamicColors.text }]}>🌐 No Public Spaces Found</Text>
                  <Text style={[styles.emptySubtext, { color: dynamicColors.textMuted }]}>
                    {searchQuery.trim() ? `No public space matched "${searchQuery}"` : 'No public spaces available yet. Create one to share!'}
                  </Text>
                </View>
              ) : (
                filteredPublicSpaces.map(pub => {
                  const owner = pub.ownerPersonaId || {};
                  const ownerHandle = owner.username ? `@${owner.username}` : 'Community';
                  const memberCount = Array.isArray(pub.members) ? pub.members.length : 1;

                  return (
                    <View
                      key={pub._id}
                      style={[
                        styles.publicSpaceCard,
                        { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                        <View style={styles.publicSpaceIconBadge}>
                          <Text style={{ fontSize: 20 }}>{pub.icon || '🌐'}</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={[styles.spaceCardTitle, { color: dynamicColors.text }]} numberOfLines={1}>{pub.title}</Text>
                            <View style={styles.pubBadgePill}>
                              <Text style={styles.pubBadgePillText}>🌐 PUBLIC</Text>
                            </View>
                          </View>

                          <Text style={[styles.spaceCardDesc, { color: dynamicColors.textSecondary, marginTop: 4 }]} numberOfLines={2}>
                            {pub.description || 'Public community space created for collaboration.'}
                          </Text>

                          {pub.aiSummary && pub.aiSummary !== 'No summary generated yet.' && (
                            <View style={styles.cardAiSummaryPill}>
                              <Text style={styles.cardAiSummaryText} numberOfLines={1}>
                                ✨ {pub.aiSummary}
                              </Text>
                            </View>
                          )}

                          <View style={styles.publicCardMetaRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Image source={{ uri: getMediaUrl(owner.avatar) || DEFAULT_AVATAR }} style={{ width: 18, height: 18, borderRadius: 9 }} />
                              <Text style={[styles.publicCardOwnerText, { color: dynamicColors.textMuted }]}>
                                By <Text style={{ color: dynamicColors.primary, fontWeight: 'bold' }}>{ownerHandle}</Text>
                              </Text>
                            </View>

                            <Text style={[styles.publicCardMembersText, { color: dynamicColors.textMuted }]}>
                              👥 {memberCount} {memberCount === 1 ? 'member' : 'members'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Card Action Buttons */}
                      <View style={styles.publicCardActionsRow}>
                        <TouchableOpacity
                          style={[styles.previewSpaceBtn, { borderColor: dynamicColors.cardBorder }]}
                          onPress={() => setPreviewSpaceId(pub._id)}
                        >
                          <Text style={[styles.previewSpaceBtnText, { color: dynamicColors.text }]}>ℹ️ Preview Canvas</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.joinSpaceBtn, { backgroundColor: dynamicColors.primary }]}
                          onPress={() => handleJoinPublicSpace(pub._id)}
                        >
                          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>+ Join Space</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
            )}

            {/* My Joined Spaces Section */}
            {(spacesSubTab === 'all' || spacesSubTab === 'my' || spacesSubTab === 'joined') && (
            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.sectionTitle, { color: dynamicColors.textMuted }]}>
                {spacesSubTab === 'my' ? `MY CREATED / ADMIN SPACES (${filteredSpaces.length})` : spacesSubTab === 'joined' ? `MY JOINED SPACES (${filteredSpaces.length})` : `MY JOINED SPACES (${filteredSpaces.length})`}
              </Text>
              {filteredSpaces.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder, marginTop: 8 }]}>
                  <Text style={[styles.emptyTitle, { color: dynamicColors.text }]}>
                    {spacesSubTab === 'my' ? '👑 No Created Spaces' : '⚡ No Joined Spaces'}
                  </Text>
                  <Text style={[styles.emptySubtext, { color: dynamicColors.textMuted }]}>
                    {spacesSubTab === 'my'
                      ? 'You have not created any spaces yet. Tap "+ New Space" above to start your own community!'
                      : 'Create your first space or join public communities above!'}
                  </Text>
                </View>
              ) : (
                filteredSpaces.map(s => {
                  const spaceUnread = (getUnreadCount ? getUnreadCount(s._id) : 0) || s.unreadCount || 0;
                  return (
                    <TouchableOpacity
                      key={s._id}
                      style={[styles.spaceCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}
                      onPress={() => navigation.navigate('Conversation', { spaceId: s._id, title: s.title })}
                    >
                      <Text style={styles.spaceCardIcon}>{s.icon || '⚡'}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={[styles.spaceCardTitle, { color: dynamicColors.text }]}>{s.title}</Text>
                          {spaceUnread > 0 && (
                            <View style={[styles.unreadBadge, { backgroundColor: '#ef4444', marginRight: 8 }]}>
                              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>{spaceUnread}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.spaceCardDesc, { color: dynamicColors.textSecondary }]}>{s.description || 'Fluid Space'}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.inviteSpaceBtn}
                        onPress={() => setInviteModalSpace(s)}
                      >
                        <Text style={styles.inviteSpaceBtnText}>+ Invite</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
            )}
          </ScrollView>
        )}

        {activeTab === 'friends' && (
          <View style={styles.tabContent}>
            <Text style={[styles.screenHeader, { color: dynamicColors.text }]}>Find Friends & Contacts</Text>

            {/* Web-Style Presence Banner */}
            <View style={[styles.presenceBanner, { backgroundColor: themeMode === 'light' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.1)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.onlineDotPulse} />
                <Text style={styles.presenceTitle}>You're online!</Text>
              </View>
              <Text style={[styles.presenceSub, { color: dynamicColors.textSecondary }]}>Good vibes only! 🌙 🚀</Text>
            </View>

            {/* ONLINE FRIENDS CAROUSEL STRIP */}
            {(() => {
              const onlineFriends = (friendsList || []).filter(c => c && safeOnlineIds.includes(String(c._id || c.id)));
              if (onlineFriends.length === 0) return null;
              return (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.sectionTitle, { color: dynamicColors.textMuted, marginBottom: 8 }]}>
                    🟢 ONLINE FRIENDS ({onlineFriends.length})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                    {onlineFriends.map(friend => {
                      const name = friend.displayName || friend.username || 'Friend';
                      const friendAvatar = getMediaUrl(friend.avatar, name);
                      return (
                        <TouchableOpacity
                          key={friend._id || friend.id}
                          style={{ alignItems: 'center', width: 68 }}
                          onPress={() => handleStartDM(friend._id || friend.id)}
                          activeOpacity={0.8}
                        >
                          <View style={{ position: 'relative', marginBottom: 4 }}>
                            <Image
                              source={{ uri: friendAvatar }}
                              style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#10b981' }}
                            />
                            <View style={[styles.onlineDot, { backgroundColor: '#10b981', bottom: 1, right: 1 }]} />
                          </View>
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: dynamicColors.text, textAlign: 'center' }} numberOfLines={1}>
                            {name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            })()}

            {/* Sub-Tabs: Suggested, Contacts, Requests */}
            <View style={styles.friendsSubTabsBar}>
              <TouchableOpacity
                style={[
                  styles.friendsSubTabPill,
                  friendsSubTab === 'suggested' && { backgroundColor: dynamicColors.primary }
                ]}
                onPress={() => setFriendsSubTab('suggested')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.friendsSubTabTitle,
                    { color: friendsSubTab === 'suggested' ? '#ffffff' : dynamicColors.textSecondary }
                  ]}
                >
                  Suggested
                </Text>
                <View
                  style={[
                    styles.subTabBadgePill,
                    {
                      backgroundColor: friendsSubTab === 'suggested' ? 'rgba(255,255,255,0.28)' : (themeMode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)')
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.subTabBadgeNumber,
                      { color: friendsSubTab === 'suggested' ? '#ffffff' : dynamicColors.textMuted }
                    ]}
                  >
                    {suggestedList.length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.friendsSubTabPill,
                  friendsSubTab === 'contacts' && { backgroundColor: dynamicColors.primary }
                ]}
                onPress={() => setFriendsSubTab('contacts')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.friendsSubTabTitle,
                    { color: friendsSubTab === 'contacts' ? '#ffffff' : dynamicColors.textSecondary }
                  ]}
                >
                  Contacts
                </Text>
                <View
                  style={[
                    styles.subTabBadgePill,
                    {
                      backgroundColor: friendsSubTab === 'contacts' ? 'rgba(255,255,255,0.28)' : (themeMode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)')
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.subTabBadgeNumber,
                      { color: friendsSubTab === 'contacts' ? '#ffffff' : dynamicColors.textMuted }
                    ]}
                  >
                    {friendsList.length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.friendsSubTabPill,
                  friendsSubTab === 'requests' && { backgroundColor: dynamicColors.primary }
                ]}
                onPress={() => setFriendsSubTab('requests')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.friendsSubTabTitle,
                    { color: friendsSubTab === 'requests' ? '#ffffff' : dynamicColors.textSecondary }
                  ]}
                >
                  Requests
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <TextInput
                style={[styles.searchInput, { backgroundColor: dynamicColors.inputBg, borderColor: dynamicColors.inputBorder, color: dynamicColors.text }]}
                placeholder={friendsSubTab === 'contacts' ? "Search contacts (@handle)..." : "Search username (@handle)..."}
                placeholderTextColor={dynamicColors.textMuted}
                value={searchQuery}
                onChangeText={handleSearchUsers}
              />
            </View>

            {searching ? (
              <ActivityIndicator color={dynamicColors.primary} style={{ marginTop: 20 }} />
            ) : friendsSubTab === 'requests' ? (
              <View style={styles.emptyRequestsBox}>
                <View style={[styles.emptyRequestsIconCircle, { backgroundColor: themeMode === 'light' ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.15)' }]}>
                  <Users size={32} color={dynamicColors.primary} />
                </View>
                <Text style={[styles.emptyRequestsTitle, { color: dynamicColors.text }]}>No Pending Requests</Text>
                <Text style={[styles.emptyRequestsSubtitle, { color: dynamicColors.textMuted }]}>
                  Incoming friend requests will appear here. You are all caught up!
                </Text>
              </View>
            ) : (
              <FlatList
                data={friendsSubTab === 'contacts' ? filterFriendsByQuery(friendsList) : filterFriendsByQuery(suggestedList)}
                keyExtractor={item => String(item._id || item.id)}
                renderItem={({ item }) => {
                  const itemId = String(item._id || item.id);
                  const statusInfo = getStatusInfo(itemId);
                  const isCurrentContact = isUserContact(itemId);
                  const isActing = actionLoadingId === itemId;

                  return (
                    <View style={[styles.friendCard, { backgroundColor: dynamicColors.card }]}>
                      <TouchableOpacity
                        style={styles.avatarWrapper}
                        onPress={() => setAvatarViewerTarget({
                          visible: true,
                          avatarUrl: item.avatar,
                          name: item.displayName || item.username,
                          handle: item.username,
                          bio: item.bio,
                          customStatus: item.customStatus,
                          status: statusInfo.label,
                          targetPersonaId: itemId
                        })}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{ uri: getMediaUrl(item.avatar, item.displayName || item.username) }}
                          style={styles.contactAvatar}
                        />
                        {statusInfo.color ? <View style={[styles.onlineDot, { backgroundColor: statusInfo.color }]} /> : null}
                      </TouchableOpacity>

                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.contactName, { color: dynamicColors.text }]} numberOfLines={1}>
                            {item.displayName || item.username}
                          </Text>
                          {statusInfo.isOnline && (
                            <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 8 }}>
                              <Text style={{ fontSize: 9, fontWeight: 'bold', color: statusInfo.color || '#10b981' }}>{statusInfo.label}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.contactHandle, { color: dynamicColors.textMuted }]} numberOfLines={1}>
                          @{item.username}{!statusInfo.isOnline ? ' • Offline' : ''}
                        </Text>
                      </View>

                      {/* Action buttons matching tab and contact state */}
                      <View style={styles.friendCardActions}>
                        {isCurrentContact ? (
                          <>
                            <TouchableOpacity
                              style={[styles.friendActionBtn, { backgroundColor: dynamicColors.primary }]}
                              onPress={() => handleStartDM(itemId)}
                              activeOpacity={0.8}
                            >
                              <MessageSquare size={12} color="#ffffff" />
                              <Text style={styles.friendActionBtnText}>Message</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.friendActionBtn, styles.friendRemoveBtn]}
                              onPress={() => handleRemoveContact(itemId, item.displayName || item.username)}
                              disabled={isActing}
                              activeOpacity={0.8}
                            >
                              {isActing ? (
                                <ActivityIndicator size="small" color="#f87171" />
                              ) : (
                                <>
                                  <UserMinus size={12} color="#f87171" />
                                  <Text style={styles.friendRemoveBtnText}>Remove</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={[styles.friendActionBtn, { backgroundColor: dynamicColors.primary }]}
                              onPress={() => handleAddFriend(itemId, item.displayName || item.username)}
                              disabled={isActing}
                              activeOpacity={0.8}
                            >
                              {isActing ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                              ) : (
                                <>
                                  <UserPlus size={12} color="#ffffff" />
                                  <Text style={styles.friendActionBtnText}>Add Friends</Text>
                                </>
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.friendActionBtn, styles.friendRemoveBtn]}
                              onPress={() => handleRemoveSuggestion(itemId)}
                              activeOpacity={0.8}
                            >
                              <UserX size={12} color="#f87171" />
                              <Text style={styles.friendRemoveBtnText}>Remove</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyFriendsListBox}>
                    <Text style={[styles.emptyFriendsListText, { color: dynamicColors.textMuted }]}>
                      {friendsSubTab === 'contacts'
                        ? (searchQuery.trim() ? "No contacts match your search." : "No contacts added yet. Explore the Suggested tab to add friends!")
                        : (searchQuery.trim() ? "No suggestions match your search." : "No suggestions found. Try searching for a username above.")}
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  <TouchableOpacity
                    style={[
                      styles.inviteFriendsBannerMobile,
                      {
                        backgroundColor: themeMode === 'light' ? 'rgba(79, 70, 229, 0.08)' : 'rgba(99, 102, 241, 0.12)',
                        borderColor: themeMode === 'light' ? 'rgba(79, 70, 229, 0.25)' : 'rgba(99, 102, 241, 0.3)'
                      }
                    ]}
                    onPress={() => setInviteFriendsVisible(true)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.inviteBannerLeft}>
                      <View style={[styles.inviteBannerIcon, { backgroundColor: dynamicColors.primary }]}>
                        <Share2 size={18} color="#ffffff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.inviteBannerTitle, { color: dynamicColors.text }]}>Invite friends</Text>
                          <View style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#6366f1' }}>Web Link</Text>
                          </View>
                        </View>
                        <Text style={[styles.inviteBannerSub, { color: dynamicColors.textSecondary }]} numberOfLines={1}>
                          Share web link to WhatsApp, Instagram, Snapchat & more!
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={dynamicColors.textMuted} />
                  </TouchableOpacity>
                }
                ListFooterComponentStyle={{ marginTop: 14, marginBottom: 32 }}
              />
            )}
          </View>
        )}

        {activeTab === 'settings' && (
          <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 32 }}>
            <Text style={[styles.screenHeader, { color: dynamicColors.text }]}>Settings & Preferences</Text>

            {/* Structured Settings Category Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: settingsSection === 'profile' ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: settingsSection === 'profile' ? dynamicColors.primary : dynamicColors.cardBorder
                  }
                ]}
                onPress={() => setSettingsSection('profile')}
              >
                <Text style={[styles.filterChipText, { color: settingsSection === 'profile' ? '#ffffff' : dynamicColors.textSecondary }]}>👤 Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: settingsSection === 'appearance' ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: settingsSection === 'appearance' ? dynamicColors.primary : dynamicColors.cardBorder
                  }
                ]}
                onPress={() => setSettingsSection('appearance')}
              >
                <Text style={[styles.filterChipText, { color: settingsSection === 'appearance' ? '#ffffff' : dynamicColors.textSecondary }]}>🎨 Appearance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: settingsSection === 'notifications' ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: settingsSection === 'notifications' ? dynamicColors.primary : dynamicColors.cardBorder
                  }
                ]}
                onPress={() => setSettingsSection('notifications')}
              >
                <Text style={[styles.filterChipText, { color: settingsSection === 'notifications' ? '#ffffff' : dynamicColors.textSecondary }]}>🔔 Notifications</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: settingsSection === 'privacy' ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: settingsSection === 'privacy' ? dynamicColors.primary : dynamicColors.cardBorder
                  }
                ]}
                onPress={() => setSettingsSection('privacy')}
              >
                <Text style={[styles.filterChipText, { color: settingsSection === 'privacy' ? '#ffffff' : dynamicColors.textSecondary }]}>🔒 Privacy & Security</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: settingsSection === 'blocked' ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: settingsSection === 'blocked' ? dynamicColors.primary : dynamicColors.cardBorder
                  }
                ]}
                onPress={() => setSettingsSection('blocked')}
              >
                <Text style={[styles.filterChipText, { color: settingsSection === 'blocked' ? '#ffffff' : dynamicColors.textSecondary }]}>👥 Friends & Blocked</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: settingsSection === 'network' ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: settingsSection === 'network' ? dynamicColors.primary : dynamicColors.cardBorder
                  }
                ]}
                onPress={() => setSettingsSection('network')}
              >
                <Text style={[styles.filterChipText, { color: settingsSection === 'network' ? '#ffffff' : dynamicColors.textSecondary }]}>⚙️ Network & Server</Text>
              </TouchableOpacity>

              {user?.role === 'admin' || user?.email === 'admin@donchat.com' || user?.email === 'testalex@gmail.com' ? (
                <TouchableOpacity
                  style={[styles.filterChip, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}
                  onPress={() => setAdminModalVisible(true)}
                >
                  <Text style={[styles.filterChipText, { color: '#fbbf24' }]}>👑 Master Admin</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>

            {/* CLASS 1: PROFILE & IDENTITY */}
            {settingsSection === 'profile' && (
              <View style={{ gap: 14 }}>
                {/* Identity Header Card */}
                <View style={[styles.settingsCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.settingsSectionTitle, { color: dynamicColors.textMuted }]}>👤 PROFILE IDENTITY</Text>
                  <View style={styles.personaRow}>
                    <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8} style={{ position: 'relative' }}>
                      <Image source={{ uri: getMediaUrl(activePersona?.avatar) || DEFAULT_AVATAR }} style={styles.chatAvatar} />
                      <View style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        backgroundColor: dynamicColors.primary,
                        borderRadius: 12,
                        width: 22,
                        height: 22,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: dynamicColors.card
                      }}>
                        <Camera size={11} color="#ffffff" />
                      </View>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.settingsVal, { color: dynamicColors.text }]}>{activePersona?.displayName || 'User'}</Text>
                      <Text style={[styles.settingsSub, { color: dynamicColors.textSecondary }]}>@{activePersona?.username || 'user'}</Text>
                      <TouchableOpacity onPress={handlePickAvatar} style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Camera size={13} color={dynamicColors.primary} />
                        <Text style={{ color: dynamicColors.primary, fontSize: 12, fontWeight: 'bold' }}>
                          {uploadingAvatar ? 'Uploading image...' : 'Change Profile Picture'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Switch Persona */}
                  {personas && personas.length > 0 ? (
                    <View style={{ marginTop: 8 }}>
                      <Text style={[styles.settingsLabel, { color: dynamicColors.textMuted }]}>Switch Active Persona:</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {personas.map(p => (
                          <TouchableOpacity
                            key={p._id}
                            style={[
                              styles.switchPill,
                              { backgroundColor: p._id === activePersona?._id ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)' }
                            ]}
                            onPress={() => switchPersona(p._id)}
                          >
                            <Text style={[styles.switchPillText, { color: p._id === activePersona?._id ? '#ffffff' : dynamicColors.text }]}>@{p.username}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: themeMode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)', borderColor: dynamicColors.cardBorder }]}
                    onPress={() => setPersonaModalVisible(true)}
                  >
                    <Text style={[styles.actionBtnText, { color: dynamicColors.text }]}>+ Create New Persona</Text>
                  </TouchableOpacity>
                </View>

                {/* Real-Time Presence Status Selector */}
                <View style={[styles.settingsCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.settingsSectionTitle, { color: dynamicColors.textMuted }]}>🟢 REAL-TIME PRESENCE STATUS</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    <TouchableOpacity
                      style={[styles.statusPill, presenceStatus === 'online' && styles.statusPillOnline]}
                      onPress={() => handlePresenceChange('online')}
                    >
                      <Text style={[styles.statusPillText, { color: presenceStatus === 'online' ? dynamicColors.success : dynamicColors.text }]}>🟢 Online</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.statusPill, presenceStatus === 'away' && styles.statusPillAway]}
                      onPress={() => handlePresenceChange('away')}
                    >
                      <Text style={[styles.statusPillText, { color: presenceStatus === 'away' ? '#f59e0b' : dynamicColors.text }]}>🟡 Away</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.statusPill, presenceStatus === 'dnd' && styles.statusPillDnd]}
                      onPress={() => handlePresenceChange('dnd')}
                    >
                      <Text style={[styles.statusPillText, { color: presenceStatus === 'dnd' ? dynamicColors.danger : dynamicColors.text }]}>🔴 Do Not Disturb</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.statusPill, presenceStatus === 'offline' && styles.statusPillOffline]}
                      onPress={() => handlePresenceChange('offline')}
                    >
                      <Text style={[styles.statusPillText, { color: presenceStatus === 'offline' ? '#94a3b8' : dynamicColors.text }]}>⚪ Appear Offline</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Profile Fields Inputs */}
                <View style={[styles.settingsCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.settingsSectionTitle, { color: dynamicColors.textMuted }]}>✏️ PUBLIC IDENTITY FIELDS</Text>

                  <View style={{ gap: 10 }}>
                    <Text style={[styles.settingsLabel, { color: dynamicColors.textMuted }]}>DISPLAY NAME</Text>
                    <TextInput
                      style={[styles.settingsInput, { backgroundColor: dynamicColors.inputBg, borderColor: dynamicColors.inputBorder, color: dynamicColors.text }]}
                      value={displayNameInput}
                      onChangeText={setDisplayNameInput}
                      placeholder="Display Name"
                      placeholderTextColor={dynamicColors.textMuted}
                    />

                    <Text style={[styles.settingsLabel, { color: dynamicColors.textMuted }]}>USERNAME HANDLE</Text>
                    <TextInput
                      style={[styles.settingsInput, { backgroundColor: dynamicColors.inputBg, borderColor: dynamicColors.inputBorder, color: dynamicColors.text }]}
                      value={usernameInput}
                      onChangeText={setUsernameInput}
                      placeholder="Username (@handle)"
                      placeholderTextColor={dynamicColors.textMuted}
                    />

                    <Text style={[styles.settingsLabel, { color: dynamicColors.textMuted }]}>BIO</Text>
                    <TextInput
                      style={[styles.settingsInput, { backgroundColor: dynamicColors.inputBg, borderColor: dynamicColors.inputBorder, color: dynamicColors.text }]}
                      value={bioText}
                      onChangeText={setBioText}
                      placeholder="Write something about yourself..."
                      placeholderTextColor={dynamicColors.textMuted}
                    />

                    <Text style={[styles.settingsLabel, { color: dynamicColors.textMuted }]}>CUSTOM STATUS</Text>
                    <TextInput
                      style={[styles.settingsInput, { backgroundColor: dynamicColors.inputBg, borderColor: dynamicColors.inputBorder, color: dynamicColors.text }]}
                      value={customStatusText}
                      onChangeText={setCustomStatusText}
                      placeholder="e.g. Building something great 🚀"
                      placeholderTextColor={dynamicColors.textMuted}
                    />

                    <TouchableOpacity style={[styles.saveProfileBtn, { backgroundColor: dynamicColors.primary }]} onPress={handleUpdateProfile}>
                      <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>Save Profile Changes</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* CLASS 2: APPEARANCE & THEMES */}
            {settingsSection === 'appearance' && (
              <View style={{ gap: 14 }}>
                <View style={[styles.settingsCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.settingsSectionTitle, { color: dynamicColors.textMuted }]}>🎨 THEME SELECTION</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[
                        styles.themeBox,
                        {
                          backgroundColor: themeMode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : themeMode === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255, 255, 255, 0.04)',
                          borderColor: themeMode === 'dark' ? dynamicColors.primary : dynamicColors.cardBorder
                        }
                      ]}
                      onPress={() => changeTheme('dark')}
                    >
                      <Text style={{ fontSize: 20 }}>🌙</Text>
                      <Text style={[styles.themeTitle, { color: dynamicColors.text }]}>Dark</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.themeBox,
                        {
                          backgroundColor: themeMode === 'light' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          borderColor: themeMode === 'light' ? dynamicColors.primary : dynamicColors.cardBorder
                        }
                      ]}
                      onPress={() => changeTheme('light')}
                    >
                      <Text style={{ fontSize: 20 }}>☀️</Text>
                      <Text style={[styles.themeTitle, { color: dynamicColors.text }]}>Light</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.themeBox,
                        {
                          backgroundColor: themeMode === 'system' ? 'rgba(99, 102, 241, 0.2)' : themeMode === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255, 255, 255, 0.04)',
                          borderColor: themeMode === 'system' ? dynamicColors.primary : dynamicColors.cardBorder
                        }
                      ]}
                      onPress={() => changeTheme('system')}
                    >
                      <Text style={{ fontSize: 20 }}>💻</Text>
                      <Text style={[styles.themeTitle, { color: dynamicColors.text }]}>System</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.settingsCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.settingsSectionTitle, { color: dynamicColors.textMuted }]}>🔤 FONT SIZE SCALING</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[
                        styles.switchPill,
                        { flex: 1, alignItems: 'center', backgroundColor: fontSizeScale === 'small' ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)' }
                      ]}
                      onPress={() => changeFontSize('small')}
                    >
                      <Text style={[styles.switchPillText, { color: fontSizeScale === 'small' ? '#ffffff' : dynamicColors.text }]}>Small (85%)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.switchPill,
                        { flex: 1, alignItems: 'center', backgroundColor: fontSizeScale === 'medium' ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)' }
                      ]}
                      onPress={() => changeFontSize('medium')}
                    >
                      <Text style={[styles.switchPillText, { color: fontSizeScale === 'medium' ? '#ffffff' : dynamicColors.text }]}>Medium (100%)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.switchPill,
                        { flex: 1, alignItems: 'center', backgroundColor: fontSizeScale === 'large' ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)' }
                      ]}
                      onPress={() => changeFontSize('large')}
                    >
                      <Text style={[styles.switchPillText, { color: fontSizeScale === 'large' ? '#ffffff' : dynamicColors.text }]}>Large (120%)</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Live Text Preview Card */}
                <View style={[styles.settingsCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.settingsSectionTitle, { color: dynamicColors.textMuted }]}>💬 LIVE TEXT PREVIEW</Text>
                  <View style={{ backgroundColor: dynamicColors.card, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: dynamicColors.cardBorder, gap: 6, marginTop: 4 }}>
                    <Text style={{ fontSize: scaledFont(14), fontWeight: 'bold', color: dynamicColors.text }}>
                      Sample Message Stream Title
                    </Text>
                    <Text style={{ fontSize: scaledFont(12), color: dynamicColors.textSecondary, lineHeight: Math.round(scaledFont(12) * 1.4) }}>
                      This preview updates in real-time as you select Small, Medium, or Large font scale options!
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* CLASS 3: NOTIFICATIONS & SOUNDS */}
            {settingsSection === 'notifications' && (
              <View style={{ gap: 14 }}>
                <View style={[styles.settingsCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.settingsSectionTitle, { color: dynamicColors.textMuted }]}>🔔 NOTIFICATION PREFERENCES</Text>
                  <View style={{ gap: 12, marginTop: 8 }}>
                    <View style={[styles.prefRow, { borderBottomColor: dynamicColors.cardBorder }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.prefLabel, { color: dynamicColors.text }]}>Direct Message Alerts</Text>
                        <Text style={[styles.settingsDesc, { color: dynamicColors.textSecondary }]}>Show toast popups for direct messages</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.switchPill, { backgroundColor: notifMsgEnabled ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)' }]}
                        onPress={() => setNotifMsgEnabled(prev => !prev)}
                      >
                        <Text style={[styles.switchPillText, { color: notifMsgEnabled ? '#ffffff' : dynamicColors.text }]}>{notifMsgEnabled ? 'ON' : 'OFF'}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.prefRow, { borderBottomColor: dynamicColors.cardBorder }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.prefLabel, { color: dynamicColors.text }]}>Space Mentions Alerts</Text>
                        <Text style={[styles.settingsDesc, { color: dynamicColors.textSecondary }]}>Show toast popups for channel mentions</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.switchPill, { backgroundColor: notifSpaceEnabled ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)' }]}
                        onPress={() => setNotifSpaceEnabled(prev => !prev)}
                      >
                        <Text style={[styles.switchPillText, { color: notifSpaceEnabled ? '#ffffff' : dynamicColors.text }]}>{notifSpaceEnabled ? 'ON' : 'OFF'}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.prefRow, { borderBottomColor: dynamicColors.cardBorder }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.prefLabel, { color: dynamicColors.text }]}>Sound Effects & Chimes</Text>
                        <Text style={[styles.settingsDesc, { color: dynamicColors.textSecondary }]}>Play audio chime when notifications arrive</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.switchPill, { backgroundColor: notifSoundEnabled ? dynamicColors.primary : themeMode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)' }]}
                        onPress={() => setNotifSoundEnabled(prev => !prev)}
                      >
                        <Text style={[styles.switchPillText, { color: notifSoundEnabled ? '#ffffff' : dynamicColors.text }]}>{notifSoundEnabled ? 'ON' : 'OFF'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={[styles.settingsCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.settingsSectionTitle, { color: dynamicColors.textMuted }]}>🔊 AUDIO TEST</Text>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: themeMode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)', borderColor: dynamicColors.cardBorder }]}
                    onPress={() => playChimeSound()}
                  >
                    <Text style={[styles.actionBtnText, { color: dynamicColors.text }]}>🔔 Play Sample iPhone Chime Sound</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* CLASS 4: PRIVACY & SECURITY */}
            {settingsSection === 'privacy' && (
              <View style={{ gap: 14 }}>
                {/* Chat Lock Passcode Security Card */}
                <View style={[styles.settingsCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.settingsSectionTitle, { color: dynamicColors.textMuted }]}>🔒 CHAT LOCK & PASSCODE PIN</Text>
                  {Boolean(user?.isDemo || user?.email === 'demo@donchat.com') ? (
                    <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.25)', marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: '#fbbf24', fontWeight: 'bold' }}>
                        ⚡ Chat Passcode is disabled on the Demo Account
                      </Text>
                      <Text style={{ fontSize: 10, color: dynamicColors.textSecondary, marginTop: 2 }}>
                        Passcode lock is disabled so all demo guests can freely explore conversations. Register your own account to set a PIN.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.settingsDesc, { color: dynamicColors.textSecondary }]}>
                        {passcodeStatus.hasPasscode
                          ? `4-digit PIN passcode active. Chat Lock is currently ${passcodeStatus.chatLockEnabled ? 'ENABLED' : 'DISABLED'}.`
                          : 'Set a 4-digit PIN passcode to lock private conversations and chats.'}
                      </Text>

                      <View style={{ gap: 10, marginTop: 4 }}>
                        {!passcodeStatus.hasPasscode ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: dynamicColors.primary }]}
                            onPress={() => setSetPasscodeVisible(true)}
                          >
                            <Text style={[styles.actionBtnText, { color: dynamicColors.primary, fontWeight: 'bold' }]}>
                              ➕ Set 4-Digit Security Passcode
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={[
                                styles.actionBtn,
                                {
                                  backgroundColor: passcodeStatus.chatLockEnabled ? 'rgba(16, 185, 129, 0.15)' : (themeMode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)'),
                                  borderColor: passcodeStatus.chatLockEnabled ? dynamicColors.success : dynamicColors.cardBorder
                                }
                              ]}
                              onPress={handleToggleChatLock}
                            >
                              <Text style={[styles.actionBtnText, { color: passcodeStatus.chatLockEnabled ? dynamicColors.success : dynamicColors.text }]}>
                                {passcodeStatus.chatLockEnabled ? '✓ Chat Lock Active (Tap to Disable)' : '🔒 Enable Chat Lock'}
                              </Text>
                            </TouchableOpacity>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                              <TouchableOpacity
                                style={[styles.actionBtn, { flex: 1, backgroundColor: themeMode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)', borderColor: dynamicColors.cardBorder }]}
                                onPress={() => setSetPasscodeVisible(true)}
                              >
                                <Text style={[styles.actionBtnText, { color: dynamicColors.text }]}>✏️ Change Passcode</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.actionBtn, { flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                                onPress={handleRemovePasscode}
                              >
                                <Text style={[styles.actionBtnText, { color: colors.danger }]}>🗑️ Remove</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        )}
                      </View>
                    </>
                  )}
                </View>

                {/* Privacy Preferences Controls */}
                <View style={[styles.settingsCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.settingsSectionTitle, { color: dynamicColors.textMuted }]}>👁️ PRIVACY CONTROLS</Text>
                    <TouchableOpacity
                      onPress={() => setPrivacyModalVisible(true)}
                      style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(99, 102, 241, 0.15)', borderWidth: 1, borderColor: dynamicColors.primary }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: dynamicColors.primary }}>Setup Modal ›</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ gap: 12 }}>
                    <View style={[styles.prefRow, { borderBottomColor: dynamicColors.cardBorder }]}>
                      <Text style={[styles.prefLabel, { color: dynamicColors.text }]}>Who can find me by handle?</Text>
                      <TouchableOpacity
                        style={styles.prefValueBtn}
                        onPress={async () => {
                          const current = activePersona?.privacySettings?.whoCanFindMe || 'friends';
                          const next = current === 'everyone' ? 'friends' : current === 'friends' ? 'nobody' : 'everyone';
                          try {
                            const res = await api.patch(`/personas/${activePersona._id}`, {
                              privacySettings: {
                                ...(activePersona?.privacySettings || {}),
                                whoCanFindMe: next,
                                setupCompleted: true
                              }
                            });
                            if (res.data?.success) {
                              setActivePersona(res.data.persona);
                              fetchData();
                            }
                          } catch (e) {}
                        }}
                      >
                        <Text style={[styles.prefValueText, { color: dynamicColors.primary }]}>
                          {(activePersona?.privacySettings?.whoCanFindMe || 'friends').toUpperCase()} ›
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.prefRow, { borderBottomColor: dynamicColors.cardBorder }]}>
                      <Text style={[styles.prefLabel, { color: dynamicColors.text }]}>Online visibility</Text>
                      <TouchableOpacity
                        style={styles.prefValueBtn}
                        onPress={async () => {
                          const current = activePersona?.privacySettings?.onlineVisibility || 'nobody';
                          const next = current === 'nobody' ? 'friends' : current === 'friends' ? 'everyone' : 'nobody';
                          try {
                            const res = await api.patch(`/personas/${activePersona._id}`, {
                              privacySettings: {
                                ...(activePersona?.privacySettings || {}),
                                onlineVisibility: next,
                                setupCompleted: true
                              }
                            });
                            if (res.data?.success) {
                              setActivePersona(res.data.persona);
                              fetchData();
                            }
                          } catch (e) {}
                        }}
                      >
                        <Text style={[styles.prefValueText, { color: dynamicColors.primary }]}>
                          {(activePersona?.privacySettings?.onlineVisibility || 'nobody').toUpperCase()} ›
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.prefRow, { borderBottomColor: dynamicColors.cardBorder }]}>
                      <Text style={[styles.prefLabel, { color: dynamicColors.text }]}>New account announcements</Text>
                      <TouchableOpacity
                        style={styles.prefValueBtn}
                        onPress={async () => {
                          const current = Boolean(activePersona?.privacySettings?.newAccountAnnouncements);
                          try {
                            const res = await api.patch(`/personas/${activePersona._id}`, {
                              privacySettings: {
                                ...(activePersona?.privacySettings || {}),
                                newAccountAnnouncements: !current,
                                setupCompleted: true
                              }
                            });
                            if (res.data?.success) {
                              setActivePersona(res.data.persona);
                              fetchData();
                            }
                          } catch (e) {}
                        }}
                      >
                        <Text style={[styles.prefValueText, { color: dynamicColors.primary }]}>
                          {activePersona?.privacySettings?.newAccountAnnouncements ? 'ENABLED ›' : 'DISABLED ›'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[styles.actionBtn, { marginTop: 8, backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: dynamicColors.primary }]}
                      onPress={() => navigation.navigate('PrivacyPolicy')}
                    >
                      <Text style={[styles.actionBtnText, { color: dynamicColors.primary, fontWeight: 'bold' }]}>
                        📜 View Official Privacy Policy Document
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Change Login Password Form */}
                <View style={[styles.settingsCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.settingsSectionTitle, { color: dynamicColors.textMuted }]}>🔑 CHANGE LOGIN PASSWORD</Text>
                  {Boolean(user?.isDemo || user?.email === 'demo@donchat.com') ? (
                    <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.25)', marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: '#fbbf24', fontWeight: 'bold' }}>
                        ⚡ Demo Showcase Account
                      </Text>
                      <Text style={{ fontSize: 10, color: dynamicColors.textSecondary, marginTop: 2 }}>
                        Password modification is disabled on the shared Demo Account. Register your own free account to personalize your credentials.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      <TextInput
                        style={[styles.settingsInput, { backgroundColor: dynamicColors.inputBg, borderColor: dynamicColors.inputBorder, color: dynamicColors.text }]}
                        placeholder="Current Password"
                        placeholderTextColor={dynamicColors.textMuted}
                        secureTextEntry
                        value={currPassword}
                        onChangeText={setCurrPassword}
                      />

                      <TextInput
                        style={[styles.settingsInput, { backgroundColor: dynamicColors.inputBg, borderColor: dynamicColors.inputBorder, color: dynamicColors.text }]}
                        placeholder="New Password (min 6 chars)"
                        placeholderTextColor={dynamicColors.textMuted}
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                      />

                      <TouchableOpacity
                        style={[styles.saveProfileBtn, { backgroundColor: dynamicColors.primary }, changingPass && { opacity: 0.5 }]}
                        disabled={changingPass}
                        onPress={handleChangeAccountPassword}
                      >
                        {changingPass ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>Update Login Password</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* CLASS 5: FRIENDS & BLOCKED USERS */}
            {settingsSection === 'blocked' && (
              <View style={{ gap: 14 }}>
                <View style={[styles.settingsCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.settingsSectionTitle, { color: dynamicColors.textMuted }]}>👥 CONTACTS & BLOCKED USERS</Text>
                  <Text style={[styles.settingsDesc, { color: dynamicColors.textSecondary }]}>
                    View friend requests, manage active contacts, or unblock handles.
                  </Text>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: themeMode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)', borderColor: dynamicColors.cardBorder }]}
                    onPress={() => setFriendRequestsVisible(true)}
                  >
                    <Text style={[styles.actionBtnText, { color: dynamicColors.text }]}>👥 Open Friend Requests & Blocked Directory</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* CLASS 6: NETWORK & SERVER */}
            {settingsSection === 'network' && (
              <View style={{ gap: 14 }}>
                <View style={[styles.settingsCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.settingsSectionTitle, { color: dynamicColors.textMuted }]}>⚙️ SERVER & NETWORK CONFIGURATION</Text>
                  <Text style={[styles.settingsDesc, { color: dynamicColors.textSecondary }]}>
                    Configure server IP address for Expo Go and local WiFi networking.
                  </Text>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: themeMode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)', borderColor: dynamicColors.cardBorder }]}
                    onPress={() => setIpModalVisible(true)}
                  >
                    <Text style={styles.actionBtnText}>⚙️ Open Server IP Network Settings</Text>
                  </TouchableOpacity>
                </View>

                {user?.role === 'admin' || user?.email === 'admin@donchat.com' || user?.email === 'testalex@gmail.com' ? (
                  <View style={styles.settingsCard}>
                    <Text style={styles.settingsSectionTitle}>👑 MASTER ADMIN CONTROL</Text>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}
                      onPress={() => setAdminModalVisible(true)}
                    >
                      <Text style={[styles.actionBtnText, { color: '#fbbf24' }]}>👑 Open Master Admin Dashboard</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Sign Out Card */}
                <View style={styles.settingsCard}>
                  <Text style={styles.settingsSectionTitle}>🚪 ACCOUNT SESSION</Text>
                  <TouchableOpacity style={styles.logoutBtnFull} onPress={logout}>
                    <Text style={styles.logoutBtnText}>Sign Out of GenAce</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Bottom Tab Bar with Unread Indicators */}
      {(() => {
        const totalUnreadChats = (conversations || []).reduce((acc, c) => acc + ((getUnreadCount ? getUnreadCount(c._id) : 0) || c.unreadCount || 0), 0);
        const totalUnreadSpaces = (spaces || []).reduce((acc, s) => acc + ((getUnreadCount ? getUnreadCount(s._id) : 0) || s.unreadCount || 0), 0);

        return (
          <View style={[styles.bottomBar, { backgroundColor: dynamicColors.card, borderTopColor: dynamicColors.cardBorder }]}>
            <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('chats')}>
              <View style={{ position: 'relative' }}>
                <MessageSquare size={20} color={activeTab === 'chats' ? dynamicColors.primary : dynamicColors.textMuted} />
                {totalUnreadChats > 0 && <View style={styles.tabUnreadBadgeDot} />}
              </View>
              <Text style={[styles.tabLabel, { color: activeTab === 'chats' ? dynamicColors.primary : dynamicColors.textMuted }, activeTab === 'chats' && styles.tabActive]}>Chats</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('spaces')}>
              <View style={{ position: 'relative' }}>
                <Zap size={20} color={activeTab === 'spaces' ? dynamicColors.primary : dynamicColors.textMuted} />
                {totalUnreadSpaces > 0 && <View style={styles.tabUnreadBadgeDot} />}
              </View>
              <Text style={[styles.tabLabel, { color: activeTab === 'spaces' ? dynamicColors.primary : dynamicColors.textMuted }, activeTab === 'spaces' && styles.tabActive]}>Spaces</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('friends')}>
              <Users size={20} color={activeTab === 'friends' ? dynamicColors.primary : dynamicColors.textMuted} />
              <Text style={[styles.tabLabel, { color: activeTab === 'friends' ? dynamicColors.primary : dynamicColors.textMuted }, activeTab === 'friends' && styles.tabActive]}>Friends</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('settings')}>
              <Settings size={20} color={activeTab === 'settings' ? dynamicColors.primary : dynamicColors.textMuted} />
              <Text style={[styles.tabLabel, { color: activeTab === 'settings' ? dynamicColors.primary : dynamicColors.textMuted }, activeTab === 'settings' && styles.tabActive]}>Settings</Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* Floating Members Directory FAB matching Web App */}
      <TouchableOpacity
        style={styles.floatingMembersFab}
        onPress={() => setMembersDrawerVisible(prev => !prev)}
        activeOpacity={0.8}
      >
        <Users size={15} color="#ffffff" />
        <Text style={styles.floatingMembersFabText}>
          {membersDrawerVisible ? 'Hide' : 'Members'}
        </Text>
      </TouchableOpacity>

      <ServerIpModal
        visible={ipModalVisible}
        onClose={() => setIpModalVisible(false)}
        onSave={() => fetchData()}
      />

      <CreateSpaceModal
        visible={createSpaceVisible}
        onClose={() => setCreateSpaceVisible(false)}
        onSuccess={() => fetchData()}
      />

      <PersonaModal
        visible={personaModalVisible}
        onClose={() => setPersonaModalVisible(false)}
      />

      <InviteMemberModal
        visible={!!inviteModalSpace}
        space={inviteModalSpace}
        onClose={() => setInviteModalSpace(null)}
        onSuccess={() => fetchData()}
      />

      <AdminModal
        visible={adminModalVisible}
        onClose={() => setAdminModalVisible(false)}
      />

      <FriendRequestsModal
        visible={friendRequestsVisible}
        onClose={() => setFriendRequestsVisible(false)}
        onSuccess={() => fetchData()}
      />

      <MembersDrawerModal
        visible={membersDrawerVisible}
        onClose={() => setMembersDrawerVisible(false)}
        contacts={contacts}
        activePersona={activePersona}
        onStartDM={handleStartDM}
        onOpenCreateSpace={() => setCreateSpaceVisible(true)}
        onOpenNewChat={() => setActiveTab('friends')}
      />

      <SpaceDetailsModal
        visible={!!previewSpaceId}
        spaceId={previewSpaceId}
        onClose={() => setPreviewSpaceId(null)}
        onSuccess={() => fetchData()}
      />

      <SetPasscodeModal
        visible={setPasscodeVisible}
        hasExistingPasscode={passcodeStatus.hasPasscode}
        onClose={() => setSetPasscodeVisible(false)}
        onSuccess={() => fetchData()}
      />

      <AvatarViewerModal
        visible={avatarViewerTarget.visible}
        onClose={() => setAvatarViewerTarget(prev => ({ ...prev, visible: false }))}
        avatarUrl={avatarViewerTarget.avatarUrl}
        name={avatarViewerTarget.name}
        handle={avatarViewerTarget.handle}
        bio={avatarViewerTarget.bio}
        customStatus={avatarViewerTarget.customStatus}
        targetPersonaId={avatarViewerTarget.targetPersonaId}
        isContact={isUserContact(avatarViewerTarget.targetPersonaId)}
        isSelf={String(activePersona?._id || activePersona?.id) === String(avatarViewerTarget.targetPersonaId)}
        onStartDM={handleStartDM}
        onAddContact={(id) => handleAddFriend(id, avatarViewerTarget.name)}
        onDeleteContact={() => handleRemoveContact(avatarViewerTarget.targetPersonaId, avatarViewerTarget.name)}
        onBlockUser={() => fetchData(true)}
      />

      <InviteFriendsModal
        visible={inviteFriendsVisible}
        onClose={() => setInviteFriendsVisible(false)}
        activePersona={activePersona}
      />

      <IncomingCallModal
        incomingCall={incomingCall}
        call={incomingCall}
        onAcceptCall={() => handleAcceptIncomingCall(incomingCall)}
        onDeclineCall={() => handleDeclineIncomingCall(incomingCall)}
      />

      <PrivacySetupModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
        activePersona={activePersona}
        onUpdated={(updated) => {
          setActivePersona(updated);
          fetchData();
        }}
      />

      {/* Status Composer Modal (Text / Image / Video) */}
      <StatusComposerModal
        visible={showStatusComposer}
        onClose={() => setShowStatusComposer(false)}
        onStatusPosted={() => {
          fetchStatuses();
        }}
        activePersona={activePersona}
        privacySettings={statusPrivacySettings}
        onOpenPrivacyModal={() => setShowStatusPrivacyModal(true)}
      />

      {/* Status Fullscreen Story Viewer (WhatsApp & Telegram style) */}
      <StatusViewerModal
        visible={showStatusViewer}
        onClose={() => {
          setShowStatusViewer(false);
          setActiveStatusGroup(null);
          fetchStatuses();
        }}
        statusGroup={activeStatusGroup}
        activePersona={activePersona}
        onStatusDeleted={() => fetchStatuses()}
        onMuteToggled={() => fetchStatuses()}
        onStatusViewed={() => fetchStatuses()}
        onOpenDirectChat={(convId) => {
          setShowStatusViewer(false);
          navigation.navigate('Conversation', { conversationId: convId });
        }}
      />

      {/* Status Privacy & Muting Settings Modal */}
      <StatusPrivacyModal
        visible={showStatusPrivacyModal}
        onClose={() => setShowStatusPrivacyModal(false)}
        activePersona={activePersona}
        dynamicColors={dynamicColors}
        themeMode={themeMode}
        onPrivacyUpdated={(updatedPrivacy) => {
          setStatusPrivacySettings(updatedPrivacy);
          fetchStatuses();
        }}
      />

      {/* Full Status Updates List Modal (See updates >) */}
      <StatusUpdatesListModal
        visible={showStatusUpdatesListModal}
        onClose={() => setShowStatusUpdatesListModal(false)}
        myStatuses={statusData.myStatuses}
        recentStatuses={statusData.recentStatuses}
        viewedStatuses={statusData.viewedStatuses}
        mutedStatuses={statusData.mutedStatuses}
        activePersona={activePersona}
        dynamicColors={dynamicColors}
        themeMode={themeMode}
        onPressMyStatus={() => {
          setShowStatusUpdatesListModal(false);
          if (statusData.myStatuses?.length > 0) {
            setActiveStatusGroup({ persona: activePersona, statuses: statusData.myStatuses });
            setShowStatusViewer(true);
          } else {
            setShowStatusComposer(true);
          }
        }}
        onPressAddStatus={() => {
          setShowStatusUpdatesListModal(false);
          setShowStatusComposer(true);
        }}
        onPressGroup={(group) => {
          setShowStatusUpdatesListModal(false);
          setActiveStatusGroup(group);
          setShowStatusViewer(true);
        }}
        onToggleUnmute={async (targetId) => {
          try {
            await api.post(`/statuses/mute/${targetId}`, { mute: false });
            fetchStatuses();
          } catch (e) {}
        }}
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
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  logoBadgeText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userBadge: {
    position: 'relative',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: colors.card,
  },
  body: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  // Search Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    opacity: 0.6,
  },
  mainSearchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
  },
  clearSearchIcon: {
    fontSize: 12,
    color: colors.textMuted,
    padding: 4,
  },
  // Filter Chips
  filterScrollView: {
    maxHeight: 38,
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  // Section Headers
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  sectionBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  // Spaces Cards
  spacesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  spaceCardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  spaceIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceName: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  spaceSubText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  // Chat Card Items (Web style)
  chatCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 10,
  },
  chatCardLocked: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.03)',
  },
  avatarWrapper: {
    position: 'relative',
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: colors.card,
  },
  dmAvatarStoryContainer: {
    padding: 2,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dmAvatarRingUnseen: {
    borderWidth: 2.5,
  },
  dmAvatarRingViewed: {
    borderWidth: 2,
  },
  storyActiveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 2,
    borderColor: colors.card,
  },
  storyPillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  storyPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chatInfoMain: {
    flex: 1,
    gap: 4,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
    marginRight: 8,
  },
  chatTimeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  chatBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatSnippetText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  lockIconBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  unreadDotBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  tabUnreadBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  // Contacts Item
  contactRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: 8,
  },
  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  contactName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.white,
  },
  contactHandle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  quickDmBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  quickDmBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  screenHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  createSpaceBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createSpaceBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  spaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 10,
  },
  spaceCardIcon: {
    fontSize: 22,
  },
  spaceCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
  spaceCardDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  spaceJoinTag: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 12,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: 8,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  friendsSubTabsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  friendsSubTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  friendsSubTabTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  subTabBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  subTabBadgeNumber: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  friendCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  friendActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  friendActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  friendRemoveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.28)',
    borderWidth: 1,
  },
  friendRemoveBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyRequestsBox: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyRequestsIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyRequestsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyRequestsSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 240,
  },
  emptyFriendsListBox: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFriendsListText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  settingsCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    padding: 16,
    borderRadius: 16,
    gap: 8,
    marginBottom: 14,
  },
  settingsSectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  personaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  settingsVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
  settingsSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  settingsDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  switchPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  switchPillActive: {
    backgroundColor: colors.primary,
  },
  switchPillText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  actionBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.success,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusPillOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.success,
  },
  statusPillAway: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
  },
  statusPillDnd: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.danger,
  },
  statusPillOffline: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderColor: '#94a3b8',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.white,
  },
  settingsInput: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 13,
  },
  saveProfileBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  saveProfileBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  themeBox: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    gap: 6,
  },
  themeBoxActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: colors.primary,
  },
  themeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  prefLabel: {
    fontSize: 12,
    color: colors.white,
  },
  prefValueBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  prefValueText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
  },
  logoutBtnFull: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  tabBtn: {
    alignItems: 'center',
  },
  tabIcon: {
    fontSize: 18,
    opacity: 0.5,
  },
  tabLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  tabActive: {
    opacity: 1,
    color: colors.primary,
    fontWeight: 'bold',
  },
  webActionContainer: {
    marginVertical: 10,
    gap: 12,
  },
  heroCenterBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  heroLogoOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroLogoInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogoText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.white,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  webGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  webCard: {
    width: '48%',
    backgroundColor: '#101625',
    borderColor: '#1d273e',
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webCardIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  webCardSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  webCardArrow: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textMuted,
    marginLeft: 2,
  },
  webBanner: {
    backgroundColor: '#101625',
    borderColor: '#1d273e',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  webBannerIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.white,
  },
  webBannerSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  webBannerBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  webBannerBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  webBannerMembersBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  presenceBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onlineDotPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  presenceTitle: {
    color: colors.success,
    fontSize: 13,
    fontWeight: 'bold',
  },
  presenceSub: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  inviteSpaceBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  inviteSpaceBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  premiumCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(168, 85, 247, 0.4)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  premiumTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.white,
  },
  premiumSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  premiumBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  premiumBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  floatingMembersFab: {
    position: 'absolute',
    bottom: 70,
    right: 18,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingMembersFabText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  publicSpaceCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  publicSpaceIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pubBadgePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pubBadgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10b981',
  },
  cardAiSummaryPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  cardAiSummaryText: {
    fontSize: 10,
    color: colors.primary,
  },
  publicCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  publicCardOwnerText: {
    fontSize: 11,
  },
  publicCardMembersText: {
    fontSize: 11,
  },
  publicCardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  previewSpaceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  previewSpaceBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  joinSpaceBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  hamburgerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    marginRight: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  hamburgerIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  versionPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  versionPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#818cf8',
    letterSpacing: 0.5,
  },
  inviteFriendsBannerMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  inviteBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  inviteBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  inviteBannerSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
});

