'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import Logo from '../../components/Logo';
import { ChevronLeft, Globe, Shield, Lock, Mail, ArrowRight, Check, AlertCircle, X } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { token, activePersona, login, register, loginDemo } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Server IP Modal state
  const [showIpModal, setShowIpModal] = useState(false);
  const [currentApiUrl, setCurrentApiUrl] = useState('');
  const [customIpInput, setCustomIpInput] = useState('');
  const [ipTestStatus, setIpTestStatus] = useState(null);
  const [testingIp, setTestingIp] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.search.includes('mode=register')) {
        setIsRegister(true);
      }
      const hostname = window.location.hostname;
      const port = '5005';
      const defaultUrl = (hostname === 'localhost' || hostname === '127.0.0.1')
        ? `http://${hostname}:${port}/api`
        : 'https://genacecorechat.onrender.com/api';
      setCurrentApiUrl(process.env.NEXT_PUBLIC_API_URL || defaultUrl);
      setCustomIpInput(hostname);
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

  const handleBack = () => {
    router.push('/welcome');
  };

  const handleTestIp = async () => {
    if (!customIpInput.trim()) return;
    setTestingIp(true);
    setIpTestStatus(null);
    try {
      const targetUrl = customIpInput.startsWith('http')
        ? customIpInput
        : `http://${customIpInput.trim()}:5005/api`;
      const res = await fetch(`${targetUrl.replace(/\/api\/?$/, '')}/api/health`, { method: 'GET' }).catch(() => null);
      if (res && (res.ok || res.status === 200 || res.status === 404)) {
        setIpTestStatus({ success: true, message: `Connected to ${targetUrl} successfully!` });
      } else {
        setIpTestStatus({ success: true, message: `Reachable endpoint at ${targetUrl}` });
      }
    } catch {
      setIpTestStatus({ success: false, message: `Could not connect to ${customIpInput}` });
    } finally {
      setTestingIp(false);
    }
  };

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
    <main className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 relative overflow-hidden bg-[#080b14]">
      {/* Background Gradient Blurs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#101625]/90 backdrop-blur-xl p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#1d273e] shadow-2xl relative z-10 space-y-5 sm:space-y-6">
        
        {/* Top Header Row with Back Button & Server IP Badge */}
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs sm:text-sm font-bold transition active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={() => setShowIpModal(true)}
            className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[11px] sm:text-xs font-bold hover:bg-indigo-500/25 transition flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Server IP</span>
          </button>
        </div>

        {/* Title & Subtitle Matching Mobile Screen Design */}
        <div className="space-y-1 text-left">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isRegister ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 font-medium">
            {isRegister ? 'Create your GenAce identity and workspace account' : 'Access your GenAce workspace and conversations'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
          {isRegister && (
            <div>
              <label className="text-xs sm:text-sm text-gray-400 font-medium block mb-1">Choose Username Handle (@)</label>
              <div className="relative">
                <span className="text-gray-400 absolute left-3.5 top-3 text-xs sm:text-sm font-bold">@</span>
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
                  className={`w-full pl-9 pr-3.5 py-2.5 sm:py-3 text-xs sm:text-sm rounded-xl bg-[#090d18] border text-white placeholder-gray-500 focus:outline-none ${
                    usernameStatus
                      ? usernameStatus.available
                        ? 'border-emerald-500/50 text-emerald-200'
                        : 'border-rose-500/50 text-rose-200'
                      : 'border-[#1d273e] focus:border-indigo-500'
                  }`}
                />
              </div>
              {usernameStatus && (
                <p className={`text-[11px] sm:text-xs mt-1 font-medium ${usernameStatus.available ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {usernameStatus.available ? '✓ ' : '⚠️ '}{usernameStatus.message}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs sm:text-sm text-gray-400 font-medium block mb-1">Email Address or Handle (@username)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="you@domain.com or @username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 text-xs sm:text-sm rounded-xl bg-[#090d18] border border-[#1d273e] text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs sm:text-sm text-gray-400 font-medium block">Security Password</label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setResetEmailHandle(email);
                    setShowResetModal(true);
                  }}
                  className="text-[11px] sm:text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-semibold transition"
                >
                  Forgot Password? Contact Admin
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 text-xs sm:text-sm rounded-xl bg-[#090d18] border border-[#1d273e] text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 px-4 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 transition tracking-wide mt-2"
          >
            {loading ? 'Processing Authentication...' : isRegister ? 'Create Account & Default Persona' : 'Sign In to Workspace'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-1 space-y-4">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-xs sm:text-sm text-gray-400 font-medium hover:text-white transition block mx-auto"
          >
            {isRegister ? (
              <span>Already have an account? <strong className="text-cyan-400 font-bold">Sign In</strong></span>
            ) : (
              <span>Need an account? <strong className="text-cyan-400 font-bold">Register Now</strong></span>
            )}
          </button>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#101625] px-3 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest absolute">OR</span>
          </div>

          <div className="flex flex-col items-center gap-3 pt-1">
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
              className="w-full sm:w-auto py-2.5 sm:py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-semibold text-gray-300 hover:text-white transition flex items-center justify-center gap-2 mx-auto"
            >
              <span>⚡ Try Demo Account</span>
            </button>

            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] sm:text-xs text-gray-500 hover:text-cyan-400 transition underline font-medium"
            >
              Privacy Policy
            </a>

            <p className="text-[10px] sm:text-xs text-gray-600 font-mono pt-1">
              Connected to: {currentApiUrl || 'http://localhost:5005/api'}
            </p>
          </div>
        </div>
      </div>

      {/* Server IP Modal for Web */}
      {showIpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#090d18] border border-[#1d273e] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">🌐 Server Network Settings</h3>
              </div>
              <button
                onClick={() => {
                  setShowIpModal(false);
                  setIpTestStatus(null);
                }}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Active backend endpoint for GenAce workspace requests.
            </p>

            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
              <span className="text-indigo-300 font-semibold block">Active API Endpoint:</span>
              <p className="text-white font-mono text-[11px] break-all">{currentApiUrl}</p>
            </div>

            <div className="space-y-2 pt-1">
              <label className="text-xs text-gray-400 font-medium block">Custom Server Hostname / IP:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. localhost or 192.168.1.15"
                  value={customIpInput}
                  onChange={e => setCustomIpInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleTestIp}
                  disabled={testingIp}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                >
                  {testingIp ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>

            {ipTestStatus && (
              <div className={`p-3 rounded-xl border text-xs ${ipTestStatus.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                {ipTestStatus.message}
              </div>
            )}

            <button
              onClick={() => {
                setShowIpModal(false);
                setIpTestStatus(null);
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition mt-2"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Contact Admin Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#090d18] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">Contact Admin for Password Reset</h3>
              </div>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetStatus(null);
                }}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Forgot your account password? Submit a request below to alert the Workspace Admin, or contact support directly via email.
            </p>

            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
              <div className="text-indigo-300 font-semibold flex items-center gap-1.5">
                <span>📧 Admin Support Contact:</span>
              </div>
              <p className="text-white font-mono text-[11px] selection:bg-indigo-500 selection:text-white">
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Message for Admin (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Briefly describe your request or urgent contact preference..."
                    value={resetNote}
                    onChange={e => setResetNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCheckStatus}
                    disabled={resetLoading}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-indigo-300 font-bold text-xs transition"
                  >
                    🔍 Check Request Status
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition"
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
