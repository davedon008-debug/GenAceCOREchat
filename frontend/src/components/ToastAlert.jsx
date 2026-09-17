'use client';

import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function ToastAlert({
  toast, // { message, type: 'success'|'error'|'info', id }
  onClose,
}) {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const { message, type = 'info' } = toast;

  const config = {
    success: {
      bg: 'bg-[#14261f]/95 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      glow: 'from-emerald-400 to-teal-500',
    },
    error: {
      bg: 'bg-[#29171a]/95 border-rose-500/40 text-rose-300 shadow-rose-500/10',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      glow: 'from-rose-500 to-red-600',
    },
    info: {
      bg: 'bg-[#152533]/95 border-cyan-500/40 text-cyan-300 shadow-cyan-500/10',
      icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
      glow: 'from-cyan-400 to-blue-500',
    },
  }[type] || {
    bg: 'bg-[#152533]/95 border-cyan-500/40 text-cyan-300 shadow-cyan-500/10',
    icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
    glow: 'from-cyan-400 to-blue-500',
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm sm:max-w-md px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`pointer-events-auto backdrop-blur-2xl border rounded-2xl p-4 shadow-2xl relative overflow-hidden flex items-center justify-between gap-3 ${config.bg}`}>
        {/* Animated Top Glow Accent Line */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.glow} animate-pulse`} />

        <div className="flex items-center gap-3 truncate">
          {config.icon}
          <span className="text-sm font-medium text-white truncate font-outfit">
            {message}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
