'use client';

import { ShieldAlert, ShieldCheck, Trash2, AlertTriangle, CheckCircle2, XCircle, Info, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info' | 'success'
  isLoading = false,
}) {
  if (!isOpen) return null;

  const iconMap = {
    danger: <ShieldAlert className="w-7 h-7 text-rose-400" />,
    warning: <AlertTriangle className="w-7 h-7 text-amber-400" />,
    info: <Info className="w-7 h-7 text-cyan-400" />,
    success: <ShieldCheck className="w-7 h-7 text-emerald-400" />,
  };

  const badgeBgMap = {
    danger: 'bg-rose-500/15 border-rose-500/30 shadow-rose-500/20',
    warning: 'bg-amber-500/15 border-amber-500/30 shadow-amber-500/20',
    info: 'bg-cyan-500/15 border-cyan-500/30 shadow-cyan-500/20',
    success: 'bg-emerald-500/15 border-emerald-500/30 shadow-emerald-500/20',
  };

  const topGlowMap = {
    danger: 'from-rose-500 via-red-500 to-pink-600',
    warning: 'from-amber-400 via-orange-500 to-yellow-500',
    info: 'from-cyan-400 via-blue-500 to-indigo-500',
    success: 'from-emerald-400 via-teal-400 to-cyan-400',
  };

  const btnGradientMap = {
    danger: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/30',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-500/30',
    info: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/30',
    success: 'bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 shadow-emerald-500/30 font-bold',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
      {/* Backdrop with backdrop blur */}
      <div 
        onClick={isLoading ? undefined : onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog Body */}
      <div className="relative w-full max-w-md bg-[#131f28]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/80 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        
        {/* Animated Top Glow Accent Line */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${topGlowMap[type] || topGlowMap.danger} animate-pulse`} />

        {/* Ambient background radial glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center pt-2">
          {/* Icon Badge */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg ${badgeBgMap[type] || badgeBgMap.danger} mb-4 relative`}>
            {iconMap[type] || iconMap.danger}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-white tracking-tight font-outfit">
            {title}
          </h3>

          {/* Message */}
          {message && (
            <p className="text-sm text-gray-300 mt-2.5 leading-relaxed max-w-xs sm:max-w-sm">
              {message}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full mt-6 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-2xl text-sm font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition active:scale-95 disabled:opacity-50"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 py-3 px-4 rounded-2xl text-sm font-semibold shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${btnGradientMap[type] || btnGradientMap.danger}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
