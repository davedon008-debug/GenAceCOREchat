import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Send,
  Image as ImageIcon,
  Camera,
  Palette,
  Type,
  Shield,
  Clock,
  Video as VideoIcon,
  Smile,
  RefreshCw
} from 'lucide-react-native';
import { ImagePicker, Video } from '../../config/safeMedia';
import api from '../../config/api';

const BG_PALETTES = [
  '#4f46e5', // Deep Indigo
  '#7c3aed', // Royal Purple
  '#db2777', // Sunset Pink
  '#059669', // Emerald Mint
  '#0284c7', // Cyan Ocean
  '#d97706', // Amber Glow
  '#18181b', // Obsidian Dark
  '#e11d48'  // Crimson Red
];

const FONT_STYLES = [
  { id: 'default', label: 'Default', fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  { id: 'serif', label: 'Serif', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  { id: 'monospace', label: 'Mono', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }
];

export default function StatusComposerModal({
  visible,
  onClose,
  onStatusPosted,
  activePersona,
  privacySettings,
  onOpenPrivacyModal
}) {
  const { width, height } = useWindowDimensions();
  const [mode, setMode] = useState('text'); // 'text' | 'media'
  const [textContent, setTextContent] = useState('');
  const [caption, setCaption] = useState('');
  const [bgIndex, setBgIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);

  // Selected media: { uri, type: 'image' | 'video', width, height }
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');

  const currentBgColor = BG_PALETTES[bgIndex];
  const currentFont = FONT_STYLES[fontIndex];

  // Cycle background color
  const handleCycleColor = () => {
    setBgIndex((prev) => (prev + 1) % BG_PALETTES.length);
  };

  // Cycle font style
  const handleCycleFont = () => {
    setFontIndex((prev) => (prev + 1) % FONT_STYLES.length);
  };

  // Pick media from gallery
  const handlePickMedia = async () => {
    try {
      if (!ImagePicker || typeof ImagePicker.launchImageLibraryAsync !== 'function') {
        Alert.alert('Notice', 'Media picker is unavailable on this build.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
        allowsEditing: true
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const isVideo = asset.type === 'video' || (asset.uri && asset.uri.match(/\.(mp4|mov|webm|m4v)$/i));
        setSelectedMedia({
          uri: asset.uri,
          type: isVideo ? 'video' : 'image',
          width: asset.width,
          height: asset.height
        });
        setMode('media');
      }
    } catch (err) {
      console.error('Error picking media:', err);
      Alert.alert('Picker Error', 'Could not open photo gallery.');
    }
  };

  // Capture from camera
  const handleCaptureCamera = async () => {
    try {
      if (!ImagePicker || typeof ImagePicker.launchCameraAsync !== 'function') {
        Alert.alert('Notice', 'Camera is unavailable on this build.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
        allowsEditing: true
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const isVideo = asset.type === 'video' || (asset.uri && asset.uri.match(/\.(mp4|mov|webm|m4v)$/i));
        setSelectedMedia({
          uri: asset.uri,
          type: isVideo ? 'video' : 'image',
          width: asset.width,
          height: asset.height
        });
        setMode('media');
      }
    } catch (err) {
      console.error('Error opening camera:', err);
      Alert.alert('Camera Error', 'Could not access device camera.');
    }
  };

  // Reset form
  const handleReset = () => {
    setTextContent('');
    setCaption('');
    setSelectedMedia(null);
    setMode('text');
    setIsUploading(false);
  };

  const handleClose = () => {
    if (isUploading) return;
    handleReset();
    onClose();
  };

  // Upload file helper
  const uploadMediaFile = async (fileUri, mediaType) => {
    const filename = fileUri.split('/').pop() || (mediaType === 'video' ? 'status_video.mp4' : 'status_image.jpg');
    const mime = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

    try {
      setUploadStatusText('Uploading media...');
      const formData = new FormData();
      const formattedUri = Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri;
      formData.append('file', {
        uri: formattedUri,
        name: filename,
        type: mime
      });

      const res = await api.post('/upload', formData, {
        timeout: 90000,
        headers: { 'Accept': 'application/json' },
        transformRequest: (data, headers) => {
          if (headers) {
            delete headers['Content-Type'];
            delete headers['content-type'];
          }
          return data;
        }
      });

      if (res.data?.success && res.data?.url) {
        return res.data.url;
      }
    } catch (formErr) {
      console.warn('FormData upload failed, falling back to base64...');
      setUploadStatusText('Encoding file...');
      const fetchRes = await fetch(fileUri);
      const blob = await fetchRes.blob();
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      const res = await api.post('/upload', {
        fileData: base64Data,
        fileName: filename
      }, { timeout: 90000 });

      if (res.data?.success && res.data?.url) {
        return res.data.url;
      }
    }

    throw new Error('Failed to upload status media');
  };

  // Submit status
  const handlePublish = async () => {
    if (mode === 'text' && !textContent.trim()) {
      Alert.alert('Empty Status', 'Please enter some text for your status.');
      return;
    }

    if (mode === 'media' && !selectedMedia) {
      Alert.alert('No Media', 'Please select an image or video to post.');
      return;
    }

    setIsUploading(true);
    setUploadStatusText('Publishing status...');

    try {
      let uploadedUrl = '';
      if (mode === 'media' && selectedMedia?.uri) {
        uploadedUrl = await uploadMediaFile(selectedMedia.uri, selectedMedia.type);
      }

      const payload = {
        type: mode === 'media' ? selectedMedia.type : 'text',
        content: mode === 'media' ? caption.trim() : textContent.trim(),
        mediaUrl: uploadedUrl,
        backgroundColor: currentBgColor,
        fontStyle: currentFont.id,
        privacy: {
          type: privacySettings?.defaultType || 'all_contacts',
          excludedPersonas: (privacySettings?.mutedViewers || []).map(p => p._id || p)
        }
      };

      const res = await api.post('/statuses', payload);

      if (res.data?.success) {
        handleReset();
        onClose();
        if (onStatusPosted) {
          onStatusPosted(res.data.status);
        }
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to post status.');
      }
    } catch (err) {
      console.error('Error posting status:', err);
      Alert.alert('Post Failed', err.response?.data?.message || err.message || 'Could not post status.');
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
    }
  };

  // Privacy description label
  const privacyLabel = () => {
    const type = privacySettings?.defaultType || 'all_contacts';
    const mutedCount = (privacySettings?.mutedViewers || []).length;

    if (type === 'exclude' || mutedCount > 0) {
      return `Contacts (except ${mutedCount})`;
    }
    if (type === 'everyone') {
      return 'Everyone';
    }
    return 'My Contacts';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.container,
          { backgroundColor: mode === 'text' ? currentBgColor : '#090d16' }
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Top Bar Header */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={handleClose}
              disabled={isUploading}
            >
              <X size={22} color="#ffffff" />
            </TouchableOpacity>

            {/* Mode Switcher Tabs */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'text' && styles.modeTabActive]}
                onPress={() => setMode('text')}
                disabled={isUploading}
              >
                <Type size={14} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.modeTabText}>Text</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, mode === 'media' && styles.modeTabActive]}
                onPress={() => {
                  if (!selectedMedia) {
                    handlePickMedia();
                  } else {
                    setMode('media');
                  }
                }}
                disabled={isUploading}
              >
                <ImageIcon size={14} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.modeTabText}>Media</Text>
              </TouchableOpacity>
            </View>

            {/* Top Action Tools */}
            <View style={styles.topRightTools}>
              {mode === 'text' ? (
                <>
                  <TouchableOpacity
                    style={styles.circleBtn}
                    onPress={handleCycleFont}
                    disabled={isUploading}
                  >
                    <Type size={18} color="#ffffff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.circleBtn, { marginLeft: 8 }]}
                    onPress={handleCycleColor}
                    disabled={isUploading}
                  >
                    <Palette size={18} color="#ffffff" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.circleBtn}
                    onPress={handlePickMedia}
                    disabled={isUploading}
                  >
                    <RefreshCw size={18} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.circleBtn, { marginLeft: 8 }]}
                    onPress={handleCaptureCamera}
                    disabled={isUploading}
                  >
                    <Camera size={18} color="#ffffff" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Main Content Area */}
          <View style={styles.body}>
            {mode === 'text' ? (
              /* Text Status Composer */
              <View style={styles.textComposerWrapper}>
                <TextInput
                  style={[
                    styles.textInput,
                    { fontFamily: currentFont.fontFamily }
                  ]}
                  placeholder="Type a status..."
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  multiline
                  autoFocus
                  maxLength={500}
                  value={textContent}
                  onChangeText={setTextContent}
                  textAlignVertical="center"
                />

                {/* Color Palette Swatches */}
                <View style={styles.colorPaletteRow}>
                  {BG_PALETTES.map((color, idx) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color },
                        bgIndex === idx && styles.colorCircleActive
                      ]}
                      onPress={() => setBgIndex(idx)}
                    />
                  ))}
                </View>

                {/* Quick Emoji Bar */}
                <View style={styles.quickEmojiBar}>
                  {['🔥', '✨', '💜', '😎', '🎉', '🚀', '❤️', '💡'].map((em) => (
                    <TouchableOpacity
                      key={em}
                      style={styles.emojiBtn}
                      onPress={() => setTextContent((prev) => prev + em)}
                    >
                      <Text style={{ fontSize: 20 }}>{em}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              /* Media Status Preview & Caption */
              <View style={styles.mediaComposerWrapper}>
                {selectedMedia ? (
                  <View style={styles.previewContainer}>
                    {selectedMedia.type === 'video' ? (
                      Video ? (
                        <Video
                          source={{ uri: selectedMedia.uri }}
                          style={styles.mediaPreview}
                          resizeMode="contain"
                          isLooping
                          shouldPlay
                          isMuted={false}
                        />
                      ) : (
                        <View style={[styles.mediaPreview, styles.videoPlaceholder]}>
                          <VideoIcon size={48} color="#ffffff" />
                          <Text style={{ color: '#ffffff', marginTop: 10, fontWeight: '700' }}>
                            Video selected ({selectedMedia.uri.split('/').pop()})
                          </Text>
                        </View>
                      )
                    ) : (
                      <Image
                        source={{ uri: selectedMedia.uri }}
                        style={styles.mediaPreview}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyMediaBox}>
                    <TouchableOpacity
                      style={styles.selectMediaCard}
                      onPress={handlePickMedia}
                    >
                      <ImageIcon size={42} color="#818cf8" />
                      <Text style={styles.selectMediaTitle}>Pick Photo or Video</Text>
                      <Text style={styles.selectMediaSub}>Tap to open gallery</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.selectMediaCard, { marginTop: 12 }]}
                      onPress={handleCaptureCamera}
                    >
                      <Camera size={42} color="#a855f7" />
                      <Text style={styles.selectMediaTitle}>Open Camera</Text>
                      <Text style={styles.selectMediaSub}>Take a new photo or video</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Caption Input for Media */}
                {selectedMedia && (
                  <View style={styles.captionContainer}>
                    <TextInput
                      style={styles.captionInput}
                      placeholder="Add a caption..."
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      value={caption}
                      onChangeText={setCaption}
                      maxLength={200}
                    />
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Bottom Bar: Privacy & 24h Expiration + Send Button */}
          <View style={styles.bottomBar}>
            {/* Privacy & Disappearing Info Pill */}
            <View style={styles.bottomInfoColumn}>
              <TouchableOpacity
                style={styles.privacyPill}
                activeOpacity={0.8}
                onPress={onOpenPrivacyModal}
                disabled={isUploading}
              >
                <Shield size={13} color="#ffffff" style={{ marginRight: 5 }} />
                <Text style={styles.privacyPillText}>{privacyLabel()}</Text>
              </TouchableOpacity>

              <View style={styles.expirationNotice}>
                <Clock size={11} color="rgba(255,255,255,0.6)" style={{ marginRight: 4 }} />
                <Text style={styles.expirationText}>Disappears in 24 hrs</Text>
              </View>
            </View>

            {/* Send / Publish Button */}
            <TouchableOpacity
              style={[
                styles.publishBtn,
                isUploading && { opacity: 0.7 }
              ]}
              activeOpacity={0.8}
              onPress={handlePublish}
              disabled={isUploading}
            >
              {isUploading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={[styles.publishText, { marginLeft: 8, fontSize: 13 }]}>
                    {uploadStatusText || 'Posting...'}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Send size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.publishText}>Post Status</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between'
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 20,
    padding: 3
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  modeTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)'
  },
  modeTabText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  topRightTools: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  textComposerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  textInput: {
    width: '100%',
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 38,
    maxHeight: '45%'
  },
  colorPaletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 18,
    gap: 8
  },
  colorCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)'
  },
  colorCircleActive: {
    transform: [{ scale: 1.25 }],
    borderColor: '#ffffff',
    borderWidth: 2
  },
  quickEmojiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 12
  },
  emojiBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  mediaComposerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  previewContainer: {
    width: '100%',
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  mediaPreview: {
    width: '100%',
    height: '100%'
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyMediaBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  selectMediaCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  selectMediaTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10
  },
  selectMediaSub: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 4
  },
  captionContainer: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)'
  },
  captionInput: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500'
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)'
  },
  bottomInfoColumn: {
    alignItems: 'flex-start'
  },
  privacyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 4
  },
  privacyPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  expirationNotice: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  expirationText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    fontWeight: '500'
  },
  publishBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6
  },
  publishText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  }
});
