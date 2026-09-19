import { useState } from 'react';
import { Search, ChevronRight, Plus, UserPlus, Upload, Zap, MoreHorizontal, Users, X, UserMinus, ShieldCheck } from 'lucide-react';
import api, { getMediaUrl, DEFAULT_AVATAR, createInitialsAvatar } from '../lib/api';
import { useSocket } from '../context/SocketContext';
import AvatarViewerModal from './AvatarViewerModal';

export default function RightMembersPanel({ 
  allContacts = [], 
  onlineUserIds = [],
  activePersona,
  activeSpace,
  onStartDM,
  onOpenCreateSpace,
  onOpenNewChat,
  onOpenInviteModal,
  onRemoveSpaceMember,
  isOpen = false,
  onClose
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarViewerTarget, setAvatarViewerTarget] = useState({ isOpen: false, avatarUrl: '', name: '', handle: '' });

  const currentPersonaId = activePersona?._id ? String(activePersona._id) : null;
  const currentUserId = activePersona?.userId ? String(activePersona.userId._id || activePersona.userId) : null;

  const spaceOwnerPersonaId = activeSpace?.ownerPersonaId?._id 
    ? String(activeSpace.ownerPersonaId._id) 
    : (activeSpace?.ownerPersonaId ? String(activeSpace.ownerPersonaId) : null);
  const spaceOwnerUserId = activeSpace?.ownerPersonaId?.userId 
    ? String(activeSpace.ownerPersonaId.userId._id || activeSpace.ownerPersonaId.userId) 
    : null;

  const isSpaceOwner = !!(
    (currentPersonaId && spaceOwnerPersonaId && currentPersonaId === spaceOwnerPersonaId) ||
    (currentUserId && spaceOwnerUserId && currentUserId === spaceOwnerUserId)
  );

  const myMember = activeSpace?.members?.find(m => {
    const mPId = String(m.personaId?._id || m.personaId || '');
    const mUId = m.personaId?.userId ? String(m.personaId.userId._id || m.personaId.userId) : null;
    return (currentPersonaId && mPId === currentPersonaId) || (currentUserId && mUId && mUId === currentUserId);
  });

  const isSpaceAdmin = isSpaceOwner || (myMember && ['owner', 'admin'].includes(myMember.role)) || (activePersona?.role === 'admin');

  const socketCtx = useSocket() || {};
  const personaStatuses = socketCtx.personaStatuses || {};
  const safeOnlineIds = Array.isArray(onlineUserIds) ? onlineUserIds.map(String) : [];

  const formattedMembers = (allContacts || [])
    .filter(c => c && typeof c === 'object')
    .map((c) => {
      const contactId = String(c._id || c.id || '');
      const selfId = activePersona?._id ? String(activePersona._id) : null;
      const isSelf = !!(selfId && contactId && selfId === contactId);
      const isAdminAccount = (c.userId?.role === 'admin' || c.role === 'admin');

      const rawStatus = isSelf ? (activePersona?.status || 'online') : (personaStatuses[contactId] || c.status || 'online');
      const isOnline = isSelf ? (activePersona?.status !== 'offline') : safeOnlineIds.includes(contactId);

      const statusDotColor = rawStatus === 'away' ? 'bg-amber-400' : rawStatus === 'dnd' ? 'bg-rose-500' : isOnline ? 'bg-emerald-500' : 'bg-gray-500';
      const statusText = rawStatus === 'away' ? 'Away' : rawStatus === 'dnd' ? 'DND' : isOnline ? 'Online' : 'Offline';

      let roleLabel = isSelf ? `You (${statusText})` : (c.type || 'Member');
      if (isAdminAccount) {
        roleLabel = '⚡ System Admin';
      }

      return {
        _id: c._id || c.id,
        name: c.displayName || (c.username ? `@${c.username}` : 'Member'),
        handle: c.username || 'user',
        role: roleLabel,
        avatar: getMediaUrl(c.avatar, c.displayName || c.username) || DEFAULT_AVATAR,
        online: isOnline,
        statusDotColor,
        statusText,
        isAdmin: isAdminAccount
      };
    });

  // Sort online members first
  const onlineMembers = formattedMembers.filter(m => m.online);
  const offlineMembers = formattedMembers.filter(m => !m.online);

  const filteredOnline = onlineMembers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOffline = offlineMembers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* ── MOBILE BACKDROP (below xl, only when open) ── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 xl:hidden"
          onClick={onClose}
        />
      )}

      {/* ── PANEL ITSELF ── */}
      <aside className={`
        bg-[#090d18] border-l border-[#151c2e] flex flex-col h-full shrink-0 select-none
        xl:relative xl:translate-x-0 xl:w-72 xl:flex xl:z-auto
        fixed inset-y-0 right-0 w-80 z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'}
      `}>
      {/* ── PANEL HEADER (Title & Close Button matching Mobile) ── */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-[#151c2e] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Users className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-extrabold text-white font-outfit tracking-tight">Members Directory</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition"
            title="Close Members Directory"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* ── STICKY TOP STATUS WIDGET — never scrolls away ── */}
      <div className="shrink-0 p-4 pb-0">
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#1a2540] via-[#1b1e3d] to-[#1c1836] border border-indigo-500/30 relative overflow-hidden shadow-2xl shadow-indigo-900/30 ring-1 ring-inset ring-white/5">
          {/* Subtle glow blob */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {/* Double-ring pulsing dot for clarity */}
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 ring-2 ring-emerald-400/30" />
                </span>
                <span className="text-sm font-extrabold text-white font-outfit tracking-tight">You're online!</span>
              </div>
              <p className="text-xs text-indigo-200/80 font-medium pl-0.5">Good vibes only! 🌙</p>
            </div>
            {/* Planet Graphic Accent */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-500 to-blue-400 flex items-center justify-center text-xl shadow-lg shadow-purple-500/30 shrink-0 ring-2 ring-white/10">
              🪐
            </div>
          </div>
        </div>
      </div>


      {/* ── SCROLLABLE BODY ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 space-y-5">

      {/* SPACE MEMBERS MODE (When viewing a Fluid Space) */}
      {activeSpace ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-extrabold text-white font-outfit uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-400" /> Space Members <span className="text-indigo-400 font-mono">({activeSpace.members?.length || 0})</span>
              </h3>
              <p className="text-[10px] text-gray-400 truncate max-w-[180px]">{activeSpace.title}</p>
            </div>
            {isSpaceAdmin && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shrink-0">
                👑 ADMIN
              </span>
            )}
          </div>

          {/* Admin Invite Button */}
          {isSpaceAdmin && onOpenInviteModal && (
            <button
              onClick={onOpenInviteModal}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add / Invite People</span>
            </button>
          )}

          {/* Search Space Members */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search space members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#12192c] border border-[#222f48] text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Space Roster List */}
          <div className="space-y-1.5">
            {(activeSpace.members || [])
              .filter(m => m && m.personaId)
              .map(m => {
                const p = (m.personaId && typeof m.personaId === 'object') ? m.personaId : {};
                const pId = String(p._id || p.id || m.personaId || '');
                if (!pId || pId === 'null' || pId === 'undefined') return null;

                const isMemberOwner = pId === spaceOwnerPersonaId || (p.userId && spaceOwnerUserId && String(p.userId._id || p.userId) === spaceOwnerUserId);
                const isMe = pId === currentPersonaId || (p.userId && currentUserId && String(p.userId._id || p.userId) === currentUserId);
                const isOnline = isMe ? (activePersona?.status !== 'offline') : safeOnlineIds.includes(pId);
                const rawStatus = isMe ? (activePersona?.status || 'online') : (personaStatuses[pId] || p.status || 'online');
                const statusDotColor = rawStatus === 'away' ? 'bg-amber-400' : rawStatus === 'dnd' ? 'bg-rose-500' : isOnline ? 'bg-emerald-500' : 'bg-gray-500';

                return {
                  _id: pId,
                  name: p.displayName || (p.username ? `@${p.username}` : 'Member'),
                  handle: p.username || 'user',
                  role: isMemberOwner ? '👑 OWNER / ADMIN' : (m.role || 'member').toUpperCase(),
                  avatar: getMediaUrl(p.avatar, p.displayName || p.username) || DEFAULT_AVATAR,
                  online: isOnline,
                  statusDotColor,
                  isOwner: isMemberOwner,
                  isMe,
                  canRemove: isSpaceAdmin && !isMe && !isMemberOwner
                };
              })
              .filter(Boolean)
              .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.handle.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(member => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-[#101524] border border-[#1d273e] hover:border-indigo-500/30 transition group"
                >
                  <div
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    onClick={() => member._id && onStartDM && onStartDM(member._id)}
                  >
                    <div
                      className="relative shrink-0 cursor-pointer group/avatar"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAvatarViewerTarget({ isOpen: true, avatarUrl: member.avatar, name: member.name, handle: member.handle });
                      }}
                      title="Click to view profile picture"
                    >
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-8 h-8 rounded-full object-cover border border-white/10 group-hover/avatar:scale-110 transition-transform"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = createInitialsAvatar(member.name); }}
                      />
                      <span className={`w-2.5 h-2.5 rounded-full border-2 border-[#090d18] absolute bottom-0 right-0 ${member.statusDotColor}`} />
                    </div>
                    <div className="min-w-0 truncate pr-1">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition">
                        {member.name}
                      </p>
                      <p className={`text-[10px] font-mono font-bold truncate ${member.isOwner ? 'text-amber-400' : 'text-gray-400'}`}>
                        {member.role}
                      </p>
                    </div>
                  </div>

                  {member.canRemove ? (
                    <button
                      onClick={() => {
                        if (confirm(`Remove @${member.handle} from ${activeSpace.title}?`)) {
                          onRemoveSpaceMember && onRemoveSpaceMember(member._id);
                        }
                      }}
                      className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition shrink-0 flex items-center gap-1"
                      title={`Kick @${member.handle} from Space`}
                    >
                      <UserMinus className="w-3 h-3 text-rose-400" />
                      <span>Remove</span>
                    </button>
                  ) : (
                    <MoreHorizontal className="w-4 h-4 text-gray-500 group-hover:text-white shrink-0 ml-1" />
                  )}
                </div>
              ))}
          </div>
        </div>
      ) : (
        /* 2. GENERAL CONTACTS MODE (When no space is active) */
        <div className="space-y-3">
        {formattedMembers.length === 0 ? (
          <div className="p-4 rounded-3xl bg-[#101524] border border-[#1d273e] text-center space-y-2.5 my-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto text-lg">
              👤
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white font-outfit">No Contacts Added Yet</h4>
              <p className="text-[11px] text-gray-400 leading-snug">
                You haven't added any contacts to your list yet. Search handles or add friends to see them online or offline!
              </p>
            </div>
            <button
              onClick={onOpenNewChat}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Friend / Search Handle</span>
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white font-outfit uppercase tracking-wider">
                Online Now <span className="text-indigo-400 font-mono">({onlineMembers.length})</span>
              </h3>
              {onlineMembers.length > 0 && (
                <button className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                  <span>View All</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Search Members */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#12192c] border border-[#222f48] text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Online Members List */}
            <div className="space-y-1">
              {filteredOnline.length === 0 ? (
                <div className="p-3 rounded-2xl bg-[#101524] border border-[#1d273e] text-center">
                  <p className="text-xs text-gray-400">No contacts online right now.</p>
                </div>
              ) : (
                filteredOnline.map((member) => (
                  <div
                    key={member._id}
                    onClick={() => member._id && onStartDM && onStartDM(member._id)}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#101524] hover:bg-[#182033] cursor-pointer transition group border border-transparent hover:border-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="relative shrink-0 cursor-pointer group/avatar"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAvatarViewerTarget({ isOpen: true, avatarUrl: member.avatar, name: member.name, handle: member.handle });
                        }}
                        title="Click to view profile picture"
                      >
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-8 h-8 rounded-full object-cover border border-white/10 group-hover/avatar:scale-110 transition-transform"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = createInitialsAvatar(member.name); }}
                        />
                        <span className={`w-2.5 h-2.5 rounded-full border-2 border-[#090d18] absolute bottom-0 right-0 ${member.statusDotColor}`} />
                      </div>
                      <div className="min-w-0 truncate">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition">
                          {member.name}
                        </p>
                        <p className="text-[10px] text-emerald-400 truncate font-mono font-semibold">
                          ● {member.role}
                        </p>
                      </div>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-gray-500 group-hover:text-white shrink-0 ml-1" />
                  </div>
                ))
              )}
            </div>

            {/* Contacts Section */}
            <div className="pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                  Offline Contacts ({filteredOffline.length})
                </h4>
              </div>

              {filteredOffline.length === 0 ? (
                <div className="p-3 rounded-2xl bg-[#0c101c] border border-[#141b2e] text-center">
                  <p className="text-[11px] text-gray-500 font-medium">
                    All your contacts are currently online!
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredOffline.map((member) => (
                    <div
                      key={member._id}
                      onClick={() => member._id && onStartDM && onStartDM(member._id)}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0c101c] hover:bg-[#141b2e] cursor-pointer transition group border border-transparent hover:border-white/5 opacity-75 hover:opacity-100"
                      title="Click to start a chat"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="relative shrink-0 cursor-pointer group/avatar"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAvatarViewerTarget({ isOpen: true, avatarUrl: member.avatar, name: member.name, handle: member.handle });
                          }}
                          title="Click to view profile picture"
                        >
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-8 h-8 rounded-full object-cover border border-white/10 grayscale group-hover:grayscale-0 group-hover/avatar:scale-110 transition"
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = createInitialsAvatar(member.name); }}
                          />
                          <span className="w-2.5 h-2.5 rounded-full bg-gray-500 border-2 border-[#090d18] absolute bottom-0 right-0" />
                        </div>
                        <div className="min-w-0 truncate">
                          <p className="text-xs font-semibold text-gray-300 truncate group-hover:text-white transition">
                            {member.name}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate font-mono">
                            Offline • Click to DM
                          </p>
                        </div>
                      </div>
                      <MoreHorizontal className="w-4 h-4 text-gray-600 group-hover:text-gray-400 shrink-0 ml-1" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        </div>
      )}

      {/* 3. QUICK ACTIONS SECTION matching reference screenshot */}
      <div className="space-y-2 pt-3 border-t border-[#151c2e]">
        <h3 className="text-xs font-bold text-white font-outfit uppercase tracking-wider mb-2">
          Quick Actions
        </h3>

        {/* Action 1: Create Space */}
        <button
          onClick={onOpenCreateSpace}
          className="w-full p-3 rounded-2xl bg-[#101524] border border-[#1d273e] hover:border-indigo-500/50 hover:bg-[#161d30] flex items-center justify-between text-left transition group shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-purple-300 transition">Create Space</p>
              <p className="text-[10px] text-gray-400">Start your own community</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition shrink-0" />
        </button>

        {/* Action 2: Add Friend */}
        <button
          onClick={onOpenNewChat}
          className="w-full p-3 rounded-2xl bg-[#101524] border border-[#1d273e] hover:border-indigo-500/50 hover:bg-[#161d30] flex items-center justify-between text-left transition group shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-blue-300 transition">Add Friend</p>
              <p className="text-[10px] text-gray-400">Search by username</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition shrink-0" />
        </button>

        {/* Action 3: Upload File */}
        <button
          onClick={onOpenNewChat}
          className="w-full p-3 rounded-2xl bg-[#101524] border border-[#1d273e] hover:border-indigo-500/50 hover:bg-[#161d30] flex items-center justify-between text-left transition group shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition">Upload File</p>
              <p className="text-[10px] text-gray-400">Images, videos, documents</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition shrink-0" />
        </button>
      </div>

      </div>{/* end scrollable body */}
    </aside>

    <AvatarViewerModal
      isOpen={avatarViewerTarget.isOpen}
      onClose={() => setAvatarViewerTarget(prev => ({ ...prev, isOpen: false }))}
      avatarUrl={avatarViewerTarget.avatarUrl}
      name={avatarViewerTarget.name}
      handle={avatarViewerTarget.handle}
    />
    </>
  );
}
