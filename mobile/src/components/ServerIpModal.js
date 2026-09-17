import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, FlatList
} from 'react-native';
import { getApiBaseUrl, getDetectedIps, setCustomServerIp, testIpConnection } from '../config/api';
import { colors } from '../theme/colors';

export default function ServerIpModal({ visible, onClose, onSave }) {
  const [detectedIps, setDetectedIps] = useState([]);
  const [selectedIp, setSelectedIp] = useState('');
  const [customIp, setCustomIp] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (visible) {
      const ips = getDetectedIps();
      setDetectedIps(ips);
      const currentUrl = getApiBaseUrl();
      const ipMatch = currentUrl.match(/http:\/\/([^:]+):5005/);
      if (ipMatch && ipMatch[1]) {
        setSelectedIp(ipMatch[1]);
        setCustomIp(ipMatch[1]);
      }
      setTestResult(null);
    }
  }, [visible]);

  const handleTestConnection = async (ipToTest) => {
    const target = ipToTest || customIp || selectedIp;
    if (!target) return;

    setTesting(true);
    setTestResult(null);
    const isOk = await testIpConnection(target);
    setTesting(false);
    setTestResult({
      ip: target,
      success: isOk,
      message: isOk ? `Connected to ${target}:5005!` : `Could not reach ${target}:5005`
    });
  };

  const handleSelectAndSave = async (ip) => {
    const finalIp = ip || customIp;
    if (!finalIp) return;
    await setCustomServerIp(finalIp);
    onSave && onSave(finalIp);
    onClose && onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>🌐 Server Network Settings</Text>
          <Text style={styles.subtitle}>
            Select or enter your PC's IP address where the GenAce backend is running.
          </Text>

          <Text style={styles.sectionLabel}>Detected PC Network IPs:</Text>
          {detectedIps.map((ip) => (
            <TouchableOpacity
              key={ip}
              style={[styles.ipCard, selectedIp === ip ? styles.ipCardActive : null]}
              onPress={() => {
                setSelectedIp(ip);
                setCustomIp(ip);
                handleTestConnection(ip);
              }}
            >
              <Text style={[styles.ipText, selectedIp === ip ? styles.ipTextActive : null]}>
                http://{ip}:5005/api
              </Text>
              <Text style={styles.badgeText}>
                {ip === '192.168.137.1' ? 'Hotspot' : ip === '10.21.184.124' ? 'Cellular' : 'Auto'}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.sectionLabel}>Custom IPv4 Address:</Text>
          <View style={styles.customIpRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 192.168.1.15"
              placeholderTextColor={colors.textMuted}
              value={customIp}
              onChangeText={(text) => {
                setCustomIp(text);
                setSelectedIp(text);
              }}
              autoCapitalize="none"
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => handleTestConnection(customIp)}
              disabled={testing}
            >
              {testing ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.testBtnText}>Test</Text>}
            </TouchableOpacity>
          </View>

          {testResult ? (
            <View style={[styles.statusBox, testResult.success ? styles.statusSuccess : styles.statusDanger]}>
              <Text style={testResult.success ? styles.statusSuccessText : styles.statusDangerText}>
                {testResult.success ? '✓ ' : '⚠️ '}{testResult.message}
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={() => handleSelectAndSave(customIp)}>
              <Text style={styles.saveBtnText}>Save Server IP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  title: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 6,
  },
  ipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  ipCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  ipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  ipTextActive: {
    color: colors.white,
    fontWeight: 'bold',
  },
  badgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  customIpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 13,
  },
  testBtn: {
    backgroundColor: '#3f3f46',
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  statusBox: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  statusSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusSuccessText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  statusDangerText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  saveBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
});
