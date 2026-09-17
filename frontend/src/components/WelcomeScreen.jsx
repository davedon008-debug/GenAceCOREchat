'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, Users, UserPlus, Compass, Zap, Search, Sun, Bell, 
  ChevronRight, Shield, Wifi, Menu, X, Loader2
} from 'lucide-react';
import api, { getMediaUrl } from '../lib/api';
import AvatarViewerModal from './AvatarViewerModal';
import Logo from './Logo';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10' fill='%231e293b'/%3E%3Cpath d='M18 20a6 6 0 0 0-12 0'/%3E%3Ccircle cx='12' cy='10' r='4'/%3E%3C/svg%3E";

export default function WelcomeScreen({
  onOpenNewChat,
  onOpenCreateSpace,
  onOpenNewPersona,
  activePersona,
  onLogout,
  onSelectNav,
  onOpenMobileSidebar,
  conversations = [],
  spaces = [],
  onSelectConversation,
  onSelectSpace,
  onStartDM
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [peopleResults, setPeopleResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ isOpen: false, avatarUrl: '', name: '', handle: '' });
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Filter conversations locally
  const convResults = searchQuery.trim()
    ? conversations.filter(c => {
        const name = c.name || c.participants?.map(p => p.displayName || p.username).join(' ') || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      }).slice(0, 4)
    : [];

  // Filter spaces locally
  const spaceResults = searchQuery.trim()
    ? spaces.filter(s =>
        s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 4)
    : [];

  // Debounced user search via API
  const searchPeople = useCallback(async (q) => {
    if (!q.trim()) { setPeopleResults([]); return; }
    setIsSearching(true);
    try {
      const res = await api.get(`/personas/search?query=${encodeURIComponent(q.trim())}`);
      if (res.data.success) setPeopleResults(res.data.personas?.slice(0, 5) || []);
    } catch {
      setPeopleResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (searchQuery.trim()) {
      debounceRef.current = setTimeout(() => searchPeople(searchQuery), 300);
    } else {
      setPeopleResults([]);
    }
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, searchPeople]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const clearSearch = () => { setSearchQuery(''); setPeopleResults([]); };

  const hasResults = convResults.length > 0 || spaceResults.length > 0 || peopleResults.length > 0;
  const showDropdown = searchFocused && searchQuery.trim().length > 0;

  return (
    <div className="flex-1 h-full bg-[#080b14] flex flex-col justify-between p-4 md:p-6 select-none relative overflow-y-auto">
      {/* 1. TOP HEADER & SEARCH BAR matching reference screenshot */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#141b2d] shrink-0">
        {/* Navigation & Action Controls Row on Mobile / Right side on Desktop */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto sm:order-last shrink-0">
          {/* Mobile Hamburger Menu Toggle Button */}
          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="sm:hidden p-2 rounded-2xl bg-[#101625] border border-[#1a2338] text-gray-300 hover:text-white hover:bg-white/5 transition shrink-0 flex items-center gap-2"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white font-outfit">Menu</span>
            </button>
          )}

          {/* Right Header Action Icons */}
          <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
            <button
              onClick={() => onSelectNav && onSelectNav('settings')}
              className="p-2 rounded-xl bg-[#101625] border border-[#1a2338] text-gray-300 hover:text-white hover:bg-white/5 transition"
              title="Settings & Theme"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectNav && onSelectNav('notifications')}
              className="p-2 rounded-xl bg-[#101625] border border-[#1a2338] text-gray-300 hover:text-white hover:bg-white/5 transition relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-1.5 right-1.5" />
            </button>
          </div>
        </div>

        {/* Search Bar — Live Global Search */}
        <div ref={searchRef} className="relative w-full sm:max-w-xl sm:flex-1">
          {/* Input */}
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 z-10 pointer-events-none" />
          <input
            type="text"
            placeholder="Search chats, users, or spaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            className={`w-full pl-10 pr-8 sm:pr-20 py-2.5 text-xs rounded-2xl bg-[#101625] border text-white placeholder-gray-400 focus:outline-none shadow-inner transition ${
              searchFocused && searchQuery ? 'border-indigo-500/70 rounded-b-none' : 'border-[#1a2338] focus:border-indigo-500/60'
            }`}
          />
          {/* Right side: clear button OR Ctrl+K hint */}
          {searchQuery ? (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-2.5 p-0.5 text-gray-400 hover:text-white transition z-20"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="absolute right-3 top-2.5 px-2 py-0.5 text-[9px] font-mono text-gray-400 bg-white/5 border border-white/10 rounded-md font-semibold hidden sm:inline-block">
              Ctrl + K
            </span>
          )}

          {/* Results Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 z-50 bg-[#0f172a] border border-indigo-500/40 border-t-0 rounded-b-2xl shadow-2xl shadow-indigo-900/30 max-h-80 overflow-y-auto">
              {/* Loading state */}
              {isSearching && !hasResults && (
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Searching...</span>
                </div>
              )}

              {/* No results */}
              {!isSearching && !hasResults && (
                <div className="px-4 py-5 text-center">
                  <p className="text-xs text-gray-400">No results for <span className="text-white font-semibold">"{searchQuery}"</span></p>
                  <p className="text-[10px] text-gray-500 mt-1">Try a different name or username</p>
                </div>
              )}

              {/* Conversations section */}
              {convResults.length > 0 && (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-indigo-400/80 font-mono">💬 Chats</p>
                  {convResults.map(c => {
                    const other = c.participants?.find(p => p._id !== activePersona?._id);
                    return (
                      <button
                        key={c._id}
                        onClick={() => { onSelectConversation && onSelectConversation(c._id); clearSearch(); setSearchFocused(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-500/10 transition text-left"
                      >
                        <img src={getMediaUrl(other?.avatar) || DEFAULT_AVATAR} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">{c.name || other?.displayName || other?.username || 'Chat'}</p>
                          <p className="text-[10px] text-gray-400 truncate">Direct Message</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Spaces section */}
              {spaceResults.length > 0 && (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-purple-400/80 font-mono">⚡ Spaces</p>
                  {spaceResults.map(s => (
                    <button
                      key={s._id}
                      onClick={() => { onSelectSpace && onSelectSpace(s._id); clearSearch(); setSearchFocused(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-500/10 transition text-left"
                    >
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-sm shrink-0">⚡</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{s.title}</p>
                        <p className="text-[10px] text-gray-400 truncate">{s.description || 'Fluid Space'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* People section */}
              {peopleResults.length > 0 && (
                <div className="border-t border-white/5">
                  <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-emerald-400/80 font-mono">
                    👥 People {isSearching && <Loader2 className="inline w-2.5 h-2.5 ml-1 animate-spin" />}
                  </p>
                  {peopleResults.map(p => (
                    <button
                      key={p._id}
                      onClick={() => { onStartDM && onStartDM(p._id); clearSearch(); setSearchFocused(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-500/10 transition text-left"
                    >
                      <img
                        src={getMediaUrl(p.avatar) || DEFAULT_AVATAR}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0 hover:scale-110 transition-transform cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAvatarViewerTarget({
                            isOpen: true,
                            avatarUrl: p.avatar,
                            name: p.displayName || p.username,
                            handle: p.username
                          });
                        }}
                        title="Click to view profile picture"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{p.displayName || p.username}</p>
                        <p className="text-[10px] text-indigo-400 font-mono truncate">@{p.username}</p>
                      </div>
                      <span className="ml-auto text-[9px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold shrink-0">Message</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. CENTER HERO DASHBOARD */}
      <div className="my-auto max-w-3xl w-full mx-auto flex flex-col items-center text-center space-y-8 py-6 relative z-10">
        
        {/* GenAce Hero Logo Badge */}
        <div className="relative group">
          <Logo variant="icon" mode="dark" size={88} className="shadow-2xl shadow-purple-900/40 group-hover:scale-105 transition-transform duration-300" />
        </div>

        {/* Title & Subtitle matching reference screenshot */}
        <div className="space-y-2 max-w-lg">
          <h1 className="text-2xl md:text-3xl font-black text-white font-outfit tracking-tight">
            Welcome to GenAce
          </h1>
          <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-normal">
            Your space to chat, connect, discover and be part of amazing communities.
          </p>
        </div>

        {/* 3. 2x2 FEATURE ACTION GRID matching reference screenshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          {/* Card 1: Start a Chat */}
          <div
            onClick={onOpenNewChat}
            className="p-4 rounded-3xl bg-[#101625] border border-[#1d273e] hover:border-indigo-500/50 flex items-center justify-between cursor-pointer group transition shadow-xl text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">Start a Chat</h3>
                <p className="text-[11px] text-gray-400 truncate">Message your friends, spaces or discover new people.</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
          </div>

          {/* Card 2: Join a Space */}
          <div
            onClick={() => onSelectNav && onSelectNav('spaces')}
            className="p-4 rounded-3xl bg-[#101625] border border-[#1d273e] hover:border-indigo-500/50 flex items-center justify-between cursor-pointer group transition shadow-xl text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white group-hover:text-purple-300 transition">Join a Space</h3>
                <p className="text-[11px] text-gray-400 truncate">Find communities that match your interests.</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
          </div>

          {/* Card 3: Meet Friends */}
          <div
            onClick={() => onSelectNav && onSelectNav('friends')}
            className="p-4 rounded-3xl bg-[#101625] border border-[#1d273e] hover:border-indigo-500/50 flex items-center justify-between cursor-pointer group transition shadow-xl text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white group-hover:text-blue-300 transition">Meet Friends</h3>
                <p className="text-[11px] text-gray-400 truncate">Search by username and build your circle.</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
          </div>

          {/* Card 4: Explore */}
          <div
            onClick={() => onSelectNav && onSelectNav('discover')}
            className="p-4 rounded-3xl bg-[#101625] border border-[#1d273e] hover:border-indigo-500/50 flex items-center justify-between cursor-pointer group transition shadow-xl text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition">Explore</h3>
                <p className="text-[11px] text-gray-400 truncate">Discover trending spaces, creators and more.</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
          </div>
        </div>

        {/* 4. BOTTOM FEATURE PROMO BANNER matching reference screenshot */}
        <div className="w-full max-w-2xl p-4 rounded-3xl bg-[#101625] border border-[#1d273e] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">New to GenAce?</h4>
              <p className="text-[11px] text-gray-400">Explore spaces, make friends and be part of something bigger.</p>
            </div>
          </div>
          <button
            onClick={() => onSelectNav && onSelectNav('discover')}
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition shrink-0 flex items-center gap-1.5"
          >
            <span>Explore Now</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tagline */}
        <div className="text-[11px] text-gray-400 tracking-wider font-medium pt-2">
          Connect &nbsp;•&nbsp; Chat &nbsp;•&nbsp; Grow
        </div>
      </div>

      {/* 5. SUB-FOOTER */}
      <div className="w-full pt-3 pb-1 border-t border-[#141b2d] flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] sm:text-[11px] text-gray-500 shrink-0 select-none">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-gray-400 font-mono whitespace-nowrap">Server connected</span>
          <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
        </div>
        <div className="font-mono text-gray-400 sm:text-gray-500 text-center sm:text-right whitespace-nowrap truncate max-w-full">
          GenAce • NEXT GENERATION. EXCELLENCE.
        </div>
      </div>

      <AvatarViewerModal
        isOpen={avatarViewerTarget.isOpen}
        onClose={() => setAvatarViewerTarget(prev => ({ ...prev, isOpen: false }))}
        avatarUrl={avatarViewerTarget.avatarUrl}
        name={avatarViewerTarget.name}
        handle={avatarViewerTarget.handle}
      />
    </div>
  );
}
