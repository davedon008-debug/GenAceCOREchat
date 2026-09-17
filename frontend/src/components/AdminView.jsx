'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, Users, Key, Trash2, Search, ArrowLeft, RefreshCw, AlertTriangle, 
  Check, Lock, X, Loader2, Sparkles, MessageSquare, Zap, ShieldAlert, Eye, Globe
} from 'lucide-react';
import api from '../lib/api';

export default function AdminView({ onBack, onInspectSpace, onOpenMobileSidebar }) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'resets' | 'spaces'
  const [stats, setStats] = useState({ totalUsers: 0, totalPersonas: 0, totalSpaces: 0, totalMessages: 0 });
  const [users, setUsers] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modal States
  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resolveModalReq, setResolveModalReq] = useState(null);
  const [resolvePassword, setResolvePassword] = useState('');
  const [resolveNote, setResolveNote] = useState('');
  const [deleteModalUser, setDeleteModalUser] = useState(null);
  const [deleteModalSpace, setDeleteModalSpace] = useState(null);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeConfirmInput, setPurgeConfirmInput] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, spacesRes, resetsRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/spaces'),
        api.get('/admin/password-resets')
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.success) {
        setStats(statsRes.value.data.stats);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value?.data?.success) {
        setUsers(usersRes.value.data.users || []);
      }
      if (spacesRes.status === 'fulfilled' && spacesRes.value?.data?.success) {
        setSpaces(spacesRes.value.data.spaces || []);
      }
      if (resetsRes.status === 'fulfilled' && resetsRes.value?.data?.success) {
        setResetRequests(resetsRes.value.data.requests || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Manage Password Submit
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwordModalUser || !newPassword.trim()) return;

    setActionLoading(true);
    try {
      const res = await api.put(`/admin/users/${passwordModalUser._id}/password`, {
        newPassword: newPassword.trim()
      });
      if (res.data.success) {
        showToast(`Password updated for ${passwordModalUser.email}`, 'success');
        setPasswordModalUser(null);
        setNewPassword('');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update password', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Resolve Password Reset Request
  const handleResolveResetRequest = async (e) => {
    e.preventDefault();
    if (!resolveModalReq) return;

    setActionLoading(true);
    try {
      const res = await api.put(`/admin/password-resets/${resolveModalReq._id}/resolve`, {
        newPassword: resolvePassword.trim(),
        adminNote: resolveNote.trim(),
        status: 'resolved'
      });
      if (res.data.success) {
        showToast(res.data.message || 'Reset request resolved', 'success');
        setResolveModalReq(null);
        setResolvePassword('');
        setResolveNote('');
        fetchAdminData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to resolve request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle User Role
  const handleToggleRole = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setActionLoading(true);
    try {
      const res = await api.put(`/admin/users/${user._id}/role`, { role: newRole });
      if (res.data.success) {
        showToast(`Updated ${user.email} role to ${newRole.toUpperCase()}`, 'success');
        setUsers(prev => prev.map(u => u._id === user._id ? { ...u, role: newRole } : u));
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update user role', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Single User
  const handleDeleteUser = async () => {
    if (!deleteModalUser) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/admin/users/${deleteModalUser._id}`);
      if (res.data.success) {
        showToast(`User ${deleteModalUser.email} deleted successfully`, 'success');
        setUsers(prev => prev.filter(u => u._id !== deleteModalUser._id));
        setDeleteModalUser(null);
        fetchAdminData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Fluid Space
  const handleDeleteSpace = async () => {
    if (!deleteModalSpace) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/admin/spaces/${deleteModalSpace._id}`);
      if (res.data.success) {
        showToast(`Space "${deleteModalSpace.title}" deleted completely`, 'success');
        setSpaces(prev => prev.filter(s => s._id !== deleteModalSpace._id));
        setDeleteModalSpace(null);
        fetchAdminData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete space', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Purge All Users
  const handlePurgeAll = async () => {
    if (purgeConfirmInput.trim().toUpperCase() !== 'CONFIRM') return;
    setActionLoading(true);
    try {
      const res = await api.delete('/admin/users/all/purge');
      if (res.data.success) {
        showToast(res.data.message || 'System purge complete', 'success');
        setShowPurgeModal(false);
        setPurgeConfirmInput('');
        fetchAdminData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Purge action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.masterName?.toLowerCase().includes(q) ||
      u.personas?.some(p => p.username?.toLowerCase().includes(q) || p.displayName?.toLowerCase().includes(q))
    );
  });

  const filteredSpaces = spaces.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.ownerPersonaId?.displayName?.toLowerCase().includes(q) ||
      s.ownerPersonaId?.username?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 h-full bg-[#080b14] flex flex-col justify-between p-4 md:p-6 select-none relative overflow-y-auto">
      
      {/* Toast Alert Popup */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-2 text-xs font-bold transition animate-fadeIn ${
          toastMessage.type === 'error' ? 'bg-rose-950/90 border-rose-500/40 text-rose-200' : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
        }`}>
          {toastMessage.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <Check className="w-4 h-4 text-emerald-400" />}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-[#141b2d] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 shrink-0 transition"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg md:text-xl font-black text-white font-outfit flex items-center gap-2 tracking-tight">
              <Shield className="w-5 h-5 text-indigo-400" />
              <span>Admin Control Center</span>
            </h1>
            <p className="text-xs text-gray-400">Master management for users, password resets, and Fluid Spaces</p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="p-2 rounded-xl bg-[#101625] border border-[#1a2338] text-gray-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5 text-xs font-semibold"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* METRIC OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4 shrink-0">
        <div className="p-4 rounded-2xl bg-[#101625] border border-[#1a2338] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Total Users</p>
            <p className="text-xl font-extrabold text-white font-outfit">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#101625] border border-[#1a2338] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Personas</p>
            <p className="text-xl font-extrabold text-white font-outfit">{stats.totalPersonas}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#101625] border border-[#1a2338] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Fluid Spaces</p>
            <p className="text-xl font-extrabold text-white font-outfit">{stats.totalSpaces}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#101625] border border-[#1a2338] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Messages Sent</p>
            <p className="text-xl font-extrabold text-white font-outfit">{stats.totalMessages}</p>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-[#141b2d] pb-2 shrink-0">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('resets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition relative ${
            activeTab === 'resets' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Key className="w-4 h-4 text-cyan-400" />
          <span>Reset Requests ({resetRequests.length})</span>
          {resetRequests.some(r => r.status === 'pending') && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 right-1" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('spaces')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'spaces' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Fluid Spaces ({spaces.length})</span>
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT SECTION */}
      {activeTab === 'users' && (
        <div className="flex-1 flex flex-col min-h-0 space-y-4 pt-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search users by email, handle, or name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-[#101625] border border-[#1a2338] text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition shadow-inner"
              />
            </div>

            {/* Purge All Danger Button */}
            <button
              onClick={() => setShowPurgeModal(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs transition shrink-0"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Purge All Users</span>
            </button>
          </div>

          {/* USERS LIST */}
          <div className="flex-1 overflow-y-auto rounded-3xl border border-[#141b2d] bg-[#0d1220] p-2 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <p className="text-xs">Loading user records...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No users found matching "{searchQuery}".
              </div>
            ) : (
              filteredUsers.map(user => (
                <div
                  key={user._id}
                  className="p-3.5 rounded-2xl bg-[#101625] border border-[#1a2338] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-500/30 transition"
                >
                  {/* Left side: User details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0 uppercase shadow">
                      {user.masterName ? user.masterName[0] : 'U'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white truncate">{user.email}</p>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          user.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {user.role || 'user'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-gray-400 truncate mt-0.5">
                        <span>Handle: <strong className="text-gray-300 font-mono">@{user.masterName}</strong></span>
                        <span>•</span>
                        <span>Personas: <strong className="text-indigo-300 font-mono">{user.personas?.length || 0}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Action buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Reset Password */}
                    <button
                      onClick={() => setPasswordModalUser(user)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                      title="Change or reset user password"
                    >
                      <Key className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Password</span>
                    </button>

                    {/* Toggle Admin Role */}
                    <button
                      onClick={() => handleToggleRole(user)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs transition"
                      title={user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                    >
                      <Shield className={`w-4 h-4 ${user.role === 'admin' ? 'text-purple-400' : 'text-gray-400'}`} />
                    </button>

                    {/* Delete User */}
                    <button
                      onClick={() => setDeleteModalUser(user)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition"
                      title="Delete user account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PASSWORD RESET REQUESTS SECTION */}
      {activeTab === 'resets' && (
        <div className="flex-1 flex flex-col min-h-0 space-y-4 pt-3">
          <div className="flex-1 overflow-y-auto rounded-3xl border border-[#141b2d] bg-[#0d1220] p-2 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <p className="text-xs">Loading password reset requests...</p>
              </div>
            ) : resetRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No password reset requests found.
              </div>
            ) : (
              resetRequests.map(reqItem => (
                <div
                  key={reqItem._id}
                  className="p-3.5 rounded-2xl bg-[#101625] border border-[#1a2338] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-500/30 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 ${
                      reqItem.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      <Key className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white truncate">{reqItem.userEmail || reqItem.emailOrHandle}</p>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          reqItem.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {reqItem.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-300 truncate mt-0.5">{reqItem.requestNote || 'Requested password reset'}</p>

                      <div className="flex items-center gap-2 text-[10px] text-gray-400 truncate mt-0.5">
                        <span>Requested: <strong className="text-gray-300 font-mono">{new Date(reqItem.createdAt).toLocaleString()}</strong></span>
                        {reqItem.adminNote && (
                          <>
                            <span>•</span>
                            <span>Admin Note: <strong className="text-indigo-300 font-mono">{reqItem.adminNote}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => {
                        setResolveModalReq(reqItem);
                        setResolvePassword('');
                        setResolveNote('');
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition"
                    >
                      <Key className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{reqItem.status === 'pending' ? 'Reset Password & Resolve' : 'Update Credentials'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FLUID SPACES MANAGEMENT SECTION */}
      {activeTab === 'spaces' && (
        <div className="flex-1 flex flex-col min-h-0 space-y-4 pt-3">
          <div className="flex items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search spaces by title, description, or owner..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-[#101625] border border-[#1a2338] text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition shadow-inner"
              />
            </div>
          </div>

          {/* SPACES LIST */}
          <div className="flex-1 overflow-y-auto rounded-3xl border border-[#141b2d] bg-[#0d1220] p-2 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <p className="text-xs">Loading spaces...</p>
              </div>
            ) : filteredSpaces.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No Fluid Spaces found matching "{searchQuery}".
              </div>
            ) : (
              filteredSpaces.map(space => (
                <div
                  key={space._id}
                  className="p-3.5 rounded-2xl bg-[#101625] border border-[#1a2338] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-500/30 transition"
                >
                  {/* Left side: Space details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-lg text-white shrink-0 shadow">
                      {space.icon || '⚡'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white truncate">{space.title}</p>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          space.visibility === 'public' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {space.visibility || 'private'}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{space.description || 'Fluid Space'}</p>

                      <div className="flex items-center gap-2 text-[10px] text-gray-400 truncate mt-1">
                        <span>Owner: <strong className="text-indigo-300 font-mono">@{space.ownerPersonaId?.username || 'Owner'}</strong></span>
                        <span>•</span>
                        <span>Members: <strong className="text-white font-mono">{space.members?.length || 0}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Action buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Inspect Space */}
                    <button
                      onClick={() => onInspectSpace && onInspectSpace(space._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                      title="Inspect space canvas and read feed"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Inspect Space</span>
                    </button>

                    {/* Delete Space */}
                    <button
                      onClick={() => setDeleteModalSpace(space)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition"
                      title="Delete Space from existence"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: RESET PASSWORD */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#101625] border border-indigo-500/40 rounded-3xl p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#1a2338] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" /> Change User Password
              </h3>
              <button onClick={() => setPasswordModalUser(null)} className="p-1 text-gray-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <p className="text-xs text-gray-300">Target User: <strong className="text-white">{passwordModalUser.email}</strong></p>
                <p className="text-[10px] text-gray-400 font-mono">@{passwordModalUser.masterName}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">New Security Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="Enter new password..."
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#090d18] border border-[#1a2338] text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !newPassword.trim()}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1.5: RESOLVE PASSWORD RESET REQUEST */}
      {resolveModalReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#101625] border border-cyan-500/40 rounded-3xl p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#1a2338] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" /> Resolve Reset Request
              </h3>
              <button onClick={() => setResolveModalReq(null)} className="p-1 text-gray-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveResetRequest} className="space-y-3">
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-1">
                <p className="text-gray-300">Requested Account: <strong className="text-white font-mono">{resolveModalReq.userEmail || resolveModalReq.emailOrHandle}</strong></p>
                <p className="text-gray-400 italic">"{resolveModalReq.requestNote || 'Password reset requested.'}"</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Set New User Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Enter new password for user..."
                    value={resolvePassword}
                    onChange={e => setResolvePassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#090d18] border border-[#1a2338] text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Admin Response / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Password updated & user notified via email"
                  value={resolveNote}
                  onChange={e => setResolveNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#090d18] border border-[#1a2338] text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolveModalReq(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow-lg flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reset Password & Mark Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DELETE SINGLE USER CONFIRMATION */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#101625] border border-rose-500/40 rounded-3xl p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-white">Delete User Account?</h3>
                <p className="text-[11px] text-gray-400">This action will remove the user and all associated personas.</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200">
              User: <strong>{deleteModalUser.email}</strong> (@{deleteModalUser.masterName})
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE FLUID SPACE CONFIRMATION */}
      {deleteModalSpace && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#101625] border border-rose-500/40 rounded-3xl p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-white">Delete Fluid Space?</h3>
                <p className="text-[11px] text-gray-400">Permanently erase this space and all messages inside it.</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200">
              Space: <strong>{deleteModalSpace.title}</strong> ({deleteModalSpace.visibility || 'private'})
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalSpace(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSpace}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PURGE ALL USERS DANGER ZONE */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#101625] border border-rose-500/50 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-7 h-7 shrink-0" />
              <div>
                <h3 className="text-base font-black text-white">Purge System Database?</h3>
                <p className="text-xs text-gray-400">Permanently delete user accounts and clear message records.</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
              <p>⚠️ <strong>Warning:</strong> This will delete all user accounts and clean up stored data.</p>
              <p className="text-[10px] text-rose-400 font-mono">Type <strong>CONFIRM</strong> to authorize this action.</p>
            </div>

            <div>
              <input
                type="text"
                placeholder="Type CONFIRM here..."
                value={purgeConfirmInput}
                onChange={e => setPurgeConfirmInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#090d18] border border-rose-500/40 text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 uppercase font-mono tracking-widest text-center"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowPurgeModal(false); setPurgeConfirmInput(''); }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurgeAll}
                disabled={actionLoading || purgeConfirmInput.trim().toUpperCase() !== 'CONFIRM'}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs transition shadow-lg flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Execute Purge'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
