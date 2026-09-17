import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { ThemeProvider } from './src/context/ThemeContext';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MainTabScreen from './src/screens/MainTabScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import { colors } from './src/theme/colors';
import { NotificationProvider } from './src/context/NotificationContext';
import { CustomAlertProvider } from './src/context/CustomAlertContext';
import { navigationRef } from './src/navigation/navigationRef';
import storage from './src/config/storage';

const Stack = createNativeStackNavigator();

// Error Boundary Component to prevent app crashes
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[GenAce App ErrorBoundary]:', error, errorInfo);
  }

  handleReset = async () => {
    try {
      await storage.removeItem('donchat_token');
      await storage.removeItem('donchat_user');
      await storage.removeItem('donchat_persona');
    } catch (e) {
      // ignore
    }
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={appStyles.errorContainer}>
          <Text style={appStyles.errorBadge}>⚡ GenAce RECOVERY</Text>
          <Text style={appStyles.errorTitle}>App Recovered from Error</Text>
          <Text style={appStyles.errorSubtitle}>
            A transient render issue occurred. Tap below to reset app cache and restart cleanly.
          </Text>
          <TouchableOpacity style={appStyles.resetBtn} onPress={this.handleReset}>
            <Text style={appStyles.resetBtnText}>🔄 Clear Cache & Restart</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function NavigationStack() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      {token ? (
        <>
          <Stack.Screen name="MainTab" component={MainTabScreen} />
          <Stack.Screen name="Conversation" component={ConversationScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <CustomAlertProvider>
            <AuthProvider>
              <SocketProvider>
                <NotificationProvider>
                  <NavigationContainer ref={navigationRef}>
                    <StatusBar style="light" backgroundColor={colors.background} />
                    <NavigationStack />
                  </NavigationContainer>
                </NotificationProvider>
              </SocketProvider>
            </AuthProvider>
          </CustomAlertProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const appStyles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  resetBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  resetBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
});

