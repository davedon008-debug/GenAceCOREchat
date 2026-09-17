import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import Logo from '../components/Logo';

export default function WelcomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Background glow blobs */}
      <View style={styles.glowBlobTop} />
      <View style={styles.glowBlobBottom} />

      {/* Hero Logo */}
      <View style={styles.heroCenterBlock}>
        <View style={{ marginBottom: 16 }}>
          <Logo variant="icon" size={80} />
        </View>

        <Text style={styles.title}>Welcome to GenAce</Text>
        <Text style={styles.subtitle}>
          Your space to chat, connect, discover and be part of amazing communities.
        </Text>
      </View>

      {/* 2x2 Feature Cards Grid */}
      <View style={styles.webGrid}>
        <TouchableOpacity style={styles.webCard} onPress={() => navigation.navigate('Login')}>
          <View style={[styles.webCardIconBg, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
            <Text style={{ fontSize: 16 }}>💬</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.webCardTitle}>Start a Chat</Text>
            <Text style={styles.webCardSub} numberOfLines={1}>Message your friends, spaces or discover new...</Text>
          </View>
          <Text style={styles.webCardArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.webCard} onPress={() => navigation.navigate('Login')}>
          <View style={[styles.webCardIconBg, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
            <Text style={{ fontSize: 16 }}>👥</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.webCardTitle}>Join a Space</Text>
            <Text style={styles.webCardSub} numberOfLines={1}>Find communities that match your interests...</Text>
          </View>
          <Text style={styles.webCardArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.webCard} onPress={() => navigation.navigate('Login')}>
          <View style={[styles.webCardIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
            <Text style={{ fontSize: 16 }}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.webCardTitle}>Meet Friends</Text>
            <Text style={styles.webCardSub} numberOfLines={1}>Search by username and build your circle...</Text>
          </View>
          <Text style={styles.webCardArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.webCard} onPress={() => navigation.navigate('Login')}>
          <View style={[styles.webCardIconBg, { backgroundColor: 'rgba(6, 182, 212, 0.2)' }]}>
            <Text style={{ fontSize: 16 }}>🧭</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.webCardTitle}>Explore</Text>
            <Text style={styles.webCardSub} numberOfLines={1}>Discover trending spaces, creators and more...</Text>
          </View>
          <Text style={styles.webCardArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Featured Promo Banner */}
      <View style={styles.webBanner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={styles.webBannerIconBg}>
            <Text style={{ fontSize: 16 }}>⚡</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.webBannerTitle}>New to GenAce?</Text>
            <Text style={styles.webBannerSub} numberOfLines={2}>Explore spaces, make friends and be part of something bigger.</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.webBannerBtn} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.webBannerBtnText}>Explore Now ›</Text>
        </TouchableOpacity>
      </View>

      {/* Auth Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Sign In to Workspace</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Create New Account</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')} style={{ alignSelf: 'center' }}>
        <Text style={{ fontSize: 11, color: colors.textMuted, textDecorationLine: 'underline', marginTop: 4 }}>
          Privacy Policy
        </Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>Connect • Chat • Grow</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080b14',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    gap: 20,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  glowBlobTop: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  glowBlobBottom: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
  },
  heroCenterBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  logoOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  logoInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  webGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  webCard: {
    width: '48%',
    backgroundColor: '#101625',
    borderColor: '#1d273e',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webCardIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  webCardSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  webCardArrow: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  webBanner: {
    backgroundColor: '#101625',
    borderColor: '#1d273e',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  webBannerIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.white,
  },
  webBannerSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  webBannerBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  webBannerBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
    marginTop: 10,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 10,
  },
});
