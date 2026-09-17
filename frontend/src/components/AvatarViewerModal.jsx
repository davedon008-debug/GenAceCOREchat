'use client';

import { useState, useRef } from 'react';
import { X, Download, Camera, Loader2, Check } from 'lucide-react';
import api, { getMediaUrl, DEFAULT_AVATAR } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function AvatarViewerModal({ isOpen, onClose, avatarUrl, name, handle, bio, customStatus, isSelf }) {
  const { activePersona, setActivePersona } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [flashMsg, setFlashMsg] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const cleanHandle = handle ? handle.replace(/^@/, '').toLowerCase() : '';
  const activeHandle = activePersona?.username ? activePersona.username.replace(/^@/, '').toLowerCase() : '';
  const isUserSelf = isSelf || (cleanHandle && activeHandle && cleanHandle === activeHandle);

  const displayAvatar = isUserSelf && activePersona?.avatar ? activePersona.avatar : avatarUrl;
  const resolvedUrl = getMediaUrl(displayAvatar) || DEFAULT_AVATAR;

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activePersona?._id) return;

    setUploading(true);
    try {
      let newAvatarUrl = '';
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/upload', formData);
        if (res.data?.success) {
          newAvatarUrl = res.data.url || res.data.fileUrl;
        }
      } catch (fErr) {
        const base64Str = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const b64Res = await api.post('/upload', { fileData: base64Str, fileName: file.name });
        if (b64Res.data?.success) {
          newAvatarUrl = b64Res.data.url || b64Res.data.fileUrl;
        }
      }

      if (newAvatarUrl) {
        const patchRes = await api.patch(`/personas/${activePersona._id}`, { avatar: newAvatarUrl });
        if (patchRes.data?.success) {
          setActivePersona(patchRes.data.persona);
          setFlashMsg('Profile picture updated!');
          setTimeout(() => setFlashMsg(''), 3000);
        }
      }
    } catch (err) {
      console.error('Failed to upload profile photo:', err);
      alert('Could not upload profile photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-fadeIn select-none overflow-y-auto"
      onClick={onClose}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Top Bar */}
      <div
        className="w-full max-w-2xl flex items-center justify-between text-white py-2.5 px-4 rounded-2xl bg-white/10 border border-white/10 shadow-2xl backdrop-blur-xl z-10 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 pr-4">
          <h3 className="text-sm sm:text-base font-bold text-white font-outfit truncate">
            {isUserSelf ? (activePersona?.displayName || name) : (name || 'Profile Picture')}
          </h3>
          {handle && (
            <p className="text-xs text-cyan-400 font-mono font-medium">@{cleanHandle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {flashMsg && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/30">
              <Check className="w-3.5 h-3.5" /> {flashMsg}
            </span>
          )}

          {isUserSelf && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              <span>{uploading ? 'Uploading...' : 'Change Photo'}</span>
            </button>
          )}

          {resolvedUrl && !resolvedUrl.startsWith('data:') && (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              download="profile-picture.jpg"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition"
              title="Download or open original picture"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-4 h-4" />
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/30 transition shadow-lg active:scale-95"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main High-Res Image & Bio Display Container */}
      <div
        className="flex-1 w-full max-w-lg flex flex-col items-center justify-center p-4 my-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative group max-w-full">
          <img
            src={resolvedUrl}
            alt={name || 'User Profile Picture'}
            className="max-w-full max-h-[50vh] sm:max-h-[60vh] w-auto h-auto rounded-3xl object-contain border-2 border-cyan-500/30 shadow-2xl shadow-cyan-500/20 transition-all duration-300 transform group-hover:scale-[1.02]"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
          />

          {isUserSelf && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs gap-2 backdrop-blur-xs transition"
            >
              <Camera className="w-5 h-5" />
              <span>Click to Change Profile Photo</span>
            </button>
          )}
        </div>

        {/* User Bio Card */}
        <div className="w-full p-4 rounded-2xl bg-[#0d1322] border border-cyan-500/30 text-left space-y-2 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase">
              📜 About / Bio
            </span>
            {customStatus && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                ✨ {customStatus}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-sans whitespace-pre-wrap break-words">
            {bio && bio.trim() ? bio.trim() : 'No bio written yet.'}
          </p>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="text-center pb-2 shrink-0">
        <p className="text-xs text-gray-400 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
          Tap anywhere outside or press <span className="font-bold text-white">✕</span> to close
        </p>
      </div>
    </div>
  );
}
