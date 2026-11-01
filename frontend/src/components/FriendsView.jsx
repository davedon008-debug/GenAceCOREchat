'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Search, Share2, ChevronRight, Menu, ArrowLeft, UserPlus, UserMinus, UserX, MessageSquare } from 'lucide-react';

import api, { getMediaUrl, DEFAULT_AVATAR, createInitialsAvatar } from '../lib/api';
import AvatarViewerModal from './AvatarViewerModal';
import InviteFriendsModal from './InviteFriendsModal';
import { useAuth } from '../context/AuthContext';

export default function FriendsView({ allContacts = [], onStartDM, onOpenMobileSidebar, onBack, onRefreshContacts, activePersona: propPersona }) {
  const authCtx = useAuth();
  const activePersona = propPersona || authCtx?.activePersona;
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('suggested'); // 'suggested' | 'contacts' | 'requests'
  const [addedIds, setAddedIds] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('genace_dismissed_suggestions');
        return saved ? JSON.parse(saved) : [];
      }
      return [];
    } catch {
      return [];
    }
  });
  const [loadingActionId, setLoadingActionId] = useState(null);
  const [loadingDMId, setLoadingDMId] = useState(null);
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ isOpen: false, avatarUrl: '', name: '', handle: '', bio: '', customStatus: '', id: null, isContact: false });

  const dismissSuggestion = (idStr) => {
    setDismissedSuggestionIds(prev => {
      const next = Array.from(new Set([...prev, idStr]));
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('genace_dismissed_suggestions', JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  };

  const socketCtx = useSocket();
  const onlineUserIds = socketCtx?.onlineUserIds || [];
  const personaStatuses = socketCtx?.personaStatuses || {};
  const safeOnlineIds = Array.isArray(onlineUserIds) ? onlineUserIds.map(String) : [];

  const [globalUsers, setGlobalUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get(`/personas/search?query=${encodeURIComponent(searchQuery.trim())}`);
        if (res.data?.success) {
          setGlobalUsers(res.data.personas || []);
        }
      } catch (err) {
        console.error('Failed to search personas:', err);
      }
    };
    fetchUsers();
  }, [searchQuery]);

  // Extract saved contact IDs from activePersona.contacts or allContacts where isContact === true
  const mySavedContactIds = Array.isArray(activePersona?.contacts)
    ? activePersona.contacts.map(c => String(c?._id || c?.id || c))
    : [];

  const serverContactIds = new Set([
    ...mySavedContactIds,
    ...(allContacts || [])
      .filter(c => c && (c.isContact === true || mySavedContactIds.includes(String(c._id || c.id))))
      .map(c => String(c._id || c.id))
  ]);

  const isUserContact = (uId) => {
    const idStr = String(uId || '');
    if (!idStr) return false;
    if (removedIds.includes(idStr)) return false;
    if (addedIds.includes(idStr)) return true;
    return serverContactIds.has(idStr);
  };

  const selfId = String(activePersona?._id || activePersona?.id || '');

  // Combine all known personas across allContacts, globalUsers, and activePersona.contacts
  const allKnownUsersMap = new Map();
  (allContacts || []).forEach(u => {
    if (u && (u._id || u.id)) allKnownUsersMap.set(String(u._id || u.id), u);
  });
  (globalUsers || []).forEach(u => {
    if (u && (u._id || u.id)) {
      const id = String(u._id || u.id);
      if (!allKnownUsersMap.has(id)) allKnownUsersMap.set(id, u);
    }
  });
  if (Array.isArray(activePersona?.contacts)) {
    activePersona.contacts.forEach(u => {
      if (u && typeof u === 'object' && (u._id || u.id)) {
        const id = String(u._id || u.id);
        if (!allKnownUsersMap.has(id)) allKnownUsersMap.set(id, u);
      }
    });
  }

  const allKnownUsers = Array.from(allKnownUsersMap.values());

  // 1. Friends/Contacts list: users who are actual contacts
  const friendsList = allKnownUsers
    .filter(c => {
      const cId = String(c._id || c.id || '');
      return cId && cId !== selfId && isUserContact(cId);
    })
    .map(c => {
      const contactId = String(c._id || c.id || '');
      const isOnline = safeOnlineIds.includes(contactId);
      const rawStatus = personaStatuses[contactId] || c.status || 'online';
      const effectiveStatus = isOnline ? (rawStatus === 'offline' ? 'online' : rawStatus) : 'offline';

      const statusLabel = effectiveStatus === 'away' ? 'Away' : effectiveStatus === 'dnd' ? 'Do Not Disturb' : effectiveStatus === 'online' ? 'Online' : 'Offline';
      const statusDotColor = effectiveStatus === 'away' ? 'bg-amber-400' : effectiveStatus === 'dnd' ? 'bg-rose-500' : effectiveStatus === 'online' ? 'bg-emerald-500' : 'bg-gray-500';

      return {
        id: c._id || c.id,
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

  // 2. Global suggested users pool: users who are NOT yet contacts and NOT self
  const pool = allKnownUsers;
  const suggestedList = pool
    .filter(u => {
      const uId = String(u._id || u.id || '');
      if (!uId || uId === selfId) return false;
      // Do not include users who are already friends/contacts
      if (isUserContact(uId)) return false;
      // Filter out dismissed suggestions unless actively searching
      if (!searchQuery.trim() && dismissedSuggestionIds.includes(uId)) return false;
      return true;
    })
    .map(u => {
      const uId = String(u._id || u.id || '');
      const isOnline = safeOnlineIds.includes(uId);

      return {
        id: u._id || u.id,
        name: u.displayName || u.username,
        handle: u.username,
        status: isOnline ? 'Online' : 'Offline',
        statusDotColor: isOnline ? 'bg-emerald-500' : 'bg-gray-500',
        avatar: getMediaUrl(u.avatar, u.displayName || u.username) || DEFAULT_AVATAR,
        online: isOnline,
        bio: u.bio,
        customStatus: u.customStatus,
        isContact: false
      };
    });

  const queryLower = searchQuery.toLowerCase().trim();
  const searchFilter = (list) => {
    if (!queryLower) return list;
    return list.filter(item =>
      (item.name || '').toLowerCase().includes(queryLower) ||
      (item.handle || '').toLowerCase().includes(queryLower)
    );
  };

  const filteredFriends = activeTab === 'contacts'
    ? searchFilter(friendsList)
    : activeTab === 'requests'
    ? []
    : searchFilter(suggestedList);

  // Add friend: makes them a friend, removes from suggestions, and adds to contacts
  const handleAddFriend = async (id, name = 'User') => {
    const idStr = String(id || '');
    if (!idStr) return;
    setLoadingActionId(idStr);

    // 0ms Optimistic UI update: becomes contact immediately
    setAddedIds(prev => [...prev.filter(x => x !== idStr), idStr]);
    setRemovedIds(prev => prev.filter(x => x !== idStr));
    setDismissedSuggestionIds(prev => prev.filter(x => x !== idStr));

    try {
      await api.post(`/personas/contacts/add/${idStr}`);
      if (onRefreshContacts) onRefreshContacts();
    } catch (err) {
      setAddedIds(prev => prev.filter(x => x !== idStr));
      console.error('Failed to add contact:', err);
    } finally {
      setLoadingActionId(null);
    }
  };

  // Remove suggestion from suggested list
  const handleRemoveSuggestion = (id) => {
    const idStr = String(id || '');
    if (!idStr) return;
    dismissSuggestion(idStr);
    if (isUserContact(idStr)) {
      setRemovedIds(prev => [...prev.filter(x => x !== idStr), idStr]);
      setAddedIds(prev => prev.filter(x => x !== idStr));
      api.delete(`/personas/contacts/remove/${idStr}`).catch(() => {});
      if (onRefreshContacts) onRefreshContacts();
    }
  };

  // Remove friend from saved contacts
  const handleRemoveFriend = async (id, name = 'User') => {
    const idStr = String(id || '');
    if (!idStr) return;
    setLoadingActionId(idStr);

    // 0ms Optimistic UI update: removed from contacts immediately
    setRemovedIds(prev => [...prev.filter(x => x !== idStr), idStr]);
    setAddedIds(prev => prev.filter(x => x !== idStr));
    // Also dismiss from suggestions so they are removed from suggestion of friends
    dismissSuggestion(idStr);

    try {
      await api.delete(`/personas/contacts/remove/${idStr}`);
      if (onRefreshContacts) onRefreshContacts();
    } catch (err) {
      setRemovedIds(prev => prev.filter(x => x !== idStr));
      console.error('Failed to remove contact:', err);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleToggleContactFromModal = async (id, name = 'User') => {
    const idStr = String(id || '');
    if (!idStr) return;
    const isContactNow = isUserContact(idStr);
    if (isContactNow) {
      await handleRemoveFriend(idStr, name);
      setAvatarViewerTarget(prev => ({ ...prev, isContact: false }));
    } else {
      await handleAddFriend(idStr, name);
      setAvatarViewerTarget(prev => ({ ...prev, isContact: true }));
    }
  };

  const handleStartChat = async (userId) => {
    if (!userId || !onStartDM) return;
    setLoadingDMId(String(userId));
    try {
      await onStartDM(userId);
    } catch (err) {
      console.error('DM initiation failed:', err);
    } finally {
      setLoadingDMId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b14] p-3 sm:p-6 pb-28 md:pb-6 overflow-y-auto select-none space-y-4 sm:space-y-6">
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
          className={`pb-3 transition relative shrink-0 flex items-center gap-1.5 ${activeTab === 'suggested' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
        >
          <span>Suggested</span>
          {suggestedList.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {suggestedList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`pb-3 transition relative shrink-0 flex items-center gap-1.5 ${activeTab === 'contacts' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
        >
          <span>Contacts</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-gray-300">
            {friendsList.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 transition relative flex items-center gap-1.5 shrink-0 ${activeTab === 'requests' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
        >
          <span>Requests</span>
        </button>
      </div>

      {/* User Card Rows */}
      <div className="space-y-2 max-w-2xl w-full">
        {filteredFriends.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#101625] border border-[#1d273e] text-center">
            <p className="text-xs text-gray-400">
              {activeTab === 'contacts'
                ? 'You have no saved contacts yet. Add friends from the Suggested tab above!'
                : activeTab === 'requests'
                ? 'No pending friend requests.'
                : 'No suggested friends available right now. Search for users above!'}
            </p>
          </div>
        ) : (
          filteredFriends.map((user) => {
            const isContact = isUserContact(user.id);
            const isActing = loadingActionId === String(user.id);
            const isDMing = loadingDMId === String(user.id);

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
                      setAvatarViewerTarget({ 
                        isOpen: true, 
                        avatarUrl: user.avatar, 
                        name: user.name, 
                        handle: user.handle, 
                        bio: user.bio, 
                        customStatus: user.customStatus,
                        id: user.id,
                        isContact
                      });
                    }}
                    title="Click to view profile picture & info"
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
                  {isContact ? (
                    <>
                      <button
                        onClick={() => handleStartChat(user.id)}
                        disabled={isDMing}
                        className="px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-[11px] sm:text-xs shadow-md shadow-indigo-600/25 transition shrink-0 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        {isDMing ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Opening...</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3.5 h-3.5 hidden sm:inline" />
                            <span>Message</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleRemoveFriend(user.id, user.name)}
                        disabled={isActing}
                        className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] sm:text-xs font-semibold transition shrink-0 flex items-center gap-1 active:scale-95 disabled:opacity-50"
                        title="Remove friend"
                      >
                        {isActing ? (
                          <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        ) : (
                          <>
                            <UserMinus className="w-3 h-3 hidden sm:inline text-rose-400" />
                            <span>Remove</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleAddFriend(user.id, user.name)}
                        disabled={isActing}
                        className="px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-[11px] sm:text-xs shadow-md shadow-indigo-600/25 transition shrink-0 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                        title="Add friend"
                      >
                        {isActing ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add Friends</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleRemoveSuggestion(user.id)}
                        className="px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-white/10 hover:border-rose-500/30 bg-white/5 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 text-[11px] sm:text-xs font-semibold transition shrink-0 flex items-center gap-1 active:scale-95"
                        title="Remove from suggestions"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Invite Friends Footer Banner */}
      <div
        onClick={() => setShowInviteModal(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowInviteModal(true); } }}
        className="max-w-2xl w-full p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-indigo-950/60 to-blue-950/60 border border-indigo-500/30 flex items-center justify-between cursor-pointer hover:border-indigo-400/60 hover:from-indigo-900/60 hover:to-blue-900/60 active:scale-[0.99] transition-all group shadow-lg shadow-indigo-950/40"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 group-hover:scale-105 group-hover:bg-indigo-600/50 transition-all shrink-0">
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition truncate">Invite friends</h4>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-indigo-500/20 text-[9px] font-bold text-indigo-300 border border-indigo-500/30">
                Share Link
              </span>
            </div>
            <p className="text-[10px] text-gray-300 truncate">Share the web link to WhatsApp, Instagram, Snapchat & more!</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition shrink-0 ml-2" />
      </div>

      <InviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        activePersona={activePersona}
      />

      <AvatarViewerModal
        isOpen={avatarViewerTarget.isOpen}
        onClose={() => setAvatarViewerTarget(prev => ({ ...prev, isOpen: false }))}
        avatarUrl={avatarViewerTarget.avatarUrl}
        name={avatarViewerTarget.name}
        handle={avatarViewerTarget.handle}
        bio={avatarViewerTarget.bio}
        customStatus={avatarViewerTarget.customStatus}
        targetPersonaId={avatarViewerTarget.id}
        isContact={avatarViewerTarget.isContact}
        onStartDM={handleStartChat}
        onToggleContact={handleToggleContactFromModal}
      />
    </div>
  );
}
