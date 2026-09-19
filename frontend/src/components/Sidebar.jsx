'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api, { getMediaUrl, DEFAULT_AVATAR, createInitialsAvatar } from '../lib/api';
import AvatarViewerModal from './AvatarViewerModal';
import Logo from './Logo';
import { 
  MessageSquare, Zap, Users, Compass, Bell, Settings, Crown, 
  ChevronRight, X, Check, Plus, LogOut, Shield, Lock, Search, Menu
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
  onSelectNav,
  isMobileView = false,
  onToggleRightPanel
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all'); // 'all' | 'dms' | 'spaces' | 'locked'

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

  const queryLower = searchQuery.toLowerCase().trim();

  const filteredConversations = (conversations || []).filter(c => {
    if (!c) return false;
    if (c.spaceId) return false;
    const isLocked = lockedConversations.includes(String(c._id));
    if (filterCategory === 'locked' && !isLocked) return false;
    if (!queryLower) return true;

    const rawPartner = c.participants?.find(p => {
      const idStr = typeof p === 'object' && p ? (p._id || p.id) : p;
      return idStr && String(idStr) !== String(activePersona?._id);
    }) || c.participants?.[0];

    const partnerIdStr = typeof rawPartner === 'object' && rawPartner ? (rawPartner._id || rawPartner.id) : rawPartner;
    const partner = (typeof rawPartner === 'object' && rawPartner?.displayName)
      ? rawPartner
      : ((allContacts || []).find(ac => String(ac._id) === String(partnerIdStr)) || rawPartner);

    const name = (c.name || partner?.displayName || '').toLowerCase();
    const handle = (partner?.username || '').toLowerCase();
    return name.includes(queryLower) || handle.includes(queryLower);
  });

  const filteredSpaces = (spaces || []).filter(s => {
    if (!s) return false;
    const isLocked = s.isLocked || (Array.isArray(lockedSpaces) && lockedSpaces.includes(String(s._id)));
    if (filterCategory === 'locked' && !isLocked) return false;
    if (!queryLower) return true;
    const title = (s.title || '').toLowerCase();
    const desc = (s.description || '').toLowerCase();
    return title.includes(queryLower) || desc.includes(queryLower);
  });

  return (
    <aside className={`${isMobileView ? 'w-full h-full' : 'w-60 lg:w-64 h-full'} flex flex-col justify-between p-3 sm:p-4 bg-[#090d18] border-r border-[#151c2e] shrink-0 select-none overflow-y-auto z-20 custom-scrollbar`}>
      <div className="flex flex-col space-y-4">
        {/* Top Header Row with Logo, Hamburger Menu & Avatar Status */}
        <div className="flex items-center justify-between px-1 py-1 gap-2">
          {/* Hamburger Menu Toggle Button for Members Directory */}
          {onToggleRightPanel && (
            <button
              onClick={onToggleRightPanel}
              className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-indigo-600/20 hover:border-indigo-500/40 transition shrink-0 flex items-center justify-center"
              title="Open Members Directory"
            >
              <Menu className="w-4 h-4 text-indigo-400" />
            </button>
          )}

          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Logo variant="full" mode="dark" size={24} />
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold shrink-0">
              v1.0.0
            </span>
          </div>

          <div
            onClick={() => setShowPersonaMenu(!showPersonaMenu)}
            className="relative cursor-pointer group shrink-0"
            title="Profile & Identity Persona"
          >
            <img
              src={getMediaUrl(activePersona?.avatar, activePersona?.displayName || activePersona?.username) || DEFAULT_AVATAR}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-white/20 group-hover:scale-105 transition shadow-md"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = createInitialsAvatar(activePersona?.displayName || activePersona?.username); }}
            />
            <span className={`w-2.5 h-2.5 rounded-full ${activeStatusColor} absolute bottom-0 right-0 border-2 border-[#090d18]`} />
          </div>
        </div>

        {/* Desktop Nav Links (Hidden on mobile list view when isMobileView is true) */}
        {!isMobileView && (
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
        )}

        {/* Mobile Search Bar & Category Filter Chips */}
        {activeNav === 'chats' && (
          <div className="space-y-3">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3" />
              <input
                type="text"
                placeholder="Search messages, contacts, spaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/60 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Chips Horizontal Scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[11px] select-none">
              {[
                { id: 'all', label: 'All Chats' },
                { id: 'dms', label: 'Direct Messages' },
                { id: 'spaces', label: '⚡ Fluid Spaces' },
                { id: 'locked', label: '🔒 Locked Chats' }
              ].map((chip) => {
                const isSelected = filterCategory === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setFilterCategory(chip.id)}
                    className={`px-3 py-1 rounded-full border transition whitespace-nowrap font-medium ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-md shadow-indigo-600/30'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border-white/10'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Welcome Hero & 2x2 Feature Cards Grid (Mobile View) */}
            {isMobileView && filterCategory === 'all' && !searchQuery.trim() && (
              <div className="py-2 space-y-3 border-y border-white/5 my-1">
                <div className="flex flex-col items-center text-center py-2 space-y-1">
                  <Logo variant="icon" mode="dark" size={42} />
                  <h3 className="text-sm font-extrabold text-white">Welcome to GenAce</h3>
                  <p className="text-[11px] text-gray-400 max-w-xs leading-tight">
                    Your space to chat, connect, discover and be part of fluid communities.
                  </p>
                </div>

                {/* 2x2 Feature Action Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onOpenNewChat}
                    className="p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-left flex flex-col justify-between space-y-2 group transition"
                  >
                    <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition">Start a Chat</p>
                      <p className="text-[10px] text-gray-400 truncate">Message contacts</p>
                    </div>
                  </button>

                  <button
                    onClick={() => onSelectNav && onSelectNav('spaces')}
                    className="p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-left flex flex-col justify-between space-y-2 group transition"
                  >
                    <div className="w-7 h-7 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-purple-300 transition">Join a Space</p>
                      <p className="text-[10px] text-gray-400 truncate">Public spaces</p>
                    </div>
                  </button>

                  <button
                    onClick={() => onSelectNav && onSelectNav('friends')}
                    className="p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-left flex flex-col justify-between space-y-2 group transition"
                  >
                    <div className="w-7 h-7 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-blue-300 transition">Meet Friends</p>
                      <p className="text-[10px] text-gray-400 truncate">Search @handle</p>
                    </div>
                  </button>

                  <button
                    onClick={onOpenCreateSpace}
                    className="p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-left flex flex-col justify-between space-y-2 group transition"
                  >
                    <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                      <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition">Create Space</p>
                      <p className="text-[10px] text-gray-400 truncate">Launch space</p>
                    </div>
                  </button>
                </div>

                {/* Featured Promo Banner */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-slate-900 border border-indigo-500/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">⚡</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">New to GenAce?</p>
                      <p className="text-[10px] text-gray-300 truncate">Explore spaces & connect.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onSelectNav && onSelectNav('discover')}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shrink-0 transition"
                  >
                    Explore ›
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Channels & Conversations Section */}
        {activeNav === 'chats' && (
          <div className="space-y-4 pt-1">
            {/* Spaces Subsection */}
            {(filterCategory === 'all' || filterCategory === 'spaces') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 font-mono">
                    Fluid Spaces ({filteredSpaces.length})
                  </span>
                  <button
                    onClick={onOpenCreateSpace}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                    title="Create Space"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                  {filteredSpaces.length === 0 ? (
                    <div className="px-2.5 py-3 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                      <p className="text-[11px] text-gray-400">No fluid spaces found.</p>
                    </div>
                  ) : (
                    filteredSpaces.map((s) => {
                      const isSelected = activeType === 'space' && String(activeId) === String(s._id);
                      const isLocked = s.isLocked || (Array.isArray(lockedSpaces) && lockedSpaces.includes(String(s._id)));
                      return (
                        <button
                          key={s._id}
                          onClick={() => onSelectSpace(s._id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition text-xs group ${
                            isSelected
                              ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/40 shadow'
                              : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
                              {s.icon || '⚡'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate text-xs">{s.title}</p>
                              <p className="text-[10px] text-gray-400 truncate">{s.description || 'Fluid Space'}</p>
                            </div>
                          </div>
                          {isLocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Direct Messages Subsection */}
            {(filterCategory === 'all' || filterCategory === 'dms' || filterCategory === 'locked') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 font-mono">
                    Recent Conversations ({filteredConversations.length})
                  </span>
                  <button
                    onClick={onOpenNewChat}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                    title="New Direct Message"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                  {filteredConversations.length === 0 ? (
                    <div className="px-2.5 py-3 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <p className="text-[11px] text-gray-400">No conversations found.</p>
                      <button
                        onClick={onOpenNewChat}
                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center justify-center gap-1 mx-auto pt-1"
                      >
                        <Plus className="w-3 h-3" /> Start a Chat
                      </button>
                    </div>
                  ) : (
                    filteredConversations.map((c) => {
                      const rawPartner = c.participants?.find(p => {
                        const idStr = typeof p === 'object' && p ? (p._id || p.id) : p;
                        return idStr && String(idStr) !== String(activePersona?._id);
                      }) || c.participants?.[0];

                      const partnerIdStr = typeof rawPartner === 'object' && rawPartner ? (rawPartner._id || rawPartner.id) : rawPartner;
                      const partner = (typeof rawPartner === 'object' && rawPartner?.displayName)
                        ? rawPartner
                        : ((allContacts || []).find(ac => String(ac._id) === String(partnerIdStr)) || rawPartner);

                      const name = c.name || partner?.displayName || (partner?.username ? `@${partner.username}` : 'Chat');
                      const avatar = getMediaUrl(partner?.avatar, name) || DEFAULT_AVATAR;

                      const partnerId = partnerIdStr ? String(partnerIdStr) : null;
                      const isLocked = lockedConversations.includes(String(c._id));
                      const isSelected = activeType === 'conversation' && String(activeId) === String(c._id);

                      return (
                        <button
                          key={c._id}
                          onClick={() => onSelectConversation(c._id, c)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition text-xs group ${
                            isSelected
                              ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/40 shadow'
                              : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <img 
                                src={avatar} 
                                alt="" 
                                className="w-9 h-9 rounded-xl object-cover border border-white/10" 
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = createInitialsAvatar(name); }}
                              />
                              <span className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border border-[#090d18] ${getStatusDotClass(partnerId)}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="truncate font-bold text-white text-xs">{name}</span>
                                {isLocked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                              </div>
                              <p className="text-[10px] text-gray-400 truncate">
                                {partner?.username ? `@${partner.username}` : 'Direct Message'}
                              </p>
                            </div>
                          </div>
                          {c.unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-500 text-white shadow shrink-0">
                              {c.unreadCount}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Widgets */}
      <div className="space-y-3 pt-3 border-t border-[#151c2e] mt-2">
        {/* User Profile Card */}
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
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = createInitialsAvatar(activePersona?.displayName || activePersona?.username); }}
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
