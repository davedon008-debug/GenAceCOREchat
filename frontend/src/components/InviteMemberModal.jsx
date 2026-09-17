import { useState } from 'react';
import api, { getMediaUrl } from '../lib/api';
import { X, Search, UserPlus, Check, Users } from 'lucide-react';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10' fill='%231e293b'/%3E%3Cpath d='M18 20a6 6 0 0 0-12 0'/%3E%3Ccircle cx='12' cy='10' r='4'/%3E%3C/svg%3E";

export default function InviteMemberModal({ space, onClose, onSuccess }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentMemberIds = space?.members?.map(m => m.personaId?._id || m.personaId) || [];

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await api.get(`/personas/search?query=${encodeURIComponent(query.trim())}`);
      if (res.data.success) {
        setSearchResults(res.data.personas || []);
      }
    } catch (err) {
      console.error('Failed to search personas:', err);
    }
  };

  const handleAddMember = (persona) => {
    if (!selectedMembers.some(m => m._id === persona._id)) {
      setSelectedMembers([...selectedMembers, persona]);
    }
  };

  const handleRemoveMember = (personaId) => {
    setSelectedMembers(selectedMembers.filter(m => m._id !== personaId));
  };

  const handleSubmit = async () => {
    if (selectedMembers.length === 0) {
      setErrorMsg('Please select at least one person to invite.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.post(`/spaces/${space._id}/invite`, {
        personaIds: selectedMembers.map(m => m._id)
      });

      if (res.data.success) {
        onSuccess(res.data.space);
        onClose();
      } else {
        setErrorMsg(res.data.message || 'Failed to invite members');
      }
    } catch (err) {
      console.error('Invite members error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to invite members');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Invite Members to <span className="text-purple-400">{space?.title || 'Space'}</span>
              </h3>
              <p className="text-xs text-gray-400">Add team members to this collaborative Fluid Space.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Existing Members Preview */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" /> Current Members ({space?.members?.length || 0})
          </label>
          <div className="flex items-center gap-2 overflow-x-auto p-2 rounded-xl bg-white/5 border border-white/10">
            {space?.members?.map((m) => {
              const persona = m.personaId;
              if (!persona) return null;
              return (
                <div
                  key={persona._id || persona}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 shrink-0"
                >
                  <img
                    src={getMediaUrl(persona.avatar) || DEFAULT_AVATAR}
                    alt={persona.displayName}
                    className="w-5 h-5 rounded-full object-cover"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                  />
                  <span>{persona.displayName || persona.username}</span>
                  <span className="text-[9px] uppercase px-1 rounded bg-white/10 text-gray-400">{m.role}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected People To Invite */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
            People to Invite ({selectedMembers.length})
          </label>

          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white/5 border border-white/10 max-h-24 overflow-y-auto">
              {selectedMembers.map((m) => (
                <span
                  key={m._id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-medium"
                >
                  <img
                    src={getMediaUrl(m.avatar) || DEFAULT_AVATAR}
                    alt={m.displayName}
                    className="w-4 h-4 rounded-full object-cover"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                  />
                  <span>{m.displayName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m._id)}
                    className="hover:text-white transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* User Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user handle (@username only)..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
            />
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="max-h-44 overflow-y-auto space-y-1 bg-slate-950/90 border border-white/10 rounded-xl p-2">
              {searchResults.map((u) => {
                const isAlreadyMember = currentMemberIds.some(id => String(id) === String(u._id));
                const isSelected = selectedMembers.some(m => m._id === u._id);

                return (
                  <div
                    key={u._id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={getMediaUrl(u.avatar) || DEFAULT_AVATAR}
                        alt={u.displayName}
                        className="w-7 h-7 rounded-full object-cover"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                      />
                      <div>
                        <p className="text-xs font-semibold text-white">{u.displayName}</p>
                        <p className="text-[10px] text-gray-400">@{u.username}</p>
                      </div>
                    </div>

                    {isAlreadyMember ? (
                      <span className="text-[10px] px-2 py-1 rounded bg-white/10 text-gray-400 font-medium">
                        Already Member
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isSelected}
                        onClick={() => handleAddMember(u)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                          isSelected
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3 h-3" /> Selected
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" /> Add
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
              {searchResults.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No matching users found.</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedMembers.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition"
          >
            {isSubmitting ? (
              <span>Inviting...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Send Invitations
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
