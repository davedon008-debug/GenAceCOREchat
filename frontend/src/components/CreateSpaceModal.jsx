'use client';

import { useState } from 'react';
import api, { getMediaUrl, SpaceIcon, isImageIcon } from '../lib/api';
import { X, Search, Plus, Zap, Check, Users, Sparkles, Globe, Lock, Upload, Link, Smile, Loader2, Image as ImageIcon } from 'lucide-react';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10' fill='%231e293b'/%3E%3Cpath d='M18 20a6 6 0 0 0-12 0'/%3E%3Ccircle cx='12' cy='10' r='4'/%3E%3C/svg%3E";
const ICON_OPTIONS = ['⚡', '🚀', '💬', '💼', '🎮', '🎨', '💡', '🛡️', '🌐', '🔒', '👑', '🔥', '💎', '❤️', '🔮', '🛸'];

export default function CreateSpaceModal({ onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('⚡');
  const [iconType, setIconType] = useState('preset'); // 'preset' | 'upload' | 'url'
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [visibility, setVisibility] = useState('private');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success && res.data.url) {
        setIcon(res.data.url);
        setImageUrl(res.data.url);
      } else {
        setErrorMsg('Failed to upload image icon');
      }
    } catch (err) {
      console.error('Space icon upload error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to upload image file');
    } finally {
      setIsUploading(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a title for your Fluid Space.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.post('/spaces', {
        title: title.trim(),
        description: description.trim(),
        icon: icon || '⚡',
        visibility,
        invitedPersonaIds: selectedMembers.map(m => m._id)
      });

      if (res.data.success) {
        onSuccess(res.data.space);
        onClose();
      } else {
        setErrorMsg(res.data.message || 'Failed to create Fluid Space');
      }
    } catch (err) {
      console.error('Create space error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to create Fluid Space');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[#101625] border border-[#1d273e] rounded-3xl p-6 w-full max-w-lg space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/20 overflow-hidden">
              <SpaceIcon icon={icon} fallback="⚡" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Create Fluid Space
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-normal">
                  Group Canvas
                </span>
              </h3>
              <p className="text-xs text-gray-400">Set up your collaborative workspace and invite team members.</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Space Icon Selection with Image Upload Support */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Space Icon / Image Avatar
              </label>
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-[10px]">
                <button
                  type="button"
                  onClick={() => setIconType('preset')}
                  className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition ${
                    iconType === 'preset' ? 'bg-cyan-500 text-white font-bold shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Smile className="w-3 h-3" /> Emoji
                </button>
                <button
                  type="button"
                  onClick={() => setIconType('upload')}
                  className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition ${
                    iconType === 'upload' ? 'bg-cyan-500 text-white font-bold shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3 h-3" /> Upload Image
                </button>
                <button
                  type="button"
                  onClick={() => setIconType('url')}
                  className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition ${
                    iconType === 'url' ? 'bg-cyan-500 text-white font-bold shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Link className="w-3 h-3" /> Image URL
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Live Preview Box */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-xl shrink-0 overflow-hidden shadow-lg shadow-cyan-500/10">
                <SpaceIcon icon={icon} fallback="⚡" className="w-full h-full object-cover rounded-2xl" />
              </div>

              <div className="flex-1 min-w-0">
                {iconType === 'preset' && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {ICON_OPTIONS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setIcon(ic)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition border shrink-0 ${
                          icon === ic
                            ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/20 scale-105'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                )}

                {iconType === 'upload' && (
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold transition">
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Uploading image...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4" /> Select Image File
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {iconType === 'url' && (
                  <input
                    type="url"
                    placeholder="Paste image URL (https://...)"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setIcon(e.target.value || '⚡');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60"
                  />
                )}
              </div>
            </div>
          </div>


          {/* Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Space Name <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Design Sync, Marketing Campaign, Dev Team"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Description (Optional)</label>
              <input
                type="text"
                placeholder="What is this space for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>

          {/* ── Visibility Toggle ── */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Space Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Public option */}
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`relative flex flex-col items-start gap-1.5 p-3.5 rounded-xl border transition-all text-left ${
                  visibility === 'public'
                    ? 'bg-indigo-500/15 border-indigo-400 shadow-md shadow-indigo-500/10'
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
                }`}
              >
                {visibility === 'public' && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  visibility === 'public' ? 'bg-indigo-500/20' : 'bg-white/10'
                }`}>
                  <Globe className={`w-4 h-4 ${visibility === 'public' ? 'text-indigo-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className={`text-xs font-bold ${visibility === 'public' ? 'text-indigo-300' : 'text-white'}`}>Public</p>
                  <p className="text-[10px] text-gray-400 leading-snug mt-0.5">
                    Anyone on the app can discover &amp; join this space
                  </p>
                </div>
              </button>

              {/* Private option */}
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`relative flex flex-col items-start gap-1.5 p-3.5 rounded-xl border transition-all text-left ${
                  visibility === 'private'
                    ? 'bg-cyan-500/15 border-cyan-400 shadow-md shadow-cyan-500/10'
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
                }`}
              >
                {visibility === 'private' && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  visibility === 'private' ? 'bg-cyan-500/20' : 'bg-white/10'
                }`}>
                  <Lock className={`w-4 h-4 ${visibility === 'private' ? 'text-cyan-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className={`text-xs font-bold ${visibility === 'private' ? 'text-cyan-300' : 'text-white'}`}>Private</p>
                  <p className="text-[10px] text-gray-400 leading-snug mt-0.5">
                    Only people you invite can see &amp; access this space
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Invite Members Section */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" /> Invite People ({selectedMembers.length})
              </label>
            </div>

            {/* Selected Members Pills */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white/5 border border-white/10 max-h-24 overflow-y-auto">
                {selectedMembers.map((m) => (
                  <span
                    key={m._id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-medium"
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
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            {/* Search Results Dropdown */}
            {searchQuery && (
              <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-950/90 border border-white/10 rounded-xl p-2">
                {searchResults.map((u) => {
                  const isAdded = selectedMembers.some(m => m._id === u._id);
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

                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleAddMember(u)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                          isAdded
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3 h-3" /> Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" /> Add
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
                {searchResults.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No matching users found.</p>
                )}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition"
            >
              {isSubmitting ? (
                <span>Creating...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Create &amp; Launch Space
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
