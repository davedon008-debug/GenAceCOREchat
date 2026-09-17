'use client';

import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { getMediaUrl } from '../lib/api';
import { User, Briefcase, Gamepad2, Ghost, X, Camera, Loader2 } from 'lucide-react';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10' fill='%231e293b'/%3E%3Cpath d='M18 20a6 6 0 0 0-12 0'/%3E%3Ccircle cx='12' cy='10' r='4'/%3E%3C/svg%3E";

export default function PersonaModal({ onClose }) {
  const { createNewPersona } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [type, setType] = useState('personal');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      let newAvatarUrl = '';
      try {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await api.post('/upload', formData);
        if (uploadRes.data?.success) {
          newAvatarUrl = uploadRes.data.url || uploadRes.data.fileUrl;
        }
      } catch (fErr) {
        console.warn('FormData upload failed, trying base64 fallback:', fErr?.message);
        const base64Str = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const b64Res = await api.post('/upload', {
          fileData: base64Str,
          fileName: file.name
        });
        if (b64Res.data?.success) {
          newAvatarUrl = b64Res.data.url || b64Res.data.fileUrl;
        }
      }

      if (newAvatarUrl) {
        setAvatar(newAvatarUrl);
      } else {
        alert('Could not upload profile picture.');
      }
    } catch (err) {
      console.error('Failed to upload persona avatar:', err);
      alert('Could not upload profile picture: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUsernameChange = async (val) => {
    setUsername(val);
    const clean = val.trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
      setUsernameStatus(null);
      return;
    }
    try {
      const res = await api.get(`/personas/check-username?username=${clean}`);
      if (res.data.success) {
        if (res.data.available) {
          setUsernameStatus({ available: true, message: `Handle @${clean} is available!` });
        } else {
          setUsernameStatus({ available: false, message: `Handle @${clean} is already taken by another user!` });
        }
      }
    } catch {
      setUsernameStatus(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !displayName.trim()) {
      setError('Username and Display Name are required');
      return;
    }

    if (usernameStatus && !usernameStatus.available) {
      setError('Please choose a different username handle because this one is already taken.');
      return;
    }

    try {
      const cleanHandle = username.trim().toLowerCase().replace(/^@/, '');
      await createNewPersona({
        username: cleanHandle,
        displayName: displayName.trim() || `@${cleanHandle}`,
        type,
        bio: bio.trim(),
        avatar: avatar || undefined
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create persona');
    }
  };

  const types = [
    { id: 'personal', label: 'Personal', icon: <User className="w-4 h-4 text-cyan-400" />, desc: 'Everyday personal identity' },
    { id: 'business', label: 'Business', icon: <Briefcase className="w-4 h-4 text-amber-400" />, desc: 'Store, company, or store identity' },
    { id: 'gaming', label: 'Gaming', icon: <Gamepad2 className="w-4 h-4 text-purple-400" />, desc: 'Gaming & community alter-ego' },
    { id: 'anonymous', label: 'Anonymous', icon: <Ghost className="w-4 h-4 text-emerald-400" />, desc: 'Zero-identity privacy persona' }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h3 className="text-base font-bold text-white">Create New Persona Identity</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <p className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFileSelect}
          />
          {/* Avatar Upload Trigger */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative group shrink-0 cursor-pointer"
            >
              <img
                src={getMediaUrl(avatar) || DEFAULT_AVATAR}
                alt="Avatar preview"
                className="w-14 h-14 rounded-full object-cover border border-cyan-500/40 shadow-md group-hover:opacity-80 transition"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-white">Profile Photo</p>
              <p className="text-[10px] text-gray-400">Custom avatar image for this persona</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="mt-1 flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:underline"
              >
                {uploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                {uploadingAvatar ? 'Uploading image...' : 'Select Photo'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Username Handle (@)</label>
            <input
              type="text"
              placeholder="e.g. BigDonStore"
              value={username}
              onChange={e => handleUsernameChange(e.target.value)}
              className={`w-full p-3 text-xs rounded-xl bg-white/5 border text-white placeholder-gray-400 focus:outline-none ${
                usernameStatus
                  ? usernameStatus.available
                    ? 'border-emerald-500/50 text-emerald-200'
                    : 'border-rose-500/50 text-rose-200'
                  : 'border-white/10 focus:border-cyan-500'
              }`}
            />
            {usernameStatus && (
              <p className={`text-[11px] mt-1 font-medium ${usernameStatus.available ? 'text-emerald-400' : 'text-rose-400'}`}>
                {usernameStatus.available ? '✓ ' : '⚠️ '}{usernameStatus.message}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Display Name</label>
            <input
              type="text"
              placeholder="e.g. Donald's Tech Hub"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full p-3 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1.5">Persona Identity Type</label>
            <div className="grid grid-cols-2 gap-2">
              {types.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition ${
                    type === t.id
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="mt-0.5">{t.icon}</div>
                  <div>
                    <p className="text-xs font-semibold">{t.label}</p>
                    <p className="text-[10px] text-gray-400">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Bio / Profile Description</label>
            <textarea
              rows={2}
              placeholder="Short bio for this persona..."
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="w-full p-3 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
            >
              Create Persona
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
