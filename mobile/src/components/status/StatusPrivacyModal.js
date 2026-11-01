import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Check,
  Shield,
  Users,
  UserX,
  Globe,
  Search
} from 'lucide-react-native';
import api, { getMediaUrl } from '../../config/api';

export default function StatusPrivacyModal({
  visible,
  onClose,
  activePersona,
  dynamicColors,
  themeMode,
  onPrivacyUpdated
}) {
  const [selectedType, setSelectedType] = useState('all_contacts'); // 'all_contacts' | 'exclude' | 'everyone'
  const [contacts, setContacts] = useState([]);
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isLight = themeMode === 'light';

  // Load status privacy and contacts on open
  useEffect(() => {
    if (visible && activePersona?._id) {
      loadPrivacyData();
    }
  }, [visible, activePersona]);

  const loadPrivacyData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/statuses/privacy');
      if (res.data?.success) {
        const privacy = res.data.statusPrivacy || {};
        setSelectedType(privacy.defaultType || 'all_contacts');
        const muted = (privacy.mutedViewers || []).map(p => (p._id || p).toString());
        setExcludedIds(new Set(muted));
        setContacts(res.data.contacts || []);
      }
    } catch (err) {
      console.error('Failed to load status privacy:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExcludePersona = (personaId) => {
    const idStr = String(personaId);
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(idStr)) {
        next.delete(idStr);
      } else {
        next.add(idStr);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.patch('/statuses/privacy', {
        defaultType: selectedType,
        mutedViewers: Array.from(excludedIds)
      });

      if (res.data?.success) {
        if (onPrivacyUpdated) {
          onPrivacyUpdated(res.data.statusPrivacy);
        }
        onClose();
      }
    } catch (err) {
      Alert.alert('Save Failed', err.response?.data?.message || 'Could not save privacy settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredContacts = contacts.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.displayName && c.displayName.toLowerCase().includes(q)) ||
      (c.username && c.username.toLowerCase().includes(q))
    );
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.background || '#0b101b' }]}>
        {/* Header Bar */}
        <View style={[styles.header, { borderBottomColor: dynamicColors.cardBorder || 'rgba(255,255,255,0.08)' }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={22} color={dynamicColors.text || '#ffffff'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: dynamicColors.text || '#ffffff' }]}>
            Status Privacy
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: dynamicColors.primary || '#6366f1' }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>Done</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={[styles.sectionSubtitle, { color: dynamicColors.textSecondary || '#94a3b8' }]}>
            Who can see my status updates? Changes will not affect status updates that you've already posted.
          </Text>

          {/* Privacy Option 1: My Contacts */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              { backgroundColor: dynamicColors.card || 'rgba(255,255,255,0.04)', borderColor: dynamicColors.cardBorder || 'rgba(255,255,255,0.08)' },
              selectedType === 'all_contacts' && [styles.optionCardSelected, { borderColor: dynamicColors.primary || '#6366f1' }]
            ]}
            onPress={() => setSelectedType('all_contacts')}
          >
            <View style={[styles.optionIconBg, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
              <Users size={20} color="#818cf8" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.optionTitle, { color: dynamicColors.text || '#ffffff' }]}>
                My Contacts
              </Text>
              <Text style={[styles.optionDesc, { color: dynamicColors.textMuted || '#94a3b8' }]}>
                All saved friends & contacts can see your status
              </Text>
            </View>
            <View style={[
              styles.radioCircle,
              { borderColor: selectedType === 'all_contacts' ? (dynamicColors.primary || '#6366f1') : '#64748b' },
              selectedType === 'all_contacts' && { backgroundColor: dynamicColors.primary || '#6366f1' }
            ]}>
              {selectedType === 'all_contacts' && <Check size={12} color="#ffffff" strokeWidth={3} />}
            </View>
          </TouchableOpacity>

          {/* Privacy Option 2: My Contacts Except (Mute people from seeing status) */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              { backgroundColor: dynamicColors.card || 'rgba(255,255,255,0.04)', borderColor: dynamicColors.cardBorder || 'rgba(255,255,255,0.08)' },
              selectedType === 'exclude' && [styles.optionCardSelected, { borderColor: dynamicColors.primary || '#6366f1' }]
            ]}
            onPress={() => setSelectedType('exclude')}
          >
            <View style={[styles.optionIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <UserX size={20} color="#f87171" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.optionTitle, { color: dynamicColors.text || '#ffffff' }]}>
                My Contacts Except...
              </Text>
              <Text style={[styles.optionDesc, { color: dynamicColors.textMuted || '#94a3b8' }]}>
                Mute selected people from seeing your status ({excludedIds.size} excluded)
              </Text>
            </View>
            <View style={[
              styles.radioCircle,
              { borderColor: selectedType === 'exclude' ? (dynamicColors.primary || '#6366f1') : '#64748b' },
              selectedType === 'exclude' && { backgroundColor: dynamicColors.primary || '#6366f1' }
            ]}>
              {selectedType === 'exclude' && <Check size={12} color="#ffffff" strokeWidth={3} />}
            </View>
          </TouchableOpacity>

          {/* Privacy Option 3: Everyone */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              { backgroundColor: dynamicColors.card || 'rgba(255,255,255,0.04)', borderColor: dynamicColors.cardBorder || 'rgba(255,255,255,0.08)' },
              selectedType === 'everyone' && [styles.optionCardSelected, { borderColor: dynamicColors.primary || '#6366f1' }]
            ]}
            onPress={() => setSelectedType('everyone')}
          >
            <View style={[styles.optionIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <Globe size={20} color="#34d399" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.optionTitle, { color: dynamicColors.text || '#ffffff' }]}>
                Everyone
              </Text>
              <Text style={[styles.optionDesc, { color: dynamicColors.textMuted || '#94a3b8' }]}>
                All users on GenAce can see your status
              </Text>
            </View>
            <View style={[
              styles.radioCircle,
              { borderColor: selectedType === 'everyone' ? (dynamicColors.primary || '#6366f1') : '#64748b' },
              selectedType === 'everyone' && { backgroundColor: dynamicColors.primary || '#6366f1' }
            ]}>
              {selectedType === 'everyone' && <Check size={12} color="#ffffff" strokeWidth={3} />}
            </View>
          </TouchableOpacity>

          {/* Exclusion Contacts List (Only when 'exclude' is active or configuring muted people) */}
          {selectedType === 'exclude' && (
            <View style={styles.exclusionSection}>
              <View style={styles.exclusionHeader}>
                <Text style={[styles.exclusionTitle, { color: dynamicColors.text || '#ffffff' }]}>
                  Select People to Mute ({excludedIds.size} muted)
                </Text>
              </View>

              {/* Search contacts input */}
              <View style={[styles.searchBox, { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)' }]}>
                <Search size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: dynamicColors.text || '#ffffff' }]}
                  placeholder="Search contacts to mute..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {isLoading ? (
                <ActivityIndicator size="small" color="#6366f1" style={{ marginVertical: 20 }} />
              ) : filteredContacts.length === 0 ? (
                <View style={styles.emptyContacts}>
                  <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                    No contacts found. Friends you message will appear here.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredContacts}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => {
                    const isExcluded = excludedIds.has(String(item._id));
                    return (
                      <TouchableOpacity
                        style={[
                          styles.contactRow,
                          { borderBottomColor: 'rgba(255,255,255,0.05)' }
                        ]}
                        activeOpacity={0.7}
                        onPress={() => toggleExcludePersona(item._id)}
                      >
                        <Image
                          source={{ uri: getMediaUrl(item.avatar, item.displayName) }}
                          style={styles.contactAvatar}
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.contactName, { color: dynamicColors.text || '#ffffff' }]}>
                            {item.displayName || item.username}
                          </Text>
                          <Text style={styles.contactHandle}>
                            @{item.username}
                          </Text>
                        </View>

                        <View style={[
                          styles.checkbox,
                          isExcluded && { backgroundColor: '#ef4444', borderColor: '#ef4444' }
                        ]}>
                          {isExcluded && <Check size={13} color="#ffffff" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  style={{ maxHeight: 280 }}
                />
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  closeBtn: {
    padding: 6
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800'
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  content: {
    flex: 1,
    padding: 16
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10
  },
  optionCardSelected: {
    borderWidth: 2
  },
  optionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700'
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 2
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  exclusionSection: {
    marginTop: 14,
    flex: 1
  },
  exclusionHeader: {
    marginBottom: 8
  },
  exclusionTitle: {
    fontSize: 14,
    fontWeight: '700'
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 13
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1
  },
  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700'
  },
  contactHandle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyContacts: {
    paddingVertical: 24,
    alignItems: 'center'
  }
});
