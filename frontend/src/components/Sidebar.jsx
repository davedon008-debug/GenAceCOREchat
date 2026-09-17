'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api, { getMediaUrl, DEFAULT_AVATAR } from '../lib/api';
import AvatarViewerModal from './AvatarViewerModal';
import Logo from './Logo';
import { 
  MessageSquare, Zap, Users, Compass, Bell, Settings, Crown, 
  ChevronRight, X, Check, Plus, LogOut, Shield, Lock
} from 'lucide-react';

export default function Sidebar({ 
  conversations = [], 
  spaces = [], 
  allContacts = [],
  lockedConversations = [],
  lockedSpaces = [],
  activeId, 
  activeType, 
  onSelectConversation, 
  onSelectSpace,
  onStartDM,
  onOpenNewChat,
  onOpenCreateSpace,
  onOpenNewPersona,
  onResetActive,
  mobileOpen = false,
  onCloseMobile,
  onOpenCameraModal,
  onTestNotification,
  activeNav = 'chats',
  onSelectNav
}) {
  const { activePersona, user, personas, switchPersona, logout } = useAuth();
  const socketCtx = useSocket();
  const onlineUserIds = socketCtx?.onlineUserIds || [];
  const personaStatuses = socketCtx?.personaStatuses || {};
  const safeOnlineIds = Array.isArray(onlineUserIds) ? onlineUserIds.map(String) : [];

  const getStatusDotClass = (personaId) => {
    if (!personaId) return 'bg-gray-500';
    const idStr = String(personaId);
    const st = personaStatuses[idStr];
    if (st === 'away') return 'bg-amber-400';
    if (st === 'dnd') return 'bg-rose-500';
    if (st === 'online' || safeOnlineIds.includes(idStr)) return 'bg-emerald-500';
    return 'bg-gray-500';
  };

  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ isOpen: false, avatarUrl: '', name: '', handle: '' });

  const activePersonaStatus = activePersona?.status || 'online';
  const activeStatusColor = activePersonaStatus === 'online'
    ? 'bg-emerald-500'
    : activePersonaStatus === 'away'
    ? 'bg-amber-400'
    : activePersonaStatus === 'dnd'
    ? 'bg-rose-500'
    : 'bg-gray-500';

  const totalUnreadCount = (conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const navItems = [
    { id: 'chats', label: 'Chats', icon: <MessageSquare className="w-4 h-4" />, badge: totalUnreadCount > 0 ? totalUnreadCount : null },
    { id: 'spaces', label: 'Spaces', icon: <Zap className="w-4 h-4" /> },
    { id: 'friends', label: 'Friends', icon: <Users className="w-4 h-4" /> },
    { id: 'discover', label: 'Discover', icon: <Compass className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, badge: null },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin Panel', icon: <Shield className="w-4 h-4 text-purple-400" /> }] : []),
  ];

  return (
    <aside className="w-60 lg:w-64 h-full flex flex-col justify-between p-4 bg-[#090d18] border-r border-[#151c2e] shrink-0 select-none overflow-y-auto z-20">
      <div className="flex flex-col space-y-6">
        {/* Logo Header using official GenAce Logo component */}
        <div className="flex items-center justify-between px-1 py-1">
          <Logo variant="full" mode="dark" size={32} />
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold shrink-0">
            v1.0.0
          </span>
        </div>

        {/* Navigation Links List */}
        <div className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (onSelectNav) onSelectNav(item.id);
                  if (item.id === 'chats' && onResetActive) onResetActive();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition font-medium text-xs ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-bold shadow-lg shadow-indigo-600/25 border border-indigo-400/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shadow ${
                    isActive ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Channels & Conversations Section when activeNav is 'chats' */}
        {activeNav === 'chats' && (
          <div className="space-y-4 pt-2">
            {/* Spaces Subsection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 font-mono">
                  Spaces ({spaces.length})
                </span>
                <button
                  onClick={onOpenCreateSpace}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                  title="Create Space"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                {spaces.length === 0 ? (
                  <div className="px-2.5 py-3 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <p className="text-[11px] text-gray-400">No spaces joined yet.</p>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => onSelectNav && onSelectNav('discover')}
                        className="w-full py-1 px-2 text-[11px] font-bold rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition flex items-center justify-center gap-1"
                      >
                        <Compass className="w-3 h-3" /> Discover Spaces
                      </button>
                      <button
                        onClick={onOpenCreateSpace}
                        className="text-[10px] font-medium text-gray-400 hover:text-white transition flex items-center justify-center gap-1 py-0.5"
                      >
                        <Plus className="w-3 h-3" /> Create Space
                      </button>
                    </div>
                  </div>
                ) : (
                  spaces.map((s) => {
                    const isSelected = activeType === 'space' && String(activeId) === String(s._id);
                    const isLocked = s.isLocked || (Array.isArray(lockedSpaces) && lockedSpaces.includes(String(s._id)));
                    return (
                      <button
                        key={s._id}
                        onClick={() => onSelectSpace(s._id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition text-xs group ${
                          isSelected
                            ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/40 shadow'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
                          {s.icon || '⚡'}
                        </div>
                        <span className="truncate flex-1">{s.title}</span>
                        {isLocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Direct Messages Subsection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 font-mono">
                  Direct Messages ({conversations.length})
                </span>
                <button
                  onClick={onOpenNewChat}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                  title="New Direct Message"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                {conversations.filter(c => !c.spaceId).length === 0 ? (
                  <div className="px-2.5 py-2.5 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <p className="text-[11px] text-gray-400">No active DMs yet.</p>
                    <p className="text-[10px] text-gray-500">Pick a contact from the right or start a chat.</p>
                    <button
                      onClick={onOpenNewChat}
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center justify-center gap-1 mx-auto pt-1"
                    >
                      <Plus className="w-3 h-3" /> Start a Chat
                    </button>
                  </div>
                ) : (
                  conversations.filter(c => !c.spaceId).map((c) => {
                    const partner = c.participants?.find(p => String(p._id || p) !== String(activePersona?._id)) || c.participants?.[0];
                    const name = c.name || partner?.displayName || (partner?.username ? `@${partner.username}` : 'Chat');
                    const avatar = getMediaUrl(partner?.avatar, partner?.displayName || partner?.username) || DEFAULT_AVATAR;

                    const partnerId = partner?._id ? String(partner._id) : null;
                    const isPartnerOnline = partnerId && safeOnlineIds.includes(partnerId);

                    const isLocked = lockedConversations.includes(String(c._id));
                    const isSelected = activeType === 'conversation' && String(activeId) === String(c._id);

                    return (
                      <button
                        key={c._id}
                        onClick={() => onSelectConversation(c._id, c)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition text-xs group ${
                          isSelected
                            ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/40 shadow'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <img 
                              src={avatar} 
                              alt="" 
                              className="w-6 h-6 rounded-full object-cover border border-white/10" 
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                            />
                            <span className={`w-2 h-2 rounded-full absolute bottom-0 right-0 border border-[#090d18] ${getStatusDotClass(partnerId)}`} />
                          </div>
                          <span className="truncate min-w-0 flex items-center gap-1">
                            <span className="truncate">{name}</span>
                            {isLocked && <Lock className="w-3 h-3 text-indigo-400 shrink-0" />}
                          </span>
                        </div>
                        {c.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500 text-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Widgets */}
      <div className="space-y-4 pt-4 border-t border-[#151c2e]">
        {/* GenAce Premium Card matching reference screenshot */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#16172e] to-[#101224] border border-indigo-500/30 space-y-2 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-xl pointer-events-none" />
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <Crown className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>GenAce Premium</span>
          </div>
          <p className="text-[11px] text-gray-300 leading-snug">
            Unlock more features, themes and exclusive perks.
          </p>
          <button className="w-full py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition flex items-center justify-center gap-1">
            <span>Upgrade Now</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* User Profile Card matching reference screenshot */}
        <div className="relative">
          <div 
            onClick={() => setShowPersonaMenu(!showPersonaMenu)}
            className="p-2.5 rounded-2xl bg-[#101524] border border-white/5 hover:border-indigo-500/40 cursor-pointer transition flex items-center justify-between group shadow-md"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="relative shrink-0 cursor-pointer group/avatar"
                onClick={(e) => {
                  e.stopPropagation();
                  setAvatarViewerTarget({
                    isOpen: true,
                    avatarUrl: activePersona?.avatar,
                    name: activePersona?.displayName || activePersona?.username || 'User',
                    handle: activePersona?.username,
                    bio: activePersona?.bio,
                    customStatus: activePersona?.customStatus
                  });
                }}
                title="Click to view profile picture"
              >
                <img
                  src={getMediaUrl(activePersona?.avatar, activePersona?.displayName || activePersona?.username) || DEFAULT_AVATAR}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border border-white/10 group-hover/avatar:scale-110 transition-transform"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                />
                <span className={`w-2.5 h-2.5 rounded-full ${activeStatusColor} absolute bottom-0 right-0 border-2 border-[#090d18]`} />
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-xs font-bold text-white truncate">{activePersona?.displayName || 'User'}</p>
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <span className="truncate">@{activePersona?.username || 'user'}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${activeStatusColor} shrink-0`} />
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white shrink-0" />
          </div>

          {/* User Persona & Sign Out Menu Popover */}
          {showPersonaMenu && (
            <div className="absolute bottom-16 left-0 right-0 bg-[#161d2f] border border-[#27344d] rounded-2xl p-3 shadow-2xl z-50 animate-fadeIn space-y-2">
              <div className="flex items-center justify-between px-1 pb-1 border-b border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
                  Switch Identity Persona
                </span>
                <button onClick={() => setShowPersonaMenu(false)} className="text-gray-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1 max-h-36 overflow-y-auto">
                {(personas || []).map((p) => (
                  <button
                    key={p._id || p.id}
                    onClick={async () => {
                      if (p._id) await switchPersona(p._id);
                      setShowPersonaMenu(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition ${
                      p._id === activePersona?._id ? 'bg-indigo-600/30 text-indigo-200 font-semibold border border-indigo-500/40' : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <img 
                        src={getMediaUrl(p.avatar, p.displayName || p.username) || DEFAULT_AVATAR} 
                        alt="" 
                        className="w-6 h-6 rounded-full object-cover" 
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                      />
                      <div>
                        <p className="font-semibold text-white text-xs">{p.displayName || p.username}</p>
                        <p className="text-[9px] text-gray-400">@{p.username}</p>
                      </div>
                    </div>
                    {p._id === activePersona?._id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-white/10 space-y-1">
                <button
                  onClick={() => {
                    setShowPersonaMenu(false);
                    onOpenNewPersona();
                  }}
                  className="w-full flex items-center gap-2 p-1.5 rounded-xl text-xs font-medium text-indigo-400 hover:bg-indigo-500/10 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Persona
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 p-1.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AvatarViewerModal
        isOpen={avatarViewerTarget.isOpen}
        onClose={() => setAvatarViewerTarget(prev => ({ ...prev, isOpen: false }))}
        avatarUrl={avatarViewerTarget.avatarUrl}
        name={avatarViewerTarget.name}
        handle={avatarViewerTarget.handle}
        bio={avatarViewerTarget.bio}
        customStatus={avatarViewerTarget.customStatus}
      />
    </aside>
  );
}
