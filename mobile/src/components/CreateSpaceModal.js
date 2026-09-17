import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { getMediaUrl } from '../config/api';
import { colors } from '../theme/colors';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';
const ICON_OPTIONS = ['⚡', '🚀', '💬', '💼', '🎮', '🎨', '💡', '🛡️', '🌐', '🔒'];

export default function CreateSpaceModal({ visible, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('⚡');
  const [visibility, setVisibility] = useState('public'); // 'public' | 'private'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/personas/search?query=${encodeURIComponent(query.trim())}`);
      if (res.data?.success) {
        setSearchResults(res.data.personas || []);
      }
    } catch (err) {
      console.error('Failed to search personas:', err);
    }
  };

  const handleAddMember = (persona) => {
    if (!selectedMembers.some(m => m._id === persona._id)) {
      setSelectedMembers([...selectedMembers, persona]);
    }
  };

  const handleRemoveMember = (personaId) => {
    setSelectedMembers(selectedMembers.filter(m => m._id !== personaId));
  };

  const handleCreateSpace = async () => {
    if (!title.trim()) {
      Alert.alert('Space Name Required', 'Please enter a title for your Fluid Space.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/spaces', {
        title: title.trim(),
        description: description.trim(),
        icon,
        visibility,
        invitedPersonaIds: selectedMembers.map(m => m._id)
      });

      if (res.data?.success) {
        Alert.alert('Success', 'Fluid Space created successfully!');
        setTitle('');
        setDescription('');
        setSelectedMembers([]);
        setSearchQuery('');
        onSuccess && onSuccess(res.data.space);
        onClose();
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to create space');
      }
    } catch (err) {
      console.error('Create space error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to create space');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.spaceBadge}>⚡</Text>
              <View>
                <Text style={styles.titleText}>Create Fluid Space</Text>
                <Text style={styles.subtitleText}>Group workspace & channel</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ gap: 16 }}>
            {/* Symbol selector */}
            <View>
              <Text style={styles.label}>CHOOSE SPACE SYMBOL</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 6 }}>
                {ICON_OPTIONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconPill, icon === ic && styles.iconPillActive]}
                    onPress={() => setIcon(ic)}
                  >
                    <Text style={{ fontSize: 18 }}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Inputs */}
            <View style={{ gap: 10 }}>
              <Text style={styles.label}>SPACE NAME *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Design Sync, Dev Team, Marketing"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={{ gap: 10 }}>
              <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="What is this space for?"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Visibility selector */}
            <View style={{ gap: 10 }}>
              <Text style={styles.label}>VISIBILITY</Text>
              <View style={styles.visRow}>
                <TouchableOpacity
                  style={[styles.visBtn, visibility === 'public' && styles.visBtnActive]}
                  onPress={() => setVisibility('public')}
                >
                  <Text style={styles.visTitle}>🌐 Public</Text>
                  <Text style={styles.visSub}>Anyone on app can join</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.visBtn, visibility === 'private' && styles.visBtnActive]}
                  onPress={() => setVisibility('private')}
                >
                  <Text style={styles.visTitle}>🔒 Private</Text>
                  <Text style={styles.visSub}>Invite members only</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Invite Members Section */}
            <View style={{ gap: 10 }}>
              <Text style={styles.label}>INVITE MEMBERS ({selectedMembers.length})</Text>

              {/* Selected Member Chips */}
              {selectedMembers.length > 0 && (
                <View style={styles.selectedRow}>
                  {selectedMembers.map(m => (
                    <TouchableOpacity
                      key={m._id}
                      style={styles.selectedChip}
                      onPress={() => handleRemoveMember(m._id)}
                    >
                      <Image
                        source={{ uri: getMediaUrl(m.avatar) || DEFAULT_AVATAR }}
                        style={styles.chipAvatar}
                      />
                      <Text style={styles.selectedChipText}>{m.displayName || m.username} ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Search input */}
              <TextInput
                style={styles.input}
                placeholder="Search user handle (@username)..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={handleSearch}
              />

              {/* Search results list */}
              {searchQuery ? (
                <View style={styles.searchResultsBox}>
                  {searchResults.map((u) => {
                    const isAdded = selectedMembers.some(m => m._id === u._id);
                    return (
                      <View key={u._id} style={styles.userRow}>
                        <Image
                          source={{ uri: getMediaUrl(u.avatar) || DEFAULT_AVATAR }}
                          style={styles.userAvatar}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName}>{u.displayName || u.username}</Text>
                          <Text style={styles.userHandle}>@{u.username}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.addBtn, isAdded && styles.addBtnSelected]}
                          onPress={() => handleAddMember(u)}
                          disabled={isAdded}
                        >
                          <Text style={styles.addBtnText}>{isAdded ? '✓ Added' : '+ Add'}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  {searchResults.length === 0 && (
                    <Text style={{ color: colors.textMuted, fontSize: 11, padding: 8, textAlign: 'center' }}>
                      No matching users found.
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, (!title.trim() || submitting) && styles.submitBtnDisabled]}
              onPress={handleCreateSpace}
              disabled={!title.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>⚡ Launch Space</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    maxHeight: '85%',
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
  spaceBadge: {
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
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: colors.primary,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 13,
  },
  visRow: {
    flexDirection: 'row',
    gap: 10,
  },
  visBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    gap: 2,
  },
  visBtnActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  visTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.white,
  },
  visSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  selectedChipText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  searchResultsBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    maxHeight: 180,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  userName: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  userHandle: {
    color: colors.textMuted,
    fontSize: 10,
  },
  addBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addBtnSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: colors.success,
  },
  addBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
});
