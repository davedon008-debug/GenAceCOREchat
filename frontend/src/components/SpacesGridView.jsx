'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { SpaceIcon } from '../lib/api';
import {
  Search,
  Plus,
  Globe,
  Lock,
  Check,
  Menu,
  ArrowLeft,
  Loader2,
  Crown,
  Users,
  Flame,
  Sparkles
} from 'lucide-react';

export default function SpacesGridView({
  spaces = [],
  onSelectSpace,
  onOpenCreateSpace,
  onOpenMobileSidebar,
  onBack,
  onRefreshSpaces
}) {
  const { activePersona } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('popular'); // 'popular' | 'my' | 'joined'
  const [publicSpaces, setPublicSpaces] = useState([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(false);
  const [joiningSpaceId, setJoiningSpaceId] = useState(null);
  const [joinedSpaceIds, setJoinedSpaceIds] = useState([]);

  const myPersonaId = String(activePersona?._id || '');

  // Fetch all public spaces from backend
  const fetchPublicSpaces = useCallback(async () => {
    setIsLoadingPublic(true);
    try {
      const res = await api.get('/spaces/public');
      if (res.data?.success && Array.isArray(res.data.spaces)) {
        setPublicSpaces(res.data.spaces);
      }
    } catch (err) {
      console.error('Failed to load public spaces:', err);
    } finally {
      setIsLoadingPublic(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicSpaces();
  }, [fetchPublicSpaces]);

  // Check if current persona is a member of the space
  const isMemberOfSpace = useCallback((space) => {
    if (!space || !myPersonaId) return false;
    const sId = String(space._id);
    if (joinedSpaceIds.includes(sId)) return true;
    if ((spaces || []).some(myS => String(myS._id) === sId)) return true;
    if (Array.isArray(space.members)) {
      return space.members.some(m => {
        const mId = typeof m.personaId === 'object' && m.personaId
          ? String(m.personaId._id || m.personaId.id)
          : String(m.personaId || '');
        return mId === myPersonaId;
      });
    }
    return false;
  }, [myPersonaId, spaces, joinedSpaceIds]);

  // Check if current persona is owner or admin of the space
  const isOwnerOrAdminOfSpace = useCallback((space) => {
    if (!space || !myPersonaId) return false;
    const ownerId = space.ownerPersonaId
      ? String(space.ownerPersonaId._id || space.ownerPersonaId.id || space.ownerPersonaId)
      : '';
    if (ownerId && ownerId === myPersonaId) return true;

    if (Array.isArray(space.members)) {
      const memberEntry = space.members.find(m => {
        const mId = typeof m.personaId === 'object' && m.personaId
          ? String(m.personaId._id || m.personaId.id)
          : String(m.personaId || '');
        return mId === myPersonaId;
      });
      return memberEntry && ['owner', 'admin'].includes(memberEntry.role);
    }
    return false;
  }, [myPersonaId]);

  // Unified deduplicated map of all spaces (public spaces + user's joined/private spaces)
  const allSpaces = useMemo(() => {
    const map = new Map();
    (publicSpaces || []).forEach(s => {
      if (s?._id) map.set(String(s._id), s);
    });
    (spaces || []).forEach(s => {
      if (s?._id) {
        const existing = map.get(String(s._id));
        map.set(String(s._id), { ...existing, ...s });
      }
    });
    return Array.from(map.values());
  }, [publicSpaces, spaces]);

  // 1. Popular Spaces: All discoverable public & active spaces sorted by popularity (member count descending)
  const popularSpaces = useMemo(() => {
    return [...allSpaces].sort((a, b) => {
      const countA = Array.isArray(a.members) ? a.members.length : 0;
      const countB = Array.isArray(b.members) ? b.members.length : 0;
      return countB - countA;
    });
  }, [allSpaces]);

  // 2. My Spaces: Spaces created or managed by the active persona
  const mySpaces = useMemo(() => {
    return allSpaces.filter(s => isOwnerOrAdminOfSpace(s));
  }, [allSpaces, isOwnerOrAdminOfSpace]);

  // 3. Joined Spaces: Spaces where active persona is a member
  const joinedSpaces = useMemo(() => {
    return allSpaces.filter(s => isMemberOfSpace(s));
  }, [allSpaces, isMemberOfSpace]);

  // Current spaces list determined by active tab
  const activeTabSpaces = useMemo(() => {
    if (activeTab === 'my') return mySpaces;
    if (activeTab === 'joined') return joinedSpaces;
    return popularSpaces;
  }, [activeTab, mySpaces, joinedSpaces, popularSpaces]);

  // Filter within active tab by search query
  const filteredSpaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeTabSpaces;
    return activeTabSpaces.filter(s => {
      const title = (s.title || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const icon = (s.icon || '').toLowerCase();
      return title.includes(q) || desc.includes(q) || icon.includes(q);
    });
  }, [activeTabSpaces, searchQuery]);

  // Handle joining a space via backend API
  const handleJoinSpace = async (space, e) => {
    if (e) e.stopPropagation();
    const spaceId = String(space._id);
    const isJoined = isMemberOfSpace(space);

    if (isJoined) {
      if (onSelectSpace) onSelectSpace(space._id);
      return;
    }

    if (joiningSpaceId) return;
    setJoiningSpaceId(spaceId);

    try {
      const res = await api.post(`/spaces/${spaceId}/join`);
      if (res.data?.success) {
        setJoinedSpaceIds(prev => [...prev, spaceId]);
        if (onRefreshSpaces) {
          onRefreshSpaces();
        }
        fetchPublicSpaces();
        if (onSelectSpace) {
          onSelectSpace(space._id);
        }
      } else {
        alert(res.data?.message || 'Could not join space');
      }
    } catch (err) {
      console.error('Failed to join space:', err);
      alert(err.response?.data?.message || 'Failed to join space');
    } finally {
      setJoiningSpaceId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b14] p-3 sm:p-6 pb-28 md:pb-6 overflow-y-auto select-none space-y-4 sm:space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1d273e] pb-5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="hidden sm:inline-flex lg:hidden p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-indigo-400" />
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 shrink-0"
              title="Back to Chats"
            >
              <ArrowLeft className="w-5 h-5 text-indigo-400" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-black text-white font-outfit tracking-tight truncate">Spaces</h2>
            <p className="text-[11px] sm:text-xs text-gray-400 truncate">
              {activeTab === 'popular'
                ? 'Discover and join trending community spaces across the network'
                : activeTab === 'my'
                ? 'Manage spaces created and administered by you'
                : 'Browse and jump into all your joined spaces'}
            </p>
          </div>
        </div>
        <button
          onClick={onOpenCreateSpace}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition shrink-0"
        >
          <Plus className="w-4 h-4" /> <span>Create Space</span>
        </button>
      </div>

      {/* Search Input & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'popular' ? 'popular' : activeTab === 'my' ? 'my' : 'joined'} spaces...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-[#101625] border border-[#1d273e] text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Distinct Tab Buttons: Popular | My Spaces | Joined */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#101625] p-1 rounded-2xl border border-[#1d273e] overflow-x-auto no-scrollbar scrollbar-none whitespace-nowrap max-w-full">
          {[
            { id: 'popular', label: 'Popular', icon: Flame, count: popularSpaces.length },
            { id: 'my', label: 'My Spaces', icon: Crown, count: mySpaces.length },
            { id: 'joined', label: 'Joined', icon: Users, count: joinedSpaces.length }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Spaces Cards */}
      {filteredSpaces.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#101625] border border-[#1d273e] text-center space-y-3">
          {activeTab === 'popular' ? (
            <Flame className="w-10 h-10 text-amber-400/60 mx-auto" />
          ) : activeTab === 'my' ? (
            <Crown className="w-10 h-10 text-indigo-400/60 mx-auto" />
          ) : (
            <Users className="w-10 h-10 text-blue-400/60 mx-auto" />
          )}

          <p className="text-sm font-bold text-white">
            {searchQuery.trim()
              ? `No ${activeTab === 'popular' ? 'popular' : activeTab === 'my' ? 'owned' : 'joined'} spaces found matching "${searchQuery}"`
              : activeTab === 'popular'
              ? 'No public spaces available right now.'
              : activeTab === 'my'
              ? "You haven't created any spaces yet."
              : "You haven't joined any spaces yet."}
          </p>

          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {searchQuery.trim()
              ? 'Try searching with a different term or clear your search query.'
              : activeTab === 'my'
              ? 'Create your first space to build your own community, host channels, and share ideas.'
              : activeTab === 'joined'
              ? 'Explore popular community spaces to connect, chat, and collaborate with others.'
              : 'Be the first to launch a public community space on DONCHAT!'}
          </p>

          <div className="pt-2 flex items-center justify-center gap-2">
            {searchQuery.trim() ? (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition"
              >
                Clear Search
              </button>
            ) : activeTab === 'joined' ? (
              <button
                onClick={() => setActiveTab('popular')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
              >
                <Flame className="w-3.5 h-3.5" /> Explore Popular Spaces
              </button>
            ) : (
              <button
                onClick={onOpenCreateSpace}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
              >
                <Plus className="w-4 h-4" /> Create Space
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSpaces.map((space) => {
            const isJoined = isMemberOfSpace(space);
            const isOwner = isOwnerOrAdminOfSpace(space);
            const memberCount = Array.isArray(space.members) ? space.members.length : 1;
            const isPublic = space.visibility === 'public';
            const isJoiningThis = joiningSpaceId === String(space._id);

            return (
              <div
                key={space._id}
                onClick={() => {
                  if (isJoined && onSelectSpace) {
                    onSelectSpace(space._id);
                  }
                }}
                className={`p-5 rounded-3xl bg-[#101625] border border-[#1d273e] backdrop-blur-md flex flex-col justify-between space-y-4 hover:border-indigo-400/50 transition group shadow-xl ${
                  isJoined ? 'cursor-pointer hover:bg-white/[0.02]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#1e293b] flex items-center justify-center text-xl border border-white/10 group-hover:scale-105 transition overflow-hidden shrink-0">
                      <SpaceIcon icon={space.icon} fallback="⚡" className="w-full h-full object-cover rounded-2xl" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition font-outfit truncate">
                        {space.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-gray-400 font-mono">
                          {memberCount} {memberCount === 1 ? 'member' : 'members'}
                        </span>

                        {isPublic ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                            <Globe className="w-2.5 h-2.5" /> Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 font-semibold">
                            <Lock className="w-2.5 h-2.5" /> Private
                          </span>
                        )}

                        {isOwner && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                            <Crown className="w-2.5 h-2.5" /> Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">
                  {space.description || 'Community space room canvas.'}
                </p>

                <div className="pt-2">
                  {isJoined ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectSpace) onSelectSpace(space._id);
                      }}
                      className="w-full py-2.5 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-1.5 bg-indigo-600/20 text-indigo-200 border border-indigo-500/35 hover:bg-indigo-600/30"
                    >
                      <Check className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Joined • Open Space</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleJoinSpace(space, e)}
                      disabled={isJoiningThis}
                      className="w-full py-2.5 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-600/25 disabled:opacity-50"
                    >
                      {isJoiningThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Joining...</span>
                        </>
                      ) : isPublic ? (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Join Space</span>
                        </>
                      ) : (
                        <span>Request to Join</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
