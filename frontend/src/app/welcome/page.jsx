'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '../../components/Logo';
import { Settings, MessageSquare, Users, UserPlus, Compass, Zap, ArrowRight, X } from 'lucide-react';

export default function WelcomePage() {
  const router = useRouter();
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  return (
    <div className="min-h-screen w-full bg-[#080b14] text-white flex flex-col items-center justify-between p-4 sm:p-6 relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Translucent Ambient Glow Circles */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Inner Container */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between py-4 space-y-6 relative z-10">
        
        {/* Top Header Bar with Gear Settings Icon */}
        <div className="w-full flex items-center justify-between pt-2">
          <div className="w-10" /> {/* Spacer */}

          <div className="relative">
            <button
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 transition-transform active:scale-95"
              title="Quick Settings"
            >
              <Settings className="w-5 h-5 animate-spin-slow" />
            </button>

            {/* Quick Settings Floating Menu */}
            {showSettingsDrawer && (
              <div className="absolute right-0 top-14 w-60 bg-[#101625] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 space-y-3 animate-fade-in backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-blue-400" /> Web Settings
                  </span>
                  <button 
                    onClick={() => setShowSettingsDrawer(false)}
                    className="text-gray-400 hover:text-white text-xs p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <Link 
                    href="/login"
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 transition"
                  >
                    <span>🔐 Sign In Page</span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                  </Link>
                  <Link 
                    href="/privacy"
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 transition"
                  >
                    <span>📜 Privacy Policy</span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hero Branding Section */}
        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-50 blur-lg group-hover:opacity-75 transition duration-500" />
            <div className="relative w-24 h-24 rounded-3xl bg-[#090d18] border border-indigo-500/40 p-4 flex items-center justify-center shadow-2xl">
              <Logo variant="icon" size={64} />
            </div>
          </div>

          <div className="space-y-1.5 max-w-xs">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-outfit">
              Welcome to GenAce
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Your space to chat, connect, discover and be part of amazing communities.
            </p>
          </div>
        </div>

        {/* 2x2 Feature Action Cards Grid */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {/* Card 1: Start a Chat */}
          <Link
            href="/login"
            className="bg-[#101625] hover:bg-[#151c2e] border border-[#1d273e] hover:border-indigo-500/50 rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-200 group shadow-lg"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition truncate">Start a Chat</h3>
                <span className="text-xs text-gray-500 group-hover:text-gray-300">›</span>
              </div>
              <p className="text-[10px] text-gray-400 truncate mt-0.5">Message your friends...</p>
            </div>
          </Link>

          {/* Card 2: Join a Space */}
          <Link
            href="/login"
            className="bg-[#101625] hover:bg-[#151c2e] border border-[#1d273e] hover:border-purple-500/50 rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-200 group shadow-lg"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white group-hover:text-purple-300 transition truncate">Join a Space</h3>
                <span className="text-xs text-gray-500 group-hover:text-gray-300">›</span>
              </div>
              <p className="text-[10px] text-gray-400 truncate mt-0.5">Find communities th...</p>
            </div>
          </Link>

          {/* Card 3: Meet Friends */}
          <Link
            href="/login"
            className="bg-[#101625] hover:bg-[#151c2e] border border-[#1d273e] hover:border-blue-500/50 rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-200 group shadow-lg"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white group-hover:text-blue-300 transition truncate">Meet Friends</h3>
                <span className="text-xs text-gray-500 group-hover:text-gray-300">›</span>
              </div>
              <p className="text-[10px] text-gray-400 truncate mt-0.5">Search by username...</p>
            </div>
          </Link>

          {/* Card 4: Explore */}
          <Link
            href="/login"
            className="bg-[#101625] hover:bg-[#151c2e] border border-[#1d273e] hover:border-cyan-500/50 rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-200 group shadow-lg"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition truncate">Explore</h3>
                <span className="text-xs text-gray-500 group-hover:text-gray-300">›</span>
              </div>
              <p className="text-[10px] text-gray-400 truncate mt-0.5">Discover trending s...</p>
            </div>
          </Link>
        </div>

        {/* Featured Promo Banner */}
        <div className="bg-[#101625] border border-[#1d273e] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 fill-indigo-400/20" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">New to GenAce?</h4>
              <p className="text-[10px] text-gray-400 leading-tight line-clamp-2 mt-0.5">
                Explore spaces, make friends and be part of something bigger.
              </p>
            </div>
          </div>
          <Link
            href="/login?mode=register"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition shrink-0 whitespace-nowrap"
          >
            Explore Now ›
          </Link>
        </div>

        {/* Auth Action Buttons */}
        <div className="space-y-2.5 w-full pt-2">
          <Link
            href="/login"
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition active:scale-[0.99]"
          >
            Sign In to Workspace
          </Link>

          <Link
            href="/login?mode=register"
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm transition active:scale-[0.99]"
          >
            Create New Account
          </Link>
        </div>

        {/* Footer Links & Tagline */}
        <div className="pt-2 text-center space-y-2">
          <Link
            href="/privacy"
            className="text-xs text-gray-400 hover:text-white underline font-medium transition"
          >
            Privacy Policy
          </Link>
          
          <p className="text-[11px] text-gray-500 font-medium tracking-widest uppercase">
            Connect • Chat • Grow
          </p>
        </div>

      </div>
    </div>
  );
}
