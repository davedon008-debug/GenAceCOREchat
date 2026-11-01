'use client';

import { X, Download, MessageSquare, UserMinus, UserPlus } from 'lucide-react';
import { getMediaUrl, DEFAULT_AVATAR } from '../lib/api';

export default function AvatarViewerModal({ 
  isOpen, 
  onClose, 
  avatarUrl, 
  name, 
  handle, 
  bio, 
  customStatus,
  targetPersonaId,
  isContact = false,
  onStartDM,
  onToggleContact,
  isSelf = false
}) {
  if (!isOpen) return null;

  const resolvedUrl = getMediaUrl(avatarUrl, name) || DEFAULT_AVATAR;

  return (
    <div
      className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-fadeIn select-none overflow-y-auto"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="w-full max-w-2xl flex items-center justify-between text-white py-2.5 px-4 rounded-2xl bg-white/10 border border-white/10 shadow-2xl backdrop-blur-xl z-10 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 pr-4">
          <h3 className="text-sm sm:text-base font-bold text-white font-outfit truncate">
            {name || 'Profile Picture'}
          </h3>
          {handle && (
            <p className="text-xs text-cyan-400 font-mono font-medium">@{handle.replace(/^@/, '')}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {resolvedUrl && !resolvedUrl.startsWith('data:') && (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              download="profile-picture.jpg"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition"
              title="Download or open original picture"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-4 h-4" />
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/30 transition shadow-lg active:scale-95"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main High-Res Image & Bio Display Container */}
      <div
        className="flex-1 w-full max-w-lg flex flex-col items-center justify-center p-4 my-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative group max-w-full">
          <img
            src={resolvedUrl}
            alt={name || 'User Profile Picture'}
            className="max-w-full max-h-[45vh] sm:max-h-[50vh] w-auto h-auto rounded-3xl object-contain border-2 border-cyan-500/30 shadow-2xl shadow-cyan-500/20 transition-all duration-300 transform group-hover:scale-[1.02]"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
          />
        </div>

        {/* User Bio Card */}
        <div className="w-full p-4 rounded-2xl bg-[#0d1322] border border-cyan-500/30 text-left space-y-2 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase">
              📜 About / Bio
            </span>
            {customStatus && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                ✨ {customStatus}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-sans whitespace-pre-wrap break-words">
            {bio && bio.trim() ? bio.trim() : 'No bio written yet.'}
          </p>
        </div>

        {/* Quick Action Buttons (Message & Add/Remove Contact) */}
        {!isSelf && (targetPersonaId || onStartDM || onToggleContact) && (
          <div className="w-full flex items-center gap-3">
            {isContact ? (
              <>
                {onStartDM && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartDM(targetPersonaId);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message</span>
                  </button>
                )}

                {onToggleContact && (
                  <button
                    type="button"
                    onClick={() => onToggleContact(targetPersonaId, name)}
                    className="py-2.5 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30"
                  >
                    <UserMinus className="w-4 h-4 text-rose-400" />
                    <span>Remove Friend</span>
                  </button>
                )}
              </>
            ) : (
              onToggleContact && (
                <button
                  type="button"
                  onClick={() => onToggleContact(targetPersonaId, name)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Friends</span>
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      <div className="text-center pb-2 shrink-0">
        <p className="text-xs text-gray-400 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
          Tap anywhere outside or press <span className="font-bold text-white">✕</span> to close
        </p>
      </div>
    </div>
  );
}
