import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import api, { getApiBaseUrl } from '../config/api';
import ServerIpModal from '../components/ServerIpModal';

export default function LoginScreen({ navigation }) {
  const { login, loginDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ipModalVisible, setIpModalVisible] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(getApiBaseUrl());

  // Password reset request modal states
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmailHandle, setResetEmailHandle] = useState('');
  const [resetNote, setResetNote] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState(null);

  const handleResetSubmit = async () => {
    if (!resetEmailHandle.trim()) {
      setResetStatus({ success: false, message: 'Please enter your email or username handle.' });
      return;
    }

    setResetLoading(true);
    setResetStatus(null);
    try {
      const res = await api.post('/auth/request-password-reset', {
        emailOrHandle: resetEmailHandle.trim(),
        note: resetNote
      });
      setResetStatus({ success: true, message: res.data.message || 'Reset request sent to Workspace Admin!' });
    } catch (err) {
      setResetStatus({ success: false, message: err.response?.data?.message || 'Failed to send reset request.' });
    } finally {
      setResetLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!resetEmailHandle.trim()) {
      setResetStatus({ success: false, message: 'Please enter your email or handle to check status.' });
      return;
    }

    setResetLoading(true);
    setResetStatus(null);
    try {
      const res = await api.post('/auth/check-reset-status', {
        emailOrHandle: resetEmailHandle.trim()
      });
      setResetStatus({ success: true, message: res.data.message });
    } catch (err) {
      setResetStatus({
        success: false,
        message: err.response?.data?.message || 'No active reset request found for this account.'
      });
    } finally {
      setResetLoading(false);
    }
  };

  const formatErrMessage = (err, fallback) => {
    if (!err.response) {
      return `Cannot connect to server at ${currentUrl}. Tap "Server IP" below to verify network or change PC IP address.`;
    }
    return err.response?.data?.message || fallback;
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email/username and password');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(formatErrMessage(err, 'Authentication request failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginDemo();
    } catch (err) {
      setError(formatErrMessage(err, 'Demo login failed'));
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

          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Access your GenAce workspace and conversations</Text>
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
            <Text style={styles.label}>Email Address or Handle (@username)</Text>
            <TextInput
              style={styles.input}
              placeholder="you@domain.com or @username"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Security Password</Text>
              <TouchableOpacity
                onPress={() => {
                  setResetEmailHandle(email);
                  setResetModalVisible(true);
                }}
              >
                <Text style={styles.forgotPassLink}>Forgot Password? Contact Admin</Text>
              </TouchableOpacity>
            </View>
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
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Sign In to Workspace</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Alternate Actions */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Need an account? <Text style={styles.linkBold}>Register Now</Text></Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleDemoLogin}
            disabled={loading}
          >
            <Text style={styles.demoButtonText}>⚡ Try Demo Account</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.privacyLinkText}>Privacy Policy</Text>
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

      {/* Contact Admin Password Reset Modal */}
      <Modal
        visible={resetModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contact Admin for Password Reset</Text>
              <TouchableOpacity onPress={() => { setResetModalVisible(false); setResetStatus(null); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Forgot your account password? Submit a request below to alert the Workspace Admin, or contact support directly via email.
            </Text>

            <View style={styles.contactBadge}>
              <Text style={styles.contactBadgeTitle}>📧 Admin Support Contact:</Text>
              <Text style={styles.contactBadgeEmail}>admin@donchat.com</Text>
            </View>

            {resetStatus ? (
              <View style={[styles.statusBox, resetStatus.success ? styles.statusSuccess : styles.statusError]}>
                <Text style={styles.statusText}>{resetStatus.message}</Text>
              </View>
            ) : null}

            {!resetStatus?.success ? (
              <View style={styles.resetForm}>
                <Text style={styles.label}>Your Email Address or Handle (@username)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. alex@gmail.com or @alex"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  value={resetEmailHandle}
                  onChangeText={setResetEmailHandle}
                />

                <Text style={styles.label}>Message for Admin (optional)</Text>
                <TextInput
                  style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Briefly describe your request or contact preference..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={resetNote}
                  onChangeText={setResetNote}
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  <TouchableOpacity
                    style={[styles.resetSubmitBtn, { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }]}
                    onPress={handleCheckStatus}
                    disabled={resetLoading}
                  >
                    <Text style={[styles.resetSubmitText, { color: colors.accent }]}>🔍 Check Status</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.resetSubmitBtn, { flex: 1 }]}
                    onPress={handleResetSubmit}
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.resetSubmitText}>Submit Request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => { setResetModalVisible(false); setResetStatus(null); }}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forgotPassLink: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
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
    gap: 16,
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  linkBold: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  demoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  demoButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  privacyLinkText: {
    color: colors.textMuted,
    fontSize: 11,
    textDecorationLine: 'underline',
    fontWeight: '500',
    marginTop: 4,
  },
  serverInfoText: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#090d18',
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 10,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalClose: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  modalDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  contactBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    gap: 2,
  },
  contactBadgeTitle: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: 'bold',
  },
  contactBadgeEmail: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  resetForm: {
    gap: 10,
  },
  resetSubmitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  resetSubmitText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  doneBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
