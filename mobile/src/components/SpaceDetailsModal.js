import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Lock, Globe, X, Sparkles, Plus } from 'lucide-react-native';
import api, { getMediaUrl } from '../config/api';
import { colors } from '../theme/colors';
import AvatarViewerModal from './AvatarViewerModal';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

export default function SpaceDetailsModal({ visible, spaceId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [space, setSpace] = useState(null);
  const [members, setMembers] = useState([]);
  const [isMember, setIsMember] = useState(true);
  const [joining, setJoining] = useState(false);
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ visible: false, avatarUrl: '', name: '', handle: '', bio: '', customStatus: '' });

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

                  {members.map(m => {
                    const p = m.personaId || {};
                    const role = m.role || 'member';
                    const bio = p.bio || '';

                    return (
                      <TouchableOpacity
                        key={p._id || m._id}
                        style={styles.memberRow}
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
                              <Text style={styles.roleText}>{role.toUpperCase()}</Text>
                            </View>
                          </View>
                          <Text style={styles.memberHandle}>@{p.username || 'member'}</Text>
                          {bio ? <Text style={styles.memberBioText} numberOfLines={1}>"{bio}"</Text> : null}
                        </View>
                      </TouchableOpacity>
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
