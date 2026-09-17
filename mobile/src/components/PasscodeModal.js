import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { Lock, Delete } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import api from '../config/api';
import { colors } from '../theme/colors';

export default function PasscodeModal({ visible, onClose, onSuccess, title }) {
  const { colors: dynamicColors, isLight } = useTheme();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setPasscode('');
      setError('');
      setLoading(false);
    }
  }, [visible]);

  const handleKeyPress = (numStr) => {
    if (passcode.length < 4) {
      const nextCode = passcode + numStr;
      setPasscode(nextCode);
      if (nextCode.length === 4) {
        verifyCode(nextCode);
      }
    }
  };

  const handleDelete = () => {
    if (passcode.length > 0) {
      setPasscode(passcode.slice(0, -1));
      setError('');
    }
  };

  const verifyCode = async (codeToVerify) => {
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/verify-passcode', { passcode: String(codeToVerify).trim() });
      if (res.data?.success && res.data?.valid) {
        onSuccess && onSuccess();
      } else {
        setError('Incorrect Passcode');
        setPasscode('');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Verification failed');
      setPasscode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}>
          <View style={styles.lockBadge}>
            <Lock size={26} color={dynamicColors.primary} />
          </View>
          <Text style={[styles.title, { color: dynamicColors.text }]}>{title || 'Locked Conversation'}</Text>
          <Text style={[styles.subtitle, { color: dynamicColors.textSecondary }]}>Enter 4-digit passcode to unlock</Text>

          {/* Dots representation */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { borderColor: dynamicColors.cardBorder, backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255, 255, 255, 0.1)' },
                  passcode.length > index ? [styles.dotFilled, { backgroundColor: dynamicColors.primary, borderColor: dynamicColors.primary }] : null
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
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  lockBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 20,
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
    marginTop: 16,
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
