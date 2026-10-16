import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  RotateCcw
} from 'lucide-react-native';
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [facingMode, setFacingMode] = useState('user');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const isConnected = isCallConnected || !!remoteStream;

  // Call timer counter
  useEffect(() => {
    let timer = null;
    if (isConnected) {
      timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isConnected]);

  // Attach audio & video streams on web runtime
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (remoteAudioRef.current && remoteStream) {
        try {
          if (remoteAudioRef.current.srcObject !== remoteStream) {
            remoteAudioRef.current.srcObject = remoteStream;
          }
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1.0;
          remoteAudioRef.current.play()
            .then(() => setAudioBlocked(false))
            .catch(err => {
              console.log('[Mobile WebRTC Audio Autoplay Blocked]', err);
              setAudioBlocked(true);
            });
        } catch (e) {
          console.warn('[Mobile WebRTC Audio Attach Error]', e);
        }
      }

      if (remoteVideoRef.current && remoteStream && call?.isVideo) {
        try {
          if (remoteVideoRef.current.srcObject !== remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          remoteVideoRef.current.muted = true; // audio plays via dedicated <audio>
          remoteVideoRef.current.play().catch(() => {});
        } catch (e) {}
      }

      if (localVideoRef.current && localStream && call?.isVideo) {
        try {
          if (localVideoRef.current.srcObject !== localStream) {
            localVideoRef.current.srcObject = localStream;
          }
          localVideoRef.current.muted = true;
          localVideoRef.current.play().catch(() => {});
        } catch (e) {}
      }
    }
  }, [remoteStream, localStream, call?.isVideo, isCallConnected, isMinimized]);

  if (!call) return null;

  const { peerPersona, isVideo } = call;
  const peerName = peerPersona?.displayName || peerPersona?.username || 'Chat Partner';
  const peerAvatar = getMediaUrl(peerPersona?.avatar || peerPersona?.avatarUrl, peerName) || DEFAULT_AVATAR;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResumeAudio = () => {
    if (Platform.OS === 'web' && remoteAudioRef.current) {
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1.0;
      remoteAudioRef.current.play()
        .then(() => setAudioBlocked(false))
        .catch(() => {});
    }
  };

  const handleFlipCamera = async () => {
    if (!localStream) return;
    try {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const nextMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(nextMode);
        if (typeof videoTrack.applyConstraints === 'function') {
          await videoTrack.applyConstraints({ facingMode: nextMode });
        }
      }
    } catch (e) {
      console.warn('[Mobile Flip Camera Error]', e);
    }
  };

  // Minimized Floating Pill View (allows user to navigate/chat while staying on call)
  if (isMinimized) {
    return (
      <View style={styles.floatingPillContainer} pointerEvents="box-none">
        {/* Hidden persistent audio playback element on Web */}
        {Platform.OS === 'web' && React.createElement('audio', {
          ref: remoteAudioRef,
          autoPlay: true,
          playsInline: true,
          style: { display: 'none' }
        })}
        <TouchableOpacity
          style={styles.floatingPill}
          activeOpacity={0.9}
          onPress={() => {
            setIsMinimized(false);
            handleResumeAudio();
          }}
        >
          <View style={styles.floatingAvatarWrap}>
            <Image source={{ uri: peerAvatar }} style={styles.floatingAvatar} />
            <View style={[styles.floatingDot, isConnected && styles.floatingDotConnected]} />
          </View>

          <View style={styles.floatingInfo}>
            <Text style={styles.floatingName} numberOfLines={1}>{peerName}</Text>
            <Text style={styles.floatingTimer}>
              {isConnected ? formatDuration(duration) : 'Calling...'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.floatingMiniBtn, isMicMuted && styles.floatingMiniBtnMuted]}
            onPress={(e) => {
              e?.stopPropagation?.();
              onToggleMic?.();
            }}
          >
            {isMicMuted ? <MicOff size={16} color="#fca5a5" /> : <Mic size={16} color="#ffffff" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.floatingMiniBtn, styles.floatingEndBtn]}
            onPress={(e) => {
              e?.stopPropagation?.();
              onEndCall?.();
            }}
          >
            <PhoneOff size={16} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingMiniBtn}
            onPress={(e) => {
              e?.stopPropagation?.();
              setIsMinimized(false);
            }}
          >
            <Maximize2 size={16} color="#94a3b8" />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={false}
      onRequestClose={onEndCall}
    >
      <SafeAreaView style={styles.container}>
        {/* Persistent Hidden Audio Tag on Web Runtime */}
        {Platform.OS === 'web' && React.createElement('audio', {
          ref: remoteAudioRef,
          autoPlay: true,
          playsInline: true,
          style: { display: 'none' }
        })}

        {/* Top Header Info Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setIsMinimized(true)}
            activeOpacity={0.7}
          >
            <Minimize2 size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, isConnected && styles.connectedDot]} />
            <Text style={styles.peerNameText} numberOfLines={1}>{peerName}</Text>
          </View>

          <Text style={styles.timerText}>
            {isConnected ? formatDuration(duration) : (call?.isCaller ? 'Ringing...' : 'Connecting...')}
          </Text>
        </View>

        {/* Audio Blocked Tap-to-Unmute Banner */}
        {audioBlocked && (
          <TouchableOpacity
            style={styles.unmuteBanner}
            onPress={handleResumeAudio}
            activeOpacity={0.8}
          >
            <Volume2 size={18} color="#ffffff" />
            <Text style={styles.unmuteBannerText}>Tap here to enable call audio</Text>
          </TouchableOpacity>
        )}

        {/* Center Media / Video / Avatar Viewport */}
        <View style={styles.canvasContainer}>
          {isVideo && isConnected && Platform.OS === 'web' ? (
            <View style={styles.videoStage}>
              {/* Fullscreen Remote Video */}
              <View style={styles.remoteVideoContainer}>
                {React.createElement('video', {
                  ref: remoteVideoRef,
                  autoPlay: true,
                  playsInline: true,
                  style: {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    backgroundColor: '#05070e'
                  }
                })}
              </View>

              {/* Floating Self Camera Preview Box (PIP) */}
              <View style={styles.pipVideoContainer}>
                {React.createElement('video', {
                  ref: localVideoRef,
                  autoPlay: true,
                  playsInline: true,
                  muted: true,
                  style: {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                  }
                })}
              </View>
            </View>
          ) : (
            /* Voice Call or Pre-connect Avatar Stage */
            <View style={styles.avatarStage}>
              <View style={[styles.avatarGlowRing, isConnected && styles.avatarGlowConnected]}>
                <Image
                  source={{ uri: peerAvatar }}
                  style={styles.largeAvatar}
                  defaultSource={{ uri: DEFAULT_AVATAR }}
                />
              </View>

              <Text style={styles.canvasPeerTitle}>{peerName}</Text>
              <Text style={styles.canvasCallTypeSubtitle}>
                {isConnected
                  ? (isVideo ? '📹 Video Call Connected' : '🎙️ Voice Call Connected')
                  : (call?.isCaller ? '🔔 Ringing...' : '⏳ Connecting call...')}
              </Text>

              {/* Animated Audio Equalizer Waveform */}
              {isConnected && (
                <View style={styles.equalizerRow}>
                  <View style={[styles.eqBar, { height: 18 }]} />
                  <View style={[styles.eqBar, { height: 28 }]} />
                  <View style={[styles.eqBar, { height: 14 }]} />
                  <View style={[styles.eqBar, { height: 24 }]} />
                  <View style={[styles.eqBar, { height: 16 }]} />
                </View>
              )}
            </View>
          )}
        </View>

        {/* Bottom Call Controls Action Bar */}
        <View style={styles.bottomControls}>
          {/* Toggle Microphone */}
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

          {/* Toggle Camera (if Video Call) */}
          {isVideo && (
            <TouchableOpacity
              style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
              onPress={onToggleCamera}
              activeOpacity={0.8}
            >
              {isCameraOff ? (
                <VideoOff size={24} color="#fca5a5" />
              ) : (
                <VideoIcon size={24} color="#ffffff" />
              )}
            </TouchableOpacity>
          )}

          {/* Flip Camera (if Video Call) */}
          {isVideo && (
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleFlipCamera}
              activeOpacity={0.8}
            >
              <RotateCcw size={22} color="#ffffff" />
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
    backgroundColor: '#080c16',
    justifyContent: 'space-between',
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
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
    maxWidth: 140,
  },
  timerText: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  unmuteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  unmuteBannerText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
  },
  avatarStage: {
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
  avatarGlowConnected: {
    borderColor: 'rgba(16, 185, 129, 0.6)',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
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
  videoStage: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#05070e',
  },
  remoteVideoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#05070e',
  },
  pipVideoContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 110,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: '#1e293b',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomControls: {
    height: 100,
    backgroundColor: '#0c101c',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 20,
  },
  controlBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(225, 29, 72, 0.25)',
    borderColor: 'rgba(225, 29, 72, 0.6)',
  },
  endCallBtn: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  floatingPillContainer: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    left: 16,
    zIndex: 9999,
  },
  floatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  floatingAvatarWrap: {
    position: 'relative',
  },
  floatingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  floatingDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  floatingDotConnected: {
    backgroundColor: '#10b981',
  },
  floatingInfo: {
    flex: 1,
  },
  floatingName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  floatingTimer: {
    color: '#818cf8',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  floatingMiniBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingMiniBtnMuted: {
    backgroundColor: 'rgba(225, 29, 72, 0.3)',
  },
  floatingEndBtn: {
    backgroundColor: '#e11d48',
  },
});
