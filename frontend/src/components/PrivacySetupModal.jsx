'use client';

import { useState } from 'react';
import { Users, EyeOff, BellOff, Check, ChevronRight, Loader2, ShieldCheck } from 'lucide-react';
import api from '../lib/api';

export default function PrivacySetupModal({ isOpen, onClose, activePersona, onUpdated }) {
  const [whoCanFindMe, setWhoCanFindMe] = useState(
    activePersona?.privacySettings?.whoCanFindMe || 'everyone'
  );
  const [onlineVisibility, setOnlineVisibility] = useState(
    activePersona?.privacySettings?.onlineVisibility || 'everyone'
  );
  const [newAccountAnnouncements, setNewAccountAnnouncements] = useState(
    activePersona?.privacySettings?.newAccountAnnouncements ?? true
  );

  const [saving, setSaving] = useState(false);
  const [activePicker, setActivePicker] = useState(null); // 'find' | 'online' | 'announce' | null

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!activePersona?._id) return;
    setSaving(true);
    try {
      const payload = {
        privacySettings: {
          setupCompleted: true,
          whoCanFindMe,
          onlineVisibility,
          newAccountAnnouncements
        }
      };

      const res = await api.patch(`/personas/${activePersona._id}`, payload);
      if (res.data?.success) {
        if (onUpdated) onUpdated(res.data.persona);
        if (onClose) onClose();
      }
    } catch (err) {
      console.error('Failed to save privacy settings:', err);
      alert('Failed to save privacy settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const getWhoSubtitle = () => {
    if (whoCanFindMe === 'everyone') return 'Friends and other GenAce users';
    if (whoCanFindMe === 'friends') return 'Only people in your contacts list';
    return 'Hidden from all discovery & searches';
  };

  const getWhoBadgeLabel = () => {
    if (whoCanFindMe === 'everyone') return 'Everyone';
    if (whoCanFindMe === 'friends') return 'Friends only';
    return 'Nobody';
  };

  const getOnlineBadgeLabel = () => {
    if (onlineVisibility === 'everyone') return 'Everyone';
    if (onlineVisibility === 'friends') return 'Friends only';
    return 'Nobody';
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-4 flex items-center justify-center animate-fadeIn"
      onClick={() => {}}
    >
      <div 
        className="w-full max-w-md bg-[#0b0f19] border border-[#1e293b] rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Scrollable Container for all content */}
        <div className="overflow-y-auto overflow-x-hidden pr-1 -mr-1 space-y-4 flex-1 scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-transparent">
          {/* Brand Header */}
          <div className="text-center space-y-1.5 relative pt-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 mx-auto">
              <span className="text-2xl text-white font-bold leading-none select-none">∞</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black font-outfit tracking-tight text-white">
              Welcome to GenAce
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              Your space. Your connections. Your privacy.
            </p>
          </div>

          {/* Section Intro */}
          <div className="space-y-0.5 pt-1">
            <h3 className="text-sm font-bold text-white font-outfit">Set up your privacy</h3>
            <p className="text-xs text-gray-400">Choose how people can discover you.</p>
          </div>

          {/* Privacy Setting Cards */}
          <div className="space-y-2.5">
            {/* Card 1: Who can find me? */}
            <div 
              className={`p-3 sm:p-3.5 rounded-2xl bg-[#131b2e] border transition-all cursor-pointer ${
                activePicker === 'find' ? 'border-indigo-500 shadow-md shadow-indigo-500/10' : 'border-[#1e293b] hover:border-gray-700'
              }`}
              onClick={() => setActivePicker(activePicker === 'find' ? null : 'find')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">Who can find me?</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{getWhoSubtitle()}</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {getWhoBadgeLabel()}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${activePicker === 'find' ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {/* Expanded Options Selector */}
              {activePicker === 'find' && (
                <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                  {[
                    { id: 'everyone', label: 'Friends & Other GenAce Users (Public)', desc: 'Display profile in Find Friends column & global search' },
                    { id: 'friends', label: 'Friends only', desc: 'Only existing contacts can search or connect with you' },
                    { id: 'nobody', label: 'Nobody (Private)', desc: 'Hidden completely from friends column & discovery' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setWhoCanFindMe(opt.id);
                        setActivePicker(null);
                      }}
                      className={`w-full text-left p-2 rounded-xl border transition flex items-center justify-between text-xs ${
                        whoCanFindMe === opt.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                          : 'bg-[#0f1626] border-[#1e293b] text-gray-300 hover:bg-[#162035]'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-white">{opt.label}</p>
                        <p className="text-[10px] text-gray-400">{opt.desc}</p>
                      </div>
                      {whoCanFindMe === opt.id && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Card 2: Online visibility */}
            <div 
              className={`p-3 sm:p-3.5 rounded-2xl bg-[#131b2e] border transition-all cursor-pointer ${
                activePicker === 'online' ? 'border-indigo-500 shadow-md shadow-indigo-500/10' : 'border-[#1e293b] hover:border-gray-700'
              }`}
              onClick={() => setActivePicker(activePicker === 'online' ? null : 'online')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                    <EyeOff className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">Online visibility</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">Control who sees your online presence.</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {getOnlineBadgeLabel()}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${activePicker === 'online' ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {/* Expanded Options Selector */}
              {activePicker === 'online' && (
                <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                  {[
                    { id: 'nobody', label: 'Nobody (Stealth Mode)', desc: 'Always appear offline to everyone' },
                    { id: 'friends', label: 'Friends only', desc: 'Only your saved contacts see your active green dot' },
                    { id: 'everyone', label: 'Everyone', desc: 'All GenAce users can see when you are online' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setOnlineVisibility(opt.id);
                        setActivePicker(null);
                      }}
                      className={`w-full text-left p-2 rounded-xl border transition flex items-center justify-between text-xs ${
                        onlineVisibility === opt.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                          : 'bg-[#0f1626] border-[#1e293b] text-gray-300 hover:bg-[#162035]'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-white">{opt.label}</p>
                        <p className="text-[10px] text-gray-400">{opt.desc}</p>
                      </div>
                      {onlineVisibility === opt.id && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Card 3: New account announcements */}
            <div 
              className={`p-3 sm:p-3.5 rounded-2xl bg-[#131b2e] border transition-all cursor-pointer ${
                activePicker === 'announce' ? 'border-indigo-500 shadow-md shadow-indigo-500/10' : 'border-[#1e293b] hover:border-gray-700'
              }`}
              onClick={() => setActivePicker(activePicker === 'announce' ? null : 'announce')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                    <BellOff className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">New account announcements</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                      {newAccountAnnouncements ? 'Notify network of registration.' : 'Your registration stays private.'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {newAccountAnnouncements ? 'Enabled' : 'Disabled'}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${activePicker === 'announce' ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {/* Expanded Options Selector */}
              {activePicker === 'announce' && (
                <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                  {[
                    { val: false, label: 'Disabled (Recommended)', desc: 'Keep registration private without broadcast' },
                    { val: true, label: 'Enabled', desc: 'Broadcast a new account announcement to contacts' }
                  ].map((opt) => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => {
                        setNewAccountAnnouncements(opt.val);
                        setActivePicker(null);
                      }}
                      className={`w-full text-left p-2 rounded-xl border transition flex items-center justify-between text-xs ${
                        newAccountAnnouncements === opt.val
                          ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                          : 'bg-[#0f1626] border-[#1e293b] text-gray-300 hover:bg-[#162035]'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-white">{opt.label}</p>
                        <p className="text-[10px] text-gray-400">{opt.desc}</p>
                      </div>
                      {newAccountAnnouncements === opt.val && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Action Button at Bottom - Always Accessible */}
        <div className="pt-3 border-t border-[#1e293b]/70 shrink-0 mt-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Continue to GenAce</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
