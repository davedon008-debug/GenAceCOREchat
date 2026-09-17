'use client';

import { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Key, X, Eye, EyeOff, Check, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import api from '../lib/api';

export default function PasscodeModal({
  isOpen,
  mode = 'unlock', // 'unlock' | 'setup' | 'change'
  chatTitle = '',
  onSuccess,
  onClose,
}) {
  const [passcode, setPasscode] = useState('');
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [step, setStep] = useState(mode === 'change' ? 'verify' : 'enter'); // 'verify' | 'enter' | 'confirm'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      setCurrentPasscode('');
      setConfirmPasscode('');
      setError('');
      setStep(mode === 'change' ? 'verify' : 'enter');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const triggerError = (msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleUnlock = async (codeToSubmit = passcode) => {
    if (!codeToSubmit || codeToSubmit.length < 4) {
      triggerError('Passcode must be at least 4 digits');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/verify-passcode', { passcode: codeToSubmit });
      if (res.data.success && res.data.valid) {
        if (onSuccess) onSuccess(codeToSubmit);
      } else {
        triggerError(res.data.message || 'Incorrect passcode. Access denied.');
      }
    } catch (err) {
      triggerError(err.response?.data?.message || 'Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupOrChange = async () => {
    if (mode === 'change' && step === 'verify') {
      if (!currentPasscode || currentPasscode.length < 4) {
        triggerError('Enter your current passcode');
        return;
      }
      setLoading(true);
      try {
        const res = await api.post('/auth/verify-passcode', { passcode: currentPasscode });
        if (res.data.success && res.data.valid) {
          setStep('enter');
          setError('');
        } else {
          triggerError('Incorrect current passcode');
        }
      } catch (err) {
        triggerError(err.response?.data?.message || 'Verification failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === 'enter') {
      if (!passcode || passcode.length < 4) {
        triggerError('Passcode must be at least 4 characters');
        return;
      }
      setStep('confirm');
      setError('');
      return;
    }

    if (step === 'confirm') {
      if (passcode !== confirmPasscode) {
        triggerError('Passcodes do not match. Try again.');
        setConfirmPasscode('');
        return;
      }

      setLoading(true);
      try {
        const res = await api.post('/auth/chat-passcode', {
          passcode,
          currentPasscode: mode === 'change' ? currentPasscode : undefined,
        });
        if (res.data.success) {
          if (onSuccess) onSuccess(res.data);
          onClose();
        }
      } catch (err) {
        triggerError(err.response?.data?.message || 'Failed to save passcode');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleKeyPadPress = (num) => {
    setError('');
    if (mode === 'unlock') {
      if (passcode.length < 6) {
        setPasscode(prev => prev + num);
      }
    } else if (step === 'verify') {
      if (currentPasscode.length < 6) setCurrentPasscode(prev => prev + num);
    } else if (step === 'enter') {
      if (passcode.length < 6) setPasscode(prev => prev + num);
    } else if (step === 'confirm') {
      if (confirmPasscode.length < 6) setConfirmPasscode(prev => prev + num);
    }
  };

  const handleKeyPadDelete = () => {
    setError('');
    if (mode === 'unlock') {
      setPasscode(prev => prev.slice(0, -1));
    } else if (step === 'verify') {
      setCurrentPasscode(prev => prev.slice(0, -1));
    } else if (step === 'enter') {
      setPasscode(prev => prev.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPasscode(prev => prev.slice(0, -1));
    }
  };

  const activeVal = mode === 'unlock'
    ? passcode
    : (step === 'verify' ? currentPasscode : (step === 'enter' ? passcode : confirmPasscode));

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div
        className={`w-full max-w-sm rounded-3xl bg-[#0f172a] border border-[#27344d] p-6 shadow-2xl space-y-6 relative transition-transform ${
          shake ? 'animate-bounce border-rose-500' : ''
        }`}
      >
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 mx-auto shadow-lg shadow-indigo-500/25">
            <div className="w-full h-full rounded-[22px] bg-[#0c101c] flex items-center justify-center">
              {mode === 'unlock' ? (
                <Lock className="w-6 h-6 text-indigo-400" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              )}
            </div>
          </div>

          <h3 className="text-base font-bold text-white font-outfit">
            {mode === 'unlock'
              ? 'Enter Passcode'
              : (step === 'verify'
                  ? 'Verify Current Passcode'
                  : (step === 'enter' ? 'Set Special Passcode' : 'Confirm Special Passcode'))}
          </h3>
          <p className="text-xs text-gray-400">
            {mode === 'unlock'
              ? (chatTitle ? `Chat with "${chatTitle}" is locked.` : 'Enter your special passcode to unlock this chat.')
              : (step === 'verify'
                  ? 'Enter your current passcode to make changes.'
                  : (step === 'enter'
                      ? 'Choose a 4-6 digit passcode to lock your chats.'
                      : 'Re-enter your special passcode to confirm.'))}
          </p>
        </div>

        {/* Passcode Dots or Input */}
        <div className="space-y-4">
          <div className="flex justify-center items-center gap-3 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const filled = activeVal.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                    filled
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 border-indigo-400 shadow-md shadow-indigo-500/40 scale-110'
                      : 'bg-white/5 border-white/20'
                  }`}
                />
              );
            })}
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              style={{
                WebkitTextSecurity: showPasscode ? 'none' : 'disc',
                MozTextSecurity: showPasscode ? 'none' : 'disc'
              }}
              autoComplete="off"
              name="chat_passcode_pin_entry"
              id="chat_passcode_pin_entry"
              data-lpignore="true"
              data-form-type="other"
              value={activeVal}
              onChange={(e) => {
                setError('');
                const val = e.target.value;
                if (mode === 'unlock') setPasscode(val);
                else if (step === 'verify') setCurrentPasscode(val);
                else if (step === 'enter') setPasscode(val);
                else setConfirmPasscode(val);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (mode === 'unlock') handleUnlock();
                  else handleSetupOrChange();
                }
              }}
              placeholder="Or type passcode..."
              className="w-full bg-[#0c101c] border border-[#27344d] rounded-2xl px-4 py-2.5 pr-10 text-center text-sm tracking-widest text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPasscode(!showPasscode)}
              className="absolute right-3 top-3 text-gray-400 hover:text-white"
            >
              {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* On-Screen Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPadPress(String(num))}
              className="py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/5 active:scale-95 transition"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleKeyPadDelete}
            className="py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-semibold text-xs border border-white/5 transition"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeyPadPress('0')}
            className="py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/5 active:scale-95 transition"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => {
              if (mode === 'unlock') handleUnlock();
              else handleSetupOrChange();
            }}
            disabled={loading}
            className="py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition flex items-center justify-center disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'unlock' ? (
              <Unlock className="w-4 h-4" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
