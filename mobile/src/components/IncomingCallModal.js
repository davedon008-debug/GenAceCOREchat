import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView
} from 'react-native';
import { Phone, PhoneOff, Video } from 'lucide-react-native';
import { getMediaUrl } from '../config/api';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

export default function IncomingCallModal({
  incomingCall,
  onAcceptCall,
  onDeclineCall
}) {
  if (!incomingCall) return null;

  const { callerPersona, isVideo } = incomingCall;
  const callerName = callerPersona?.displayName || callerPersona?.username || 'Incoming Call';
  const callerAvatar = getMediaUrl(callerPersona?.avatar || callerPersona?.avatarUrl, callerName) || DEFAULT_AVATAR;

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={onDeclineCall}
    >
      <SafeAreaView style={styles.overlayContainer}>
        <View style={styles.cardContainer}>
          <View style={styles.pulseBg} />

          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: callerAvatar }}
              style={styles.avatar}
              defaultSource={{ uri: DEFAULT_AVATAR }}
            />
          </View>

          <Text style={styles.callerName} numberOfLines={1}>
            {callerName}
          </Text>

          <Text style={styles.callTypeSubtitle}>
            {isVideo ? '📹 Incoming Video Call...' : '📞 Incoming Voice Call...'}
          </Text>

          <View style={styles.actionsRow}>
            {/* Decline Button */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.declineBtn]}
              onPress={onDeclineCall}
              activeOpacity={0.8}
            >
              <PhoneOff size={24} color="#ffffff" />
              <Text style={styles.actionText}>Decline</Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={onAcceptCall}
              activeOpacity={0.8}
            >
              {isVideo ? <Video size={24} color="#ffffff" /> : <Phone size={24} color="#ffffff" />}
              <Text style={styles.actionText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 18, 0.85)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0f172a',
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderWidth: 1,
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  pulseBg: {
    position: 'absolute',
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  avatarWrapper: {
    marginBottom: 16,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(99, 102, 241, 0.6)',
    padding: 3,
    backgroundColor: '#1e293b',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  callerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  callTypeSubtitle: {
    fontSize: 13,
    color: '#818cf8',
    fontWeight: '600',
    marginBottom: 28,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 18,
    gap: 8,
    minWidth: 130,
  },
  declineBtn: {
    backgroundColor: '#e11d48',
  },
  acceptBtn: {
    backgroundColor: '#10b981',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
