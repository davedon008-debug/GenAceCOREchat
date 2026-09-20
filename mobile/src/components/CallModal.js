import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform
} from 'react-native';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react-native';
import { getMediaUrl } from '../config/api';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

export default function CallModal({
  call,
  localStream,
  remoteStream,
  isCallConnected,
  onEndCall,
  onToggleMic,
  onToggleCamera,
  isMicMuted,
  isCameraOff
}) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let timer = null;
    if (isCallConnected) {
      timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCallConnected]);

  if (!call) return null;

  const { peerPersona, isVideo } = call;
  const peerName = peerPersona?.displayName || peerPersona?.username || 'Chat Partner';
  const peerAvatar = getMediaUrl(peerPersona?.avatar || peerPersona?.avatarUrl, peerName) || DEFAULT_AVATAR;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={false}
      onRequestClose={onEndCall}
    >
      <SafeAreaView style={styles.container}>
        {/* Header Header Info Bar */}
        <View style={styles.topHeader}>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, isCallConnected && styles.connectedDot]} />
            <Text style={styles.peerNameText} numberOfLines={1}>{peerName}</Text>
          </View>
          <Text style={styles.timerText}>
            {isCallConnected ? formatDuration(duration) : 'Ringing...'}
          </Text>
        </View>

        {/* Center Media / Avatar Canvas */}
        <View style={styles.canvasContainer}>
          <View style={styles.avatarGlowRing}>
            <Image
              source={{ uri: peerAvatar }}
              style={styles.largeAvatar}
              defaultSource={{ uri: DEFAULT_AVATAR }}
            />
          </View>

          <Text style={styles.canvasPeerTitle}>{peerName}</Text>
          <Text style={styles.canvasCallTypeSubtitle}>
            {isCallConnected
              ? (isVideo ? '📹 Video Call Connected' : '🎙️ Voice Call Connected')
              : 'Connecting WebRTC audio feed...'}
          </Text>

          {/* Equalizer Wave Indicator */}
          {isCallConnected && (
            <View style={styles.equalizerRow}>
              <View style={[styles.eqBar, { height: 18 }]} />
              <View style={[styles.eqBar, { height: 28 }]} />
              <View style={[styles.eqBar, { height: 14 }]} />
              <View style={[styles.eqBar, { height: 24 }]} />
              <View style={[styles.eqBar, { height: 16 }]} />
            </View>
          )}
        </View>

        {/* Bottom Control Actions Bar */}
        <View style={styles.bottomControls}>
          {/* Toggle Mic Button */}
          <TouchableOpacity
            style={[styles.controlBtn, isMicMuted && styles.controlBtnActive]}
            onPress={onToggleMic}
            activeOpacity={0.8}
          >
            {isMicMuted ? (
              <MicOff size={24} color="#fca5a5" />
            ) : (
              <Mic size={24} color="#ffffff" />
            )}
          </TouchableOpacity>

          {/* Toggle Video Button (if Video Call) */}
          {isVideo && (
            <TouchableOpacity
              style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
              onPress={onToggleCamera}
              activeOpacity={0.8}
            >
              {isCameraOff ? (
                <VideoOff size={24} color="#fca5a5" />
              ) : (
                <Video size={24} color="#ffffff" />
              )}
            </TouchableOpacity>
          )}

          {/* End Call Button */}
          <TouchableOpacity
            style={[styles.controlBtn, styles.endCallBtn]}
            onPress={onEndCall}
            activeOpacity={0.8}
          >
            <PhoneOff size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'space-between',
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  connectedDot: {
    backgroundColor: '#10b981',
  },
  peerNameText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    maxWidth: 160,
  },
  timerText: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  canvasContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  avatarGlowRing: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 3,
    borderColor: 'rgba(99, 102, 241, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    marginBottom: 20,
  },
  largeAvatar: {
    width: 132,
    height: 132,
    borderRadius: 66,
  },
  canvasPeerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
  },
  canvasCallTypeSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  equalizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
  },
  eqBar: {
    width: 4,
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  bottomControls: {
    height: 100,
    backgroundColor: '#0c101c',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 24,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(225, 29, 72, 0.2)',
    borderColor: 'rgba(225, 29, 72, 0.5)',
  },
  endCallBtn: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
});
