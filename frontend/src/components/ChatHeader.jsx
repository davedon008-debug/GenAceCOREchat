import { useState } from 'react';
import { getMediaUrl, DEFAULT_AVATAR } from '../lib/api';
import AvatarViewerModal from './AvatarViewerModal';
import {
  Shield, Zap, Bot, Flame, EyeOff, Lock, Clock, CheckCircle2, ChevronDown, Menu, UserPlus, MoreVertical, Sparkles, ArrowLeft, UserX, Trash2, Users
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
  isChatLocked = false
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
    <header className="h-16 px-3 md:px-6 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between z-20 relative select-none">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
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

        {/* Hamburger Menu Button (Opens Members Directory) */}
        <button
          onClick={onToggleRightPanel || onOpenMobileSidebar}
          className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 shrink-0 transition flex items-center gap-1.5"
          title="Open Members Directory"
        >
          <Menu className="w-5 h-5 text-indigo-400" />
        </button>

        {isSpace ? (
          <div
            onClick={onToggleRightPanel}
            title="Click to view Space details & members"
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 border border-indigo-400/40 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-indigo-500/20 shrink-0 cursor-pointer hover:scale-105 transition-transform"
          >
            {icon || '⚡'}
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
          className={`min-w-0 truncate ${isSpace ? 'cursor-pointer' : ''}`}
          onClick={isSpace ? onToggleRightPanel : undefined}
          title={isSpace ? "Click to view Space details & members" : undefined}
        >
          <h2 className="text-xs md:text-sm font-bold text-white flex items-center gap-1.5 truncate font-outfit">
            <span className="truncate">{title}</span>
            {isChatLocked && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1 font-mono shrink-0">
                <Lock className="w-3 h-3 text-indigo-400" /> Locked
              </span>
            )}
            {isSpace && <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-normal shrink-0">Public Space</span>}
          </h2>
          <p className="text-[10px] md:text-[11px] text-gray-400 truncate">
            {isSpace ? (subtitle || 'Synchronized room canvas') : (subtitle || 'Direct Message')}
          </p>
        </div>
      </div>

      {/* DESKTOP ACTION BAR */}
      <div className="hidden md:flex items-center gap-2.5">
        {/* Invite People Button for Space */}
        {isSpace && (
          <button
            onClick={onOpenInviteModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition"
          >
            <UserPlus className="w-3.5 h-3.5" /> <span>Invite Members</span>
          </button>
        )}

        {/* Privacy Selector */}
        <div className="relative">
          <button
            onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${currentBadge.color}`}
          >
            {currentBadge.icon}
            <span>{currentBadge.label}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {showPrivacyDropdown && (
            <div className="absolute right-0 top-11 w-56 bg-[#182033] border border-[#2b374e] rounded-2xl p-2 shadow-2xl z-50">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-2 py-1">
                Select Privacy Vector
              </p>
              {Object.entries(privacyBadge).map(([modeKey, badge]) => (
                <button
                  key={modeKey}
                  onClick={() => {
                    onUpdatePrivacy(modeKey);
                    setShowPrivacyDropdown(false);
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

        {/* Upgrade to Space Button */}
        {!isSpace && (
          <button
            onClick={onUpgradeToSpace}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition"
          >
            <Zap className="w-3.5 h-3.5" /> <span>Create Space</span>
          </button>
        )}

        {/* AI Toolbar Toggle */}
        <button
          onClick={onToggleAIPanel}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
            showAIPanel
              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 shadow-lg shadow-indigo-500/20'
              : 'bg-[#1e293b] border-white/10 text-gray-300 hover:bg-[#28354d]'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-indigo-400" /> <span>AI Context</span>
        </button>

        {/* Desktop More Options Menu */}
        <div className="relative">
          <button
            onClick={() => setShowDesktopOptionsMenu(!showDesktopOptionsMenu)}
            className="p-2 rounded-xl bg-[#1e293b] border border-white/10 text-gray-300 hover:text-white hover:bg-[#28354d] transition"
            title="Chat Actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showDesktopOptionsMenu && (
            <div className="absolute right-0 top-11 w-52 bg-[#182033] border border-[#2b374e] rounded-2xl p-2 shadow-2xl z-50 animate-fadeIn space-y-1">
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
                  <Users className="w-4 h-4" />
                  <span>{showRightPanel ? 'Hide Members Panel' : 'Show Members Panel'}</span>
                </button>
              )}

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

      {/* MOBILE ACTION TRIGGER BUTTONS */}
      <div className="flex md:hidden items-center gap-1.5 shrink-0">
        {/* Quick AI Toggle Icon on Mobile */}
        <button
          onClick={onToggleAIPanel}
          className={`p-2 rounded-xl border transition ${
            showAIPanel
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-lg shadow-cyan-500/20'
              : 'bg-white/5 border-white/10 text-cyan-400 hover:bg-white/10'
          }`}
          title="Toggle AI Context"
        >
          <Bot className="w-4 h-4" />
        </button>

        {/* Mobile Options Menu Toggle */}
        <button
          onClick={() => {
            setShowMobileActionMenu(!showMobileActionMenu);
            setShowMobilePrivacyList(false);
          }}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Mobile Action Dropdown Drawer */}
        {showMobileActionMenu && (
          <div className="absolute right-3 top-16 w-64 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-3 shadow-2xl z-50 animate-fadeIn space-y-2">
            <div className="px-1 pb-1 border-b border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Options & Settings
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">Mobile</span>
            </div>

            {/* Members Panel Toggle (mobile) */}
            {onToggleRightPanel && (
              <button
                onClick={() => {
                  onToggleRightPanel();
                  setShowMobileActionMenu(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition ${
                  showRightPanel
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Members Panel</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded ${showRightPanel ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/10 text-gray-400'}`}>
                  {showRightPanel ? 'Visible' : 'Hidden'}
                </span>
              </button>
            )}

            {/* AI Context Button */}
            <button
              onClick={() => {
                onToggleAIPanel();
                setShowMobileActionMenu(false);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition ${
                showAIPanel
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>AI Context Assistant</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded ${showAIPanel ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/10 text-gray-400'}`}>
                {showAIPanel ? 'Active' : 'Off'}
              </span>
            </button>

            {/* Upgrade to Space / Invite People */}
            {isSpace ? (
              <button
                onClick={() => {
                  onOpenInviteModal();
                  setShowMobileActionMenu(false);
                }}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-semibold hover:bg-purple-500/30 transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Members to Space</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onUpgradeToSpace();
                  setShowMobileActionMenu(false);
                }}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 transition"
              >
                <Zap className="w-4 h-4" />
                <span>Upgrade Chat to Space</span>
              </button>
            )}

            {/* Privacy Mode Selector */}
            <div>
              <button
                onClick={() => setShowMobilePrivacyList(!showMobilePrivacyList)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition ${currentBadge.color}`}
              >
                <div className="flex items-center gap-2">
                  {currentBadge.icon}
                  <span>Privacy: {currentBadge.label}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {showMobilePrivacyList && (
                <div className="mt-1 space-y-1 pl-1 pr-1 py-1 bg-black/40 border border-white/10 rounded-xl">
                  {Object.entries(privacyBadge).map(([modeKey, badge]) => (
                    <button
                      key={modeKey}
                      onClick={() => {
                        onUpdatePrivacy(modeKey);
                        setShowMobilePrivacyList(false);
                        setShowMobileActionMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs transition ${
                        privacyMode === modeKey ? 'bg-white/10 text-white font-semibold' : 'hover:bg-white/5 text-gray-300'
                      }`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Block & Delete Buttons on Mobile */}
            <div className="pt-2 border-t border-white/10 space-y-1">
              {!isSpace && onBlockUser && (
                <button
                  onClick={() => {
                    onBlockUser();
                    setShowMobileActionMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition ${
                    isBlocked
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                  }`}
                >
                  <UserX className={`w-4 h-4 ${isBlocked ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <span>{isBlocked ? 'Unblock User' : 'Block User'}</span>
                </button>
              )}

              {onToggleLockChat && (
                <button
                  onClick={() => {
                    onToggleLockChat();
                    setShowMobileActionMenu(false);
                  }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/20 transition"
                >
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <span>{isChatLocked ? 'Unlock This Chat' : 'Lock This Chat 🔒'}</span>
                </button>
              )}

              {onDeleteConversation && (
                <button
                  onClick={() => {
                    onDeleteConversation();
                    setShowMobileActionMenu(false);
                  }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-500/20 transition"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Delete Chat</span>
                </button>
              )}
            </div>
          </div>
        )}
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
