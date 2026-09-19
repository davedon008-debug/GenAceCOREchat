import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, Image, TouchableOpacity,
  Pressable, ScrollView, Dimensions, Alert, ActivityIndicator
} from 'react-native';
import { X, User, Quote, Sparkles, ShieldAlert, UserMinus } from 'lucide-react-native';
import api, { getMediaUrl, DEFAULT_AVATAR, createInitialsAvatar } from '../config/api';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AvatarViewerModal({
  visible,
  onClose,
  avatarUrl,
  name,
  handle,
  bio,
  status,
  customStatus,
  targetPersonaId,
  isSelf = false,
  onBlockUser,
  onDeleteContact
}) {
  const [loadingAction, setLoadingAction] = useState(false);

  if (!visible) return null;

  const resolvedUrl = getMediaUrl(avatarUrl, name) || DEFAULT_AVATAR;
  const cleanHandle = handle ? handle.replace(/^@/, '') : null;

  const handleBlock = () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${name || 'this user'}? Messages between you will be hidden mutually.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: async () => {
            if (!targetPersonaId) {
              if (onBlockUser) onBlockUser();
              onClose();
              return;
            }
            try {
              setLoadingAction(true);
              const res = await api.post('/personas/block', { targetPersonaId });
              if (res.data?.success) {
                if (onBlockUser) onBlockUser();
                Alert.alert('Blocked', `${name || 'User'} has been blocked.`);
                onClose();
              }
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to block user');
            } finally {
              setLoadingAction(false);
            }
          }
        }
      ]
    );
  };

  const handleRemoveContact = () => {
    Alert.alert(
      'Remove Contact',
      `Remove ${name || 'this contact'} from your friends list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!targetPersonaId) {
              if (onDeleteContact) onDeleteContact();
              onClose();
              return;
            }
            try {
              setLoadingAction(true);
              const res = await api.post('/personas/contacts/delete', { targetPersonaId });
              if (res.data?.success) {
                if (onDeleteContact) onDeleteContact();
                Alert.alert('Removed', `${name || 'Contact'} removed from friends.`);
                onClose();
              }
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to remove contact');
            } finally {
              setLoadingAction(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header Bar */}
          <View style={styles.headerBar} onStartShouldSetResponder={() => true}>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {name || 'User Profile'}
              </Text>
              {cleanHandle ? (
                <Text style={styles.userHandle}>@{cleanHandle}</Text>
              ) : null}
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <X size={20} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Full Image Display Container */}
          <Pressable style={styles.imageContainer} onStartShouldSetResponder={() => true}>
            <Image
              source={{ uri: resolvedUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          </Pressable>

          {/* User Bio Card */}
          <Pressable style={styles.bioCard} onStartShouldSetResponder={() => true}>
            <View style={styles.bioHeaderRow}>
              <View style={styles.bioIconCircle}>
                <Quote size={14} color={colors.primary} />
              </View>
              <Text style={styles.bioSectionTitle}>ABOUT / BIO</Text>
            </View>

            <Text style={styles.bioBodyText}>
              {bio && bio.trim() ? bio.trim() : 'No bio provided.'}
            </Text>

            {customStatus ? (
              <View style={styles.customStatusPill}>
                <Sparkles size={12} color="#fbbf24" />
                <Text style={styles.customStatusText}>{customStatus}</Text>
              </View>
            ) : null}
          </Pressable>

          {/* Action Buttons: Block / Delete Contact */}
          {!isSelf && (targetPersonaId || onBlockUser || onDeleteContact) && (
            <View style={styles.actionsRow} onStartShouldSetResponder={() => true}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.removeBtn]}
                onPress={handleRemoveContact}
                disabled={loadingAction}
              >
                <UserMinus size={15} color="#f87171" />
                <Text style={styles.removeBtnText}>Remove Contact</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.blockBtn]}
                onPress={handleBlock}
                disabled={loadingAction}
              >
                {loadingAction ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <ShieldAlert size={15} color="#ffffff" />
                    <Text style={styles.blockBtnText}>Block User</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Footer Hint */}
          <View style={styles.footerHint}>
            <Text style={styles.footerText}>Tap outside to close</Text>
          </View>
        </ScrollView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    gap: 16,
    alignItems: 'center',
  },
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flex: 1,
    paddingRight: 10,
  },
  userName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  userHandle: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.45,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  bioCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  bioHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bioIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  bioBodyText: {
    fontSize: 13,
    color: colors.white,
    lineHeight: 19,
    fontWeight: '400',
  },
  customStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 4,
  },
  customStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fbbf24',
  },
  footerHint: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  actionsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  removeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  removeBtnText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
  },
  blockBtn: {
    backgroundColor: '#dc2626',
    borderColor: '#ef4444',
  },
  blockBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
