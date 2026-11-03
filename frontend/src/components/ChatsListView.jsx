import { useState, useEffect } from 'react';
import { Search, Plus, MessageSquare, Zap, Edit3, CheckCheck, Users, Lock, UserPlus, Check, Loader2 } from 'lucide-react';
import api, { getMediaUrl, DEFAULT_AVATAR, createInitialsAvatar, SpaceIcon } from '../lib/api';
import { useSocket } from '../context/SocketContext';
import AvatarViewerModal from './AvatarViewerModal';

export default function ChatsListView({
  conversations = [],
  spaces = [],
  allContacts = [],
  lockedConversations = [],
  activePersona,
  onSelectConversation,
  onSelectSpace,
  onStartDM,
  onOpenNewChat,
  onOpenCreateSpace,
  onRefreshContacts
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'dms' | 'spaces'
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ isOpen: false, avatarUrl: '', name: '', handle: '' });
  const [globalPeople, setGlobalPeople] = useState([]);
  const [addedContactIds, setAddedContactIds] = useState([]);
  const [addingContactId, setAddingContactId] = useState(null);

  const socketCtx = useSocket() || {};
  const onlineUserIds = socketCtx.onlineUserIds || [];
  const personaStatuses = socketCtx.personaStatuses || {};
  const safeOnlineIds = Array.isArray(onlineUserIds) ? onlineUserIds.map(String) : [];

  const getStatusDotClass = (personaId) => {
    if (!personaId) return null;
    const idStr = String(personaId);
    const st = personaStatuses[idStr];
    if (st === 'away') return 'bg-amber-400';
    if (st === 'dnd') return 'bg-rose-500';
    if (st === 'online' || safeOnlineIds.includes(idStr)) return 'bg-emerald-500';
    return null;
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const convChatList = (conversations || [])
    .filter(c => !c.spaceId)
    .map(c => {
    const isLocked = lockedConversations.includes(String(c._id));
    const rawPartner = c.participants?.find(p => {
      const idStr = typeof p === 'object' && p ? (p._id || p.id) : p;
      return idStr && String(idStr) !== String(activePersona?._id);
    }) || c.participants?.[0];

    const partnerIdStr = typeof rawPartner === 'object' && rawPartner ? (rawPartner._id || rawPartner.id) : rawPartner;
    const otherParticipant = (typeof rawPartner === 'object' && rawPartner?.displayName)
      ? rawPartner
      : ((allContacts || []).find(ac => String(ac._id) === String(partnerIdStr)) || rawPartner);

    const username = otherParticipant?.username || 'user';
    const name = otherParticipant?.displayName || (otherParticipant?.username ? `@${otherParticipant.username}` : 'User');
    const avatar = getMediaUrl(otherParticipant?.avatar, name) || DEFAULT_AVATAR;

    const lastMsg = typeof c.lastMessage === 'object' ? c.lastMessage : null;
    let rawLastMsgContent = 'No messages yet';
    if (lastMsg) {
      const isMe = String(lastMsg.senderPersonaId?._id || lastMsg.senderPersonaId) === String(activePersona?._id);
      const prefix = isMe ? 'You: ' : '';
      if (lastMsg.privacyMode === 'burn') {
        rawLastMsgContent = `${prefix}🔥 Burn on read message`;
      } else if (lastMsg.contentType === 'voice') {
        rawLastMsgContent = `${prefix}🎙️ Voice note`;
      } else if (lastMsg.contentType === 'image') {
        rawLastMsgContent = `${prefix}📷 Photo`;
      } else if (lastMsg.contentType === 'video') {
        rawLastMsgContent = `${prefix}📹 Video`;
      } else if (lastMsg.contentType === 'file') {
        rawLastMsgContent = `${prefix}📎 Attachment`;
      } else if (lastMsg.content) {
        rawLastMsgContent = `${prefix}${lastMsg.content}`;
      }
    }
    const lastMsgContent = isLocked ? '🔒 Chat is locked' : rawLastMsgContent;

    return {
      _id: c._id,
      convId: c._id,
      name,
      username,
      avatar,
      lastText: lastMsgContent,
      time: formatTimestamp(c.lastMessage?.createdAt || c.updatedAt),
      unread: c.unreadCount || 0,
      privacyMode: c.privacyMode,
      targetPersonaId: otherParticipant?._id || partnerIdStr,
      isLocked,
      isRealConv: true
    };
  });

  const contactOnlyList = (allContacts || [])
    .filter(contact => {
      const contactId = String(contact._id);
      if (contactId === String(activePersona?._id)) return false;
      return !conversations.some(c => (c.participants || []).some(p => {
        const pId = typeof p === 'object' && p ? (p._id || p.id) : p;
        return pId && String(pId) === contactId;
      }));
    })
    .map(contact => ({
      _id: contact._id,
      convId: null,
      name: contact.displayName || `@${contact.username}`,
      username: contact.username,
      avatar: getMediaUrl(contact.avatar, contact.displayName || contact.username) || DEFAULT_AVATAR,
      lastText: contact.bio || `@${contact.username} • Tap to start conversation`,
      time: '',
      unread: 0,
      privacyMode: 'normal',
      targetPersonaId: contact._id,
      isRealConv: false
    }));

  const combinedItems = [...convChatList, ...contactOnlyList];

  useEffect(() => {
    if (!searchQuery.trim()) {
      setGlobalPeople([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/personas/search?query=${encodeURIComponent(searchQuery.trim())}`);
        if (res.data?.success) {
          const knownIds = new Set([
            ...combinedItems.map(i => String(i.targetPersonaId || i._id)),
            String(activePersona?._id)
          ]);
          setGlobalPeople((res.data.personas || []).filter(p => !knownIds.has(String(p._id))));
        }
      } catch (e) {
        setGlobalPeople([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activePersona]);

  const handleAddFriend = async (targetPersonaId) => {
    const idStr = String(targetPersonaId || '');
    if (!idStr) return;
    setAddingContactId(idStr);
    setAddedContactIds(prev => [...prev, idStr]);
    try {
      await api.post(`/personas/contacts/add/${idStr}`);
      if (onRefreshContacts) onRefreshContacts();
    } catch (e) {
      setAddedContactIds(prev => prev.filter(x => x !== idStr));
      console.error('Failed to add contact:', e);
    } finally {
      setAddingContactId(null);
    }
  };

  const filteredDMs = combinedItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.lastText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSpaces = (spaces || []).filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b14] p-3 sm:p-6 overflow-y-auto select-none space-y-4 sm:space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#141b2d] pb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white font-outfit tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400 shrink-0" /> Recent Chats & Conversations
          </h2>
          <p className="text-xs text-gray-400">Select a conversation or space to open the chat stream</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenNewChat}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition"
          >
            <Edit3 className="w-4 h-4" /> <span>New DM</span>
          </button>
        </div>
      </div>

      {/* Search Input & Filter Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search chats, contacts or spaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-[#0f172a] border border-[#1e293b] text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#0f172a] p-1 rounded-2xl border border-[#1e293b] overflow-x-auto no-scrollbar scrollbar-none whitespace-nowrap max-w-full">
          {[
            { id: 'all', label: 'All' },
            { id: 'dms', label: 'Direct Messages' },
            { id: 'spaces', label: `Spaces (${spaces.length})` },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold capitalize transition shrink-0 ${
                activeFilter === chip.id
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Conversations & Spaces */}
      <div className="space-y-6">
        {/* Spaces Section */}
        {(activeFilter === 'all' || activeFilter === 'spaces') && filteredSpaces.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">
              Fluid Community Spaces ({filteredSpaces.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSpaces.map((s) => (
                <div
                  key={s._id}
                  onClick={() => onSelectSpace(s._id)}
                  className="p-4 rounded-3xl bg-[#101625] border border-[#1d273e] hover:border-indigo-500/50 flex items-center justify-between cursor-pointer group transition shadow-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-indigo-500/40 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                      <SpaceIcon icon={s.icon} fallback="⚡" className="w-full h-full object-cover rounded-2xl" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition truncate">{s.title}</h4>
                      <p className="text-[11px] text-gray-400 truncate">{s.members?.length || 0} members connected</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 group-hover:bg-indigo-600 group-hover:text-white transition shrink-0 ml-2">
                    Open Space
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Direct Messages Section */}
        {(activeFilter === 'all' || activeFilter === 'dms') && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">
              Direct Messages & Contacts ({filteredDMs.length})
            </h3>
            {filteredDMs.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#0f172a] border border-[#1e293b] text-center">
                <p className="text-xs text-gray-400">No direct conversations found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredDMs.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => {
                      if (item.isRealConv && item.convId) {
                        onSelectConversation(item.convId);
                      } else if (item.targetPersonaId && onStartDM) {
                        onStartDM(item.targetPersonaId);
                      }
                    }}
                    className="p-4 rounded-3xl bg-[#101625] border border-[#1d273e] hover:border-indigo-500/50 flex items-center justify-between cursor-pointer group transition shadow-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="relative cursor-pointer group/avatar shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAvatarViewerTarget({
                            isOpen: true,
                            avatarUrl: item.avatar,
                            name: item.name,
                            handle: item.username
                          });
                        }}
                        title="Click to view profile picture"
                      >
                        <img 
                          src={item.avatar} 
                          alt="" 
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = createInitialsAvatar(item.name || item.username); }}
                          className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover/avatar:scale-110 transition-transform" 
                        />
                        {item.targetPersonaId && getStatusDotClass(item.targetPersonaId) && (
                          <span className={`w-2.5 h-2.5 rounded-full border-2 border-[#0f172a] absolute bottom-0 right-0 ${getStatusDotClass(item.targetPersonaId)}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition truncate flex items-center gap-1">
                            <span>{item.name}</span>
                            {item.isLocked && <Lock className="w-3 h-3 text-indigo-400 shrink-0" />}
                          </h4>
                          {item.time && <span suppressHydrationWarning className="text-[10px] text-gray-500 font-mono">{item.time}</span>}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate">{item.lastText}</p>
                      </div>
                    </div>
                    {item.unread > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white font-extrabold text-[10px] shadow shrink-0 ml-2">
                        {item.unread}
                      </span>
                    ) : (
                      <span className="text-[10px] px-3 py-1.5 rounded-xl bg-white/5 text-gray-300 font-semibold border border-white/10 group-hover:bg-indigo-600 group-hover:text-white transition shrink-0 ml-2">
                        Chat
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* People around the world section when searching */}
        {searchQuery.trim() && globalPeople.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" /> People Around The World ({globalPeople.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {globalPeople.map((p) => {
                const isContact = addedContactIds.includes(String(p._id));
                const isAdding = addingContactId === String(p._id);

                return (
                  <div
                    key={p._id}
                    onClick={() => onStartDM && onStartDM(p._id)}
                    className="p-4 rounded-3xl bg-[#101625] border border-emerald-500/30 hover:border-emerald-400/60 flex items-center justify-between cursor-pointer group transition shadow-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="relative cursor-pointer group/avatar shrink-0"
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
                      >
                        <img 
                          src={getMediaUrl(p.avatar, p.displayName || p.username)} 
                          alt="" 
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = createInitialsAvatar(p.displayName || p.username); }}
                          className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover/avatar:scale-110 transition-transform" 
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition truncate flex items-center gap-1">
                          <span>{p.displayName || p.username}</span>
                        </h4>
                        <p className="text-[11px] text-gray-400 truncate">@{p.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                      {isContact ? (
                        <span className="text-[10px] px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 text-emerald-400" /> Friend
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddFriend(p._id)}
                          disabled={isAdding}
                          className="text-[10px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition flex items-center gap-1 shadow-md shadow-indigo-600/25 active:scale-95 disabled:opacity-50"
                        >
                          {isAdding ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <UserPlus className="w-3 h-3" />
                          )}
                          <span>Add Friend</span>
                        </button>
                      )}
                      <button
                        onClick={() => onStartDM && onStartDM(p._id)}
                        className="text-[10px] px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold border border-emerald-500/30 transition flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
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
