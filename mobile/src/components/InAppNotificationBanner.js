import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Animated, Easing, Modal
} from 'react-native';
import { Zap, MessageSquare, X, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { getMediaUrl } from '../config/api';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

export default function InAppNotificationBanner({ notification, onDismiss, onPress }) {
  const { colors: dynamicColors, isLight } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (notification) {
      // Slide down animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 4.5s
      const timer = setTimeout(() => {
        dismissBanner();
      }, 4500);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const dismissBanner = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss && onDismiss();
    });
  };

  if (!notification) return null;

  const isSpace = notification.type === 'space';

  return (
    <Modal
      transparent
      visible={!!notification}
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissBanner}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.bannerCard,
          {
            backgroundColor: isLight ? '#ffffff' : '#1e1e2d',
            borderColor: isSpace ? '#06b6d4' : dynamicColors.primary,
          },
        ]}
        onPress={() => {
          dismissBanner();
          onPress && onPress(notification);
        }}
      >
        {/* Top Type Indicator Badge */}
        <View style={styles.headerBadgeRow}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: isSpace ? 'rgba(6, 182, 212, 0.15)' : 'rgba(99, 102, 241, 0.15)' },
            ]}
          >
            {isSpace ? (
              <Zap size={11} color="#06b6d4" />
            ) : (
              <MessageSquare size={11} color="#6366f1" />
            )}
            <Text
              style={[
                styles.typeBadgeText,
                { color: isSpace ? '#06b6d4' : '#6366f1' },
              ]}
            >
              {isSpace ? 'FLUID SPACE MESSAGE' : 'DIRECT MESSAGE'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={(e) => {
              e.stopPropagation();
              dismissBanner();
            }}
          >
            <X size={14} color={dynamicColors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Content Row */}
        <View style={styles.contentRow}>
          <Image
            source={{ uri: getMediaUrl(notification.avatar || DEFAULT_AVATAR) }}
            style={styles.avatar}
          />
          <View style={styles.textCol}>
            <Text
              style={[styles.titleText, { color: dynamicColors.text }]}
              numberOfLines={1}
            >
              {notification.title || 'New Message'}
            </Text>
            <Text
              style={[styles.subtitleText, { color: dynamicColors.textSecondary }]}
              numberOfLines={2}
            >
              {notification.subtitle || notification.body || ''}
            </Text>
          </View>
          <ChevronRight size={18} color={dynamicColors.textMuted} />
        </View>
      </TouchableOpacity>
    </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 999999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  bannerCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  textCol: {
    flex: 1,
  },
  titleText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
