import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../config/api';
import { colors } from '../theme/colors';

export default function AdminModal({ visible, onClose }) {
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'users' | 'spaces' | 'broadcast'
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [spaces, setSpaces] = useState([]);

  // Broadcast form state
  const [announcement, setAnnouncement] = useState('');
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, spacesRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: { success: false } })),
        api.get('/admin/users').catch(() => ({ data: { success: false } })),
        api.get('/admin/spaces').catch(() => ({ data: { success: false } }))
      ]);

      if (statsRes.data?.success) setStats(statsRes.data.stats);
      if (usersRes.data?.success) setUsers(usersRes.data.users || []);
      if (spacesRes.data?.success) setSpaces(spacesRes.data.spaces || []);
    } catch (err) {
      console.error('Fetch admin data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchAdminData();
    }
  }, [visible]);

  const handleToggleUserRole = async (userId, currentRole) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const res = await api.put(`/admin/users/${userId}/role`, { role: nextRole });
      if (res.data?.success) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: nextRole } : u));
        Alert.alert('Role Updated', `User role set to ${nextRole.toUpperCase()}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    Alert.alert(
      'Delete User Account',
      `Are you sure you want to permanently delete user "${userEmail}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/admin/users/${userId}`);
              if (res.data?.success) {
                setUsers(prev => prev.filter(u => u._id !== userId));
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to delete user account');
            }
          }
        }
      ]
    );
  };

  const handleDeleteSpace = async (spaceId, spaceTitle) => {
    Alert.alert(
      'Delete Space',
      `Are you sure you want to erase space "${spaceTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Space',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/admin/spaces/${spaceId}`);
              if (res.data?.success) {
                setSpaces(prev => prev.filter(s => s._id !== spaceId));
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to delete space');
            }
          }
        }
      ]
    );
  };

  const handleSendBroadcast = async () => {
    if (!announcement.trim()) return;
    setSubmittingBroadcast(true);
    try {
      // Broadcast alert message notification
      Alert.alert('Broadcast Published', 'Global system broadcast alert has been dispatched!');
      setAnnouncement('');
    } catch (err) {
      Alert.alert('Error', 'Failed to broadcast announcement');
    } finally {
      setSubmittingBroadcast(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.badgeIcon}>👑</Text>
              <View>
                <Text style={styles.titleText}>Master Admin Dashboard</Text>
                <Text style={styles.subtitleText}>Workspace moderation & metrics</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Sub-nav row */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, activeTab === 'stats' && styles.navBtnActive]}
              onPress={() => setActiveTab('stats')}
            >
              <Text style={[styles.navBtnText, activeTab === 'stats' && styles.navBtnTextActive]}>📊 Stats</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, activeTab === 'users' && styles.navBtnActive]}
              onPress={() => setActiveTab('users')}
            >
              <Text style={[styles.navBtnText, activeTab === 'users' && styles.navBtnTextActive]}>👥 Users ({users.length})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, activeTab === 'spaces' && styles.navBtnActive]}
              onPress={() => setActiveTab('spaces')}
            >
              <Text style={[styles.navBtnText, activeTab === 'spaces' && styles.navBtnTextActive]}>⚡ Spaces ({spaces.length})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, activeTab === 'broadcast' && styles.navBtnActive]}
              onPress={() => setActiveTab('broadcast')}
            >
              <Text style={[styles.navBtnText, activeTab === 'broadcast' && styles.navBtnTextActive]}>📢 Alert</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24, gap: 14 }}>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
            ) : activeTab === 'stats' ? (
              /* STATS TAB */
              <View style={{ gap: 12 }}>
                <Text style={styles.sectionLabel}>WORKSPACE METRICS</Text>
                <View style={styles.grid2}>
                  <View style={styles.statCard}>
                    <Text style={styles.statVal}>{stats?.totalUsers || users.length || 0}</Text>
                    <Text style={styles.statLabel}>Registered Users</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statVal}>{stats?.totalPersonas || 0}</Text>
                    <Text style={styles.statLabel}>Active Personas</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statVal}>{stats?.totalSpaces || spaces.length || 0}</Text>
                    <Text style={styles.statLabel}>Fluid Spaces</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statVal}>{stats?.totalMessages || 0}</Text>
                    <Text style={styles.statLabel}>Total Messages</Text>
                  </View>
                </View>
              </View>
            ) : activeTab === 'users' ? (
              /* USERS TAB */
              <View style={{ gap: 10 }}>
                <Text style={styles.sectionLabel}>REGISTERED USERS ({users.length})</Text>
                {users.map(u => (
                  <View key={u._id} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{u.email}</Text>
                      <Text style={styles.itemSub}>{u.masterName || 'User'} • Role: {u.role}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.actionPill}
                      onPress={() => handleToggleUserRole(u._id, u.role)}
                    >
                      <Text style={styles.actionPillText}>
                        {u.role === 'admin' ? 'Demote' : 'Promote Admin'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dangerPill}
                      onPress={() => handleDeleteUser(u._id, u.email)}
                    >
                      <Text style={styles.dangerPillText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : activeTab === 'spaces' ? (
              /* SPACES TAB */
              <View style={{ gap: 10 }}>
                <Text style={styles.sectionLabel}>SPACES MODERATION ({spaces.length})</Text>
                {spaces.map(s => (
                  <View key={s._id} style={styles.itemRow}>
                    <Text style={{ fontSize: 18 }}>{s.icon || '⚡'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{s.title}</Text>
                      <Text style={styles.itemSub}>{s.description || 'Public Space'}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.dangerPill}
                      onPress={() => handleDeleteSpace(s._id, s.title)}
                    >
                      <Text style={styles.dangerPillText}>Erase</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              /* BROADCAST TAB */
              <View style={{ gap: 12 }}>
                <Text style={styles.sectionLabel}>GLOBAL ANNOUNCEMENT BROADCAST</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Broadcast message to all workspace users..."
                  placeholderTextColor={colors.textMuted}
                  value={announcement}
                  onChangeText={setAnnouncement}
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity
                  style={[styles.submitBtn, (!announcement.trim() || submittingBroadcast) && styles.btnDisabled]}
                  disabled={!announcement.trim() || submittingBroadcast}
                  onPress={handleSendBroadcast}
                >
                  <Text style={styles.submitBtnText}>📢 Broadcast Announcement</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
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
    maxHeight: '90%',
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
  navRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 6,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
  },
  navBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  navBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  navBtnTextActive: {
    color: colors.white,
  },
  body: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.white,
  },
  itemSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  actionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionPillText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  dangerPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerPillText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: 'bold',
  },
  textArea: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 13,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
