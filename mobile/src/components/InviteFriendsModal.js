import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Linking,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Share2, Globe, Sparkles, MessageCircle, ChevronRight, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export default function InviteFriendsModal({ visible, onClose, activePersona }) {
  const { colors: dynamicColors, themeMode } = useTheme();

  // Cloud web version URL
  const webUrl = 'https://genacecorechat.onrender.com';
  const inviterHandle = activePersona?.username ? `@${activePersona.username.replace(/^@/, '')}` : '';
  const inviterName = activePersona?.displayName || activePersona?.username || '';

  const shareTitle = 'Join me on GenAce';
  const shareText = inviterName
    ? `Hey! Join me on GenAce (${inviterHandle || inviterName})! Chat in real-time and join spaces: ${webUrl}`
    : `Hey! Join me on GenAce – chat in real-time, collaborate in spaces, and hang out with friends: ${webUrl}`;

  // 1. Native OS Share Sheet (WhatsApp, Instagram, Snapchat, Telegram, Messages, Copy Link...)
  const handleNativeShare = async () => {
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { message: shareText, url: webUrl, title: shareTitle }
          : { message: shareText, title: shareTitle }
      );
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // 2. WhatsApp direct
  const handleWhatsApp = async () => {
    const appUrl = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
    const webFallback = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webFallback);
      }
    } catch (e) {
      Linking.openURL(webFallback).catch(() => {});
    }
  };

  // 3. Snapchat direct
  const handleSnapchat = async () => {
    const snapUrl = `https://www.snapchat.com/share?link=${encodeURIComponent(webUrl)}&text=${encodeURIComponent(shareText)}`;
    try {
      await Linking.openURL(snapUrl);
    } catch (e) {
      handleNativeShare();
    }
  };

  // 4. Instagram direct
  const handleInstagram = async () => {
    const igApp = 'instagram://direct';
    const igWeb = 'https://www.instagram.com/direct/inbox/';
    try {
      const canOpen = await Linking.canOpenURL(igApp);
      if (canOpen) {
        Alert.alert(
          'Instagram Direct',
          'We will open Instagram. You can also use the "Share via Apps" button to share directly into your Instagram chats or stories!',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Instagram',
              onPress: () => Linking.openURL(igApp).catch(() => Linking.openURL(igWeb))
            },
            {
              text: 'Share via Apps Sheet',
              onPress: handleNativeShare
            }
          ]
        );
      } else {
        await Linking.openURL(igWeb);
      }
    } catch (e) {
      handleNativeShare();
    }
  };

  // 5. Telegram direct
  const handleTelegram = async () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(webUrl)}&text=${encodeURIComponent(shareText)}`;
    try {
      await Linking.openURL(tgUrl);
    } catch (e) {
      handleNativeShare();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.modalCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: dynamicColors.cardBorder }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconBadge, { backgroundColor: dynamicColors.primary }]}>
                  <Share2 size={20} color="#ffffff" />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: dynamicColors.text }]}>Invite Friends</Text>
                  <Text style={[styles.modalSub, { color: dynamicColors.textSecondary }]}>
                    Share GenAce web link with friends
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: themeMode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}
              >
                <X size={18} color={dynamicColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
              {/* Inviting as persona banner */}
              {inviterName ? (
                <View style={[styles.personaBanner, { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.25)' }]}>
                  <Sparkles size={14} color="#6366f1" />
                  <Text style={[styles.personaBannerText, { color: dynamicColors.text }]}>
                    Inviting as <Text style={{ fontWeight: 'bold', color: '#6366f1' }}>{inviterName}</Text>
                    {inviterHandle ? ` (${inviterHandle})` : ''}
                  </Text>
                </View>
              ) : null}

              {/* Web link preview box */}
              <View style={[styles.linkBox, { backgroundColor: dynamicColors.cardAlt || '#101625', borderColor: dynamicColors.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Globe size={13} color="#6366f1" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: dynamicColors.textSecondary }}>WEB APP LINK</Text>
                </View>
                <Text style={[styles.linkText, { color: dynamicColors.text }]} numberOfLines={1} selectable>
                  {webUrl}
                </Text>
              </View>

              {/* Primary Native Share Sheet Button */}
              <TouchableOpacity
                style={[styles.primaryShareBtn, { backgroundColor: dynamicColors.primary }]}
                onPress={handleNativeShare}
                activeOpacity={0.85}
              >
                <Share2 size={18} color="#ffffff" />
                <Text style={styles.primaryShareBtnText}>Share via Apps (WhatsApp, Instagram, Snap...)</Text>
              </TouchableOpacity>

              <Text style={[styles.sectionTitle, { color: dynamicColors.textMuted }]}>
                OR CHOOSE A PLATFORM
              </Text>

              {/* WhatsApp */}
              <TouchableOpacity
                style={[styles.socialRow, { backgroundColor: dynamicColors.cardAlt || '#101625', borderColor: dynamicColors.cardBorder }]}
                onPress={handleWhatsApp}
                activeOpacity={0.8}
              >
                <View style={[styles.socialIcon, { backgroundColor: 'rgba(37, 211, 102, 0.15)', borderColor: 'rgba(37, 211, 102, 0.3)' }]}>
                  <MessageCircle size={20} color="#25D366" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.socialName, { color: dynamicColors.text }]}>WhatsApp</Text>
                  <Text style={[styles.socialDesc, { color: dynamicColors.textSecondary }]}>Send directly in chats</Text>
                </View>
                <ChevronRight size={18} color={dynamicColors.textMuted} />
              </TouchableOpacity>

              {/* Instagram */}
              <TouchableOpacity
                style={[styles.socialRow, { backgroundColor: dynamicColors.cardAlt || '#101625', borderColor: dynamicColors.cardBorder }]}
                onPress={handleInstagram}
                activeOpacity={0.8}
              >
                <View style={[styles.socialIcon, { backgroundColor: 'rgba(225, 48, 108, 0.15)', borderColor: 'rgba(225, 48, 108, 0.3)' }]}>
                  <ExternalLink size={20} color="#E1306C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.socialName, { color: dynamicColors.text }]}>Instagram</Text>
                  <Text style={[styles.socialDesc, { color: dynamicColors.textSecondary }]}>Share to Direct inbox or Stories</Text>
                </View>
                <ChevronRight size={18} color={dynamicColors.textMuted} />
              </TouchableOpacity>

              {/* Snapchat */}
              <TouchableOpacity
                style={[styles.socialRow, { backgroundColor: dynamicColors.cardAlt || '#101625', borderColor: dynamicColors.cardBorder }]}
                onPress={handleSnapchat}
                activeOpacity={0.8}
              >
                <View style={[styles.socialIcon, { backgroundColor: 'rgba(255, 252, 0, 0.15)', borderColor: 'rgba(255, 252, 0, 0.3)' }]}>
                  <Share2 size={20} color="#eab308" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.socialName, { color: dynamicColors.text }]}>Snapchat</Text>
                  <Text style={[styles.socialDesc, { color: dynamicColors.textSecondary }]}>Share snap link</Text>
                </View>
                <ChevronRight size={18} color={dynamicColors.textMuted} />
              </TouchableOpacity>

              {/* Telegram */}
              <TouchableOpacity
                style={[styles.socialRow, { backgroundColor: dynamicColors.cardAlt || '#101625', borderColor: dynamicColors.cardBorder }]}
                onPress={handleTelegram}
                activeOpacity={0.8}
              >
                <View style={[styles.socialIcon, { backgroundColor: 'rgba(34, 158, 217, 0.15)', borderColor: 'rgba(34, 158, 217, 0.3)' }]}>
                  <SendIcon size={20} color="#229ED9" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.socialName, { color: dynamicColors.text }]}>Telegram</Text>
                  <Text style={[styles.socialDesc, { color: dynamicColors.textSecondary }]}>Send to chats & channels</Text>
                </View>
                <ChevronRight size={18} color={dynamicColors.textMuted} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function SendIcon({ size, color }) {
  return <MessageCircle size={size} color={color} />;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    width: '100%',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSub: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyContent: {
    padding: 20,
    gap: 12,
  },
  personaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  personaBannerText: {
    fontSize: 12,
  },
  linkBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  primaryShareBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  socialIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  socialDesc: {
    fontSize: 11,
    marginTop: 1,
  },
});
