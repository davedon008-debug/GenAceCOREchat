'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, QrCode, Globe, Sparkles, MessageCircle, ArrowRight } from 'lucide-react';
import { playSentSound } from '../lib/sound';

export default function InviteFriendsModal({ isOpen, onClose, activePersona }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [customLinkType, setCustomLinkType] = useState('browser'); // 'browser' | 'cloud'

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setShowQr(false);
      setToastMessage('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Determine origin URLs
  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://genacecorechat.onrender.com';
  const cloudOrigin = 'https://genacecorechat.onrender.com';
  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Choose the effective invite link
  const inviteUrl = (customLinkType === 'cloud' || (isLocalHost && customLinkType !== 'browser'))
    ? cloudOrigin
    : browserOrigin;

  const inviterHandle = activePersona?.username ? `@${activePersona.username.replace(/^@/, '')}` : '';
  const inviterName = activePersona?.displayName || activePersona?.username || '';

  const shareTitle = 'Join me on GenAce';
  const shareText = inviterName
    ? `Hey! Join me on GenAce (${inviterHandle || inviterName})! Chat in real-time, hang out in collaborative spaces, and connect:`
    : `Hey! Join me on GenAce – chat in real-time, collaborate in spaces, and hang out with friends! Check it out:`;

  const fullShareMessage = `${shareText}\n${inviteUrl}`;

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? '' : prev));
    }, 3200);
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = inviteUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      playSentSound();
      triggerToast('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleCopyFullMessage = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullShareMessage);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = fullShareMessage;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      playSentSound();
      triggerToast('Invite message & link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy full message:', err);
    }
  };

  // 1. Native Device Share Sheet (iOS / Android / macOS / Windows)
  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: inviteUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Native share failed:', err);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // 2. WhatsApp
  const handleShareWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareMessage)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // 3. Snapchat
  const handleShareSnapchat = () => {
    const snapUrl = `https://www.snapchat.com/share?link=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(snapUrl, '_blank', 'noopener,noreferrer');
  };

  // 4. Instagram
  const handleShareInstagram = async () => {
    // Instagram does not offer a direct web URL query parameter for prefilled DMs
    // Best user experience: copy invite link & message, show feedback, and open Instagram Direct Inbox
    await handleCopyFullMessage();
    triggerToast('Link copied! Opening Instagram so you can paste into your DM or Story ✨');
    setTimeout(() => {
      window.open('https://www.instagram.com/direct/inbox/', '_blank', 'noopener,noreferrer');
    }, 600);
  };

  // 5. Telegram
  const handleShareTelegram = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  // 6. X (Twitter)
  const handleShareTwitter = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(inviteUrl)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  };

  const hasNativeShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  return (
    <div
      className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-[#0c111e] border border-indigo-500/30 shadow-2xl shadow-indigo-950/70 overflow-hidden flex flex-col my-auto transition-all transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 pb-4 border-b border-[#1b253b] bg-gradient-to-r from-indigo-950/40 via-[#0e1629] to-blue-950/40">
          {/* Toast Alert */}
          {toastMessage && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/40 animate-bounce flex items-center gap-1.5 whitespace-nowrap">
              <Check className="w-3.5 h-3.5" />
              <span>{toastMessage}</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white font-outfit tracking-tight">
                    Invite Friends
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-bold text-indigo-300">
                    Web Link
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Send GenAce invite to friends on social apps or copy link
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 border border-white/5 hover:border-rose-500/30 transition shrink-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Persona inviter banner */}
          {inviterName && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Inviting as <span className="font-bold text-white">{inviterName}</span> {inviterHandle && <span className="text-cyan-400 font-mono text-[11px]">{inviterHandle}</span>}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Web Version Link Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" /> Web Version Link
              </span>
              {isLocalHost && (
                <div className="flex items-center gap-1 bg-[#141c2e] p-0.5 rounded-lg border border-[#233150] text-[10px]">
                  <button
                    onClick={() => setCustomLinkType('browser')}
                    className={`px-2 py-0.5 rounded-md transition ${customLinkType === 'browser' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    Local Host
                  </button>
                  <button
                    onClick={() => setCustomLinkType('cloud')}
                    className={`px-2 py-0.5 rounded-md transition ${customLinkType === 'cloud' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    Cloud Public
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl bg-[#121929] border border-[#1f2c47] focus-within:border-indigo-500/60 transition">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="w-full bg-transparent text-xs text-indigo-200 font-mono focus:outline-none select-all px-2"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition shrink-0 shadow-md ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
                title="Copy Link"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Native Share Sheet Button (if available on device / mobile browser) */}
          {hasNativeShare && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition transform active:scale-[0.99]"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via Device Sheet (WhatsApp, Instagram, Snapchat...)</span>
            </button>
          )}

          {/* Social Platforms Grid */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Direct Social Share
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* WhatsApp */}
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#121929] hover:bg-[#162137] border border-[#1d2943] hover:border-[#25D366]/50 transition group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] group-hover:scale-105 transition-transform shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white group-hover:text-[#25D366] transition">WhatsApp</h4>
                  <p className="text-[10px] text-gray-400 truncate">Send directly in chats</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#25D366] group-hover:translate-x-0.5 transition shrink-0" />
              </button>

              {/* Instagram */}
              <button
                onClick={handleShareInstagram}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#121929] hover:bg-[#162137] border border-[#1d2943] hover:border-pink-500/50 transition group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.79-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white group-hover:text-pink-400 transition">Instagram</h4>
                  <p className="text-[10px] text-gray-400 truncate">Copy link & open DMs</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-pink-400 group-hover:translate-x-0.5 transition shrink-0" />
              </button>

              {/* Snapchat */}
              <button
                onClick={handleShareSnapchat}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#121929] hover:bg-[#162137] border border-[#1d2943] hover:border-yellow-400/50 transition group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center text-yellow-300 group-hover:scale-105 transition-transform shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M12.016 2.002c-3.924 0-6.398 2.852-6.398 5.803 0 1.11.378 2.215.82 2.97.234.398.242.668.086 1.05-.152.373-.559.736-1.127.89-.554.152-.969.412-1.092.834-.143.496.115.932.744 1.25.967.488 1.957.576 2.457.947.283.21.365.488.242.879-.203.64-1.076 1.688-2.619 2.012-.41.086-.688.355-.668.688.025.404.469.645 1.191.738 1.199.156 2.533-.146 3.73-.787.426-.229.83-.242 1.18-.008.846.564 1.854.832 2.92.832 1.066 0 2.074-.268 2.92-.832.35-.234.754-.221 1.18.008 1.197.641 2.531.943 3.73.787.723-.094 1.166-.334 1.191-.738.02-.332-.258-.602-.668-.688-1.543-.324-2.416-1.371-2.619-2.012-.123-.391-.041-.668.242-.879.5-.371 1.49-.459 2.457-.947.629-.318.887-.754.744-1.25-.123-.422-.537-.682-1.092-.834-.568-.154-.975-.518-1.127-.89-.156-.383-.148-.652.086-1.05.441-.755.82-1.86.82-2.97 0-2.951-2.475-5.803-6.398-5.803z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white group-hover:text-yellow-300 transition">Snapchat</h4>
                  <p className="text-[10px] text-gray-400 truncate">Share snap invite link</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-yellow-300 group-hover:translate-x-0.5 transition shrink-0" />
              </button>

              {/* Telegram */}
              <button
                onClick={handleShareTelegram}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#121929] hover:bg-[#162137] border border-[#1d2943] hover:border-[#229ED9]/50 transition group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9] group-hover:scale-105 transition-transform shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white group-hover:text-[#229ED9] transition">Telegram</h4>
                  <p className="text-[10px] text-gray-400 truncate">Post in chats & channels</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#229ED9] group-hover:translate-x-0.5 transition shrink-0" />
              </button>

              {/* X / Twitter */}
              <button
                onClick={handleShareTwitter}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#121929] hover:bg-[#162137] border border-[#1d2943] hover:border-white/30 transition group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">X (Twitter)</h4>
                  <p className="text-[10px] text-gray-400 truncate">Tweet invite link</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
              </button>

              {/* Copy Full Message */}
              <button
                onClick={handleCopyFullMessage}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#121929] hover:bg-[#162137] border border-[#1d2943] hover:border-indigo-400/50 transition group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300 group-hover:scale-105 transition-transform shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">Copy Full Text</h4>
                  <p className="text-[10px] text-gray-400 truncate">Message + web link</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-indigo-300 group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            </div>
          </div>

          {/* QR Code Section Toggle */}
          <div className="pt-2 border-t border-[#1b253b]">
            <button
              onClick={() => setShowQr(prev => !prev)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#101726] border border-[#1d273e] hover:border-indigo-500/40 text-xs font-semibold text-gray-300 hover:text-white transition"
            >
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-indigo-400" />
                <span>{showQr ? 'Hide In-Person QR Code' : 'Show In-Person QR Code (Scan with phone)'}</span>
              </div>
              <span className="text-[11px] text-indigo-400 font-bold">{showQr ? '▲' : '▼'}</span>
            </button>

            {showQr && (
              <div className="mt-3 p-4 rounded-2xl bg-[#121929] border border-indigo-500/30 flex flex-col items-center justify-center space-y-3 animate-fadeIn">
                <div className="p-3 bg-white rounded-2xl shadow-xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteUrl)}`}
                    alt="GenAce Web Link QR Code"
                    className="w-40 h-40 rounded-lg object-contain"
                  />
                </div>
                <p className="text-[11px] text-gray-400 text-center max-w-xs">
                  Friends can point their camera at this QR code to immediately open the GenAce web app!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1b253b] bg-[#090e18] flex items-center justify-between text-[11px] text-gray-400">
          <span>Powered by GenAce Core</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition font-medium text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
