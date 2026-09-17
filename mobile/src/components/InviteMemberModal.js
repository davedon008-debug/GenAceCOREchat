import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Image
} from 'react-native';
import api, { getMediaUrl } from '../config/api';
import { colors } from '../theme/colors';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

export default function InviteMemberModal({ visible, space, onClose, onSuccess }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentMemberIds = space?.members?.map(m => m.personaId?._id || m.personaId) || [];

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

  const handleSubmit = async () => {
    if (selectedMembers.length === 0) {
      setErrorMsg('Please select at least one person to invite.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.post(`/spaces/${space._id}/invite`, {
        personaIds: selectedMembers.map(m => m._id)
      });

      if (res.data?.success) {
        if (onSuccess) onSuccess(res.data.space);
        setSelectedMembers([]);
        setSearchQuery('');
        onClose();
      } else {
        setErrorMsg(res.data?.message || 'Failed to invite members');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to invite members');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Invite Members to {space?.title || 'Space'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Selected Members Chips */}
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
                    style={{ width: 18, height: 18, borderRadius: 9, marginRight: 4 }}
                  />
                  <Text style={styles.selectedChipText}>@{m.username} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Search Input */}
          <View style={styles.searchGroup}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search user handle (@username)..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          {/* Search Results List */}
          <ScrollView style={styles.resultsList}>
            {searchResults.map(u => {
              const isAlreadyMember = currentMemberIds.some(id => String(id) === String(u._id));
              const isSelected = selectedMembers.some(m => m._id === u._id);

              return (
                <View key={u._id} style={styles.userRow}>
                  <Image source={{ uri: getMediaUrl(u.avatar) || DEFAULT_AVATAR }} style={styles.userAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{u.displayName || u.username}</Text>
                    <Text style={styles.userHandle}>@{u.username}</Text>
                  </View>

                  {isAlreadyMember ? (
                    <Text style={styles.alreadyTag}>Already Member</Text>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addBtn, isSelected && styles.addBtnSelected]}
                      onPress={() => handleAddMember(u)}
                      disabled={isSelected}
                    >
                      <Text style={styles.addBtnText}>{isSelected ? '✓ Added' : '+ Add'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={isSubmitting || selectedMembers.length === 0}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Send Invitations</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.white,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  selectedChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedChipText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  searchGroup: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 13,
  },
  resultsList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  alreadyTag: {
    color: colors.textMuted,
    fontSize: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
