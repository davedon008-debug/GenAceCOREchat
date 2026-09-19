'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Search, Share2, ChevronRight, Menu, ArrowLeft } from 'lucide-react';

import api, { getMediaUrl, DEFAULT_AVATAR, createInitialsAvatar } from '../lib/api';
import AvatarViewerModal from './AvatarViewerModal';

export default function FriendsView({ allContacts = [], onStartDM, onOpenMobileSidebar, onBack, onRefreshContacts }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('suggested'); // 'suggested' | 'contacts' | 'requests'
  const [addedHandles, setAddedHandles] = useState([]);
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ isOpen: false, avatarUrl: '', name: '', handle: '' });

  const socketCtx = useSocket();
  const onlineUserIds = socketCtx?.onlineUserIds || [];
  const personaStatuses = socketCtx?.personaStatuses || {};
  const safeOnlineIds = Array.isArray(onlineUserIds) ? onlineUserIds.map(String) : [];

  const [globalUsers, setGlobalUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get(`/personas/search?query=${encodeURIComponent(searchQuery.trim())}`);
        if (res.data.success) {
          setGlobalUsers(res.data.personas || []);
        }
      } catch (err) {
        console.error('Failed to search personas:', err);
      }
    };
    fetchUsers();
  }, [searchQuery]);

  const contactIds = new Set((allContacts || []).map(c => String(c._id || c.id)));

  const friendsList = allContacts.map(c => {
    const contactId = String(c._id || c.id || '');
    const isOnline = safeOnlineIds.includes(contactId);
    const rawStatus = personaStatuses[contactId] || c.status || 'online';
    const effectiveStatus = isOnline ? (rawStatus === 'offline' ? 'online' : rawStatus) : 'offline';

    const statusLabel = effectiveStatus === 'away' ? 'Away' : effectiveStatus === 'dnd' ? 'Do Not Disturb' : effectiveStatus === 'online' ? 'Online' : 'Offline';
    const statusDotColor = effectiveStatus === 'away' ? 'bg-amber-400' : effectiveStatus === 'dnd' ? 'bg-rose-500' : effectiveStatus === 'online' ? 'bg-emerald-500' : 'bg-gray-500';

    return {
      id: c._id,
      name: c.displayName || c.username,
      handle: c.username,
      status: statusLabel,
      statusDotColor,
      avatar: getMediaUrl(c.avatar, c.displayName || c.username) || DEFAULT_AVATAR,
      online: isOnline,
      bio: c.bio,
      customStatus: c.customStatus,
      isContact: true
    };
  });

  const formattedGlobalUsers = globalUsers.map(u => {
    const uId = String(u._id || u.id || '');
    const isOnline = safeOnlineIds.includes(uId);
    const isContact = contactIds.has(uId) || addedHandles.includes(u._id);

    return {
      id: u._id,
      name: u.displayName || u.username,
      handle: u.username,
      status: isOnline ? 'Online' : 'Offline',
      statusDotColor: isOnline ? 'bg-emerald-500' : 'bg-gray-500',
      avatar: getMediaUrl(u.avatar, u.displayName || u.username) || DEFAULT_AVATAR,
      online: isOnline,
      bio: u.bio,
      customStatus: u.customStatus,
      isContact
    };
  });

  const filteredFriends = activeTab === 'contacts'
    ? friendsList.filter(f => (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (f.handle || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : activeTab === 'requests'
    ? formattedGlobalUsers.filter(u => u.isContact)
    : (formattedGlobalUsers.length > 0 ? formattedGlobalUsers : friendsList);

  const toggleAdd = async (id) => {
    try {
      if (addedHandles.includes(id) || contactIds.has(String(id))) {
        await api.delete(`/personas/contacts/remove/${id}`);
        setAddedHandles(addedHandles.filter(h => h !== id));
      } else {
        await api.post(`/personas/contacts/add/${id}`);
        setAddedHandles([...addedHandles, id]);
      }
      if (onRefreshContacts) onRefreshContacts();
    } catch (err) {
      console.error('Failed to toggle contact:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b14] p-3 sm:p-6 overflow-y-auto select-none space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="border-b border-[#1d273e] pb-4 flex items-center gap-3">
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
          <h2 className="text-lg sm:text-xl font-black text-white font-outfit tracking-tight truncate">Find Friends</h2>
          <p className="text-[11px] sm:text-xs text-gray-400 truncate">Search and connect with handles across GenAce</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md w-full">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-[#101625] border border-[#1d273e] text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 sm:gap-6 border-b border-[#1d273e] text-xs font-semibold overflow-x-auto no-scrollbar scrollbar-none whitespace-nowrap">
        <button
          onClick={() => setActiveTab('suggested')}
          className={`pb-3 transition relative shrink-0 ${activeTab === 'suggested' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
        >
          Suggested
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`pb-3 transition relative shrink-0 ${activeTab === 'contacts' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
        >
          Contacts ({friendsList.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 transition relative flex items-center gap-1.5 shrink-0 ${activeTab === 'requests' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
        >
          Requests
        </button>
      </div>

      {/* User Card Rows */}
      <div className="space-y-2 max-w-2xl w-full">
        {filteredFriends.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#101625] border border-[#1d273e] text-center">
            <p className="text-xs text-gray-400">No contacts or suggested friends found.</p>
          </div>
        ) : (
          filteredFriends.map((user) => {
            const isAdded = addedHandles.includes(user.id);

            return (
              <div
                key={user.id}
                className="flex items-center justify-between gap-2.5 sm:gap-4 p-3 sm:p-3.5 rounded-2xl bg-[#101625] border border-[#1d273e] hover:border-indigo-500/30 transition group min-w-0 w-full"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 overflow-hidden">
                  <div
                    className="relative cursor-pointer group/avatar shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAvatarViewerTarget({ isOpen: true, avatarUrl: user.avatar, name: user.name, handle: user.handle, bio: user.bio, customStatus: user.customStatus });
                    }}
                    title="Click to view profile picture"
                  >
                    <img
                      src={user.avatar}
                      alt=""
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = createInitialsAvatar(user.name || user.handle); }}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-white/10 group-hover/avatar:scale-110 transition-transform"
                    />
                    {user.online && (
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border-2 border-[#0f172a] absolute bottom-0 right-0" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden pr-2 sm:pr-3">
                    <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition truncate">
                      {user.name}
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 font-mono truncate">
                      {user.handle ? (user.handle.startsWith('@') ? user.handle : `@${user.handle}`) : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (onStartDM && user.id) onStartDM(user.id);
                    }}
                    className="px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-[11px] sm:text-xs shadow-md shadow-indigo-600/25 transition shrink-0"
                  >
                    Message
                  </button>

                  <button
                    onClick={() => toggleAdd(user.id)}
                    className={`px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-semibold transition shrink-0 ${
                      user.isContact
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                    title={user.isContact ? 'Remove from contacts' : 'Add to contacts'}
                  >
                    {user.isContact ? 'Remove' : '+ Add Friend'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Invite Friends Footer Banner */}
      <div className="max-w-2xl w-full p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-indigo-950/60 to-blue-950/60 border border-indigo-500/30 flex items-center justify-between cursor-pointer hover:border-indigo-400/60 transition group">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition truncate">Invite friends</h4>
            <p className="text-[10px] text-gray-300 truncate">Share the app with your friends and grow the community!</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition shrink-0 ml-2" />
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
    </div>
  );
}
