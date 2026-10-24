'use client';

import React, { useState } from 'react';
import { usePWA } from '../context/PWAContext';
import { 
  Download, 
  Share, 
  PlusSquare, 
  Sparkles, 
  X, 
  Smartphone, 
  Check, 
  ArrowDown, 
  BellRing, 
  Zap, 
  ShieldCheck 
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
    deferredPrompt,
  } = usePWA();

  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  // If already running inside standalone PWA or installed, don't show anything
  if (isStandalone || isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await promptInstall();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowManualGuide(true);
    }
  };

  return (
    <>
      {/* 1. Sleek Floating "Install App" Pill (Shown when modal is closed) */}
      {!showModal && (
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

      {/* 2. Primary Install Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div 
            className="relative w-full max-w-md bg-[#0a0e1a]/95 border border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_15px_60px_rgba(0,242,254,0.2)] backdrop-blur-2xl overflow-hidden transition-all text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient background glows */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={closeInstallPrompt}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header: App Logo & Badges */}
            <div className="flex flex-col items-center text-center">
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
                <span>Official Web App</span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-indigo-200 bg-clip-text text-transparent">
                Install GenAce
              </h2>
              <p className="text-slate-300 text-xs mt-1.5 max-w-xs leading-relaxed">
                Add GenAce to your home screen or desktop for the fastest autonomous messaging experience.
              </p>
            </div>

            {/* Key Advantages List */}
            <div className="mt-5 space-y-2.5 bg-slate-900/60 rounded-2xl p-3.5 border border-slate-800/80">
              <div className="flex items-center gap-3 text-left text-xs text-slate-200">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <BellRing className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div>
                  <span className="font-semibold text-white">Instant Notifications</span>
                  <p className="text-[11px] text-slate-400 leading-snug">Receive instant call rings and chat alerts.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-left text-xs text-slate-200">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div>
                  <span className="font-semibold text-white">Full-Screen & Zero Lag</span>
                  <p className="text-[11px] text-slate-400 leading-snug">No browser address bar, instant native responsiveness.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-left text-xs text-slate-200">
                <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div>
                  <span className="font-semibold text-white">Private & Secure</span>
                  <p className="text-[11px] text-slate-400 leading-snug">Autonomous spaces and local encrypted cache.</p>
                </div>
              </div>
            </div>

            {/* iOS Step Guide if expanded or if on iOS */}
            {(showIOSGuide || (isIOS && !deferredPrompt)) && (
              <div className="mt-4 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-left animate-fade-in">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs mb-2">
                  <Smartphone className="w-4 h-4" />
                  <span>How to install on iPhone & iPad:</span>
                </div>
                <ol className="text-[11px] text-slate-300 space-y-2 pl-1">
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px]">1</span>
                    <span>Tap the <strong className="text-white">Share</strong> button <Share className="w-3.5 h-3.5 inline mx-1 text-cyan-400" /> at bottom of Safari</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px]">2</span>
                    <span>Scroll down and tap <strong className="text-white">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-cyan-400" /></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px]">3</span>
                    <span>Tap <strong className="text-white">Add</strong> in the top-right corner</span>
                  </li>
                </ol>
              </div>
            )}

            {/* Manual Desktop / Chrome Guide if prompted without deferredPrompt */}
            {showManualGuide && !isIOS && !deferredPrompt && (
              <div className="mt-4 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-left animate-fade-in">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs mb-1.5">
                  <Download className="w-4 h-4" />
                  <span>Browser Install Instructions:</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Click the <strong>Install GenAce</strong> icon (⊕ or ⬇) located in your browser's address bar, or open your browser menu (⋮) and select <strong>&quot;Install GenAce&quot;</strong> or <strong>&quot;Add to Phone&quot;</strong>.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 space-y-2.5">
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>
                  {deferredPrompt ? 'Install GenAce App' : isIOS ? 'Add to Home Screen' : 'Install GenAce'}
                </span>
              </button>

              <button
                onClick={closeInstallPrompt}
                className="w-full py-2.5 px-4 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Continue in Browser
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
