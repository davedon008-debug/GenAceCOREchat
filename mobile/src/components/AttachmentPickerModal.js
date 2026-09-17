import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity
} from 'react-native';
import { Image, FileText, Mic, Camera, X, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

export default function AttachmentPickerModal({
  visible = false,
  onClose,
  onPickImage,
  onPickDocument,
  onRecordVoice,
  onTakePhoto
}) {
  const { colors: dynamicColors, isLight } = useTheme();
  const [disabled, setDisabled] = React.useState(false);

  React.useEffect(() => {
    if (visible) setDisabled(false);
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop dismiss touch */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Bottom Sheet Card */}
        <View style={[styles.sheetContainer, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
          {/* Top Handle Indicator */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.sheetTitle, { color: dynamicColors.text }]}>Add Attachment</Text>
              <Text style={[styles.sheetSub, { color: dynamicColors.textMuted }]}>Select media or document type to send</Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}
              onPress={onClose}
            >
              <X size={18} color={dynamicColors.text} />
            </TouchableOpacity>
          </View>

          {/* Options Grid */}
          <View style={styles.optionsList}>
            {/* Document Option */}
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)', borderColor: dynamicColors.cardBorder }]}
              onPress={() => {
                if (disabled) return;
                setDisabled(true);
                onClose();
                setTimeout(() => {
                  onPickDocument();
                }, 300);
              }}
            >
              <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                <FileText size={22} color="#c084fc" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: dynamicColors.text }]}>Document & Files</Text>
                <Text style={[styles.optionSub, { color: dynamicColors.textMuted }]}>PDF, Word, Excel, TXT, Zip archives</Text>
              </View>
              <ChevronRight size={18} color={dynamicColors.textMuted} />
            </TouchableOpacity>

            {/* Photo Library Option */}
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)', borderColor: dynamicColors.cardBorder }]}
              onPress={() => {
                if (disabled) return;
                setDisabled(true);
                onClose();
                setTimeout(() => {
                  onPickImage();
                }, 300);
              }}
            >
              <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Image size={22} color="#60a5fa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: dynamicColors.text }]}>Photo & Video Gallery</Text>
                <Text style={[styles.optionSub, { color: dynamicColors.textMuted }]}>Choose photos or media from device</Text>
              </View>
              <ChevronRight size={18} color={dynamicColors.textMuted} />
            </TouchableOpacity>

            {/* Camera Option */}
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)', borderColor: dynamicColors.cardBorder }]}
              onPress={() => {
                if (disabled) return;
                setDisabled(true);
                onClose();
                setTimeout(() => {
                  onTakePhoto();
                }, 300);
              }}
            >
              <View style={[styles.iconBox, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                <Camera size={22} color="#f472b6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: dynamicColors.text }]}>Camera Snapshot</Text>
                <Text style={[styles.optionSub, { color: dynamicColors.textMuted }]}>Capture photo using camera</Text>
              </View>
              <ChevronRight size={18} color={dynamicColors.textMuted} />
            </TouchableOpacity>

            {/* Voice Recording Option */}
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)', borderColor: dynamicColors.cardBorder }]}
              onPress={() => {
                if (disabled) return;
                setDisabled(true);
                onClose();
                setTimeout(() => {
                  onRecordVoice();
                }, 200);
              }}
            >
              <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Mic size={22} color="#34d399" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: dynamicColors.text }]}>Voice Message</Text>
                <Text style={[styles.optionSub, { color: dynamicColors.textMuted }]}>Record high-quality voice audio</Text>
              </View>
              <ChevronRight size={18} color={dynamicColors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.06)' }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelBtnText, { color: dynamicColors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  sheetSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 12,
  },
  optionsList: {
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
