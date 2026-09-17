import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  FlatList, Image, TextInput, ActivityIndicator, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
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
import Logo from '../components/Logo';
import {
  Menu, Search, MessageSquare, Zap, Users, Settings, Compass,
  Globe, Info, Plus, Shield, Crown, Lock, ChevronRight, X, User, Camera
} from 'lucide-react-native';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

export default function MainTabScreen({ navigation }) {
  const { activePersona, user, personas, switchPersona, logout, setActivePersona } = useAuth();
  const { themeMode, fontSizeScale, changeTheme, changeFontSize, colors: dynamicColors, fontMultiplier, scaledFont } = useTheme();
  const { socket, onlinePersonaIds = [], personaStatuses = {} } = useSocket() || {};
  const safeOnlineIds = Array.isArray(onlinePersonaIds) ? onlinePersonaIds.map(String) : [];

  const getStatusColor = (personaId) => {
    if (!personaId) return null;
    const idStr = String(personaId);
    const st = personaStatuses?.[idStr];
    if (st === 'away') return '#f59e0b';
    if (st === 'dnd') return '#ef4444';
    if (st === 'online' || safeOnlineIds.includes(idStr)) return dynamicColors.success || '#10b981';
    return null;
  };
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
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [friendRequestsVisible, setFriendRequestsVisible] = useState(false);
  const [membersDrawerVisible, setMembersDrawerVisible] = useState(false);
  const [previewSpaceId, setPreviewSpaceId] = useState(null);
  const [setPasscodeVisible, setSetPasscodeVisible] = useState(false);
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ visible: false, avatarUrl: '', name: '', handle: '', bio: '', customStatus: '' });

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

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [convRes, spaceRes, pubSpaceRes, contactRes, passRes] = await Promise.all([
        api.get('/conversations').catch(() => ({ data: { conversations: [] } })),
        api.get('/spaces').catch(() => ({ data: { spaces: [] } })),
        api.get('/spaces/public').catch(() => ({ data: { spaces: [] } })),
        api.get('/personas/all').catch(() => ({ data: { contacts: [] } })),
        api.get('/auth/passcode-status').catch(() => ({ data: { hasPasscode: false, chatLockEnabled: false } }))
      ]);

      if (convRes.data?.success) setConversations(convRes.data.conversations || []);
      if (spaceRes.data?.success) setSpaces(spaceRes.data.spaces || []);
      if (pubSpaceRes.data?.success) setPublicSpaces(pubSpaceRes.data.spaces || []);
      if (contactRes.data?.success) setContacts(contactRes.data.contacts || []);
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

    socket.on('message:new', handleRealtimeUpdate);
    socket.on('conversation:new', handleRealtimeUpdate);
    socket.on('space:created', handleRealtimeUpdate);
    socket.on('space:updated', handleRealtimeUpdate);

    return () => {
      socket.off('message:new', handleRealtimeUpdate);
      socket.off('conversation:new', handleRealtimeUpdate);
      socket.off('space:created', handleRealtimeUpdate);
      socket.off('space:updated', handleRealtimeUpdate);
    };
  }, [socket, activePersona]);

  const handleSearchUsers = async (text) => {
    setSearchQuery(text);
    const clean = text.trim().replace(/^@/, '');
    if (!clean) {
      setFoundUsers([]);
      return;
    }
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

  const filteredSpaces = (spaces || []).filter(s => {
    if (!s) return false;
    if (filterCategory === 'locked' && !s.isLocked) return false;
    if (!queryLower) return true;
    const title = (s.title || '').toLowerCase();
    const desc = (s.description || '').toLowerCase();
    return title.includes(queryLower) || desc.includes(queryLower);
  });

  const unjoinedPublicSpaces = (publicSpaces || []).filter(pub =>
    !spaces.some(my => String(my._id) === String(pub._id))
  );

  const filteredPublicSpaces = unjoinedPublicSpaces.filter(pub => {
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

      {/* Main Body View based on Tab */}
      <View style={[styles.body, { backgroundColor: dynamicColors.background }]}>
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

                    return (
                      <TouchableOpacity
                        key={c._id}
                        style={[styles.chatCardItem, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }, c.isLocked && styles.chatCardLocked]}
                        onPress={() => navigation.navigate('Conversation', {
                          conversationId: c._id,
                          title: name,
                          avatar,
                          otherPersonaId: partner?._id,
                          isLocked: c.isLocked || false
                        })}
                        onLongPress={() => handleToggleLockChat(c._id)}
                      >
                        <TouchableOpacity
                          style={styles.avatarWrapper}
                          onPress={() => setAvatarViewerTarget({ visible: true, avatarUrl: partner?.avatar, name, handle: partner?.username, bio: partner?.bio, customStatus: partner?.customStatus })}
                          activeOpacity={0.8}
                        >
                          <Image source={{ uri: avatar }} style={styles.chatAvatar} />
                          {partnerStatusColor ? <View style={[styles.onlineDot, { backgroundColor: partnerStatusColor }]} /> : null}
                          {unreadCount > 0 && <View style={styles.unreadDotBadge} />}
                        </TouchableOpacity>

                        <View style={styles.chatInfoMain}>
                          <View style={styles.chatHeaderRow}>
                            <Text style={[styles.chatNameText, { color: dynamicColors.text }]} numberOfLines={1}>{name}</Text>
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
            <View style={[styles.searchBarContainer, { backgroundColor: dynamicColors.inputBg, borderColor: dynamicColors.inputBorder, marginBottom: 16 }]}>
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

            {/* Public Space Discovery Section */}
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

            {/* My Joined Spaces Section */}
            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.sectionTitle, { color: dynamicColors.textMuted }]}>MY JOINED SPACES ({filteredSpaces.length})</Text>
              {filteredSpaces.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder, marginTop: 8 }]}>
                  <Text style={[styles.emptyTitle, { color: dynamicColors.text }]}>⚡ No Joined Spaces</Text>
                  <Text style={[styles.emptySubtext, { color: dynamicColors.textMuted }]}>
                    Create your first space or join public communities above!
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

            <View style={styles.searchContainer}>
              <TextInput
                style={[styles.searchInput, { backgroundColor: dynamicColors.inputBg, borderColor: dynamicColors.inputBorder, color: dynamicColors.text }]}
                placeholder="Search username (@handle)..."
                placeholderTextColor={dynamicColors.textMuted}
                value={searchQuery}
                onChangeText={handleSearchUsers}
              />
            </View>

            {searching ? (
              <ActivityIndicator color={dynamicColors.primary} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={searchQuery.trim() ? foundUsers : contacts}
                keyExtractor={item => item._id}
                renderItem={({ item }) => {
                  const contactStatusColor = getStatusColor(item._id);
                  return (
                    <View style={[styles.friendCard, { backgroundColor: dynamicColors.card }]}>
                      <TouchableOpacity
                        style={styles.avatarWrapper}
                        onPress={() => setAvatarViewerTarget({ visible: true, avatarUrl: item.avatar, name: item.displayName || item.username, handle: item.username, bio: item.bio, customStatus: item.customStatus })}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: getMediaUrl(item.avatar) || DEFAULT_AVATAR }} style={styles.contactAvatar} />
                        {contactStatusColor ? <View style={[styles.onlineDot, { backgroundColor: contactStatusColor }]} /> : null}
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.contactName, { color: dynamicColors.text }]}>{item.displayName || item.username}</Text>
                        <Text style={[styles.contactHandle, { color: dynamicColors.textMuted }]}>@{item.username}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: dynamicColors.primary }]}
                        onPress={() => handleStartDM(item._id)}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Message</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
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
                </View>

                {/* Privacy Preferences Controls */}
                <View style={[styles.settingsCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.settingsSectionTitle, { color: dynamicColors.textMuted }]}>👁️ PRIVACY CONTROLS</Text>
                  <View style={{ gap: 12 }}>
                    <View style={[styles.prefRow, { borderBottomColor: dynamicColors.cardBorder }]}>
                      <Text style={[styles.prefLabel, { color: dynamicColors.text }]}>Who can find me by handle?</Text>
                      <TouchableOpacity
                        style={styles.prefValueBtn}
                        onPress={() => setFindHandlePerm(prev => prev === 'everyone' ? 'friends' : prev === 'friends' ? 'nobody' : 'everyone')}
                      >
                        <Text style={[styles.prefValueText, { color: dynamicColors.primary }]}>{findHandlePerm.toUpperCase()} ›</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.prefRow, { borderBottomColor: dynamicColors.cardBorder }]}>
                      <Text style={[styles.prefLabel, { color: dynamicColors.text }]}>Who can send me messages?</Text>
                      <TouchableOpacity
                        style={styles.prefValueBtn}
                        onPress={() => setMsgPerm(prev => prev === 'everyone' ? 'friends' : prev === 'friends' ? 'nobody' : 'everyone')}
                      >
                        <Text style={[styles.prefValueText, { color: dynamicColors.primary }]}>{msgPerm.toUpperCase()} ›</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.prefRow, { borderBottomColor: dynamicColors.cardBorder }]}>
                      <Text style={[styles.prefLabel, { color: dynamicColors.text }]}>Show online status</Text>
                      <TouchableOpacity
                        style={styles.prefValueBtn}
                        onPress={() => setShowOnline(prev => !prev)}
                      >
                        <Text style={[styles.prefValueText, { color: dynamicColors.primary }]}>{showOnline ? 'ENABLED ›' : 'DISABLED ›'}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.prefRow, { borderBottomColor: dynamicColors.cardBorder }]}>
                      <Text style={[styles.prefLabel, { color: dynamicColors.text }]}>Read receipts</Text>
                      <TouchableOpacity
                        style={styles.prefValueBtn}
                        onPress={() => setReadReceipts(prev => !prev)}
                      >
                        <Text style={[styles.prefValueText, { color: dynamicColors.primary }]}>{readReceipts ? 'ENABLED ›' : 'DISABLED ›'}</Text>
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
});

