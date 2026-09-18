'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Globe, Lock, Check, Menu, ArrowLeft } from 'lucide-react';

export default function SpacesGridView({ spaces = [], onSelectSpace, onOpenCreateSpace, onOpenMobileSidebar, onBack }) {
  const { activePersona } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('popular'); // 'popular' | 'my' | 'joined'
  const [joinedSpaceIds, setJoinedSpaceIds] = useState([]);

  const isMemberOfSpace = (space) => {
    if (!space || !space.members || !activePersona?._id) return false;
    return space.members.some(m => {
      const mId = typeof m.personaId === 'object' && m.personaId ? (m.personaId._id || m.personaId.id) : m.personaId;
      return String(mId) === String(activePersona._id);
    });
  };

  const displaySpaces = spaces.map((s) => ({
    id: s._id,
    realSpace: s,
    title: s.title,
    icon: s.icon || '⚡',
    members: `${s.members?.length || 0} members`,
    isPublic: s.visibility === 'public',
    tags: s.description || 'Fluid space room canvas.',
    gradient: 'from-indigo-600/20 to-blue-600/20 border-indigo-500/30'
  }));

  const filteredSpaces = displaySpaces.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tags.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleJoin = (spaceId) => {
    if (joinedSpaceIds.includes(spaceId)) {
      setJoinedSpaceIds(joinedSpaceIds.filter(id => id !== spaceId));
    } else {
      setJoinedSpaceIds([...joinedSpaceIds, spaceId]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b14] p-3 sm:p-6 overflow-y-auto select-none space-y-4 sm:space-y-6">
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
            <p className="text-[11px] sm:text-xs text-gray-400 truncate">Discover and join active community spaces</p>
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
            placeholder="Search spaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-[#101625] border border-[#1d273e] text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#101625] p-1 rounded-2xl border border-[#1d273e] overflow-x-auto no-scrollbar scrollbar-none whitespace-nowrap max-w-full">
          {['popular', 'my', 'joined'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold capitalize transition shrink-0 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'my' ? 'My Spaces' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Spaces Cards */}
      {filteredSpaces.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#101625] border border-[#1d273e] text-center space-y-3">
          <Globe className="w-10 h-10 text-indigo-400/50 mx-auto" />
          <p className="text-xs text-gray-400">No public spaces found.</p>
          <button
            onClick={onOpenCreateSpace}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create First Space
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSpaces.map((item) => {
            const isJoined = isMemberOfSpace(item.realSpace) || joinedSpaceIds.includes(item.id);

            return (
              <div
                key={item.id}
                onClick={() => item.realSpace && onSelectSpace && onSelectSpace(item.realSpace._id)}
                className={`p-5 rounded-3xl bg-gradient-to-br ${item.gradient} bg-[#101625] border border-[#1d273e] backdrop-blur-md flex flex-col justify-between space-y-4 hover:border-indigo-400/50 cursor-pointer transition group shadow-xl`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#1e293b] flex items-center justify-center text-xl border border-white/10 group-hover:scale-105 transition">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition font-outfit">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[10px] text-gray-400 font-mono">{item.members}</p>
                        {item.isPublic ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                            <Globe className="w-2 h-2" /> Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 font-semibold">
                            <Lock className="w-2 h-2" /> Private
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">
                  {item.tags}
                </p>

                <div className="pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleJoin(item.id);
                      if (item.realSpace && onSelectSpace) onSelectSpace(item.realSpace._id);
                    }}
                    className={`w-full py-2 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      isJoined
                        ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 hover:bg-indigo-600/40'
                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-600/25'
                    }`}
                  >
                    {isJoined ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> <span>Joined</span>
                      </>
                    ) : item.isPublic ? (
                      <span>Join</span>
                    ) : (
                      <span>Request to Join</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
