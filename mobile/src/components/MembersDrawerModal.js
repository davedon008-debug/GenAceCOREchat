import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, Image, FlatList
} from 'react-native';
import { Users, X, Search, Zap, UserPlus, Sparkles, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { colors } from '../theme/colors';
import { getMediaUrl } from '../config/api';
import AvatarViewerModal from './AvatarViewerModal';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

export default function MembersDrawerModal({
  visible = false,
  onClose,
  contacts = [],
  activePersona,
  onStartDM,
  onOpenCreateSpace,
  onOpenNewChat
}) {
  const { colors: dynamicColors, isLight } = useTheme();
  const { onlinePersonaIds = [], personaStatuses = {} } = useSocket() || {};
  const safeOnlineIds = Array.isArray(onlinePersonaIds) ? onlinePersonaIds.map(String) : [];
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ visible: false, avatarUrl: '', name: '', handle: '', bio: '', customStatus: '' });

  const formattedMembers = (contacts || [])
    .filter(c => c && typeof c === 'object')
    .map(c => {
      const contactId = String(c._id || c.id || '');
      const selfId = activePersona?._id ? String(activePersona._id) : null;
      const isSelf = !!(selfId && contactId && selfId === contactId);
      const isOnline = isSelf ? (activePersona?.status !== 'offline') : safeOnlineIds.includes(contactId);
      return {
        _id: c._id || c.id,
        name: c.displayName || (c.username ? `@${c.username}` : 'Member'),
        handle: c.username || 'user',
        role: c.type || 'Member',
        avatar: getMediaUrl(c.avatar || DEFAULT_AVATAR),
        bio: c.bio || '',
        customStatus: c.customStatus || '',
        online: isOnline
      };
    });

  const onlineMembers = formattedMembers.filter(m => m.online);
  const offlineMembers = formattedMembers.filter(m => !m.online);

  const queryLower = searchQuery.toLowerCase().trim();

  const filteredOnline = onlineMembers.filter(m =>
    !queryLower || m.name.toLowerCase().includes(queryLower) || m.handle.toLowerCase().includes(queryLower)
  );

  const filteredOffline = offlineMembers.filter(m =>
    !queryLower || m.name.toLowerCase().includes(queryLower) || m.handle.toLowerCase().includes(queryLower)
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.drawerContainer, { backgroundColor: dynamicColors.card, borderRightColor: dynamicColors.cardBorder }]}>
          {/* Drawer Top Header Bar */}
          <View style={[styles.drawerHeader, { backgroundColor: dynamicColors.card, borderBottomColor: dynamicColors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Users size={18} color={dynamicColors.primary} />
              <Text style={[styles.drawerTitle, { color: dynamicColors.text }]}>Members Directory</Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255, 255, 255, 0.08)' }]} onPress={onClose}>
              <X size={16} color={dynamicColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Sticky Top Status Banner */}
            <View style={[styles.statusWidget, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
              <View style={{ gap: 4, flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={styles.onlinePulseDot} />
                  <Text style={[styles.statusWidgetTitle, { color: dynamicColors.text }]}>You're online!</Text>
                </View>
                <Text style={[styles.statusWidgetSub, { color: dynamicColors.textSecondary }]}>Good vibes only!</Text>
              </View>
              <View style={styles.planetOrb}>
                <Sparkles size={18} color="#818cf8" />
              </View>
            </View>

            {/* Contacts Search Bar */}
            <View style={[styles.searchBar, { backgroundColor: dynamicColors.inputBg, borderColor: dynamicColors.inputBorder }]}>
              <Search size={14} color={dynamicColors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: dynamicColors.text }]}
                placeholder="Search contacts..."
                placeholderTextColor={dynamicColors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={14} color={dynamicColors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Online Members Section */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: dynamicColors.textMuted }]}>ONLINE NOW</Text>
                <Text style={styles.sectionBadge}>{onlineMembers.length}</Text>
              </View>

              {filteredOnline.length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.emptyText, { color: dynamicColors.textMuted }]}>No contacts online right now.</Text>
                </View>
              ) : (
                filteredOnline.map(m => (
                  <TouchableOpacity
                    key={m._id}
                    style={[styles.memberCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}
                    onPress={() => {
                      onClose();
                      onStartDM(m._id);
                    }}
                  >
                    <TouchableOpacity
                      style={styles.avatarContainer}
                      onPress={() => setAvatarViewerTarget({ visible: true, avatarUrl: m.avatar, name: m.name, handle: m.handle, bio: m.bio, customStatus: m.customStatus, targetPersonaId: m._id })}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: m.avatar }} style={styles.avatar} />
                      <View style={styles.onlineDot} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.memberName, { color: dynamicColors.text }]}>{m.name}</Text>
                      <Text style={styles.memberRole}>● {m.role}</Text>
                    </View>
                    <ChevronRight size={16} color={dynamicColors.textMuted} />
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Offline Contacts Section */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: dynamicColors.textMuted }]}>OFFLINE CONTACTS</Text>
                <Text style={styles.sectionBadge}>{filteredOffline.length}</Text>
              </View>

              {filteredOffline.length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
                  <Text style={[styles.emptyText, { color: dynamicColors.textMuted }]}>No offline contacts.</Text>
                </View>
              ) : (
                filteredOffline.map(m => (
                  <TouchableOpacity
                    key={m._id}
                    style={[styles.memberCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder, opacity: 0.75 }]}
                    onPress={() => {
                      onClose();
                      onStartDM(m._id);
                    }}
                  >
                    <TouchableOpacity
                      style={styles.avatarContainer}
                      onPress={() => setAvatarViewerTarget({ visible: true, avatarUrl: m.avatar, name: m.name, handle: m.handle, bio: m.bio, customStatus: m.customStatus, targetPersonaId: m._id })}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: m.avatar }} style={[styles.avatar, { opacity: 0.8 }]} />
                      <View style={[styles.onlineDot, { backgroundColor: '#64748b' }]} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.memberName, { color: dynamicColors.text }]}>{m.name}</Text>
                      <Text style={[styles.memberHandle, { color: dynamicColors.textMuted }]}>@{m.handle} • Offline</Text>
                    </View>
                    <ChevronRight size={16} color={dynamicColors.textMuted} />
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Quick Actions Section */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: dynamicColors.textMuted }]}>QUICK ACTIONS</Text>

              <TouchableOpacity
                style={[styles.actionRow, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}
                onPress={() => {
                  onClose();
                  onOpenCreateSpace();
                }}
              >
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                  <Zap size={16} color="#c084fc" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: dynamicColors.text }]}>Create Space</Text>
                  <Text style={[styles.actionSub, { color: dynamicColors.textMuted }]}>Start your own community</Text>
                </View>
                <ChevronRight size={16} color={dynamicColors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionRow, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}
                onPress={() => {
                  onClose();
                  onOpenNewChat();
                }}
              >
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                  <UserPlus size={16} color="#60a5fa" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: dynamicColors.text }]}>Add Friend</Text>
                  <Text style={[styles.actionSub, { color: dynamicColors.textMuted }]}>Search handle & build your circle</Text>
                </View>
                <ChevronRight size={16} color={dynamicColors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* App Version Footer */}
            <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: dynamicColors.textMuted, fontWeight: '600' }}>
                GenAce Mobile • v1.0.0
              </Text>
            </View>
          </ScrollView>
        </View>

        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      </View>

      <AvatarViewerModal
        visible={avatarViewerTarget.visible}
        onClose={() => setAvatarViewerTarget(prev => ({ ...prev, visible: false }))}
        avatarUrl={avatarViewerTarget.avatarUrl}
        name={avatarViewerTarget.name}
        handle={avatarViewerTarget.handle}
        bio={avatarViewerTarget.bio}
        customStatus={avatarViewerTarget.customStatus}
        targetPersonaId={avatarViewerTarget.targetPersonaId}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdrop: {
    flex: 1,
  },
  drawerContainer: {
    width: '82%',
    maxWidth: 340,
    backgroundColor: '#090d18',
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: '#151c2e',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#151c2e',
    backgroundColor: '#0c1120',
  },
  drawerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.white,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  closeBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollBody: {
    flex: 1,
    padding: 14,
  },
  statusWidget: {
    backgroundColor: '#101625',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  onlinePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusWidgetTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.white,
  },
  statusWidgetSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  planetOrb: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101625',
    borderColor: '#1d273e',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 12,
  },
  sectionBlock: {
    marginBottom: 18,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  sectionBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emptyBox: {
    backgroundColor: '#101625',
    borderColor: '#1d273e',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101625',
    borderColor: '#1d273e',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.success,
    borderWidth: 1.5,
    borderColor: '#101625',
  },
  memberName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  memberRole: {
    fontSize: 10,
    color: colors.success,
    fontWeight: 'bold',
    marginTop: 1,
  },
  memberHandle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  cardArrow: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101625',
    borderColor: '#1d273e',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  actionIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  actionSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
});
