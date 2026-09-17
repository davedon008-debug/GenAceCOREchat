import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Pressable, Animated, Dimensions, Platform, Alert
} from 'react-native';
import {
  Shield, Lock, AlertTriangle, CheckCircle2,
  Flame, Info, X, Sparkles, AlertCircle, Trash2
} from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { colors } from '../theme/colors';

const CustomAlertContext = createContext({});

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Keep reference to original Alert.alert
const originalNativeAlert = Alert.alert;

let globalAlertListener = null;

// Monkey-patch React Native Alert.alert once at module load
Alert.alert = (title, message, buttons, options) => {
  if (globalAlertListener) {
    globalAlertListener(title, message, buttons, options);
  } else {
    originalNativeAlert.call(Alert, title, message, buttons, options);
  }
};

export function CustomAlertProvider({ children }) {
  const { colors: dynamicColors, isLight } = useTheme();
  const [alertConfig, setAlertConfig] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const showAlert = (title, message, buttons, options) => {
    let alertTitle = title || '';
    let alertMessage = message;
    let alertButtons = buttons;
    let alertOptions = options;

    // Normalize parameters if message is passed as buttons array
    if (Array.isArray(message)) {
      alertButtons = message;
      alertMessage = '';
      alertOptions = buttons || {};
    } else if (typeof message === 'object' && message !== null && !Array.isArray(message) && !buttons) {
      alertOptions = message;
      alertMessage = '';
    }

    if (!alertButtons || alertButtons.length === 0) {
      alertButtons = [{ text: 'OK', style: 'default' }];
    }

    setAlertConfig({
      title: String(alertTitle),
      message: alertMessage ? String(alertMessage) : '',
      buttons: alertButtons,
      options: alertOptions || {}
    });

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true
      })
    ]).start();
  };

  const hideAlert = (onComplete) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true
    }).start(() => {
      setAlertConfig(null);
      scaleAnim.setValue(0.9);
      if (onComplete) onComplete();
    });
  };

  useEffect(() => {
    globalAlertListener = (title, message, buttons, options) => {
      showAlert(title, message, buttons, options);
    };

    return () => {
      globalAlertListener = null;
    };
  }, []);

  const handleButtonPress = (btn) => {
    const callback = btn.onPress;
    hideAlert(() => {
      if (typeof callback === 'function') {
        callback();
      }
    });
  };

  const handleBackdropPress = () => {
    if (alertConfig?.options?.cancelable !== false) {
      const cancelBtn = alertConfig?.buttons?.find(b => b.style === 'cancel');
      hideAlert(() => {
        if (cancelBtn && typeof cancelBtn.onPress === 'function') {
          cancelBtn.onPress();
        } else if (typeof alertConfig?.options?.onDismiss === 'function') {
          alertConfig.options.onDismiss();
        }
      });
    }
  };

  // Determine alert category & styling (Icon, Colors, Header gradient bar)
  const getAlertTheme = () => {
    if (!alertConfig) return {};

    const t = (alertConfig.title || '').toLowerCase();
    const m = (alertConfig.message || '').toLowerCase();
    const combined = `${t} ${m}`;

    if (combined.includes('privacy') || combined.includes('vector') || combined.includes('lock') || combined.includes('passcode') || combined.includes('secret') || combined.includes('vault') || combined.includes('permission')) {
      return {
        accentColor: '#818cf8',
        iconBg: 'rgba(99, 102, 241, 0.18)',
        borderColor: 'rgba(99, 102, 241, 0.35)',
        icon: <Shield size={26} color="#818cf8" />
      };
    }

    if (combined.includes('error') || combined.includes('failed') || combined.includes('fail') || combined.includes('required') || combined.includes('short') || combined.includes('invalid') || combined.includes('denied')) {
      return {
        accentColor: '#ef4444',
        iconBg: 'rgba(239, 68, 68, 0.18)',
        borderColor: 'rgba(239, 68, 68, 0.35)',
        icon: <AlertTriangle size={26} color="#f87171" />
      };
    }

    if (combined.includes('success') || combined.includes('saved') || combined.includes('joined') || combined.includes('unlocked') || combined.includes('unblocked') || combined.includes('changed')) {
      return {
        accentColor: '#10b981',
        iconBg: 'rgba(16, 185, 129, 0.18)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        icon: <CheckCircle2 size={26} color="#34d399" />
      };
    }

    if (combined.includes('delete') || combined.includes('remove') || combined.includes('block') || combined.includes('burn')) {
      return {
        accentColor: '#f59e0b',
        iconBg: 'rgba(245, 158, 11, 0.18)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
        icon: <Flame size={26} color="#fbbf24" />
      };
    }

    // Default notice / info theme
    return {
      accentColor: '#3b82f6',
      iconBg: 'rgba(59, 130, 246, 0.18)',
      borderColor: 'rgba(59, 130, 246, 0.35)',
      icon: <Info size={26} color="#60a5fa" />
    };
  };

  const themeMeta = getAlertTheme();

  return (
    <CustomAlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}

      {alertConfig && (
        <Modal
          transparent
          visible={!!alertConfig}
          animationType="none"
          onRequestClose={handleBackdropPress}
        >
          <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <Pressable style={styles.backdrop} onPress={handleBackdropPress} />

            <Animated.View
              style={[
                styles.dialogContainer,
                {
                  backgroundColor: isLight ? '#ffffff' : '#111726',
                  borderColor: isLight ? 'rgba(0, 0, 0, 0.1)' : themeMeta.borderColor,
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              {/* Top Accent Line */}
              <View style={[styles.topAccentBar, { backgroundColor: themeMeta.accentColor }]} />

              {/* Icon Header */}
              <View style={[styles.iconContainer, { backgroundColor: themeMeta.iconBg }]}>
                {themeMeta.icon}
              </View>

              {/* Title */}
              {alertConfig.title ? (
                <Text style={[styles.title, { color: isLight ? '#0f172a' : '#f8fafc' }]}>
                  {alertConfig.title}
                </Text>
              ) : null}

              {/* Message */}
              {alertConfig.message ? (
                <Text style={[styles.message, { color: isLight ? '#475569' : '#94a3b8' }]}>
                  {alertConfig.message}
                </Text>
              ) : null}

              {/* Action Buttons */}
              <View
                style={[
                  styles.buttonsContainer,
                  alertConfig.buttons.length > 2 ? styles.buttonsColumn : styles.buttonsRow
                ]}
              >
                {alertConfig.buttons.map((btn, index) => {
                  const isDestructive = btn.style === 'destructive';
                  const isCancel = btn.style === 'cancel';
                  const isPrimary = !isDestructive && !isCancel;

                  let btnBg = isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)';
                  let btnTextColor = isLight ? '#334155' : '#cbd5e1';
                  let btnBorderColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.12)';

                  if (isDestructive) {
                    btnBg = '#dc2626';
                    btnTextColor = '#ffffff';
                    btnBorderColor = '#ef4444';
                  } else if (isPrimary) {
                    btnBg = isLight ? colors.primary : '#4f46e5';
                    btnTextColor = '#ffffff';
                    btnBorderColor = '#6366f1';
                  }

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        alertConfig.buttons.length <= 2 && { flex: 1 },
                        {
                          backgroundColor: btnBg,
                          borderColor: btnBorderColor
                        }
                      ]}
                      activeOpacity={0.75}
                      onPress={() => handleButtonPress(btn)}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          {
                            color: btnTextColor,
                            fontWeight: isCancel ? '600' : '700'
                          }
                        ]}
                      >
                        {btn.text || 'OK'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </CustomAlertContext.Provider>
  );
}

export function useCustomAlert() {
  return useContext(CustomAlertContext);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 9, 20, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogContainer: {
    width: Math.min(SCREEN_WIDTH - 44, 380),
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  buttonsContainer: {
    width: '100%',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  buttonsColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  button: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
