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
      <div className="mx-4 my-3 rounded-3xl overflow-hidden relative border border-cyan-500/20 shadow-2xl bg-gradient-to-r from-[#090d1f] via-[#101935] to-[#0c1329] p-4 sm:p-5 pr-10 sm:pr-12">
        {/* Ambient Radial Glow */}
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        {/* Close / Dismiss Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-white/20 text-gray-300 hover:text-white transition flex items-center justify-center shadow-lg z-30 active:scale-90"
            title="Dismiss profile banner"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar Profile Photo (Clickable to view full size) */}
            <div
              className="relative shrink-0 cursor-pointer group"
              onClick={() => setShowAvatarViewer(true)}
              title="Click to view full profile picture & bio"
            >
              <img
                src={avatar}
                alt=""
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-cyan-400/40 shadow-lg shadow-cyan-500/10 group-hover:scale-105 transition-transform"
              />
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#090d1f] absolute -bottom-0.5 -right-0.5 shadow-md" />
            </div>

            {/* User Meta & Bio */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white font-outfit tracking-tight truncate">
                  {displayName}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium capitalize shrink-0">
                  {type}
                </span>
                {customStatus && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium shrink-0">
                    ✨ {customStatus}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-cyan-400 font-mono font-medium">@{username}</p>
              <p className="text-xs text-gray-200 leading-relaxed mt-1 whitespace-pre-wrap break-words">
                {userBio || 'No bio provided.'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Block / Contact */}
          <div className="shrink-0 flex items-center gap-2">
            {onBlockUser && (
              <button
                type="button"
                onClick={onBlockUser}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 ${
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
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-semibold transition"
              >
                <span>Remove Contact</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-medium">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">Encrypted</span>
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
