import { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { getMediaUrl, DEFAULT_AVATAR } from '../lib/api';
import AvatarViewerModal from './AvatarViewerModal';

export default function UserProfileBanner({
  participant,
  onClose,
  onBlockUser,
  onRemoveContact,
  isBlocked = false
}) {
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  if (!participant) return null;

  const displayName = participant.displayName || participant.username || 'User';
  const username = participant.username || 'user';
  const avatar = getMediaUrl(participant.avatar, displayName) || DEFAULT_AVATAR;
  const userBio = participant.bio && participant.bio.trim() ? participant.bio.trim() : null;
  const customStatus = participant.customStatus && participant.customStatus.trim() ? participant.customStatus.trim() : null;
  const type = participant.type || 'personal';

  return (
    <>
      <div className="mx-2 sm:mx-4 my-2 sm:my-3 rounded-2xl sm:rounded-3xl overflow-hidden relative border border-cyan-500/20 shadow-xl bg-gradient-to-r from-[#090d1f] via-[#101935] to-[#0c1329] p-3 sm:p-4.5">
        {/* Ambient Radial Glow */}
        <div className="absolute -right-12 -top-12 w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Close / Dismiss Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-white/20 text-gray-300 hover:text-white transition flex items-center justify-center shadow-md z-30 active:scale-90 shrink-0"
            title="Dismiss profile banner"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        )}

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 pr-7 sm:pr-8 md:pr-0">
          {/* Main User Info Section */}
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Avatar Profile Photo */}
            <div
              className="relative shrink-0 cursor-pointer group"
              onClick={() => setShowAvatarViewer(true)}
              title="Click to view full profile picture & bio"
            >
              <img
                src={avatar}
                alt=""
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover border border-cyan-400/40 shadow-md shadow-cyan-500/10 group-hover:scale-105 transition-transform"
              />
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border-2 border-[#090d1f] absolute -bottom-0.5 -right-0.5 shadow-md" />
            </div>

            {/* User Meta & Bio */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                <h2 className="text-xs sm:text-sm md:text-base font-bold text-white font-outfit tracking-tight truncate max-w-[140px] sm:max-w-xs">
                  {displayName}
                </h2>
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium capitalize shrink-0">
                  {type}
                </span>
                {customStatus && (
                  <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium shrink-0 truncate max-w-[120px] sm:max-w-none">
                    ✨ {customStatus}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-cyan-400 font-mono font-medium truncate">@{username}</p>
              {userBio && (
                <p className="text-[11px] sm:text-xs text-gray-300 leading-tight sm:leading-relaxed mt-0.5 line-clamp-1 sm:line-clamp-2 break-words">
                  {userBio}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons: Block / Contact / Encrypted */}
          <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 pt-1 md:pt-0 border-t md:border-t-0 border-white/5 md:border-none flex-wrap">
            {onBlockUser && (
              <button
                type="button"
                onClick={onBlockUser}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs font-semibold transition flex items-center gap-1 shrink-0 ${
                  isBlocked
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                }`}
              >
                <span>{isBlocked ? 'Unblock' : 'Block'}</span>
              </button>
            )}

            {onRemoveContact && (
              <button
                type="button"
                onClick={onRemoveContact}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-[11px] sm:text-xs font-semibold transition shrink-0"
              >
                <span>Remove Contact</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-gray-300 text-[11px] sm:text-xs font-medium shrink-0">
              <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
              <span className="text-[10px] sm:text-[11px]">Encrypted</span>
            </div>
          </div>
        </div>
      </div>

      <AvatarViewerModal
        isOpen={showAvatarViewer}
        onClose={() => setShowAvatarViewer(false)}
        avatarUrl={avatar}
        name={displayName}
        handle={username}
        bio={userBio}
        customStatus={customStatus}
      />
    </>
  );
}
