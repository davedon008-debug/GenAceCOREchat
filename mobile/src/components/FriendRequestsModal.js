import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { getMediaUrl } from '../config/api';
import { colors } from '../theme/colors';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10' fill='%231e293b'/%3E%3Cpath d='M18 20a6 6 0 0 0-12 0'/%3E%3Ccircle cx='12' cy='10' r='4'/%3E%3C/svg%3E";

export default function FriendRequestsModal({ visible, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('contacts'); // 'contacts' | 'blocked'
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [blocked, setBlocked] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contactsRes, blockedRes] = await Promise.all([
        api.get('/personas/all').catch(() => ({ data: { contacts: [] } })),
        api.get('/personas/blocked').catch(() => ({ data: { blocked: [] } }))
      ]);

      if (contactsRes.data?.success) setContacts(contactsRes.data.contacts || []);
      if (blockedRes.data?.success) setBlocked(blockedRes.data.blockedPersonas || blockedRes.data.blocked || []);
    } catch (err) {
      console.error('Fetch friend data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible]);

  const handleUnblock = async (targetPersonaId, handle) => {
    try {
      const res = await api.delete(`/personas/block/${targetPersonaId}`);
      if (res.data?.success) {
        setBlocked(prev => prev.filter(p => p._id !== targetPersonaId));
        Alert.alert('Unblocked', `@${handle} has been unblocked.`);
        onSuccess && onSuccess();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to unblock user');
    }
  };

  const handleBlock = async (targetPersonaId, handle) => {
    try {
      const res = await api.post(`/personas/block/${targetPersonaId}`);
      if (res.data?.success) {
        Alert.alert('Blocked', `@${handle} is now blocked.`);
        fetchData();
        onSuccess && onSuccess();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to block user');
    }
  };

  const handleRemoveContact = async (targetPersonaId, name) => {
    try {
      const res = await api.delete(`/personas/contacts/remove/${targetPersonaId}`);
      if (res.data?.success) {
        setContacts(prev => prev.filter(c => c._id !== targetPersonaId));
        Alert.alert('Contact Removed', `${name} removed from contacts.`);
        onSuccess && onSuccess();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to remove contact');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.badgeIcon}>👥</Text>
              <View>
                <Text style={styles.titleText}>Contacts & Privacy Controls</Text>
                <Text style={styles.subtitleText}>Friends list & blocked users</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Nav Tabs */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, activeTab === 'contacts' && styles.navBtnActive]}
              onPress={() => setActiveTab('contacts')}
            >
              <Text style={[styles.navBtnText, activeTab === 'contacts' && styles.navBtnTextActive]}>
                👥 All Contacts ({contacts.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, activeTab === 'blocked' && styles.navBtnActive]}
              onPress={() => setActiveTab('blocked')}
            >
              <Text style={[styles.navBtnText, activeTab === 'blocked' && styles.navBtnTextActive]}>
                🚫 Blocked Users ({blocked.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24, gap: 12 }}>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
            ) : activeTab === 'contacts' ? (
              contacts.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>👥 No Contacts Found</Text>
                  <Text style={styles.emptySub}>Search user handles on the Friends tab to connect!</Text>
                </View>
              ) : (
                contacts.map(c => (
                  <View key={c._id} style={styles.itemRow}>
                    <Image source={{ uri: getMediaUrl(c.avatar || DEFAULT_AVATAR) }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{c.displayName || c.username}</Text>
                      <Text style={styles.itemSub}>@{c.username}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.dangerPill}
                      onPress={() => handleBlock(c._id, c.username)}
                    >
                      <Text style={styles.dangerPillText}>Block</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )
            ) : (
              blocked.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>🚫 No Blocked Users</Text>
                  <Text style={styles.emptySub}>You haven't blocked any personas.</Text>
                </View>
              ) : (
                blocked.map(b => (
                  <View key={b._id} style={styles.itemRow}>
                    <Image source={{ uri: getMediaUrl(b.avatar || DEFAULT_AVATAR) }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{b.displayName || b.username}</Text>
                      <Text style={styles.itemSub}>@{b.username}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.actionPill}
                      onPress={() => handleUnblock(b._id, b.username)}
                    >
                      <Text style={styles.actionPillText}>Unblock</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )
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
  navRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 10,
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
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  navBtnTextActive: {
    color: colors.white,
  },
  body: {
    padding: 20,
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
  emptySub: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  itemRow: {
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionPillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  dangerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerPillText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: 'bold',
  },
});
