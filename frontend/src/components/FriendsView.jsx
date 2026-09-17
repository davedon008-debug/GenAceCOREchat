'use client';

import { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Search, Share2, ChevronRight, Menu, ArrowLeft } from 'lucide-react';

import api, { getMediaUrl } from '../lib/api';
import AvatarViewerModal from './AvatarViewerModal';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10' fill='%231e293b'/%3E%3Cpath d='M18 20a6 6 0 0 0-12 0'/%3E%3Ccircle cx='12' cy='10' r='4'/%3E%3C/svg%3E";

export default function FriendsView({ allContacts = [], onStartDM, onOpenMobileSidebar, onBack, onRefreshContacts }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('suggested'); // 'suggested' | 'contacts' | 'requests'
  const [addedHandles, setAddedHandles] = useState([]);
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ isOpen: false, avatarUrl: '', name: '', handle: '' });

  const socketCtx = useSocket();
  const onlineUserIds = socketCtx?.onlineUserIds || [];
  const personaStatuses = socketCtx?.personaStatuses || {};
  const safeOnlineIds = Array.isArray(onlineUserIds) ? onlineUserIds.map(String) : [];

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
      avatar: getMediaUrl(c.avatar) || DEFAULT_AVATAR,
      online: isOnline,
      bio: c.bio,
      customStatus: c.customStatus
    };
  });

  const filteredFriends = friendsList.filter(f =>
    f.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAdd = async (id) => {
    try {
      if (addedHandles.includes(id)) {
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
    <div className="flex-1 flex flex-col h-full bg-[#090c15] p-6 overflow-y-auto select-none space-y-6">
      {/* Header */}
      <div className="border-b border-[#1e293b] pb-4 flex items-center gap-3">
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
          <h2 className="text-xl font-black text-white font-outfit tracking-tight">Find Friends</h2>
          <p className="text-xs text-gray-400">Search and connect with handles across GenAce</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-[#0f172a] border border-[#1e293b] text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-[#1e293b] text-xs font-semibold">
        <button
          onClick={() => setActiveTab('suggested')}
          className={`pb-3 transition relative ${activeTab === 'suggested' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
        >
          Suggested
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`pb-3 transition relative ${activeTab === 'contacts' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
        >
          Contacts ({friendsList.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 transition relative flex items-center gap-1.5 ${activeTab === 'requests' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
        >
          Requests
        </button>
      </div>

      {/* User Card Rows */}
      <div className="space-y-2 max-w-2xl">
        {filteredFriends.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#0f172a] border border-[#1e293b] text-center">
            <p className="text-xs text-gray-400">No contacts or suggested friends found.</p>
          </div>
        ) : (
          filteredFriends.map((user) => {
            const isAdded = addedHandles.includes(user.id);

            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0f172a] border border-[#1e293b] hover:border-indigo-500/30 transition group"
              >
                <div className="flex items-center gap-3">
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
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover/avatar:scale-110 transition-transform"
                    />
                    {user.online && (
                      <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0f172a] absolute bottom-0 right-0" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                      {user.name}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-mono">
                      @{user.handle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onStartDM && user.id) onStartDM(user.id);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition"
                  >
                    Message
                  </button>

                  <button
                    onClick={() => toggleAdd(user.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition"
                    title="Remove from contacts"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Invite Friends Footer Banner */}
      <div className="max-w-2xl p-4 rounded-3xl bg-gradient-to-r from-indigo-950/60 to-blue-950/60 border border-indigo-500/30 flex items-center justify-between cursor-pointer hover:border-indigo-400/60 transition group">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">Invite friends</h4>
            <p className="text-[10px] text-gray-300">Share the app with your friends and grow the community!</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition" />
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
