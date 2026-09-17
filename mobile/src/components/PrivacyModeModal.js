import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView
} from 'react-native';
import {
  CheckCircle2, Lock, Clock, Flame, Shield, EyeOff, Check, X
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

export default function PrivacyModeModal({
  visible = false,
  currentMode = 'normal',
  onClose,
  onSelectMode
}) {
  const { colors: dynamicColors, isLight } = useTheme();

  if (!visible) return null;

  const modes = [
    {
      key: 'normal',
      title: 'Normal Mode',
      subtitle: 'Standard persistent chat room log',
      icon: <CheckCircle2 size={22} color="#60a5fa" />,
      iconBg: 'rgba(59, 130, 246, 0.15)'
    },
    {
      key: 'private',
      title: 'Private Mode',
      subtitle: 'Encrypted private conversation session',
      icon: <Lock size={22} color="#fbbf24" />,
      iconBg: 'rgba(245, 158, 11, 0.15)'
    },
    {
      key: 'disappearing',
      title: 'Disappearing 24h',
      subtitle: 'Messages automatically self-destruct after 24 hours',
      icon: <Clock size={22} color="#c084fc" />,
      iconBg: 'rgba(168, 85, 247, 0.15)'
    },
    {
      key: 'burn',
      title: 'Burn on Read 🔥',
      subtitle: 'Messages incinerate 10 seconds after recipient views',
      icon: <Flame size={22} color="#f87171" />,
      iconBg: 'rgba(239, 68, 68, 0.15)'
    },
    {
      key: 'vault',
      title: 'Vault Encrypted',
      subtitle: 'Payload protected with vault-grade encryption',
      icon: <Shield size={22} color="#34d399" />,
      iconBg: 'rgba(16, 185, 129, 0.15)'
    },
    {
      key: 'anonymous',
      title: 'Anonymous Identity',
      subtitle: 'Masks sender persona metadata in room stream',
      icon: <EyeOff size={22} color="#9ca3af" />,
      iconBg: 'rgba(156, 163, 175, 0.15)'
    }
  ];

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

        {/* Bottom Sheet Container */}
        <View style={[styles.sheetContainer, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
          {/* Handle indicator */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.sheetTitle, { color: dynamicColors.text }]}>Privacy Vector 🛡️</Text>
              <Text style={[styles.sheetSub, { color: dynamicColors.textMuted }]}>
                Select privacy protection mode
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}
              onPress={onClose}
            >
              <X size={18} color={dynamicColors.text} />
            </TouchableOpacity>
          </View>

          {/* Options List */}
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <View style={styles.optionsList}>
              {modes.map((item) => {
                const isActive = currentMode === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: isActive
                          ? (isLight ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.15)')
                          : (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)'),
                        borderColor: isActive
                          ? dynamicColors.primary
                          : dynamicColors.cardBorder
                      }
                    ]}
                    onPress={() => {
                      onSelectMode(item.key);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                      {item.icon}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.optionTitle, { color: dynamicColors.text }]}>
                          {item.title}
                        </Text>
                        {isActive && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>ACTIVE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.optionSub, { color: dynamicColors.textMuted }]}>
                        {item.subtitle}
                      </Text>
                    </View>
                    {isActive ? (
                      <Check size={20} color={dynamicColors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.06)', marginTop: 12 }]}
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
    paddingBottom: 28,
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
    marginBottom: 14,
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
    paddingVertical: 2,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
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
  activeBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#818cf8',
    fontSize: 9,
    fontWeight: 'bold',
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
