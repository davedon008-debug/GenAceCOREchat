'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { Search, Globe, Users, Zap, Menu, ArrowLeft, LogIn, Check } from 'lucide-react';
import api, { getMediaUrl } from '../lib/api';
import AvatarViewerModal from './AvatarViewerModal';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10' fill='%231e293b'/%3E%3Cpath d='M18 20a6 6 0 0 0-12 0'/%3E%3Ccircle cx='12' cy='10' r='4'/%3E%3C/svg%3E";

export default function DiscoverView({ allContacts = [], onSelectSpace, onStartDM, onOpenMobileSidebar, onBack }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [publicSpaces, setPublicSpaces] = useState([]);
  const [joiningId, setJoiningId] = useState(null);
  const [joinedIds, setJoinedIds] = useState(new Set());
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ isOpen: false, avatarUrl: '', name: '', handle: '' });

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

  const fetchPublicSpaces = useCallback(async () => {
    try {
      const res = await api.get('/spaces/public');
      if (res.data.success) {
        setPublicSpaces(res.data.spaces);
      }
    } catch (err) {
      console.error('Failed to fetch public spaces:', err);
    }
  }, []);

  useEffect(() => {
    fetchPublicSpaces();
  }, [fetchPublicSpaces]);

  const handleJoin = async (spaceId) => {
    if (joiningId) return;
    setJoiningId(spaceId);
    try {
      const res = await api.post(`/spaces/${spaceId}/join`);
      if (res.data.success) {
        setJoinedIds(prev => new Set([...prev, spaceId]));
        // Navigate into the space
        if (onSelectSpace) onSelectSpace(spaceId);
      }
    } catch (err) {
      console.error('Failed to join space:', err);
    } finally {
      setJoiningId(null);
    }
  };

  const filteredSpaces = publicSpaces.filter(s =>
    s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = allContacts.filter(c =>
    (c.displayName || c.username)?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090c15] p-6 overflow-y-auto select-none space-y-8">
      {/* Header */}
      <div className="border-b border-[#1e293b] pb-5 flex items-center gap-3">
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
        <div>
          <h2 className="text-xl font-black text-white font-outfit tracking-tight flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" /> Discover
          </h2>
          <p className="text-xs text-gray-400">Explore public communities and people</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-lg">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search people or spaces..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-[#0f172a] border border-[#1e293b] text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* Public Spaces */}
      <section className="space-y-4 max-w-2xl">
        <h3 className="text-sm font-bold text-white font-outfit flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-400" /> Public Communities
          {filteredSpaces.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-normal">
              {filteredSpaces.length}
            </span>
          )}
        </h3>
        {filteredSpaces.length === 0 ? (
          <div className="p-6 rounded-3xl bg-[#0f172a] border border-[#1e293b] text-center">
            <Globe className="w-8 h-8 text-indigo-500/40 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No public communities available yet.</p>
            <p className="text-[10px] text-gray-500 mt-1">Be the first to create a public Fluid Space!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredSpaces.map((space) => {
              const isJoined = joinedIds.has(space._id);
              const isJoining = joiningId === space._id;
              return (
                <div
                  key={space._id}
                  className="p-4 rounded-3xl bg-gradient-to-br from-indigo-600/10 to-blue-600/10 bg-[#0f172a] border border-indigo-500/20 hover:border-indigo-400/40 transition group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl shrink-0">{space.icon || '⚡'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-white truncate">{space.title}</p>
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold shrink-0">
                          <Globe className="w-2.5 h-2.5" /> Public
                        </span>
                      </div>
                      {space.description && (
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{space.description}</p>
                      )}
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{space.members?.length || 0} members</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectSpace && onSelectSpace(space._id)}
                      className="flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-[10px] transition text-center"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleJoin(space._id)}
                      disabled={isJoined || isJoining}
                      className={`flex-1 py-1.5 rounded-xl font-bold text-[10px] transition flex items-center justify-center gap-1 ${
                        isJoined
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                      }`}
                    >
                      {isJoining ? (
                        <span className="animate-pulse">Joining...</span>
                      ) : isJoined ? (
                        <><Check className="w-3 h-3" /> Joined</>
                      ) : (
                        <><LogIn className="w-3 h-3" /> Join</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* People to Meet */}
      <section className="space-y-4 max-w-2xl">
        <h3 className="text-sm font-bold text-white font-outfit flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" /> People to Connect With
        </h3>
        {filteredUsers.length === 0 ? (
          <div className="p-6 rounded-3xl bg-[#0f172a] border border-[#1e293b] text-center">
            <p className="text-xs text-gray-400">No active users found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => {
              const uId = String(user._id || user.id || '');
              const isUserOnline = safeOnlineIds.includes(uId);

              return (
                <div
                  key={user._id}
                  onClick={() => onStartDM && onStartDM(user._id)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0f172a] border border-[#1e293b] hover:border-indigo-500/30 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="relative cursor-pointer group/avatar shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAvatarViewerTarget({
                          isOpen: true,
                          avatarUrl: user.avatar,
                          name: user.displayName || user.username,
                          handle: user.username,
                          bio: user.bio,
                          customStatus: user.customStatus
                        });
                      }}
                      title="Click to view profile picture"
                    >
                      <img src={getMediaUrl(user.avatar) || DEFAULT_AVATAR} alt={user.displayName || user.username} className="w-9 h-9 rounded-full object-cover border border-white/10 group-hover/avatar:scale-110 transition-transform" />
                      <span className={`w-2.5 h-2.5 rounded-full absolute bottom-0 right-0 border-2 border-[#0f172a] ${getStatusDotClass(uId)}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white group-hover:text-indigo-300 transition">{user.displayName || `@${user.username}`}</p>
                      <p className="text-[10px] text-gray-400 font-mono">@{user.username}</p>
                    </div>
                  </div>
                  <button className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-[10px] shadow-md transition">
                    Connect
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AvatarViewerModal
        isOpen={avatarViewerTarget.isOpen}
        onClose={() => setAvatarViewerTarget(prev => ({ ...prev, isOpen: false }))}
        avatarUrl={avatarViewerTarget.avatarUrl}
        name={avatarViewerTarget.name}
        handle={avatarViewerTarget.handle}
        bio={avatarViewerTarget.bio}
        customStatus={avatarViewerTarget.customStatus}
      />
    </div>
  );
}
