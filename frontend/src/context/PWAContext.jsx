'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PWAContext = createContext({
  isStandalone: false,
  canInstall: false,
  isIOS: false,
  isInstalled: false,
  showModal: false,
  openInstallPrompt: () => {},
  closeInstallPrompt: () => {},
  promptInstall: async () => {},
  deferredPrompt: null,
});

export function PWAProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  // Check standalone mode (already installed & running as PWA)
  const checkStandalone = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const isStand =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');
    return Boolean(isStand);
  }, []);

  // Check iOS device
  const checkIOS = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return isApple;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone = checkStandalone();
    setIsStandalone(standalone);

    const ios = checkIOS();
    setIsIOS(ios);

    // If already running inside installed standalone PWA, don't show prompt
    if (standalone) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed in this specific tab session
    const sessionDismissed = sessionStorage.getItem('genace_install_dismissed_session') === 'true';
    if (sessionDismissed) {
      setDismissedThisSession(true);
    }

    // Capture beforeinstallprompt event (Chromium browsers: Chrome, Edge, Android Chrome, Samsung Internet, Brave)
    const handleBeforeInstallPrompt = (e) => {
      // Prevent automatic browser mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);

      // If user hasn't dismissed in this tab, show prompt
      if (!sessionDismissed && !standalone) {
        // Small delay to ensure initial page view renders smoothly
        setTimeout(() => {
          setShowModal(true);
        }, 1200);
      }
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      setShowModal(false);
      sessionStorage.removeItem('genace_install_dismissed_session');
      console.log('[PWA] GenAce was installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS / browsers where beforeinstallprompt doesn't fire, show modal if not dismissed
    if (!standalone && !sessionDismissed) {
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 1800);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkStandalone, checkIOS]);

  const openInstallPrompt = useCallback(() => {
    setShowModal(true);
  }, []);

  const closeInstallPrompt = useCallback(() => {
    setShowModal(false);
    setDismissedThisSession(true);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('genace_install_dismissed_session', 'true');
      } catch (e) {
        console.warn('[PWA] Storage error:', e);
      }
    }
  }, []);

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          console.log('[PWA] User accepted the install prompt');
          setIsInstalled(true);
          setShowModal(false);
          setDeferredPrompt(null);
        } else {
          console.log('[PWA] User dismissed the install prompt');
        }
      } catch (err) {
        console.error('[PWA] Error showing native prompt:', err);
      }
    }
  }, [deferredPrompt]);

  return (
    <PWAContext.Provider
      value={{
        isStandalone,
        canInstall,
        isIOS,
        isInstalled,
        showModal,
        openInstallPrompt,
        closeInstallPrompt,
        promptInstall,
        deferredPrompt,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}
export default PWAContext;
