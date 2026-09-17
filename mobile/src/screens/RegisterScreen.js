import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api, { getApiBaseUrl } from '../config/api';
import { colors } from '../theme/colors';
import ServerIpModal from '../components/ServerIpModal';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [ipModalVisible, setIpModalVisible] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(getApiBaseUrl());

  const formatErrMessage = (err, fallback) => {
    if (!err.response) {
      return `Cannot connect to server at ${currentUrl}. Tap "Server IP" to switch PC IP address or check Wi-Fi/Hotspot connection.`;
    }
    return err.response?.data?.message || fallback;
  };

  const handleUsernameChange = async (val) => {
    setUsername(val);
    const clean = val.trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
      setUsernameStatus(null);
      return;
    }

    try {
      const res = await api.get(`/personas/check-username?username=${clean}`);
      if (res.data.success) {
        if (res.data.available) {
          setUsernameStatus({ available: true, message: `Handle @${clean} is available!` });
        } else {
          setUsernameStatus({ available: false, message: `Handle @${clean} is already taken!` });
        }
      }
    } catch (e) {
      setUsernameStatus(null);
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (usernameStatus && !usernameStatus.available) {
      setError('Please choose a different username handle.');
      return;
    }

    const cleanHandle = username.toLowerCase().trim().replace(/^@/, '');
    setError('');
    setLoading(true);

    try {
      await register({
        email: email.trim(),
        password,
        masterName: cleanHandle,
        username: cleanHandle,
        displayName: `@${cleanHandle}`
      });
    } catch (err) {
      setError(formatErrMessage(err, 'Registration failed. Please check network connection.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ipBadge} onPress={() => setIpModalVisible(true)}>
              <Text style={styles.ipBadgeText}>🌐 Server IP</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join GenAce and set up your personal handle identity</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.changeIpInline} onPress={() => setIpModalVisible(true)}>
              <Text style={styles.changeIpInlineText}>⚙️ Change Server IP / Network Settings</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Form Inputs */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Choose Username Handle (@)</Text>
            <View style={styles.handleContainer}>
              <Text style={styles.atSymbol}>@</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.handleInput,
                  usernameStatus
                    ? usernameStatus.available
                      ? styles.inputSuccess
                      : styles.inputDanger
                    : null
                ]}
                placeholder="username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                value={username}
                onChangeText={handleUsernameChange}
              />
            </View>
            {usernameStatus ? (
              <Text style={[styles.statusText, usernameStatus.available ? styles.statusSuccess : styles.statusDanger]}>
                {usernameStatus.available ? '✓ ' : '⚠️ '}{usernameStatus.message}
              </Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@domain.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Security Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Create Account & Default Persona</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Link */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Sign In</Text></Text>
          </TouchableOpacity>

          <Text style={styles.serverInfoText}>
            Connected to: {currentUrl}
          </Text>
        </View>
      </ScrollView>

      <ServerIpModal
        visible={ipModalVisible}
        onClose={() => setIpModalVisible(false)}
        onSave={() => setCurrentUrl(getApiBaseUrl())}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    marginBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {},
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  ipBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ipBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  changeIpInline: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  changeIpInlineText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  form: {
    gap: 16,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  handleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  atSymbol: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.white,
    fontSize: 13,
  },
  handleInput: {
    flex: 1,
    paddingLeft: 32,
  },
  inputSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  inputDanger: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  statusText: {
    fontSize: 11,
    marginTop: 2,
  },
  statusSuccess: {
    color: colors.success,
  },
  statusDanger: {
    color: colors.danger,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    gap: 8,
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  linkBold: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  serverInfoText: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
});
