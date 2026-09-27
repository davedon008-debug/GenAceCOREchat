import { useState } from 'react';
import { getMediaUrl, DEFAULT_AVATAR, SpaceIcon } from '../lib/api';
import AvatarViewerModal from './AvatarViewerModal';
import {
  Shield, Zap, Bot, Flame, EyeOff, Lock, Clock, CheckCircle2, ChevronDown, Menu, UserPlus, MoreVertical, Sparkles, ArrowLeft, UserX, Trash2, Users, Phone, Video, Heart
} from 'lucide-react';

export default function ChatHeader({
  title,
  subtitle,
  avatar,
  icon,
  privacyMode = 'normal',
  onUpdatePrivacy,
  onUpgradeToSpace,
  onToggleAIPanel,
  showAIPanel,
  isSpace = false,
  onOpenMobileSidebar,
  onOpenInviteModal,
  onCloseActive,
  onBlockUser,
  onDeleteConversation,
  isBlocked = false,
  onToggleRightPanel,
  showRightPanel = false,
  onToggleLockChat,
  isChatLocked = false,
  onStartCall,
  onOpenSecretLovers
}) {
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const [showDesktopOptionsMenu, setShowDesktopOptionsMenu] = useState(false);
  const [showMobileActionMenu, setShowMobileActionMenu] = useState(false);
  const [showMobilePrivacyList, setShowMobilePrivacyList] = useState(false);

  const privacyBadge = {
    normal: { label: 'Normal Mode', icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />, color: 'bg-blue-500/10 border-blue-500/30 text-blue-300' },
    private: { label: 'Private Mode', icon: <Lock className="w-3.5 h-3.5 text-amber-400" />, color: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
    disappearing: { label: 'Disappearing 24h', icon: <Clock className="w-3.5 h-3.5 text-purple-400" />, color: 'bg-purple-500/10 border-purple-500/30 text-purple-300' },
    burn: { label: 'Burn on Read', icon: <Flame className="w-3.5 h-3.5 text-rose-400" />, color: 'bg-rose-500/10 border-rose-500/30 text-rose-300' },
    vault: { label: 'Vault Encrypted', icon: <Shield className="w-3.5 h-3.5 text-emerald-400" />, color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' },
    anonymous: { label: 'Anonymous Identity', icon: <EyeOff className="w-3.5 h-3.5 text-gray-400" />, color: 'bg-gray-500/10 border-gray-500/30 text-gray-300' }
  };

  const currentBadge = privacyBadge[privacyMode] || privacyBadge.normal;

  return (
    <header className="h-16 px-3 md:px-6 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between gap-2 z-20 relative select-none">
      {/* Left User/Chat Information - Takes Priority and Never Gets Squished */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 overflow-hidden">
        {/* Back / Deselect Active Chat Button */}
        {onCloseActive && (
          <button
            onClick={onCloseActive}
            className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 shrink-0 transition"
            title="Return to Main Welcome Screen"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

          {isSpace ? (
            <div
              onClick={onToggleRightPanel}
              title="Click to view Space details & members"
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 border border-indigo-400/40 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-indigo-500/20 shrink-0 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
            >
              <SpaceIcon icon={icon} fallback="⚡" className="w-full h-full object-cover rounded-2xl" />
            </div>
          ) : (
          <img
            src={getMediaUrl(avatar, title) || DEFAULT_AVATAR}
            alt=""
            className="w-10 h-10 rounded-2xl object-cover border border-white/15 shadow-md shrink-0 cursor-pointer hover:scale-105 transition-transform"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
            onClick={() => setShowAvatarViewer(true)}
            title="Click to view full picture"
          />
        )}

        <div
          className={`min-w-0 flex-1 truncate ${isSpace ? 'cursor-pointer' : ''}`}
          onClick={isSpace ? onToggleRightPanel : undefined}
          title={isSpace ? "Click to view Space details & members" : undefined}
        >
          <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2 truncate font-outfit">
            <span className="truncate">{title}</span>
            {isChatLocked && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1 font-mono shrink-0">
                <Lock className="w-3 h-3 text-indigo-400" /> Locked
              </span>
            )}
            {isSpace && <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-normal shrink-0">Public Space</span>}
          </h2>
          <p className="text-[11px] md:text-xs text-gray-400 truncate">
            {isSpace ? (subtitle || 'Synchronized room canvas') : (subtitle || 'Direct Message')}
          </p>
        </div>
      </div>

      {/* Action Buttons Bar - Compact & Uncluttered */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Secret Lovers Quick Action */}
        {!isSpace && onOpenSecretLovers && (
          <button
            onClick={onOpenSecretLovers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-md transition hover:scale-105"
            title="Play Secret Lovers Game"
          >
            <Heart className="w-3.5 h-3.5 fill-white animate-pulse" />
            <span className="hidden xl:inline">Secret Lovers</span>
          </button>
        )}

        {/* Audio & Video Call Quick Buttons */}
        {!isSpace && onStartCall && (
          <>
            <button
              onClick={() => onStartCall({ isVideo: false })}
              className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition hover:scale-105"
              title="Start Voice Call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => onStartCall({ isVideo: true })}
              className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition hover:scale-105"
              title="Start Video Call"
            >
              <Video className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Options Dropdown Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowDesktopOptionsMenu(!showDesktopOptionsMenu)}
            className="p-2.5 rounded-xl bg-[#1e293b] border border-white/10 text-gray-300 hover:text-white hover:bg-[#28354d] transition flex items-center gap-1"
            title="Chat Options & Settings"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showDesktopOptionsMenu && (
            <div className="absolute right-0 top-12 w-60 bg-[#182033] border border-[#2b374e] rounded-2xl p-2 shadow-2xl z-50 animate-fadeIn space-y-1">
              {/* Privacy Vector Selector Dropdown Section */}
              <div className="p-1 border-b border-white/10 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1 px-1">
                  Privacy Mode
                </span>
                <button
                  onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs font-medium transition ${currentBadge.color}`}
                >
                  <div className="flex items-center gap-1.5">
                    {currentBadge.icon}
                    <span>{currentBadge.label}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>

                {showPrivacyDropdown && (
                  <div className="mt-1 space-y-1 pl-1 pr-1 py-1 bg-[#101726] border border-[#2b374e] rounded-xl">
                    {Object.entries(privacyBadge).map(([modeKey, badge]) => (
                      <button
                        key={modeKey}
                        onClick={() => {
                          onUpdatePrivacy(modeKey);
                          setShowPrivacyDropdown(false);
                          setShowDesktopOptionsMenu(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition ${
                          privacyMode === modeKey ? 'bg-indigo-600/30 text-white font-medium' : 'hover:bg-white/5 text-gray-300'
                        }`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Create / Upgrade to Space */}
              {!isSpace ? (
                <button
                  onClick={() => {
                    onUpgradeToSpace();
                    setShowDesktopOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition shadow-md"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Create / Upgrade Space</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onOpenInviteModal();
                    setShowDesktopOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-600/20 hover:bg-indigo-600/30 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Invite Members to Space</span>
                </button>
              )}

              {/* AI Context Toolbar Toggle */}
              <button
                onClick={() => {
                  onToggleAIPanel();
                  setShowDesktopOptionsMenu(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  showAIPanel ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <Bot className="w-4 h-4 text-indigo-400" />
                <span>{showAIPanel ? 'Hide AI Context' : 'Show AI Context'}</span>
              </button>

              {/* Members Panel Toggle */}
              {onToggleRightPanel && (
                <button
                  onClick={() => {
                    onToggleRightPanel();
                    setShowDesktopOptionsMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    showRightPanel
                      ? 'text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>{showRightPanel ? 'Hide Members Directory' : 'Members Directory'}</span>
                </button>
              )}

              {/* Lock Chat Toggle */}
              {onToggleLockChat && (
                <button
                  onClick={() => {
                    onToggleLockChat();
                    setShowDesktopOptionsMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    isChatLocked
                      ? 'text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <span>{isChatLocked ? 'Unlock This Chat' : 'Lock This Chat 🔒'}</span>
                </button>
              )}

              {/* Block User */}
              {!isSpace && onBlockUser && (
                <button
                  onClick={() => {
                    onBlockUser();
                    setShowDesktopOptionsMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    isBlocked
                      ? 'text-emerald-400 hover:bg-emerald-500/10'
                      : 'text-rose-400 hover:bg-rose-500/10'
                  }`}
                >
                  <UserX className="w-4 h-4" />
                  <span>{isBlocked ? 'Unblock User' : 'Block User'}</span>
                </button>
              )}

              {/* Delete Chat */}
              {onDeleteConversation && (
                <button
                  onClick={() => {
                    onDeleteConversation();
                    setShowDesktopOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 font-semibold transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Chat</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <AvatarViewerModal
        isOpen={showAvatarViewer}
        onClose={() => setShowAvatarViewer(false)}
        avatarUrl={avatar}
        name={title}
        handle={subtitle}
      />
    </header>
  );
}
