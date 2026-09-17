import { useEffect, useState } from 'react';
import { Bell, MessageSquare, X, ArrowRight, Zap, Shield } from 'lucide-react';
import { getMediaUrl, DEFAULT_AVATAR } from '../lib/api';

export default function NotificationToast({ notification, onClick, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const { title, senderName, senderAvatar, content, isSpace, privacyMode } = notification;

  return (
    <div 
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm sm:max-w-md px-4
        transition-all duration-300 ease-out transform
        ${visible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-6 opacity-0 scale-95 pointer-events-none'}
      `}
    >
      <div 
        onClick={() => {
          onClick();
          onClose();
        }}
        className="glass-panel bg-[#18252d]/95 backdrop-blur-2xl border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl shadow-emerald-500/10 hover:border-emerald-400 cursor-pointer group relative overflow-hidden transition"
      >
        {/* Animated Top Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-purple-500 animate-pulse" />

        <div className="flex items-center gap-3">
          {/* Sender / Space Icon */}
          <div className="relative shrink-0">
            <img 
              src={getMediaUrl(senderAvatar, senderName) || DEFAULT_AVATAR} 
              alt="" 
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
              className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500/60 group-hover:scale-105 transition-transform" 
            />
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#18252d] absolute bottom-0 right-0 flex items-center justify-center text-[8px] font-bold text-slate-950">
              ✓
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 truncate">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white truncate flex items-center gap-1.5 font-outfit">
                {isSpace ? <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> : <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                <span className="truncate">{senderName || 'New Message'}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-semibold shrink-0 ml-1">
                Just now
              </span>
            </div>

            <p className="text-xs text-gray-300 truncate mt-0.5">
              {privacyMode === 'burn'
                ? '🔥 Burn on read message received (click to reveal)'
                : privacyMode === 'vault'
                ? '🛡️ Vault encrypted message received'
                : privacyMode === 'disappearing'
                ? '⏱️ Disappearing message received'
                : privacyMode === 'anonymous'
                ? '👻 Anonymous message received'
                : privacyMode === 'private'
                ? '🔒 Private message received'
                : (content || 'Sent a message')}
            </p>

            {privacyMode && privacyMode !== 'normal' && (
              <span className="inline-flex items-center gap-1 text-[9px] text-purple-300 font-mono mt-1">
                <Shield className="w-2.5 h-2.5" /> Encrypted ({privacyMode})
              </span>
            )}
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500/30 overflow-hidden">
          <div className="h-full bg-emerald-400 animate-toastProgress" />
        </div>
      </div>
    </div>
  );
}
