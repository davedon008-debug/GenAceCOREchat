import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Lock, Globe, X, Sparkles, Plus, UserPlus, UserMinus, ShieldCheck } from 'lucide-react-native';
import api, { getMediaUrl, DEFAULT_AVATAR } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import AvatarViewerModal from './AvatarViewerModal';
import InviteMemberModal from './InviteMemberModal';

export default function SpaceDetailsModal({ visible, spaceId, onClose, onSuccess }) {
  const { activePersona } = useAuth();
  const [loading, setLoading] = useState(false);
  const [space, setSpace] = useState(null);
  const [members, setMembers] = useState([]);
  const [isMember, setIsMember] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ visible: false, avatarUrl: '', name: '', handle: '', bio: '', customStatus: '' });

  const currentPersonaId = activePersona?._id ? String(activePersona._id) : null;
  const currentUserId = activePersona?.userId ? String(activePersona.userId._id || activePersona.userId) : null;

  const ownerPersonaIdStr = space?.ownerPersonaId?._id 
    ? String(space.ownerPersonaId._id) 
    : (space?.ownerPersonaId ? String(space.ownerPersonaId) : null);
  const ownerUserIdStr = space?.ownerPersonaId?.userId 
    ? String(space.ownerPersonaId.userId._id || space.ownerPersonaId.userId) 
    : null;

  const isOwner = !!(
    (currentPersonaId && ownerPersonaIdStr && currentPersonaId === ownerPersonaIdStr) ||
    (currentUserId && ownerUserIdStr && currentUserId === ownerUserIdStr)
  );

  const myMember = members.find(m => {
    const mPId = String(m.personaId?._id || m.personaId || '');
    const mUId = m.personaId?.userId ? String(m.personaId.userId._id || m.personaId.userId) : null;
    return (currentPersonaId && mPId === currentPersonaId) || (currentUserId && mUId && mUId === currentUserId);
  });

  const isAdmin = isOwner || (myMember && ['owner', 'admin'].includes(myMember.role)) || (activePersona?.role === 'admin');

  const fetchSpace = async () => {
    if (!spaceId) return;
    try {
      setLoading(true);
      const res = await api.get(`/spaces/${spaceId}`);
      if (res.data?.success) {
        setSpace(res.data.space);
        setMembers(res.data.space?.members || []);
        if (typeof res.data.isMember === 'boolean') {
          setIsMember(res.data.isMember);
        }
      }
    } catch (err) {
      console.error('Fetch space details error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSpace = async () => {
    if (!spaceId) return;
    setJoining(true);
    try {
      const res = await api.post(`/spaces/${spaceId}/join`);
      if (res.data?.success) {
        Alert.alert('Joined Space!', `You are now a member of ${res.data.space?.title || 'this space'}.`);
        setIsMember(true);
        fetchSpace();
        onSuccess && onSuccess(res.data.space);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to join space');
    } finally {
      setJoining(false);
    }
  };

  const handleRemoveMember = (targetPersonaId, memberName) => {
    if (!targetPersonaId) return;
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this space?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Member',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/spaces/${spaceId}/members/${targetPersonaId}`);
              if (res.data?.success) {
                Alert.alert('Member Removed', `${memberName} removed from this space.`);
                setMembers(prev => prev.filter(m => String(m.personaId?._id || m.personaId) !== String(targetPersonaId)));
                if (onSuccess) onSuccess(res.data.space);
              }
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to remove member');
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    if (visible) {
      fetchSpace();
    }
  }, [visible, spaceId]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(99, 102, 241, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.titleText}>{space?.title || 'Space Info'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  {space?.visibility === 'private' ? (
                    <>
                      <Lock size={11} color={colors.textMuted} />
                      <Text style={styles.subtitleText}>Private Space</Text>
                    </>
                  ) : (
                    <>
                      <Globe size={11} color={colors.textMuted} />
                      <Text style={styles.subtitleText}>Public Space</Text>
                    </>
                  )}
                  {isAdmin && (
                    <View style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: 4 }}>
                      <Text style={{ color: '#c084fc', fontSize: 9, fontWeight: 'bold' }}>👑 YOU ARE ADMIN</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24, gap: 14 }}>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
            ) : (
              <>
                {/* Space Info Box */}
                <View style={styles.infoCard}>
                  <Text style={styles.sectionLabel}>ABOUT THIS SPACE</Text>
                  <Text style={styles.descText}>{space?.description || 'No description provided.'}</Text>
                  
                  {space?.aiSummary && space.aiSummary !== 'No summary generated yet.' && (
                    <View style={styles.aiSummaryBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <Sparkles size={13} color={colors.primary} />
                        <Text style={styles.aiSummaryTitle}>AI Summary</Text>
                      </View>
                      <Text style={styles.aiSummaryText}>{space.aiSummary}</Text>
                    </View>
                  )}

                  <Text style={styles.statSubText}>
                    Created: {space?.createdAt ? new Date(space.createdAt).toLocaleDateString() : 'N/A'}
                    {space?.ownerPersonaId?.username ? ` • By @${space.ownerPersonaId.username}` : ''}
                    {` • ${members.length} Members`}
                  </Text>
                </View>

                {/* Member Action Buttons */}
                {isMember && (
                  <View style={{ gap: 8 }}>
                    {isAdmin && (
                      <TouchableOpacity
                        style={[styles.joinBtn, { backgroundColor: colors.primary }]}
                        onPress={() => setInviteModalVisible(true)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <UserPlus size={16} color="#ffffff" />
                          <Text style={styles.joinBtnText}>+ Add / Invite People to Space</Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.joinBtn, { backgroundColor: space?.isLocked ? 'rgba(245, 158, 11, 0.2)' : 'rgba(99, 102, 241, 0.15)', borderWidth: 1, borderColor: space?.isLocked ? 'rgba(245, 158, 11, 0.4)' : 'rgba(99, 102, 241, 0.3)' }]}
                      onPress={async () => {
                        if (!spaceId) return;
                        try {
                          const res = await api.post('/auth/toggle-lock-chat', { spaceId });
                          if (res.data?.success) {
                            const nextState = !!res.data.isLocked;
                            setSpace(prev => prev ? { ...prev, isLocked: nextState } : prev);
                            Alert.alert(
                              nextState ? 'Space Locked 🔒' : 'Space Unlocked 🔓',
                              nextState ? 'This space is now locked with your 4-digit PIN.' : 'Passcode lock removed from this space.'
                            );
                            if (onSuccess) onSuccess(res.data.space);
                          }
                        } catch (err) {
                          Alert.alert('Error', err.response?.data?.message || 'Failed to toggle lock status');
                        }
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Lock size={16} color={space?.isLocked ? '#f59e0b' : '#818cf8'} />
                        <Text style={[styles.joinBtnText, { color: space?.isLocked ? '#f59e0b' : '#818cf8' }]}>
                          {space?.isLocked ? 'Unlock Space (Passcode Set)' : 'Lock Space with PIN 🔒'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Join Button for non-members viewing public space */}
                {!isMember && space?.visibility === 'public' && (
                  <TouchableOpacity
                    style={[styles.joinBtn, joining && { opacity: 0.6 }]}
                    onPress={handleJoinSpace}
                    disabled={joining}
                  >
                    {joining ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Plus size={16} color="#ffffff" />
                        <Text style={styles.joinBtnText}>Join Public Space</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {/* Member Roster */}
                <View style={{ gap: 10 }}>
                  <Text style={styles.sectionLabel}>MEMBER ROSTER ({members.length})</Text>

                  {members
                    .filter(m => m && m.personaId)
                    .map(m => {
                      const p = (m.personaId && typeof m.personaId === 'object') ? m.personaId : {};
                      const targetPId = String(p._id || p.id || m.personaId || m._id || '');
                      if (!targetPId || targetPId === 'null' || targetPId === 'undefined') return null;

                      const targetUId = p.userId ? String(p.userId._id || p.userId) : null;
                      const isMemberOwner = targetPId === ownerPersonaIdStr || (targetUId && ownerUserIdStr && targetUId === ownerUserIdStr);
                      const role = isMemberOwner ? 'owner' : (m.role || 'member');
                      const bio = p.bio || '';
                      const isMe = targetPId === currentPersonaId || (targetUId && currentUserId && targetUId === currentUserId);
                      const canKickThisUser = isAdmin && !isMe && !isMemberOwner;

                    return (
                      <View key={targetPId} style={styles.memberRow}>
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
                          onPress={() => setAvatarViewerTarget({
                            visible: true,
                            avatarUrl: p.avatar,
                            name: p.displayName || p.username || 'Member',
                            handle: p.username,
                            bio: p.bio,
                            customStatus: p.customStatus
                          })}
                          activeOpacity={0.8}
                        >
                          <Image source={{ uri: getMediaUrl(p.avatar || DEFAULT_AVATAR) }} style={styles.avatar} />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.memberName}>{p.displayName || p.username || 'Member'}</Text>
                              <View style={[styles.roleBadge, role === 'owner' ? styles.roleOwner : role === 'admin' ? styles.roleAdmin : styles.roleMember]}>
                                <Text style={styles.roleText}>{role === 'owner' ? '👑 OWNER / ADMIN' : role.toUpperCase()}</Text>
                              </View>
                            </View>
                            <Text style={styles.memberHandle}>@{p.username || 'member'}</Text>
                            {bio ? <Text style={styles.memberBioText} numberOfLines={1}>"{bio}"</Text> : null}
                          </View>
                        </TouchableOpacity>

                        {canKickThisUser && (
                          <TouchableOpacity
                            style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', borderWidth: 1, borderRadius: 8 }}
                            onPress={() => handleRemoveMember(targetPId, p.displayName || p.username || 'Member')}
                          >
                            <Text style={{ color: '#f87171', fontSize: 11, fontWeight: 'bold' }}>Remove</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          <AvatarViewerModal
            visible={avatarViewerTarget.visible}
            onClose={() => setAvatarViewerTarget(prev => ({ ...prev, visible: false }))}
            avatarUrl={avatarViewerTarget.avatarUrl}
            name={avatarViewerTarget.name}
            handle={avatarViewerTarget.handle}
            bio={avatarViewerTarget.bio}
            customStatus={avatarViewerTarget.customStatus}
          />

          <InviteMemberModal
            visible={inviteModalVisible}
            space={space}
            onClose={() => setInviteModalVisible(false)}
            onSuccess={(updatedSpace) => {
              if (updatedSpace) {
                setSpace(updatedSpace);
                setMembers(updatedSpace.members || []);
              }
              fetchSpace();
              if (onSuccess) onSuccess(updatedSpace);
            }}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeIcon: {
    fontSize: 22,
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  subtitleText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  body: {
    padding: 20,
  },
  infoCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  descText: {
    fontSize: 13,
    color: colors.white,
    lineHeight: 18,
  },
  statSubText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  aiSummaryBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  aiSummaryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  aiSummaryText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  joinBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  memberName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.white,
  },
  memberHandle: {
    fontSize: 10,
    color: colors.textMuted,
  },
  memberBioText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleOwner: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  roleAdmin: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  roleMember: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  roleText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.white,
  },
});
