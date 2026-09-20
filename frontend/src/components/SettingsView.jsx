'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api, { getMediaUrl, DEFAULT_AVATAR } from '../lib/api';
import { getNotifPrefs, saveNotifPrefs, playNotificationSound } from '../lib/sound';
import { enableWebPushNotifications, disableWebPushNotifications, getWebPushStatus } from '../lib/pushSubscription';
import PasscodeModal from './PasscodeModal';
import {
  User, Palette, Bell, Shield, UserX, HelpCircle, Camera, Edit2,
  Check, LogOut, Moon, Sun, Monitor, Lock, Eye, EyeOff, Key,
  MessageSquare, ChevronRight, X, Save, Loader2, CheckCircle, AlertCircle, Volume2, ArrowLeft
} from 'lucide-react';

// ─── Inline editable field ────────────────────────────────────────────────────
function EditableField({ label, value, onSave, type = 'text', placeholder, mono = false, multiline = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setDraft(value); }, [value]);

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    setError('');
    const err = await onSave(draft);
    setSaving(false);
    if (err) { setError(err); }
    else { setEditing(false); }
  };

  const inputCls = `w-full bg-[#0c101c] border border-indigo-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 transition ${mono ? 'font-mono' : ''}`;

  return (
    <div className="p-3.5 rounded-2xl bg-[#151c2e] border border-[#27344d] space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{label}</p>
        {!editing ? (
          <button onClick={() => { setEditing(true); setError(''); }} className="p-1 rounded-lg text-gray-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button onClick={() => { setEditing(false); setDraft(value); setError(''); }} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          {multiline ? (
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={3}
              placeholder={placeholder}
              className={inputCls + ' resize-none'}
              autoFocus
            />
          ) : (
            <input
              type={type}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={placeholder}
              className={inputCls}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setDraft(value); } }}
            />
          )}
          {error && <p className="text-[10px] text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : (
        <p className={`text-xs font-bold text-white pt-0.5 ${mono ? 'font-mono' : ''}`}>{value || <span className="text-gray-500 italic font-normal">{placeholder}</span>}</p>
      )}
    </div>
  );
}

// ─── Change Password Form ─────────────────────────────────────────────────────
function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); setError(''); setSuccess(''); };

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!current || !next || !confirm) return setError('All fields are required.');
    if (next.length < 6) return setError('New password must be at least 6 characters.');
    if (next !== confirm) return setError('New passwords do not match.');
    setSaving(true);
    try {
      const res = await api.patch('/auth/change-password', { currentPassword: current, newPassword: next });
      if (res.data.success) {
        setSuccess('Password changed successfully!');
        reset();
        setTimeout(() => { setOpen(false); setSuccess(''); }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally { setSaving(false); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition"
      >
        <Lock className="w-4 h-4" />
        <span>Change Password</span>
      </button>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-[#0f172a] border border-rose-500/20 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-white flex items-center gap-2"><Lock className="w-4 h-4 text-rose-400" /> Change Password</p>
        <button onClick={() => { setOpen(false); reset(); }} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      {/* Current password */}
      <div className="relative">
        <input
          type={showCurrent ? 'text' : 'password'}
          placeholder="Current password"
          value={current}
          onChange={e => setCurrent(e.target.value)}
          className="w-full bg-[#0c101c] border border-[#27344d] rounded-xl px-3 py-2 pr-9 text-xs text-white focus:outline-none focus:border-indigo-400 transition"
        />
        <button onClick={() => setShowCurrent(v => !v)} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white">
          {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* New password */}
      <div className="relative">
        <input
          type={showNext ? 'text' : 'password'}
          placeholder="New password (min 6 chars)"
          value={next}
          onChange={e => setNext(e.target.value)}
          className="w-full bg-[#0c101c] border border-[#27344d] rounded-xl px-3 py-2 pr-9 text-xs text-white focus:outline-none focus:border-indigo-400 transition"
        />
        <button onClick={() => setShowNext(v => !v)} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white">
          {showNext ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Confirm */}
      <input
        type="password"
        placeholder="Confirm new password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        className="w-full bg-[#0c101c] border border-[#27344d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 transition"
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
      />

      {error && <p className="text-[10px] text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
      {success && <p className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{success}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
        {saving ? 'Updating…' : 'Update Password'}
      </button>
    </div>
  );
}

// ─── Blocked Users Component ───────────────────────────────────────────────────
function BlockedUsersTab() {
  const [blockedList, setBlockedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState(null);

  const fetchBlocked = async () => {
    setLoading(true);
    try {
      const res = await api.get('/personas/blocked');
      if (res.data.success) {
        setBlockedList(res.data.blockedPersonas || []);
      }
    } catch (err) {
      console.error('Failed to fetch blocked users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocked();
  }, []);

  const handleUnblock = async (targetPersonaId) => {
    setUnblockingId(targetPersonaId);
    try {
      const res = await api.delete(`/personas/block/${targetPersonaId}`);
      if (res.data.success) {
        setBlockedList(prev => prev.filter(p => p._id !== targetPersonaId));
      }
    } catch (err) {
      console.error('Failed to unblock user:', err);
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-base font-bold text-white font-outfit">Blocked Users</h3>
        <p className="text-xs text-gray-400">Manage users you have blocked on GenAce</p>
      </div>

      {loading ? (
        <div className="p-10 rounded-3xl bg-[#0f172a] border border-[#1e293b] text-center">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
          <p className="text-xs text-gray-400 mt-2">Loading blocked users...</p>
        </div>
      ) : blockedList.length === 0 ? (
        <div className="p-10 rounded-3xl bg-[#0f172a] border border-[#1e293b] text-center">
          <UserX className="w-10 h-10 text-gray-500 mx-auto mb-2" />
          <p className="text-xs text-gray-400 font-semibold">You have not blocked anyone yet.</p>
          <p className="text-[10px] text-gray-500 mt-1">Blocked users cannot message you or see your profile.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blockedList.map((user) => (
            <div
              key={user._id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0f172a] border border-[#1e293b] hover:border-indigo-500/30 transition"
            >
              <div className="flex items-center gap-3">
                <img
                  src={getMediaUrl(user.avatar) || DEFAULT_AVATAR}
                  alt={user.displayName || user.username}
                  className="w-10 h-10 rounded-full object-cover border border-white/10"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                />
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {user.displayName || user.username}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-mono">
                    @{user.username}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleUnblock(user._id)}
                disabled={unblockingId === user._id}
                className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {unblockingId === user._id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Unblocking...</span>
                  </>
                ) : (
                  <span>Unblock</span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chat Lock & Passcode Settings Component ─────────────────────────────────
function ChatLockSettings() {
  const [status, setStatus] = useState({ hasPasscode: false, chatLockEnabled: false, lockedConversations: [] });
  const [loading, setLoading] = useState(true);
  const [passcodeModalMode, setPasscodeModalMode] = useState(null);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchStatus = async () => {
    try {
      const res = await api.get('/auth/passcode-status');
      if (res.data.success) {
        setStatus({
          hasPasscode: res.data.hasPasscode,
          chatLockEnabled: res.data.chatLockEnabled,
          lockedConversations: res.data.lockedConversations || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch passcode status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleToggleLock = async () => {
    if (!status.hasPasscode) {
      setPasscodeModalMode('setup');
      setShowPasscodeModal(true);
      return;
    }

    try {
      const nextState = !status.chatLockEnabled;
      const res = await api.post('/auth/toggle-chat-lock', { enabled: nextState });
      if (res.data.success) {
        setStatus(prev => ({ ...prev, chatLockEnabled: res.data.chatLockEnabled }));
        setFeedback({ type: 'success', message: res.data.message });
        setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update Chat Lock' });
    }
  };

  const handleRemovePasscode = async (verifiedPasscode) => {
    try {
      const res = await api.post('/auth/chat-passcode', { passcode: '', currentPasscode: verifiedPasscode });
      if (res.data.success) {
        fetchStatus();
        setShowPasscodeModal(false);
        setFeedback({ type: 'success', message: 'Passcode removed. Chat Lock disabled.' });
        setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to remove passcode' });
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-[#0f172a] border border-[#1e293b] space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              Chat Lock with Special Passcode
              {status.chatLockEnabled && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/40 font-semibold">
                  ACTIVE 🔒
                </span>
              )}
            </h4>
            <p className="text-[10px] text-gray-400">Lock your chats with a personal passcode PIN</p>
          </div>
        </div>

        <button
          onClick={handleToggleLock}
          disabled={loading}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
            status.chatLockEnabled ? 'bg-indigo-600' : 'bg-gray-700'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
              status.chatLockEnabled ? 'right-1' : 'left-1'
            }`}
          />
        </button>
      </div>

      {feedback.message && (
        <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#1e293b]">
        {!status.hasPasscode ? (
          <button
            onClick={() => {
              setPasscodeModalMode('setup');
              setShowPasscodeModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-md shadow-indigo-600/25"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Set Special Passcode</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                setPasscodeModalMode('change');
                setShowPasscodeModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-semibold text-xs transition flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Change Passcode</span>
            </button>

            <button
              onClick={() => {
                setPasscodeModalMode('remove');
                setShowPasscodeModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold text-xs transition flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Remove Passcode</span>
            </button>
          </>
        )}
      </div>

      <PasscodeModal
        isOpen={showPasscodeModal}
        mode={passcodeModalMode === 'remove' ? 'unlock' : (passcodeModalMode || 'setup')}
        onSuccess={(data) => {
          if (passcodeModalMode === 'remove') {
            handleRemovePasscode(data);
          } else {
            fetchStatus();
            setShowPasscodeModal(false);
            setFeedback({ type: 'success', message: 'Passcode updated successfully!' });
            setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
          }
        }}
        onClose={() => setShowPasscodeModal(false)}
      />
    </div>
  );
}

// ─── Status Picker ────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { id: 'online', label: 'Online', color: 'bg-emerald-400' },
  { id: 'away', label: 'Away', color: 'bg-amber-400' },
  { id: 'dnd', label: 'Do Not Disturb', color: 'bg-rose-500' },
  { id: 'offline', label: 'Appear Offline', color: 'bg-gray-500' },
];

// ─── Main SettingsView ────────────────────────────────────────────────────────
export default function SettingsView({ onBack, defaultSection }) {
  const { activePersona, setActivePersona, logout } = useAuth();
  const { theme, changeTheme, fontSizeScale, changeFontSize } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState(defaultSection || 'profile');
  const [mobileShowPanel, setMobileShowPanel] = useState(!!defaultSection);
  const [statusSaving, setStatusSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activePersona?._id) return;

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
        const err = await patchPersona({ avatar: newAvatarUrl });
        if (err) {
          alert(`Profile update error: ${err}`);
        } else {
          setSavedFlash('Profile picture updated!');
          setTimeout(() => setSavedFlash(''), 3000);
        }
      } else {
        alert('Could not process image upload.');
      }
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      alert('Failed to upload profile picture: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Notification preferences (persisted to localStorage) ──
  const [notifPrefs, setNotifPrefs] = useState(getNotifPrefs);
  const [pushStatus, setPushStatus] = useState(null);
  const [enablingPush, setEnablingPush] = useState(false);
  const [pushInfo, setPushInfo] = useState({ supported: true, permission: 'default', isSubscribed: false });

  const refreshPushStatus = async () => {
    const st = await getWebPushStatus();
    setPushInfo(st);
  };

  useEffect(() => {
    refreshPushStatus();
  }, []);

  const handleEnablePush = async () => {
    setEnablingPush(true);
    setPushStatus(null);
    const res = await enableWebPushNotifications();
    setEnablingPush(false);
    setPushStatus(res);
    refreshPushStatus();
  };

  const handleDisablePush = async () => {
    setEnablingPush(true);
    setPushStatus(null);
    const res = await disableWebPushNotifications();
    setEnablingPush(false);
    setPushStatus(res);
    refreshPushStatus();
  };

  const toggleNotifPref = (key) => {
    setNotifPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveNotifPrefs(next);
      // Live feedback: play sound when sound is re-enabled
      if (key === 'soundEffects' && next.soundEffects) {
        setTimeout(() => playNotificationSound(), 50);
      }
      return next;
    });
  };

  const navItems = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy & Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'blocked', label: 'Blocked Users', icon: <UserX className="w-4 h-4" /> },
    { id: 'help', label: 'Help & Support', icon: <HelpCircle className="w-4 h-4" /> },
  ];

  const activeItemLabel = navItems.find(i => i.id === activeSubTab)?.label || 'Settings';

  // Generic patch helper — returns error string or null
  const patchPersona = async (fields) => {
    try {
      const res = await api.patch(`/personas/${activePersona._id}`, fields);
      if (res.data.success) {
        setActivePersona(res.data.persona);
        setSavedFlash('Saved!');
        setTimeout(() => setSavedFlash(''), 2000);
        return null;
      }
      return res.data.message || 'Update failed.';
    } catch (err) {
      return err.response?.data?.message || 'Update failed.';
    }
  };

  const handleStatusChange = async (statusId) => {
    setStatusSaving(true);
    await patchPersona({ status: statusId });
    setStatusSaving(false);
  };

  const currentStatus = activePersona?.status || 'online';
  const currentStatusInfo = STATUS_OPTIONS.find(s => s.id === currentStatus) || STATUS_OPTIONS[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b14] overflow-hidden select-none">

      {/* ── Mobile-only top bar with dynamic back navigation ── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#1d273e] bg-[#101625] shrink-0">
        <button
          onClick={() => {
            if (mobileShowPanel) {
              setMobileShowPanel(false);
            } else if (onBack) {
              onBack();
            }
          }}
          className="flex items-center gap-1.5 p-1.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition -ml-1"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-semibold text-gray-300">
            {mobileShowPanel ? 'Menu' : 'Chats'}
          </span>
        </button>
        <span className="text-sm font-bold text-white font-outfit truncate">
          {mobileShowPanel ? activeItemLabel : 'Settings'}
        </span>
        <div className="w-10" />
      </div>

      {/* ── Main settings layout ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto">
        {/* Left Settings Navigation Sidebar */}
        <div className={`w-full md:w-64 border-r border-[#1d273e] p-6 space-y-6 shrink-0 bg-[#101625] ${mobileShowPanel ? 'hidden md:block' : 'block md:block'}`}>
          <div>
            <h2 className="text-xl font-black text-white font-outfit tracking-tight">Settings</h2>
            <p className="text-xs text-gray-400">Account settings and preferences</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSubTab(item.id);
                  setMobileShowPanel(true);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition ${
                  activeSubTab === item.id
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60 md:hidden" />
              </button>
            ))}
          </nav>

          <div className="pt-4 border-t border-[#1e293b]">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Main Settings Display Area */}
        <div className={`flex-1 p-6 md:p-8 space-y-6 overflow-y-auto ${mobileShowPanel ? 'block md:block' : 'hidden md:block'}`}>

        {/* ─── PROFILE TAB ─── */}
        {activeSubTab === 'profile' && (
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white font-outfit">Profile</h3>
                <p className="text-xs text-gray-400">Manage your public identity</p>
              </div>
              {savedFlash && (
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold animate-pulse">
                  <CheckCircle className="w-3.5 h-3.5" /> {savedFlash}
                </span>
              )}
            </div>

            {/* Avatar + display name header */}
            <div className="p-6 rounded-3xl bg-[#0f172a] border border-[#1e293b] shadow-xl space-y-6">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileSelect}
              />
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group shrink-0 cursor-pointer"
                  title="Click to change profile picture"
                >
                  <img
                    src={getMediaUrl(activePersona?.avatar) || DEFAULT_AVATAR}
                    alt={activePersona?.displayName}
                    className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500/40 shadow-lg group-hover:opacity-80 transition"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0f172a] ${currentStatusInfo.color}`} />
                </div>
                <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white font-outfit">{activePersona?.displayName}</h3>
                  <p className="text-xs text-indigo-400 font-mono">@{activePersona?.username}</p>
                  <p className="text-xs text-gray-400 italic leading-relaxed">{activePersona?.bio || 'No bio set.'}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{uploadingAvatar ? 'Uploading image...' : 'Change Profile Picture'}</span>
                  </button>
                </div>
              </div>

              {/* Status Picker */}
              <div className="pt-2 border-t border-[#1e293b] space-y-2">
                <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Real-time Status</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleStatusChange(s.id)}
                      disabled={statusSaving}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                        currentStatus === s.id
                          ? 'bg-indigo-600/20 border-indigo-500/40 text-white'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${s.color}`} />
                      <span className="truncate">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div className="space-y-3">
              <EditableField
                label="Display Name"
                value={activePersona?.displayName || ''}
                placeholder="Your display name"
                onSave={(val) => patchPersona({ displayName: val })}
              />
              <EditableField
                label="Username"
                value={activePersona?.username ? `@${activePersona.username}` : ''}
                placeholder="@handle"
                mono
                onSave={(val) => patchPersona({ username: val.replace(/^@/, '') })}
              />
              <EditableField
                label="Bio"
                value={activePersona?.bio || ''}
                placeholder="Write something about yourself…"
                multiline
                onSave={(val) => patchPersona({ bio: val })}
              />
              <EditableField
                label="Custom Status"
                value={activePersona?.customStatus || ''}
                placeholder="e.g. Building something great 🚀"
                onSave={(val) => patchPersona({ customStatus: val })}
              />
            </div>

            {/* Change Password */}
            <div className="space-y-2">
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider pl-1">Security</p>
              <ChangePasswordForm />
            </div>
          </div>
        )}

        {/* ─── APPEARANCE TAB ─── */}
        {activeSubTab === 'appearance' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white font-outfit">Appearance</h3>
              <p className="text-xs text-gray-400">Customize how GenAce looks and feels</p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0f172a] border border-[#1e293b] space-y-5">
              <div>
                <p className="text-xs font-bold text-white mb-3">Theme</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'dark', label: 'Dark', icon: <Moon className="w-5 h-5" /> },
                    { id: 'light', label: 'Light', icon: <Sun className="w-5 h-5" /> },
                    { id: 'system', label: 'System', icon: <Monitor className="w-5 h-5" /> },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => changeTheme(t.id)}
                      className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-2 transition ${
                        theme === t.id
                          ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#1e293b] pt-5 space-y-3">
                <p className="text-xs font-bold text-white">Font Size Scaling</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'small', label: 'Small (14px)' },
                    { id: 'medium', label: 'Medium (16px)' },
                    { id: 'large', label: 'Large (18px)' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => changeFontSize(f.id)}
                      className={`p-3 rounded-2xl border text-xs font-semibold transition ${
                        fontSizeScale === f.id
                          ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0c101c] border border-[#27344d] space-y-1">
                  <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Live Text Stream Preview</p>
                  <p className="text-sm font-semibold text-white">Sample Message Stream</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    This message text scales dynamically in real-time when you select Small, Medium, or Large font options.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── NOTIFICATIONS TAB ─── */}
        {activeSubTab === 'notifications' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white font-outfit">Notifications</h3>
              <p className="text-xs text-gray-400">Control how and when you receive alerts</p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0f172a] border border-[#1e293b] space-y-1">
              {[
                {
                  key: 'messageNotifications',
                  label: 'Message Notifications',
                  desc: 'Show a toast when a direct message arrives',
                  icon: <MessageSquare className="w-4 h-4 text-indigo-400" />
                },
                {
                  key: 'spaceMentions',
                  label: 'Space Mentions',
                  desc: 'Show a toast for new messages in spaces',
                  icon: <Bell className="w-4 h-4 text-cyan-400" />
                },
                {
                  key: 'soundEffects',
                  label: 'Sound Effects',
                  desc: 'Play a chime when a notification arrives',
                  icon: <Volume2 className="w-4 h-4 text-purple-400" />
                },
                {
                  key: 'emailDigest',
                  label: 'Email Digest',
                  desc: 'Receive weekly email summaries (coming soon)',
                  icon: <Bell className="w-4 h-4 text-amber-400" />,
                  disabled: true
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-3.5 border-b border-[#1e293b] last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white">{item.label}</p>
                      <p className="text-[10px] text-gray-400 truncate">{item.desc}</p>
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <button
                    onClick={() => !item.disabled && toggleNotifPref(item.key)}
                    disabled={item.disabled}
                    aria-pressed={notifPrefs[item.key]}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ml-4 ${
                      item.disabled
                        ? 'opacity-40 cursor-not-allowed bg-gray-700'
                        : notifPrefs[item.key]
                          ? 'bg-indigo-600'
                          : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                        notifPrefs[item.key] ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* Live status banner */}
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Current Status</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'messageNotifications', label: 'DM toasts', color: 'indigo' },
                  { key: 'spaceMentions', label: 'Space toasts', color: 'cyan' },
                  { key: 'soundEffects', label: 'Sound', color: 'purple' },
                ].map(({ key, label, color }) => (
                  <span
                    key={key}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border font-mono ${
                      notifPrefs[key]
                        ? `bg-${color}-500/20 border-${color}-500/40 text-${color}-300`
                        : 'bg-gray-700/50 border-gray-600/40 text-gray-500 line-through'
                    }`}
                  >
                    {notifPrefs[key] ? '✓' : '✗'} {label}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-gray-500">Changes are saved instantly and apply to all new messages.</p>
            </div>

            {/* Closed-App / Lock Screen Background Push Card */}
            <div className="p-5 rounded-3xl bg-[#0f172a] border border-cyan-500/20 space-y-3 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">Closed-App / Lock Screen Push Notifications</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-semibold border ${
                        pushInfo.isSubscribed
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : pushInfo.permission === 'denied'
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      }`}>
                        {pushInfo.isSubscribed ? 'ENABLED 🔔' : pushInfo.permission === 'denied' ? 'BLOCKED 🚫' : 'NOT ENABLED'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">Receive DM & Space alerts on your device lock screen when browser tab is closed</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {pushInfo.isSubscribed ? (
                    <button
                      onClick={handleDisablePush}
                      disabled={enablingPush}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {enablingPush ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      {enablingPush ? 'Disabling…' : 'Disable Push'}
                    </button>
                  ) : (
                    <button
                      onClick={handleEnablePush}
                      disabled={enablingPush}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-60"
                    >
                      {enablingPush ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                      {enablingPush ? 'Enabling…' : 'Enable Closed-App Push'}
                    </button>
                  )}
                </div>
              </div>

              {pushStatus && (
                <div className={`p-3 rounded-xl border text-xs font-medium ${pushStatus.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                  {pushStatus.message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── PRIVACY & SECURITY TAB ─── */}
        {activeSubTab === 'privacy' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white font-outfit">Privacy & Security</h3>
              <p className="text-xs text-gray-400">Control your privacy preferences</p>
            </div>

            <ChatLockSettings />

            <div className="p-6 rounded-3xl bg-[#0f172a] border border-[#1e293b] space-y-4">
              {[
                { label: 'Who can find me by handle?', value: 'Everyone', icon: <Eye className="w-4 h-4 text-indigo-400" /> },
                { label: 'Who can send me messages?', value: 'Friends Only', icon: <MessageSquare className="w-4 h-4 text-indigo-400" /> },
                { label: 'Show online status', value: 'Enabled', icon: <EyeOff className="w-4 h-4 text-indigo-400" /> },
                { label: 'Read receipts', value: 'Enabled', icon: <Check className="w-4 h-4 text-indigo-400" /> },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#151c2e] border border-[#27344d] cursor-pointer hover:border-indigo-500/30 transition">
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-xs font-semibold text-white">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span>{item.value}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-[#1e293b] space-y-3">
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 transition"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold">View Official Privacy Policy</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </a>

                <ChangePasswordForm />
              </div>
            </div>
          </div>
        )}

        {/* ─── BLOCKED USERS TAB ─── */}
        {activeSubTab === 'blocked' && <BlockedUsersTab />}

        {/* ─── HELP & SUPPORT TAB ─── */}
        {activeSubTab === 'help' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white font-outfit">Help & Support</h3>
              <p className="text-xs text-gray-400">Find answers or reach our team</p>
            </div>
            <div className="p-6 rounded-3xl bg-[#0f172a] border border-[#1e293b] space-y-3">
              {[
                { label: 'Getting Started Guide', desc: 'Learn the basics of GenAce' },
                { label: 'FAQ — Common Questions', desc: 'Quick answers to common issues' },
                { label: 'Report a Problem', desc: 'Let us know if something is broken' },
                { label: 'Contact Support', desc: 'Chat with the GenAce team' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#151c2e] border border-[#27344d] cursor-pointer hover:border-indigo-500/30 transition">
                  <div>
                    <p className="text-xs font-semibold text-white">{item.label}</p>
                    <p className="text-[10px] text-gray-400">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}

              <div className="mt-4 p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-center">
                <p className="text-xs font-bold text-indigo-300">GenAce v1.0.0</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Real-time chat, spaces, and more.</p>
              </div>
            </div>
          </div>
        )}
      </div>{/* end main content area */}
      </div>{/* end inner layout wrapper */}
    </div>
  );
}
