'use client';

import { useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { getMediaUrl, DEFAULT_AVATAR } from '../lib/api';
import { playIncomingRingtone, stopAllSFX } from '../lib/callSFX';

export default function IncomingCallModal({ call, onAccept, onDecline }) {
  useEffect(() => {
    playIncomingRingtone();
    return () => {
      stopAllSFX();
    };
  }, []);

  if (!call) return null;

  const { callerPersona, isVideo } = call;
  const name = callerPersona?.displayName || 'Unknown Caller';
  const handle = callerPersona?.handle ? `@${callerPersona.handle}` : '';
  const avatar = getMediaUrl(callerPersona?.avatarUrl, name) || DEFAULT_AVATAR;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-sm bg-[#101625] border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden">
        {/* Glowing Background Pulse Halo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />

        {/* Dynamic Animated Ring Halo around Avatar */}
        <div className="relative mb-5 mt-2">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 blur-md animate-ping opacity-50" />
          <img
            src={avatar}
            alt={name}
            className="relative w-24 h-24 rounded-full object-cover border-2 border-indigo-400/60 shadow-xl"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
          />
          <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-indigo-600 text-white border-2 border-[#101625] shadow-md">
            {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          </div>
        </div>

        {/* Caller Info */}
        <h3 className="text-xl font-bold text-white font-outfit truncate max-w-xs">{name}</h3>
        {handle && <p className="text-xs text-gray-400 font-mono mt-0.5">{handle}</p>}
        
        <p className="mt-3 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center gap-1.5 animate-pulse">
          {isVideo ? 'Incoming Video Call...' : 'Incoming Voice Call...'}
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-center gap-6 w-full">
          {/* Decline Button */}
          <button
            onClick={() => {
              stopAllSFX();
              onDecline();
            }}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition hover:scale-105 active:scale-95"
          >
            <PhoneOff className="w-5 h-5" />
            <span>Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={() => {
              stopAllSFX();
              onAccept();
            }}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition hover:scale-105 active:scale-95"
          >
            <Phone className="w-5 h-5" />
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
