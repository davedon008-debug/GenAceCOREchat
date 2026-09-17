'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import Logo from '../../components/Logo';
import { Zap, Shield, Sparkles, User, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { token, activePersona, login, register, loginDemo } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('mode=register')) {
      setIsRegister(true);
    }
    if (token && activePersona) {
      router.push('/chat');
    }
  }, [token, activePersona, router]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterName, setMasterName] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null);

  // Contact Admin Reset Password modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmailHandle, setResetEmailHandle] = useState('');
  const [resetNote, setResetNote] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState(null);

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetEmailHandle.trim()) return;

    setResetLoading(true);
    setResetStatus(null);
    try {
      const res = await api.post('/auth/request-password-reset', {
        emailOrHandle: resetEmailHandle,
        note: resetNote
      });
      setResetStatus({ success: true, message: res.data.message || 'Password reset request sent to Admin!' });
    } catch (err) {
      setResetStatus({ success: false, message: err.response?.data?.message || 'Failed to submit reset request.' });
    } finally {
      setResetLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!resetEmailHandle.trim()) {
      setResetStatus({ success: false, message: 'Please enter your email or username handle to check status.' });
      return;
    }
    setResetLoading(true);
    setResetStatus(null);
    try {
      const res = await api.post('/auth/check-reset-status', {
        emailOrHandle: resetEmailHandle
      });
      setResetStatus({
        success: true,
        message: res.data.message
      });
    } catch (err) {
      setResetStatus({
        success: false,
        message: err.response?.data?.message || 'No active reset request found for this account.'
      });
    } finally {
      setResetLoading(false);
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
    
    if (isRegister && usernameStatus && !usernameStatus.available) {
      setError('Please choose a different username handle because this one is already taken.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const cleanHandle = username.toLowerCase().trim().replace(/^@/, '');
        await register({
          email,
          password,
          masterName: cleanHandle,
          username: cleanHandle,
          displayName: `@${cleanHandle}`
        });
      } else {
        await login(email, password);
      }
      router.push('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Gradient Blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="flex flex-col items-center justify-center space-y-3 text-center">
          <Logo variant="full" mode="dark" size={48} showTagline />
          <p className="text-xs text-gray-400 font-medium">Next-Gen Autonomous Messaging & Fluid Spaces</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Choose Username Handle (@)</label>
              <div className="relative">
                <span className="text-gray-400 absolute left-3 top-2.5 text-xs font-bold">@</span>
                <input
                  type="text"
                  required
                  placeholder="username"
                  value={username}
                  onChange={e => {
                    handleUsernameChange(e.target.value);
                    setMasterName(e.target.value);
                    setDisplayName(`@${e.target.value.trim().toLowerCase().replace(/^@/, '')}`);
                  }}
                  className={`w-full pl-8 pr-3 py-2.5 text-xs rounded-xl bg-white/5 border text-white placeholder-gray-400 focus:outline-none ${
                    usernameStatus
                      ? usernameStatus.available
                        ? 'border-emerald-500/50 text-emerald-200'
                        : 'border-rose-500/50 text-rose-200'
                      : 'border-white/10 focus:border-cyan-500'
                  }`}
                />
              </div>
              {usernameStatus && (
                <p className={`text-[11px] mt-1 font-medium ${usernameStatus.available ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {usernameStatus.available ? '✓ ' : '⚠️ '}{usernameStatus.message}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Email Address or Handle (@username)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="you@domain.com or @username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400 font-medium block">Security Password</label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setResetEmailHandle(email);
                    setShowResetModal(true);
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline font-medium transition"
                >
                  Forgot Password? Contact Admin
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-cyan-500/25 transition"
          >
            {loading ? 'Processing Authentication...' : isRegister ? 'Create Account & Default Persona' : 'Sign In to Workspace'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 space-y-3">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-xs text-cyan-400 hover:underline font-medium block mx-auto"
          >
            {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register Now'}
          </button>

          <div className="pt-2 border-t border-white/5 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                try {
                  await loginDemo();
                  router.push('/chat');
                } catch {
                  setError('Demo login failed');
                } finally {
                  setLoading(false);
                }
              }}
              className="text-[11px] text-gray-400 hover:text-white transition font-medium flex items-center justify-center gap-1.5 mx-auto py-1 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
            >
              <span>⚡ Try Demo Account</span>
            </button>

            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-gray-500 hover:text-cyan-400 transition underline font-medium pt-1"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>

      {/* Contact Admin Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#090d18] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Contact Admin for Password Reset</h3>
              </div>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetStatus(null);
                }}
                className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Forgot your account password? Submit a request below to alert the Workspace Admin, or contact support directly via email.
            </p>

            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-1">
              <div className="text-cyan-300 font-semibold flex items-center gap-1.5">
                <span>📧 Admin Support Contact:</span>
              </div>
              <p className="text-white font-mono text-[11px] selection:bg-cyan-500 selection:text-black">
                admin@donchat.com
              </p>
            </div>

            {resetStatus && (
              <div className={`p-3 rounded-xl border text-xs ${resetStatus.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                {resetStatus.message}
              </div>
            )}

            {!resetStatus?.success && (
              <form onSubmit={handleResetSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Your Email or Handle (@username)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. alex@gmail.com or @alex"
                    value={resetEmailHandle}
                    onChange={e => setResetEmailHandle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Message for Admin (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Briefly describe your request or urgent contact preference..."
                    value={resetNote}
                    onChange={e => setResetNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCheckStatus}
                    disabled={resetLoading}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-cyan-300 font-bold text-xs transition"
                  >
                    🔍 Check Request Status
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg transition"
                  >
                    {resetLoading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}

            {resetStatus?.success && (
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetStatus(null);
                }}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
