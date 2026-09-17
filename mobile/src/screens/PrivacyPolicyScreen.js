import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { getApiBaseUrl } from '../config/api';

export default function PrivacyPolicyScreen({ navigation }) {
  const lastUpdated = 'September 17, 2026';

  const handleOpenWebPolicy = () => {
    try {
      const apiBase = getApiBaseUrl();
      const serverBase = apiBase.replace(/\/api\/?$/, '');
      const url = serverBase.startsWith('http') ? `${serverBase}/privacy` : 'https://donchat.app/privacy';
      Linking.openURL(url).catch(() => {
        // ignore fallback
      });
    } catch (e) {
      Linking.openURL('https://donchat.app/privacy').catch(() => {});
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <TouchableOpacity
          onPress={handleOpenWebPolicy}
          style={styles.webBtn}
          activeOpacity={0.7}
        >
          <ExternalLink size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>OFFICIAL COMPLIANCE</Text>
          </View>
          <Text style={styles.bannerTitle}>GenAce Privacy Policy</Text>
          <Text style={styles.bannerSub}>
            Last updated: <Text style={styles.highlight}>{lastUpdated}</Text>
          </Text>
        </View>

        {/* Section 1 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#38bdf8' }]} />
            <Text style={styles.sectionTitle}>1. Overview & Commitment</Text>
          </View>
          <Text style={styles.bodyText}>
            Welcome to GenAce CORE. We prioritize your privacy, data sovereignty, and security. 
            This document outlines how GenAce CORE collects, uses, and safeguards your data across 
            mobile (Android/iOS) and web applications.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#c084fc' }]} />
            <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          </View>
          <Text style={styles.bodyText}>
            GenAce adheres to strict data minimization. We only store:
          </Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Account Info:</Text> Email address, encrypted password hash, and display handle.</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Personas & Profiles:</Text> User-configured personas, custom handles, and status indicators.</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Messages & Media:</Text> Text payload, voice note duration, and uploaded media storage paths.</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Socket Metadata:</Text> Temporary connection IDs used strictly for real-time message routing.</Text>
        </View>

        {/* Section 3 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#34d399' }]} />
            <Text style={styles.sectionTitle}>3. Media Storage & Auto-Clean (TTL)</Text>
          </View>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>No Base64 Bloat:</Text> Media files (images, audio, files) are stored as separate isolated files. Only short URL references are saved in MongoDB.</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Auto-Expiring Messages (TTL):</Text> Disappearing messages self-destruct from the database automatically upon expiration.</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Burn Messages:</Text> Once revealed, burn-on-read messages are permanently deleted.</Text>
        </View>

        {/* Section 4 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#fbbf24' }]} />
            <Text style={styles.sectionTitle}>4. No Third-Party Sales</Text>
          </View>
          <Text style={styles.bodyText}>
            We do NOT sell, rent, or monetize your personal information or chat content. 
            All data transfers use HTTPS/WSS encryption.
          </Text>
        </View>

        {/* Section 5 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#f87171' }]} />
            <Text style={styles.sectionTitle}>5. Account Deletion & Data Erasure</Text>
          </View>
          <Text style={styles.bodyText}>
            You have full control over your data. When an account or persona is deleted:
          </Text>
          <Text style={styles.bulletItem}>• All associated chat messages, spaces, and profile data are permanently erased.</Text>
          <Text style={styles.bulletItem}>• Active mobile and web sessions are revoked in real-time.</Text>
        </View>

        {/* Section 6 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#60a5fa' }]} />
            <Text style={styles.sectionTitle}>6. Contact & Support</Text>
          </View>
          <Text style={styles.bodyText}>
            For privacy inquiries or compliance requests, reach our team at:
          </Text>
          <TouchableOpacity
            style={styles.emailBox}
            onPress={() => Linking.openURL('mailto:davedon008@gmail.com')}
            activeOpacity={0.7}
          >
            <Text style={styles.emailText}>davedon008@gmail.com</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          © {new Date().getFullYear()} GenAce CORE Platform. All Rights Reserved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  webBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  highlight: {
    color: '#38bdf8',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: colors.surface || '#161922',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.white,
  },
  bodyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bulletItem: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  bold: {
    fontWeight: 'bold',
    color: colors.white,
  },
  emailBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-start',
  },
  emailText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
