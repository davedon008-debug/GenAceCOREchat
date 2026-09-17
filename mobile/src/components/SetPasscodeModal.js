import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { Lock, Delete, X, ShieldCheck, KeyRound } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import api from '../config/api';
import { colors } from '../theme/colors';

export default function SetPasscodeModal({
  visible = false,
  hasExistingPasscode = false,
  onClose,
  onSuccess
}) {
  const { colors: dynamicColors, isLight } = useTheme();

  // Step state: 'current' (if changing) -> 'new' -> 'confirm'
  const [step, setStep] = useState(hasExistingPasscode ? 'current' : 'new');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep(hasExistingPasscode ? 'current' : 'new');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setError('');
      setLoading(false);
    }
  }, [visible, hasExistingPasscode]);

  const activePin = step === 'current' ? currentPin : step === 'new' ? newPin : confirmPin;

  const handleKeyPress = (numStr) => {
    if (activePin.length < 4) {
      const nextCode = activePin + numStr;
      setError('');

      if (step === 'current') {
        setCurrentPin(nextCode);
        if (nextCode.length === 4) {
          // Move to 'new' step
          setStep('new');
        }
      } else if (step === 'new') {
        setNewPin(nextCode);
        if (nextCode.length === 4) {
          // Move to 'confirm' step
          setStep('confirm');
        }
      } else if (step === 'confirm') {
        setConfirmPin(nextCode);
        if (nextCode.length === 4) {
          submitPasscode(nextCode);
        }
      }
    }
  };

  const handleDelete = () => {
    setError('');
    if (step === 'current' && currentPin.length > 0) {
      setCurrentPin(prev => prev.slice(0, -1));
    } else if (step === 'new' && newPin.length > 0) {
      setNewPin(prev => prev.slice(0, -1));
    } else if (step === 'confirm' && confirmPin.length > 0) {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const submitPasscode = async (confirmedCode) => {
    if (confirmedCode !== newPin) {
      setError('PINs do not match. Try again.');
      setConfirmPin('');
      setStep('new');
      setNewPin('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        passcode: confirmedCode,
        ...(hasExistingPasscode ? { currentPasscode: currentPin } : {})
      };

      const res = await api.post('/auth/chat-passcode', payload);
      if (res.data?.success) {
        Alert.alert('Passcode Saved!', res.data.message || 'Passcode PIN set successfully!');
        onSuccess && onSuccess();
        onClose && onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save passcode';
      setError(msg);
      if (msg.toLowerCase().includes('current')) {
        setStep('current');
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        setStep('new');
        setNewPin('');
        setConfirmPin('');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const getTitle = () => {
    if (step === 'current') return 'Enter Current Passcode';
    if (step === 'new') return hasExistingPasscode ? 'Enter New 4-Digit Passcode' : 'Create 4-Digit Passcode';
    return 'Confirm New 4-Digit Passcode';
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={18} color={dynamicColors.textMuted} />
          </TouchableOpacity>

          <View style={styles.iconBadge}>
            <KeyRound size={26} color={dynamicColors.primary} />
          </View>

          <Text style={[styles.title, { color: dynamicColors.text }]}>{getTitle()}</Text>
          <Text style={[styles.subtitle, { color: dynamicColors.textSecondary }]}>
            {step === 'current'
              ? 'Enter your existing 4-digit PIN to continue'
              : step === 'new'
              ? 'Choose a 4-digit PIN for Chat Lock'
              : 'Re-enter your 4-digit PIN to confirm'}
          </Text>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { borderColor: dynamicColors.cardBorder, backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255, 255, 255, 0.1)' },
                  activePin.length > index ? [styles.dotFilled, { backgroundColor: dynamicColors.primary, borderColor: dynamicColors.primary }] : null
                ]}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {loading ? (
            <ActivityIndicator size="large" color={dynamicColors.primary} style={styles.loader} />
          ) : (
            <View style={styles.keypad}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['', '0', '⌫']
              ].map((row, rIdx) => (
                <View key={rIdx} style={styles.keypadRow}>
                  {row.map((key, kIdx) => {
                    if (key === '') {
                      return <View key={kIdx} style={styles.keyButtonEmpty} />;
                    }
                    if (key === '⌫') {
                      return (
                        <TouchableOpacity
                          key={kIdx}
                          style={[styles.keyButton, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255, 255, 255, 0.06)' }]}
                          onPress={handleDelete}
                        >
                          <Delete size={20} color={dynamicColors.text} />
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <TouchableOpacity
                        key={kIdx}
                        style={[styles.keyButton, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255, 255, 255, 0.06)' }]}
                        onPress={() => handleKeyPress(key)}
                      >
                        <Text style={[styles.keyText, { color: dynamicColors.text }]}>{key}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={[styles.cancelText, { color: dynamicColors.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 18,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  dotFilled: {},
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  loader: {
    marginVertical: 32,
  },
  keypad: {
    width: '100%',
    gap: 12,
    marginVertical: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  keyButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyButtonEmpty: {
    width: 64,
    height: 64,
  },
  keyText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
