'use client';

import React, { useState, useEffect } from 'react';
import { usePWA } from '../context/PWAContext';
import { 
  Download, 
  Share, 
  PlusSquare, 
  Sparkles, 
  X, 
  Smartphone, 
  Check, 
  CheckCircle2,
  PartyPopper,
  ArrowDown, 
  BellRing, 
  Zap, 
  ShieldCheck,
  Compass,
  AlertTriangle 
} from 'lucide-react';
import Image from 'next/image';

export default function InstallPromptModal() {
  const {
    isStandalone,
    isIOS,
    isInstalled,
    showModal,
    closeInstallPrompt,
    openInstallPrompt,
    promptInstall,
    markInstalled,
    deferredPrompt,
  } = usePWA();

  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent || '';
      const inApp = /FBAN|FBAV|Instagram|Twitter|Line|WhatsApp|Snapchat|Messenger/i.test(ua);
      setIsInAppBrowser(inApp);
    }
  }, []);

  // If running inside standalone PWA or marked installed and not showing success screen, don't render
  if ((isStandalone || isInstalled) && !installedSuccess) {
    return null;
  }

  const handleInstallClick = async () => {
    // 1. Android / Chromium (Chrome, Edge, Samsung Internet, Brave)
    if (deferredPrompt) {
      const accepted = await promptInstall();
      if (accepted) {
        setInstalledSuccess(true);
      }
      return;
    }

    // 2. Desktop Chrome / other browsers without deferredPrompt
    if (!isIOS) {
      setShowManualGuide(true);
    }
  };

  const handleConfirmDone = () => {
    setInstalledSuccess(true);
  };

  const handleFinishSuccess = () => {
    markInstalled();
    setInstalledSuccess(false);
    closeInstallPrompt();
  };

  return (
    <>
      {/* 1. Sleek Floating "Install App" Pill (Shown when modal is closed) */}
      {!showModal && !installedSuccess && (
        <div className="fixed bottom-20 md:bottom-6 left-4 z-40 animate-fade-in">
          <button
            onClick={openInstallPrompt}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#0a0e1a]/90 hover:bg-[#12182c] border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 text-xs font-semibold backdrop-blur-xl shadow-[0_4px_25px_rgba(0,242,254,0.25)] transition-all duration-300 hover:scale-105 active:scale-95"
            title="Install GenAce App"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <Download className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
            <span className="tracking-wide">Install GenAce App</span>
          </button>
        </div>
      )}

      {/* 2. Primary Install Modal or Success Celebration Screen */}
      {(showModal || installedSuccess) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div 
            className="relative w-full max-w-md bg-[#0a0e1a]/95 border border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_15px_60px_rgba(0,242,254,0.25)] backdrop-blur-2xl overflow-hidden transition-all text-white text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient background glows */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={installedSuccess ? handleFinishSuccess : closeInstallPrompt}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* ─── CASE A: INSTALLED SUCCESSFULLY CELEBRATION VIEW ─── */}
            {installedSuccess ? (
              <div className="py-2 flex flex-col items-center animate-fade-in space-y-4">
                {/* Glowing checkmark badge */}
                <div className="relative my-2">
                  <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-11 h-11 text-emerald-400" />
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold uppercase tracking-wider">
                  <PartyPopper className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Installation Confirmed</span>
                </div>

                <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-emerald-100 to-cyan-200 bg-clip-text text-transparent">
                  Installed Successfully!
                </h2>

                <p className="text-slate-300 text-xs max-w-xs leading-relaxed">
                  GenAce has been added as a standalone app. Close your browser and tap the <strong>GenAce</strong> icon on your phone&apos;s Home Screen or App Library for full-screen messaging!
                </p>

                {/* App icon preview card */}
                <div className="w-full bg-[#101625] border border-emerald-500/30 rounded-2xl p-3.5 flex items-center gap-3 text-left">
                  <div className="relative w-12 h-12 rounded-xl bg-[#090d18] border border-emerald-400/40 p-1 flex items-center justify-center shrink-0">
                    <Image
                      src="/icon-192.png"
                      alt="GenAce Icon"
                      width={44}
                      height={44}
                      className="rounded-lg object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>GenAce Standalone App</span>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      Ready on your iPhone Home Screen
                    </p>
                  </div>
                </div>

                <div className="w-full pt-2">
                  <button
                    onClick={handleFinishSuccess}
                    className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:via-teal-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Done — Open on iPhone
                  </button>
                </div>
              </div>
            ) : (
              /* ─── CASE B: INSTALL INSTRUCTION VIEW ─── */
              <div className="flex flex-col items-center animate-fade-in">
                {/* Header: App Logo & Badges */}
                <div className="relative mb-3 group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 rounded-2xl blur-md opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
                  <div className="relative w-20 h-20 rounded-2xl bg-[#0e1424] border border-cyan-400/40 p-2 flex items-center justify-center shadow-inner overflow-hidden">
                    <Image
                      src="/icon-192.png"
                      alt="GenAce Icon"
                      width={72}
                      height={72}
                      className="rounded-xl object-cover"
                      priority
                    />
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold tracking-wider uppercase mb-2">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Official iPhone & Web App</span>
                </div>

                <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-indigo-200 bg-clip-text text-transparent">
                  Install GenAce App
                </h2>
                <p className="text-slate-300 text-xs mt-1.5 max-w-xs leading-relaxed">
                  Install GenAce as a standalone app on your iPhone or device for full-screen mode and instant notifications.
                </p>

                {/* In-App Browser Warning (WhatsApp / Instagram / Telegram) */}
                {isIOS && isInAppBrowser && (
                  <div className="mt-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-left w-full animate-fade-in">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Opened in WhatsApp / In-App Browser</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      Apple only allows installing apps from <strong>Safari</strong>. Tap the <strong>Safari</strong> or <strong>⋯ icon</strong> at bottom right, then choose <strong>&quot;Open in Safari&quot;</strong>.
                    </p>
                  </div>
                )}

                {/* iPhone Interactive Installation Steps */}
                {isIOS && (
                  <div className="mt-4 p-4 rounded-2xl bg-[#0e1628] border border-cyan-500/40 text-left w-full shadow-inner animate-fade-in space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                        <Smartphone className="w-4 h-4 text-cyan-400" />
                        <span>How to Install on iPhone:</span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400/80 uppercase font-semibold">Safari</span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          1
                        </div>
                        <div className="text-xs text-slate-200 leading-snug">
                          Look at the <strong>bottom bar of Safari</strong> and tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-1 text-cyan-400" />.
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          2
                        </div>
                        <div className="text-xs text-slate-200 leading-snug">
                          Scroll down the menu and tap <strong className="text-white">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-cyan-400" />.
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          3
                        </div>
                        <div className="text-xs text-slate-200 leading-snug">
                          Tap <strong className="text-white">Add</strong> in the top-right corner. GenAce will appear on your Home Screen!
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-cyan-300/80 animate-pulse">
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>Share button is located at the bottom of your iPhone screen</span>
                    </div>
                  </div>
                )}

                {/* Non-iOS Key Advantages List */}
                {!isIOS && !showManualGuide && (
                  <div className="mt-4 space-y-2 bg-slate-900/60 rounded-2xl p-3.5 border border-slate-800/80 w-full text-left">
                    <div className="flex items-center gap-3 text-xs text-slate-200">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                        <BellRing className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <div>
                        <span className="font-semibold text-white">Instant Notifications</span>
                        <p className="text-[11px] text-slate-400 leading-snug">Call rings & instant space alerts.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-200">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        <Zap className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <div>
                        <span className="font-semibold text-white">Full-Screen & Zero Lag</span>
                        <p className="text-[11px] text-slate-400 leading-snug">Runs as standalone app without browser bars.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Desktop / Chrome Guide if prompted without deferredPrompt */}
                {showManualGuide && !isIOS && !deferredPrompt && (
                  <div className="mt-4 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-left w-full animate-fade-in">
                    <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs mb-1.5">
                      <Download className="w-4 h-4" />
                      <span>Browser Install Instructions:</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Click the <strong>Install GenAce</strong> icon (⊕ or ⬇) in your browser&apos;s address bar, or open your browser menu (⋮) and select <strong>&quot;Install GenAce&quot;</strong>.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-5 space-y-2.5 w-full">
                  {isIOS ? (
                    /* iPhone Confirm Button */
                    <button
                      onClick={handleConfirmDone}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:via-teal-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Check className="w-4 h-4" />
                      <span>✓ I&apos;ve Added It to Home Screen</span>
                    </button>
                  ) : (
                    /* Android / Desktop Button */
                    <button
                      onClick={handleInstallClick}
                      className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Download className="w-4 h-4" />
                      <span>{deferredPrompt ? 'Install GenAce App' : 'Install GenAce'}</span>
                    </button>
                  )}

                  {/* Secondary Dismiss Button */}
                  <button
                    onClick={closeInstallPrompt}
                    className="w-full py-2.5 px-4 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Continue in Browser
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
