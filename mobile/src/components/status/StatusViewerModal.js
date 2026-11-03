import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  MoreVertical,
  Eye,
  Trash2,
  Volume2,
  VolumeX,
  Send,
  Heart,
  Smile,
  ShieldAlert,
  Pause,
  Play,
  VolumeX as MuteIcon
} from 'lucide-react-native';
import { Video, Audio, ResizeMode } from '../../config/safeMedia';
import api, { getMediaUrl, createInitialsAvatar } from '../../config/api';

const STORY_DURATION = 5000; // 5 seconds per text/image story

export default function StatusViewerModal({
  visible,
  onClose,
  statusGroup, // { persona, statuses: [...] }
  activePersona,
  onStatusDeleted,
  onMuteToggled,
  onOpenDirectChat,
  onStatusViewed
}) {
  const { width, height } = useWindowDimensions();
  const statuses = statusGroup?.statuses || [];
  const author = statusGroup?.persona;
  const isMe = String(author?._id || '') === String(activePersona?._id || '');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [replySentFeedback, setReplySentFeedback] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [videoInstanceKey, setVideoInstanceKey] = useState(0);

  const videoRef = useRef(null);
  const hasVideoStartedRef = useRef(false);
  const videoFinishedRef = useRef(false);
  const wasVisibleRef = useRef(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const currentProgressRef = useRef(0);
  const touchDownTimeRef = useRef(0);
  const wasLongPressRef = useRef(false);
  const currentItem = statuses[currentIndex] || statuses[0];

  const isCurrentlyPaused = isPaused || isHolding || showViewersSheet;

  const authorId = String(author?._id || '');
  const activeAuthorIdRef = useRef('');
  const viewedIdsRef = useRef(new Set());

  // Configure Audio session mode for video playback
  useEffect(() => {
    if (visible && Audio?.setAudioModeAsync) {
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true
      }).catch(() => {});
    }
  }, [visible]);

  // Set initial index to first unseen status (or 0 if all viewed) when modal opens or author changes
  useEffect(() => {
    if (visible && statuses.length > 0) {
      const isNewOpen = !wasVisibleRef.current;
      const isNewAuthor = activeAuthorIdRef.current !== authorId;
      if (isNewOpen || isNewAuthor) {
        wasVisibleRef.current = true;
        activeAuthorIdRef.current = authorId;
        const firstUnseenIdx = statuses.findIndex(s => !s.isSeen);
        const targetIdx = firstUnseenIdx >= 0 ? firstUnseenIdx : 0;
        setCurrentIndex(targetIdx);
        currentProgressRef.current = 0;
        progressAnim.setValue(0);
        setIsPaused(false);
        setIsHolding(false);
        setShowViewersSheet(false);
        setReplyText('');
        setReplySentFeedback(null);
        setVideoError(null);
        setIsVideoLoading(statuses[targetIdx]?.type === 'video');
        hasVideoStartedRef.current = false;
        videoFinishedRef.current = false;
        setVideoInstanceKey(prev => prev + 1);
      }
    } else if (!visible) {
      wasVisibleRef.current = false;
      activeAuthorIdRef.current = '';
      setIsPaused(false);
      setIsHolding(false);
      setShowViewersSheet(false);
      setVideoError(null);
      setIsVideoLoading(false);
    }
  }, [visible, authorId, statuses]);

  // Reset video playback trackers on story index change
  useEffect(() => {
    currentProgressRef.current = 0;
    progressAnim.setValue(0);
    hasVideoStartedRef.current = false;
    videoFinishedRef.current = false;
    setVideoError(null);
    if (currentItem?.type === 'video') {
      setIsVideoLoading(true);
      setVideoInstanceKey(prev => prev + 1);
    } else {
      setIsVideoLoading(false);
    }
  }, [currentIndex]);

  // Mark current status as viewed when viewing someone else's story (tracked via viewedIdsRef to prevent re-triggering loops)
  useEffect(() => {
    const currentId = currentItem?._id ? String(currentItem._id) : null;
    if (visible && currentId && !isMe && !viewedIdsRef.current.has(currentId)) {
      viewedIdsRef.current.add(currentId);
      currentItem.isSeen = true;
      api.post(`/statuses/${currentId}/view`).catch(() => {});
      if (onStatusViewed) {
        onStatusViewed(currentId, authorId);
      }
    }
  }, [visible, currentIndex, currentItem?._id, isMe, authorId]);

  // Refresh viewers when opening sheet for own status
  useEffect(() => {
    if (showViewersSheet && currentItem && isMe) {
      api.get('/statuses/feed').then(res => {
        if (res.data?.success && res.data.myStatuses) {
          const fresh = res.data.myStatuses.find(s => String(s._id) === String(currentItem._id));
          if (fresh && fresh.viewers) {
            currentItem.viewers = fresh.viewers;
          }
        }
      }).catch(() => {});
    }
  }, [showViewersSheet, currentItem?._id, isMe]);

  // Video playback status callback: drives progress and triggers auto-advance only when video genuinely finishes
  const handleVideoPlaybackStatusUpdate = (playbackStatus) => {
    if (!playbackStatus) return;

    if (playbackStatus.error) {
      console.warn('Video playback error:', playbackStatus.error);
      setIsVideoLoading(false);
      setVideoError('Unable to play video');
      return;
    }

    if (!playbackStatus.isLoaded) {
      setIsVideoLoading(true);
      return;
    }

    if (playbackStatus.isBuffering) {
      setIsVideoLoading(true);
    } else {
      setIsVideoLoading(false);
    }

    // Mark that the video genuinely began playing past initial frame
    if (playbackStatus.positionMillis > 150) {
      hasVideoStartedRef.current = true;
    }

    // Drive progress bar smoothly with valid duration
    if (playbackStatus.durationMillis && playbackStatus.durationMillis > 0) {
      const progress = playbackStatus.positionMillis / playbackStatus.durationMillis;
      const safeProgress = Math.min(1, Math.max(0, isNaN(progress) ? 0 : progress));
      currentProgressRef.current = safeProgress;
      progressAnim.setValue(safeProgress);
    }

    // Advance ONLY when video genuinely finishes playing (prevent stale instant auto-advance)
    if (
      playbackStatus.didJustFinish &&
      !isCurrentlyPaused &&
      !videoFinishedRef.current &&
      hasVideoStartedRef.current
    ) {
      videoFinishedRef.current = true;
      currentProgressRef.current = 0;
      progressAnim.setValue(0);
      handleNext();
    }
  };

  // Progress Bar Animation & Auto-Advance with smooth pause resume (for text & image only)
  useEffect(() => {
    if (!visible || isCurrentlyPaused) {
      progressAnim.stopAnimation((val) => {
        currentProgressRef.current = val;
      });
      return;
    }

    // Video status progress and advance is driven by video duration and playback status!
    if (currentItem?.type === 'video') {
      return;
    }

    const remaining = Math.max(200, STORY_DURATION * (1 - currentProgressRef.current));
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: remaining,
      useNativeDriver: false
    });

    anim.start(({ finished }) => {
      if (finished) {
        currentProgressRef.current = 0;
        handleNext();
      }
    });

    return () => {
      progressAnim.stopAnimation();
    };
  }, [visible, currentIndex, isCurrentlyPaused, currentItem?.type]);

  const handleNext = () => {
    currentProgressRef.current = 0;
    progressAnim.setValue(0);
    hasVideoStartedRef.current = false;
    videoFinishedRef.current = false;
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    currentProgressRef.current = 0;
    progressAnim.setValue(0);
    hasVideoStartedRef.current = false;
    videoFinishedRef.current = false;
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      progressAnim.setValue(0);
      if (currentItem?.type === 'video') {
        setIsVideoLoading(true);
        setVideoInstanceKey(prev => prev + 1);
      }
    }
  };

  // Hold to pause story
  const handlePressIn = () => {
    touchDownTimeRef.current = Date.now();
    wasLongPressRef.current = false;
    setIsHolding(true);
  };

  const handlePressOut = () => {
    const elapsed = Date.now() - touchDownTimeRef.current;
    if (elapsed > 200) {
      wasLongPressRef.current = true;
    }
    setIsHolding(false);
  };

  // Tap navigation: Left 30% goes back, Right 70% advances (resumes if paused, ignores if user was holding)
  const handleScreenPress = (e) => {
    if (wasLongPressRef.current) {
      wasLongPressRef.current = false;
      return;
    }
    // If paused, tap to resume!
    if (isPaused) {
      setIsPaused(false);
      return;
    }
    const touchX = e.nativeEvent.locationX;
    if (touchX < width * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  // Send private reply to status author
  const handleSendReply = async (contentToSend) => {
    const text = (contentToSend || replyText || '').trim();
    if (!text || isSendingReply || !currentItem) return;

    setIsSendingReply(true);
    try {
      const res = await api.post('/statuses/reply', {
        statusId: currentItem._id,
        content: text
      });

      if (res.data?.success) {
        setReplyText('');
        setReplySentFeedback('✓ Sent privately!');
        setTimeout(() => setReplySentFeedback(null), 2500);

        if (onOpenDirectChat && res.data.conversationId) {
          // Callback option if needed
        }
      }
    } catch (err) {
      Alert.alert('Reply Failed', err.response?.data?.message || 'Failed to send reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Delete status (for author)
  const handleDeleteCurrentStatus = () => {
    Alert.alert(
      'Delete Status',
      'Are you sure you want to delete this status? It will disappear for all viewers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/statuses/${currentItem._id}`);
              if (statuses.length <= 1) {
                onClose();
              } else {
                handleNext();
              }
              if (onStatusDeleted) onStatusDeleted(currentItem._id);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete status');
            }
          }
        }
      ]
    );
  };

  // Mute author's statuses
  const handleToggleMute = () => {
    Alert.alert(
      'Mute Status Updates',
      `Mute updates from ${author?.displayName || 'this user'}? You won't see their new stories in your main feed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mute',
          onPress: async () => {
            try {
              await api.post(`/statuses/mute/${author._id}`, { mute: true });
              if (onMuteToggled) onMuteToggled(author._id, true);
              onClose();
            } catch (err) {
              Alert.alert('Error', 'Failed to mute status updates');
            }
          }
        }
      ]
    );
  };

  // Relative time helper
  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return 'Today';
  };

  if (!visible || !statusGroup || statuses.length === 0 || !currentItem) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Touch Handler Area for Hold-to-Pause and Left/Right tap */}
        <TouchableWithoutFeedback
          onPress={handleScreenPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View style={styles.mediaContainer}>
            {/* Story Content Rendering */}
            {currentItem.type === 'text' ? (
              /* Text Status */
              <View
                style={[
                  styles.textStatusWrapper,
                  { backgroundColor: currentItem.backgroundColor || '#6366f1' }
                ]}
              >
                <Text
                  style={[
                    styles.textStatusContent,
                    currentItem.fontStyle === 'serif' && { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
                    currentItem.fontStyle === 'monospace' && { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }
                  ]}
                >
                  {currentItem.content}
                </Text>
              </View>
            ) : currentItem.type === 'video' ? (
              /* Video Status */
              <View style={styles.videoStatusWrapper}>
                {Video && currentItem.mediaUrl ? (
                  <>
                    <Video
                      key={`video_${currentItem._id || currentItem.mediaUrl}_${currentIndex}_${videoInstanceKey}`}
                      ref={videoRef}
                      source={{ uri: getMediaUrl(currentItem.mediaUrl) }}
                      style={styles.fullscreenMedia}
                      resizeMode={ResizeMode ? ResizeMode.CONTAIN : 'contain'}
                      shouldPlay={!isCurrentlyPaused && !videoError}
                      isLooping={false}
                      isMuted={isMuted}
                      progressUpdateIntervalMillis={50}
                      onPlaybackStatusUpdate={handleVideoPlaybackStatusUpdate}
                      onError={(err) => {
                        console.warn('Video error callback:', err);
                        setIsVideoLoading(false);
                        setVideoError('Unable to play video');
                      }}
                    />

                    {/* Buffering / Loading Indicator */}
                    {isVideoLoading && !videoError && (
                      <View style={styles.videoLoaderOverlay} pointerEvents="none">
                        <ActivityIndicator size="large" color="#ffffff" />
                        <Text style={styles.videoLoaderText}>Loading video...</Text>
                      </View>
                    )}

                    {/* Video Load / Playback Error Fallback */}
                    {videoError && (
                      <View style={styles.videoErrorOverlay}>
                        <ShieldAlert size={36} color="#f87171" style={{ marginBottom: 8 }} />
                        <Text style={styles.videoErrorText}>{videoError}</Text>
                        <TouchableOpacity
                          style={styles.retryVideoBtn}
                          onPress={() => {
                            setVideoError(null);
                            setIsVideoLoading(true);
                            setVideoInstanceKey(k => k + 1);
                          }}
                        >
                          <Text style={styles.retryVideoText}>Tap to Retry</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.textStatusWrapper}>
                    <Text style={{ color: '#ffffff', fontSize: 16 }}>Video player unavailable</Text>
                  </View>
                )}
                {currentItem.content ? (
                  <View style={styles.mediaCaptionBox}>
                    <Text style={styles.mediaCaptionText}>{currentItem.content}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              /* Image Status */
              <View style={styles.imageStatusWrapper}>
                <Image
                  source={{ uri: getMediaUrl(currentItem.mediaUrl) }}
                  style={styles.fullscreenMedia}
                  resizeMode="contain"
                />
                {currentItem.content ? (
                  <View style={styles.mediaCaptionBox}>
                    <Text style={styles.mediaCaptionText}>{currentItem.content}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Paused Indicator Overlay */}
            {isCurrentlyPaused && (
              <View style={styles.pausedIndicatorPill} pointerEvents="none">
                <Pause size={12} color="#ffffff" fill="#ffffff" />
                <Text style={styles.pausedIndicatorText}>PAUSED</Text>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>

        {/* UI Overlay Chrome (Hidden when holding for immersive viewing) */}
        {!isHolding && (
          <SafeAreaView style={styles.overlayChrome} pointerEvents="box-none">
            {/* Top Segmented Progress Bars */}
            <View style={styles.progressBarsRow}>
              {statuses.map((item, index) => {
                let barWidth = '0%';
                if (index < currentIndex) {
                  barWidth = '100%';
                } else if (index === currentIndex) {
                  barWidth = progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  });
                }

                return (
                  <View key={item._id || index} style={styles.progressBarTrack}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        { width: barWidth }
                      ]}
                    />
                  </View>
                );
              })}
            </View>

            {/* Header: Author info, time ago, mute/close buttons */}
            <View style={styles.headerRow}>
              <View style={styles.authorInfo}>
                <Image
                  source={{ uri: getMediaUrl(author?.avatar, author?.displayName) }}
                  style={styles.authorAvatar}
                />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.authorName} numberOfLines={1}>
                    {author?.displayName || author?.username || 'User'}
                  </Text>
                  <Text style={styles.statusTimeAgo}>
                    {getTimeAgo(currentItem.createdAt)} • Disappears in 24h
                  </Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                {/* Pause / Play Toggle Button */}
                <TouchableOpacity
                  style={styles.iconCircleBtn}
                  onPress={() => setIsPaused(prev => !prev)}
                  activeOpacity={0.8}
                >
                  {isCurrentlyPaused ? <Play size={18} color="#ffffff" /> : <Pause size={18} color="#ffffff" />}
                </TouchableOpacity>

                {currentItem.type === 'video' && (
                  <TouchableOpacity
                    style={[styles.iconCircleBtn, { marginLeft: 6 }]}
                    onPress={() => setIsMuted(prev => !prev)}
                  >
                    {isMuted ? <VolumeX size={18} color="#ffffff" /> : <Volume2 size={18} color="#ffffff" />}
                  </TouchableOpacity>
                )}

                {isMe ? (
                  <TouchableOpacity
                    style={[styles.iconCircleBtn, { marginLeft: 6 }]}
                    onPress={handleDeleteCurrentStatus}
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.iconCircleBtn, { marginLeft: 6 }]}
                    onPress={handleToggleMute}
                  >
                    <MoreVertical size={18} color="#ffffff" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.iconCircleBtn, { marginLeft: 8 }]}
                  onPress={onClose}
                >
                  <X size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              {replySentFeedback && (
                <View style={styles.feedbackToast}>
                  <Text style={styles.feedbackToastText}>{replySentFeedback}</Text>
                </View>
              )}

              {isMe ? (
                /* Author: Views Counter Pill */
                <View style={styles.viewsCounterRow}>
                  <TouchableOpacity
                    style={styles.viewsBtnPill}
                    activeOpacity={0.8}
                    onPress={() => setShowViewersSheet(true)}
                  >
                    <Eye size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.viewsBtnText}>
                      {currentItem.viewers?.length || 0} view{(currentItem.viewers?.length || 0) !== 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Viewer: Private Reply Input Bar with Quick Reactions */
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'position' : undefined}
                >
                  {/* Quick Reactions Bar */}
                  <View style={styles.reactionsBar}>
                    {['❤️', '😂', '🔥', '👏', '😮', '😢'].map((em) => (
                      <TouchableOpacity
                        key={em}
                        style={styles.reactionBtn}
                        onPress={() => handleSendReply(em)}
                      >
                        <Text style={{ fontSize: 24 }}>{em}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Reply Input Box */}
                  <View style={styles.replyBox}>
                    <TextInput
                      style={styles.replyInput}
                      placeholder={`Reply to ${author?.displayName || 'status'}...`}
                      placeholderTextColor="rgba(255, 255, 255, 0.6)"
                      value={replyText}
                      onChangeText={setReplyText}
                      onFocus={() => setIsPaused(true)}
                      onBlur={() => setIsPaused(false)}
                      returnKeyType="send"
                      onSubmitEditing={() => handleSendReply()}
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendReplyBtn,
                        !replyText.trim() && { opacity: 0.5 }
                      ]}
                      onPress={() => handleSendReply()}
                      disabled={!replyText.trim() || isSendingReply}
                    >
                      {isSendingReply ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Send size={16} color="#ffffff" />
                      )}
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
              )}
            </View>
          </SafeAreaView>
        )}

        {/* Viewers Bottom Sheet Modal (For own status) */}
        <Modal
          visible={showViewersSheet}
          animationType="slide"
          transparent
          onRequestClose={() => setShowViewersSheet(false)}
        >
          <View style={styles.sheetOverlay}>
            <View style={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Eye size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.sheetTitle}>
                    Viewed by {currentItem.viewers?.length || 0}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.iconCircleBtn}
                  onPress={() => setShowViewersSheet(false)}
                >
                  <X size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {currentItem.viewers && currentItem.viewers.length > 0 ? (() => {
                const seen = new Set();
                const uniqueViewers = [];
                for (const v of currentItem.viewers) {
                  const vId = (v.personaId?._id || v.personaId)?._id || (v.personaId?._id || v.personaId)?.toString();
                  if (vId && !seen.has(vId)) {
                    seen.add(vId);
                    uniqueViewers.push(v);
                  }
                }

                return (
                  <FlatList
                    data={uniqueViewers}
                    keyExtractor={(item, idx) => {
                      const vId = (item.personaId?._id || item.personaId)?.toString() || idx;
                      return `${vId}_${idx}`;
                    }}
                    renderItem={({ item }) => {
                      const viewer = item.personaId;
                      return (
                        <View style={styles.viewerRow}>
                          <Image
                            source={{ uri: getMediaUrl(viewer?.avatar, viewer?.displayName) }}
                            style={styles.viewerAvatar}
                          />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.viewerName}>
                              {viewer?.displayName || viewer?.username || 'User'}
                            </Text>
                            <Text style={styles.viewerTime}>
                              {getTimeAgo(item.viewedAt)}
                            </Text>
                          </View>
                        </View>
                      );
                    }}
                    contentContainerStyle={{ paddingVertical: 8 }}
                  />
                );
              })() : (
                <View style={styles.emptyViewersBox}>
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>
                    No views yet. Your contacts will appear here once they see it.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
  },
  mediaContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000'
  },
  textStatusWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28
  },
  textStatusContent: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 40
  },
  imageStatusWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  videoStatusWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  fullscreenMedia: {
    width: '100%',
    height: '100%'
  },
  mediaCaptionBox: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)'
  },
  mediaCaptionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center'
  },
  overlayChrome: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 24 : 0
  },
  progressBarsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4
  },
  progressBarTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 1.5,
    marginHorizontal: 2.5,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffffff'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#ffffff'
  },
  authorName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  },
  statusTimeAgo: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '500'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  feedbackToast: {
    alignSelf: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 10
  },
  feedbackToastText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  viewsCounterRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6
  },
  viewsBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)'
  },
  viewsBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  reactionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingHorizontal: 10
  },
  reactionBtn: {
    padding: 6
  },
  replyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  replyInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 6
  },
  sendReplyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end'
  },
  sheetContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.55,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)'
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  sheetTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)'
  },
  viewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  viewerName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  viewerTime: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2
  },
  emptyViewersBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pausedIndicatorPill: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 999,
  },
  pausedIndicatorText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  videoLoaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15
  },
  videoLoaderText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    letterSpacing: 0.5
  },
  videoErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 20
  },
  videoErrorText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12
  },
  retryVideoBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)'
  },
  retryVideoText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  }
});
