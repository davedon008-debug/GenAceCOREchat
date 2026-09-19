import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Image, Alert, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api, { getMediaUrl, DEFAULT_AVATAR } from '../config/api';
import { ImagePicker } from '../config/safeMedia';
import { colors } from '../theme/colors';

export default function PersonaModal({ visible, onClose }) {
  const { createNewPersona } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [type, setType] = useState('personal');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null);

  const handlePickAvatar = async () => {
    if (!ImagePicker || typeof ImagePicker.requestMediaLibraryPermissionsAsync !== 'function') {
      Alert.alert('Notice', 'Image picker module is unavailable on this Expo Go sandbox.');
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
        await uploadPersonaAvatar(selectedAsset.uri);
      }
    } catch (err) {
      console.error('Avatar picker error:', err);
    }
  };

  const uploadPersonaAvatar = async (fileUri) => {
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
        setAvatar(uploadRes.data.url);
      }
    } catch (err) {
      console.error('Failed to upload persona avatar:', err);
      Alert.alert('Upload Failed', 'Could not upload profile picture. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUsernameChange = async (val) => {
    setUsername(val);
    const clean = val.trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
      setUsernameStatus(null);
      return;
    }
    try {
      const res = await api.get(`/personas/check-username?username=${clean}`);
      if (res.data?.success) {
        if (res.data.available) {
          setUsernameStatus({ available: true, message: `Handle @${clean} is available!` });
        } else {
          setUsernameStatus({ available: false, message: `Handle @${clean} is already taken!` });
        }
      }
    } catch (e) {
      setUsernameStatus(null);
    }
  };

  const handleSubmit = async () => {
    if (!username.trim() || !displayName.trim()) {
      setError('Username and Display Name are required');
      return;
    }

    if (usernameStatus && !usernameStatus.available) {
      setError('Please choose a different username handle.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const cleanHandle = username.trim().toLowerCase().replace(/^@/, '');
      await createNewPersona({
        username: cleanHandle,
        displayName: displayName.trim() || `@${cleanHandle}`,
        type,
        bio: bio.trim(),
        avatar: avatar ? getMediaUrl(avatar) : undefined
      });
      setUsername('');
      setDisplayName('');
      setBio('');
      setAvatar('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create persona identity');
    } finally {
      setLoading(false);
    }
  };

  const types = [
    { id: 'personal', label: 'Personal', icon: '👤', desc: 'Everyday identity' },
    { id: 'business', label: 'Business', icon: '💼', desc: 'Store or company' },
    { id: 'gaming', label: 'Gaming', icon: '🎮', desc: 'Gaming alter-ego' },
    { id: 'anonymous', label: 'Anonymous', icon: '👻', desc: 'Privacy persona' }
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Create New Persona</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <ScrollView contentContainerStyle={styles.form}>
            {/* Avatar Photo Selection */}
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarCircleBtn} onPress={handlePickAvatar} disabled={uploadingAvatar}>
                <Image
                  source={{ uri: avatar ? getMediaUrl(avatar) : DEFAULT_AVATAR }}
                  style={styles.avatarPreviewImage}
                />
                <View style={styles.avatarEditOverlay}>
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={{ fontSize: 12 }}>📷</Text>
                  )}
                </View>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Profile Picture</Text>
                <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar}>
                  <Text style={styles.changePhotoLink}>
                    {uploadingAvatar ? 'Uploading image...' : 'Tap to upload photo from gallery'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username Handle (@)</Text>
              <TextInput
                style={[
                  styles.input,
                  usernameStatus
                    ? usernameStatus.available
                      ? styles.inputSuccess
                      : styles.inputDanger
                    : null
                ]}
                placeholder="e.g. BigDonStore"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                value={username}
                onChangeText={handleUsernameChange}
              />
              {usernameStatus ? (
                <Text style={[styles.statusText, usernameStatus.available ? styles.statusSuccess : styles.statusDanger]}>
                  {usernameStatus.available ? '✓ ' : '⚠️ '}{usernameStatus.message}
                </Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Donald's Tech Hub"
                placeholderTextColor={colors.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Persona Identity Type</Text>
              <View style={styles.typeGrid}>
                {types.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.typeCard, type === t.id && styles.typeCardActive]}
                    onPress={() => setType(t.id)}
                  >
                    <Text style={{ fontSize: 18 }}>{t.icon}</Text>
                    <View>
                      <Text style={[styles.typeTitle, type === t.id && styles.typeTitleActive]}>{t.label}</Text>
                      <Text style={styles.typeDesc}>{t.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio / Profile Description</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                placeholder="Short bio for this persona..."
                placeholderTextColor={colors.textMuted}
                multiline
                value={bio}
                onChangeText={setBio}
              />
            </View>

            <View style={styles.footerRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Persona</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  closeBtn: {
    padding: 6,
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
    marginBottom: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.white,
    fontSize: 13,
  },
  inputSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  inputDanger: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  statusText: {
    fontSize: 11,
  },
  statusSuccess: {
    color: colors.success,
  },
  statusDanger: {
    color: colors.danger,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  typeCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeCardActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: colors.primary,
  },
  typeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  typeTitleActive: {
    color: colors.white,
  },
  typeDesc: {
    fontSize: 9,
    color: colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
