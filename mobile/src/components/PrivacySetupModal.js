import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import api from '../services/api';
import { colors } from '../theme/colors';

export default function PrivacySetupModal({ visible, onClose, activePersona, onUpdated }) {
  const [whoCanFindMe, setWhoCanFindMe] = useState(
    activePersona?.privacySettings?.whoCanFindMe || 'everyone'
  );
  const [onlineVisibility, setOnlineVisibility] = useState(
    activePersona?.privacySettings?.onlineVisibility || 'everyone'
  );
  const [newAccountAnnouncements, setNewAccountAnnouncements] = useState(
    activePersona?.privacySettings?.newAccountAnnouncements ?? true
  );

  const [saving, setSaving] = useState(false);
  const [activePicker, setActivePicker] = useState(null); // 'find' | 'online' | 'announce' | null

  const handleSave = async () => {
    if (!activePersona?._id) return;
    setSaving(true);
    try {
      const payload = {
        privacySettings: {
          setupCompleted: true,
          whoCanFindMe,
          onlineVisibility,
          newAccountAnnouncements
        }
      };

      const res = await api.patch(`/personas/${activePersona._id}`, payload);
      if (res.data?.success) {
        if (onUpdated) onUpdated(res.data.persona);
        if (onClose) onClose();
      }
    } catch (err) {
      console.error('Failed to save privacy settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const getWhoSubtitle = () => {
    if (whoCanFindMe === 'everyone') return 'Friends and other GenAce users';
    if (whoCanFindMe === 'friends') return 'Only people in your contacts list';
    return 'Hidden from all discovery & search';
  };

  const getWhoBadge = () => {
    if (whoCanFindMe === 'everyone') return 'Everyone';
    if (whoCanFindMe === 'friends') return 'Friends only';
    return 'Nobody';
  };

  const getOnlineBadge = () => {
    if (onlineVisibility === 'everyone') return 'Everyone';
    if (onlineVisibility === 'friends') return 'Friends only';
    return 'Nobody';
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Infinity Brand Icon */}
            <View style={styles.iconWrapper}>
              <Text style={styles.infinityText}>∞</Text>
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.title}>Welcome to GenAce</Text>
            <Text style={styles.subtitle}>
              Your space. Your connections. Your privacy.
            </Text>

            {/* Section Heading */}
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionTitle}>Set up your privacy</Text>
              <Text style={styles.sectionSubtitle}>Choose how people can discover you.</Text>
            </View>

            {/* Card 1: Who can find me? */}
            <TouchableOpacity
              style={[styles.card, activePicker === 'find' && styles.cardActive]}
              onPress={() => setActivePicker(activePicker === 'find' ? null : 'find')}
              activeOpacity={0.8}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardIconBg}>
                  <Text style={{ fontSize: 16 }}>👥</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Who can find me?</Text>
                  <Text style={styles.cardDesc}>{getWhoSubtitle()}</Text>
                </View>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagText}>{getWhoBadge()}</Text>
                </View>
              </View>

              {activePicker === 'find' && (
                <View style={styles.pickerBox}>
                  {[
                    { id: 'everyone', label: 'Friends & Other GenAce Users (Public)', desc: 'Visible on Friends column & global search' },
                    { id: 'friends', label: 'Friends only', desc: 'Only contacts can discover you' },
                    { id: 'nobody', label: 'Nobody (Private)', desc: 'Hidden completely from friends column' }
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.pickerItem, whoCanFindMe === opt.id && styles.pickerItemActive]}
                      onPress={() => {
                        setWhoCanFindMe(opt.id);
                        setActivePicker(null);
                      }}
                    >
                      <Text style={[styles.pickerLabel, whoCanFindMe === opt.id && styles.pickerLabelActive]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.pickerDesc}>{opt.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </TouchableOpacity>

            {/* Card 2: Online visibility */}
            <TouchableOpacity
              style={[styles.card, activePicker === 'online' && styles.cardActive]}
              onPress={() => setActivePicker(activePicker === 'online' ? null : 'online')}
              activeOpacity={0.8}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardIconBg}>
                  <Text style={{ fontSize: 16 }}>👁️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Online visibility</Text>
                  <Text style={styles.cardDesc}>Control who sees your online presence.</Text>
                </View>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagText}>{getOnlineBadge()}</Text>
                </View>
              </View>

              {activePicker === 'online' && (
                <View style={styles.pickerBox}>
                  {[
                    { id: 'nobody', label: 'Nobody (Stealth Mode)', desc: 'Always appear offline to everyone' },
                    { id: 'friends', label: 'Friends only', desc: 'Only saved contacts see green status' },
                    { id: 'everyone', label: 'Everyone', desc: 'All users see your online status' }
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.pickerItem, onlineVisibility === opt.id && styles.pickerItemActive]}
                      onPress={() => {
                        setOnlineVisibility(opt.id);
                        setActivePicker(null);
                      }}
                    >
                      <Text style={[styles.pickerLabel, onlineVisibility === opt.id && styles.pickerLabelActive]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.pickerDesc}>{opt.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </TouchableOpacity>

            {/* Card 3: New account announcements */}
            <TouchableOpacity
              style={[styles.card, activePicker === 'announce' && styles.cardActive]}
              onPress={() => setActivePicker(activePicker === 'announce' ? null : 'announce')}
              activeOpacity={0.8}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardIconBg}>
                  <Text style={{ fontSize: 16 }}>🔔</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>New account announcements</Text>
                  <Text style={styles.cardDesc}>
                    {newAccountAnnouncements ? 'Notify network of registration.' : 'Your registration stays private.'}
                  </Text>
                </View>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagText}>{newAccountAnnouncements ? 'Enabled' : 'Disabled'}</Text>
                </View>
              </View>

              {activePicker === 'announce' && (
                <View style={styles.pickerBox}>
                  {[
                    { val: false, label: 'Disabled (Recommended)', desc: 'Keep registration private without broadcast' },
                    { val: true, label: 'Enabled', desc: 'Broadcast arrival to contacts' }
                  ].map(opt => (
                    <TouchableOpacity
                      key={String(opt.val)}
                      style={[styles.pickerItem, newAccountAnnouncements === opt.val && styles.pickerItemActive]}
                      onPress={() => {
                        setNewAccountAnnouncements(opt.val);
                        setActivePicker(null);
                      }}
                    >
                      <Text style={[styles.pickerLabel, newAccountAnnouncements === opt.val && styles.pickerLabelActive]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.pickerDesc}>{opt.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>

          {/* Pinned Continue Button */}
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.continueBtnText}>Continue to GenAce</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  container: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: '#0c101c',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 22,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  scrollContent: {
    alignItems: 'center'
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6
  },
  infinityText: {
    fontSize: 34,
    color: '#ffffff',
    fontWeight: 'bold',
    lineHeight: 38
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20
  },
  sectionHeaderWrap: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748b'
  },
  card: {
    width: '100%',
    backgroundColor: '#141b2d',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    marginBottom: 10
  },
  cardActive: {
    borderColor: '#6366f1'
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  cardIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  cardDesc: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  tagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#34d399'
  },
  pickerBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6
  },
  pickerItem: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#0f1626',
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  pickerItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1'
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1'
  },
  pickerLabelActive: {
    color: '#ffffff',
    fontWeight: 'bold'
  },
  pickerDesc: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2
  },
  continueBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6
  },
  continueBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold'
  }
});
