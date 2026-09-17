import { useState } from 'react';
import { Search, Plus, MessageSquare, Zap, Edit3, CheckCheck, Users, Lock } from 'lucide-react';
import { getMediaUrl } from '../lib/api';
import { useSocket } from '../context/SocketContext';
import AvatarViewerModal from './AvatarViewerModal';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10' fill='%231e293b'/%3E%3Cpath d='M18 20a6 6 0 0 0-12 0'/%3E%3Ccircle cx='12' cy='10' r='4'/%3E%3C/svg%3E";

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
  onOpenCreateSpace
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'dms' | 'spaces'
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ isOpen: false, avatarUrl: '', name: '', handle: '' });

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
    const otherParticipant = c.participants?.find(p => String(p._id) !== String(activePersona?._id)) || c.participants?.[0];
    const username = otherParticipant?.username || 'user';
    const name = otherParticipant?.displayName || `@${username}`;
    const avatar = getMediaUrl(otherParticipant?.avatar) || DEFAULT_AVATAR;
    const rawLastMsgContent = c.lastMessage?.content || (c.lastMessage?.contentType === 'voice' ? '🎙️ Voice note' : c.lastMessage?.contentType === 'image' ? '📷 Photo' : 'No messages yet');
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
      targetPersonaId: otherParticipant?._id,
      isLocked,
      isRealConv: true
    };
  });

  const contactOnlyList = (allContacts || [])
    .filter(contact => String(contact._id) !== String(activePersona?._id) && !conversations.some(c => c.participants?.some(p => String(p._id) === String(contact._id))))
    .map(contact => ({
      _id: contact._id,
      convId: null,
      name: contact.displayName || `@${contact.username}`,
      username: contact.username,
      avatar: getMediaUrl(contact.avatar) || DEFAULT_AVATAR,
      lastText: contact.bio || `@${contact.username} • Tap to start conversation`,
      time: '',
      unread: 0,
      privacyMode: 'normal',
      targetPersonaId: contact._id,
      isRealConv: false
    }));

  const combinedItems = [...convChatList, ...contactOnlyList];

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
    <div className="flex-1 flex flex-col h-full bg-[#080b14] p-6 overflow-y-auto select-none space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#141b2d] pb-5">
        <div>
          <h2 className="text-xl font-black text-white font-outfit tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" /> Recent Chats & Conversations
          </h2>
          <p className="text-xs text-gray-400">Select a conversation or space to open the chat stream</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewChat}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition"
          >
            <Edit3 className="w-4 h-4" /> <span>New DM</span>
          </button>
        </div>
      </div>

      {/* Search Input & Filter Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search chats, contacts or spaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-[#0f172a] border border-[#1e293b] text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 bg-[#0f172a] p-1 rounded-2xl border border-[#1e293b]">
          {[
            { id: 'all', label: 'All' },
            { id: 'dms', label: 'Direct Messages' },
            { id: 'spaces', label: `Spaces (${spaces.length})` },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
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
                  className="p-4 rounded-3xl bg-[#0f172a] border border-[#1e293b] hover:border-indigo-500/50 flex items-center justify-between cursor-pointer group transition shadow-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-indigo-500/40 flex items-center justify-center text-xl shrink-0">
                      {s.icon || '⚡'}
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
                    className="p-4 rounded-3xl bg-[#0f172a] border border-[#1e293b] hover:border-indigo-500/50 flex items-center justify-between cursor-pointer group transition shadow-xl"
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
                        <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover/avatar:scale-110 transition-transform" />
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
                          {item.time && <span className="text-[10px] text-gray-500 font-mono">{item.time}</span>}
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
