'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  ChevronRight,
  X,
  Eye,
  Send,
  Trash2,
  Camera,
  Type,
  Image as ImageIcon,
  Shield,
  Clock,
  VolumeX,
  Volume2,
  Search,
  Check,
  UserX,
  Users,
  Globe,
  Sparkles,
  Pause,
  Play,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import api, { getMediaUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const BG_GRADIENTS = [
  { id: 'indigo', name: 'Indigo', bg: 'linear-gradient(135deg, #4f46e5, #7c3aed)', solid: '#4f46e5' },
  { id: 'purple', name: 'Purple', bg: 'linear-gradient(135deg, #7c3aed, #c026d3)', solid: '#7c3aed' },
  { id: 'pink', name: 'Sunset', bg: 'linear-gradient(135deg, #db2777, #f97316)', solid: '#db2777' },
  { id: 'emerald', name: 'Emerald', bg: 'linear-gradient(135deg, #059669, #0d9488)', solid: '#059669' },
  { id: 'cyan', name: 'Cyan Ocean', bg: 'linear-gradient(135deg, #0284c7, #2563eb)', solid: '#0284c7' },
  { id: 'amber', name: 'Warm Amber', bg: 'linear-gradient(135deg, #d97706, #ea580c)', solid: '#d97706' },
  { id: 'dark', name: 'Obsidian', bg: 'linear-gradient(135deg, #18181b, #09090b)', solid: '#18181b' },
  { id: 'crimson', name: 'Crimson', bg: 'linear-gradient(135deg, #e11d48, #9f1239)', solid: '#e11d48' }
];

const FONT_OPTIONS = [
  { id: 'default', label: 'Modern Sans', style: 'font-sans' },
  { id: 'serif', label: 'Classic Serif', style: 'font-serif' },
  { id: 'mono', label: 'Tech Mono', style: 'font-mono' }
];

export default function StatusBar({ onSelectConversation }) {
  const { activePersona } = useAuth();
  const socketCtx = useSocket();
  const socket = socketCtx?.socket;

  const [mounted, setMounted] = useState(false);
  const [feed, setFeed] = useState({
    myStatuses: [],
    recentStatuses: [],
    viewedStatuses: [],
    mutedStatuses: []
  });
  const [privacy, setPrivacy] = useState(null);
  const [contactsList, setContactsList] = useState([]);

  // Modals state
  const [showComposer, setShowComposer] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showUpdatesListModal, setShowUpdatesListModal] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);

  // Composer state
  const [composerMode, setComposerMode] = useState('text'); // 'text' | 'media'
  const [textContent, setTextContent] = useState('');
  const [bgIndex, setBgIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isPosting, setIsPosting] = useState(false);

  // Privacy modal state
  const [selectedPrivacyType, setSelectedPrivacyType] = useState('all_contacts');
  const [excludedContactIds, setExcludedContactIds] = useState(new Set());
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  // Viewer state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyToast, setReplyToast] = useState('');
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isVideoBuffering, setIsVideoBuffering] = useState(true);
  const [videoError, setVideoError] = useState(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);

  const fileInputRef = useRef(null);
  const holdStartRef = useRef(0);
  const wasHoldRef = useRef(false);
  const videoRef = useRef(null);
  const viewedIdsRef = useRef(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Instant localStorage cache restore
  useEffect(() => {
    if (!activePersona?._id || typeof window === 'undefined') return;
    const cacheKey = `donchat_status_feed_${activePersona._id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          setFeed(parsed);
        }
      } catch (e) {}
    }
  }, [activePersona?._id]);

  // Fetch status feed & optional privacy settings
  const fetchFeed = async (fetchPrivacyToo = false) => {
    try {
      const feedPromise = api.get('/statuses/feed').catch(() => ({ data: { success: false } }));
      const privPromise = fetchPrivacyToo ? api.get('/statuses/privacy').catch(() => ({ data: { success: false } })) : null;

      const [res, privRes] = await Promise.all([
        feedPromise,
        privPromise
      ]);

      if (res.data?.success) {
        const newFeed = {
          myStatuses: res.data.myStatuses || [],
          recentStatuses: res.data.recentStatuses || [],
          viewedStatuses: res.data.viewedStatuses || [],
          mutedStatuses: res.data.mutedStatuses || []
        };
        setFeed(newFeed);
        if (activePersona?._id && typeof window !== 'undefined') {
          try {
            localStorage.setItem(`donchat_status_feed_${activePersona._id}`, JSON.stringify(newFeed));
          } catch (e) {}
        }
      }
      if (privRes?.data?.success) {
        setPrivacy(privRes.data.statusPrivacy);
        setSelectedPrivacyType(privRes.data.statusPrivacy?.defaultType || 'all_contacts');
        const muted = (privRes.data.statusPrivacy?.mutedViewers || []).map(p => (p._id || p).toString());
        setExcludedContactIds(new Set(muted));
        setContactsList(privRes.data.contacts || []);
      }
    } catch (e) {
      console.error('Failed to load status feed:', e);
    }
  };

  useEffect(() => {
    if (activePersona?._id) {
      fetchFeed(true);
    }
  }, [activePersona?._id]);

  // Socket updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchFeed(false);
    socket.on('status:created', handleUpdate);
    socket.on('status:viewed', handleUpdate);
    socket.on('status:deleted', handleUpdate);
    return () => {
      socket.off('status:created', handleUpdate);
      socket.off('status:viewed', handleUpdate);
      socket.off('status:deleted', handleUpdate);
    };
  }, [socket]);

  // Reset progress when active status changes
  useEffect(() => {
    setProgressPercent(0);
  }, [currentIdx, activeGroup]);

  // Story Auto-Advance & Fluid Linear Progress (WhatsApp & Telegram Style)
  useEffect(() => {
    if (!showViewer || !activeGroup || isPaused || showViewersSheet) return;
    const statuses = activeGroup.statuses || [];
    if (statuses.length === 0) return;

    const isMe = String(activeGroup.persona?._id) === String(activePersona?._id);
    const currItem = statuses[currentIdx];
    const currId = currItem?._id ? String(currItem._id) : null;
    if (currId && !isMe && !viewedIdsRef.current.has(currId)) {
      viewedIdsRef.current.add(currId);
      currItem.isSeen = true;
      api.post(`/statuses/${currId}/view`).catch(() => {});
    }

    // Video status progress and advance is driven by video duration and onEnded!
    if (currItem?.type === 'video') {
      return;
    }

    const duration = 5000;
    const intervalMs = 25;
    const step = (intervalMs / duration) * 100;

    const interval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 100) {
          if (currentIdx < statuses.length - 1) {
            setCurrentIdx(c => c + 1);
            return 0;
          } else {
            setShowViewer(false);
            return 100;
          }
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [showViewer, activeGroup, currentIdx, isPaused, showViewersSheet]);

  // Synchronize muted DOM property with state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Robust play helper with automatic muted fallback when browser autoplay policy blocks unmuted audio
  const attemptPlayVideo = (forceMuted = false) => {
    const vid = videoRef.current;
    if (!vid) return;

    if (forceMuted) {
      vid.muted = true;
      setIsMuted(true);
    } else {
      vid.muted = isMuted;
    }

    const playPromise = vid.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsAutoplayBlocked(false);
        })
        .catch((err) => {
          console.warn('Playback attempt rejected:', err?.name || err);
          if (!forceMuted && !vid.muted) {
            // Unmuted autoplay blocked by browser policy -> fallback to muted autoplay immediately!
            vid.muted = true;
            setIsMuted(true);
            const retryPromise = vid.play();
            if (retryPromise !== undefined) {
              retryPromise
                .then(() => {
                  setIsAutoplayBlocked(false);
                })
                .catch((err2) => {
                  console.warn('Muted playback also blocked:', err2?.name || err2);
                  setIsAutoplayBlocked(true);
                });
            }
          } else {
            setIsAutoplayBlocked(true);
          }
        });
    }
  };

  // Video playback control on viewer open / status index / pause / active group change
  useEffect(() => {
    if (!showViewer) return;
    const curr = activeGroup?.statuses?.[currentIdx];
    if (curr?.type !== 'video') return;

    setIsVideoBuffering(true);
    setVideoError(null);
    setIsAutoplayBlocked(false);

    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        attemptPlayVideo(false);
      }
    }
  }, [showViewer, isPaused, currentIdx, activeGroup]);

  // Reset video time on story slide change
  useEffect(() => {
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = 0;
      } catch (e) {}
    }
  }, [currentIdx]);

  // Story Viewer Launcher Helper
  const openStoryViewer = (group, initialIndex = null) => {
    setActiveGroup(group);
    let idx = initialIndex;
    if (idx === null || idx === undefined) {
      const firstUnseen = (group.statuses || []).findIndex(s => !s.isSeen);
      idx = firstUnseen >= 0 ? firstUnseen : 0;
    }
    setCurrentIdx(idx);
    setIsPaused(false);
    setIsVideoBuffering(true);
    setVideoError(null);
    setIsAutoplayBlocked(false);
    setProgressPercent(0);
    setShowViewer(true);
  };

  // Keyboard Navigation (Arrows, Space, Escape)
  useEffect(() => {
    if (!showViewer) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowViewer(false);
      } else if (e.key === 'ArrowRight') {
        if (currentIdx < (activeGroup?.statuses?.length || 1) - 1) {
          setCurrentIdx(prev => prev + 1);
        } else {
          setShowViewer(false);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIdx > 0) {
          setCurrentIdx(prev => prev - 1);
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showViewer, currentIdx, activeGroup]);

  const handlePointerDown = () => {
    holdStartRef.current = Date.now();
    wasHoldRef.current = false;
    setIsPaused(true);
  };

  const handlePointerUp = () => {
    if (Date.now() - holdStartRef.current > 200) {
      wasHoldRef.current = true;
    }
    setIsPaused(false);
  };

  const handleHotspotClick = (direction) => {
    if (wasHoldRef.current) {
      wasHoldRef.current = false;
      return;
    }
    if (direction === 'prev') {
      if (currentIdx > 0) {
        setCurrentIdx(prev => prev - 1);
      } else if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    } else {
      if (currentIdx < (activeGroup?.statuses?.length || 1) - 1) {
        setCurrentIdx(prev => prev + 1);
      } else {
        setShowViewer(false);
      }
    }
  };

  // Media Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    const url = URL.createObjectURL(file);
    const isVid = file.type.startsWith('video/');
    setMediaPreview({ url, isVideo: isVid });
    setComposerMode('media');
  };

  // Publish Status
  const handlePublish = async () => {
    if (composerMode === 'text' && !textContent.trim()) return;
    if (composerMode === 'media' && !mediaFile) return;

    setIsPosting(true);
    try {
      let uploadedUrl = '';
      if (composerMode === 'media' && mediaFile) {
        const formData = new FormData();
        formData.append('file', mediaFile);
        const upRes = await api.post('/upload', formData);
        if (upRes.data?.success) {
          uploadedUrl = upRes.data.url;
        }
      }

      const payload = {
        type: composerMode === 'media' ? (mediaPreview?.isVideo ? 'video' : 'image') : 'text',
        content: composerMode === 'media' ? caption.trim() : textContent.trim(),
        mediaUrl: uploadedUrl,
        backgroundColor: BG_GRADIENTS[bgIndex].solid,
        fontStyle: FONT_OPTIONS[fontIndex].id,
        privacy: {
          type: selectedPrivacyType || 'all_contacts',
          excludedPersonas: Array.from(excludedContactIds)
        }
      };

      const res = await api.post('/statuses', payload);
      if (res.data?.success) {
        setTextContent('');
        setCaption('');
        setMediaFile(null);
        setMediaPreview(null);
        setShowComposer(false);
        fetchFeed();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post status');
    } finally {
      setIsPosting(false);
    }
  };

  // Reply to Story Privately
  const handleSendReply = async (textToSend) => {
    const text = (textToSend || replyInput || '').trim();
    const currItem = activeGroup?.statuses?.[currentIdx];
    if (!text || !currItem || isSendingReply) return;

    setIsSendingReply(true);
    try {
      const res = await api.post('/statuses/reply', {
        statusId: currItem._id,
        content: text
      });
      if (res.data?.success) {
        setReplyInput('');
        setReplyToast('✓ Sent privately to direct chat!');
        setTimeout(() => setReplyToast(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Save Privacy
  const handleSavePrivacy = async () => {
    setIsSavingPrivacy(true);
    try {
      const res = await api.patch('/statuses/privacy', {
        defaultType: selectedPrivacyType,
        mutedViewers: Array.from(excludedContactIds)
      });
      if (res.data?.success) {
        setPrivacy(res.data.statusPrivacy);
        setShowPrivacyModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Could not save privacy settings');
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const hasMyStatus = feed.myStatuses && feed.myStatuses.length > 0;
  const allOthers = [...feed.recentStatuses, ...feed.viewedStatuses];

  const privacySummaryLabel = () => {
    if (selectedPrivacyType === 'exclude' || excludedContactIds.size > 0) {
      return `Contacts (except ${excludedContactIds.size})`;
    }
    if (selectedPrivacyType === 'everyone') return 'Everyone (Public)';
    return 'My Contacts';
  };

  return (
    <div className="px-3 py-2 border-b border-white/5 select-none">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 rounded-full bg-indigo-500" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">STATUS</span>
        </div>
        <button
          onClick={() => setShowUpdatesListModal(true)}
          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition"
        >
          See updates <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Horizontal Stories Rail */}
      <div className="flex items-start gap-2.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
        {/* 1. My Status Item */}
        <div
          onClick={() => {
            if (hasMyStatus) {
              openStoryViewer({ persona: activePersona, statuses: feed.myStatuses }, 0);
            } else {
              setShowComposer(true);
            }
          }}
          className="flex flex-col items-center w-[58px] shrink-0 cursor-pointer group"
        >
          <div className="relative w-12 h-12 mb-1 flex items-center justify-center">
            <div className={`w-12 h-12 rounded-full p-[2px] flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
              hasMyStatus
                ? 'border-2 border-indigo-500 shadow-md shadow-indigo-500/20'
                : 'border-2 border-dashed border-indigo-400/50 bg-indigo-500/10 group-hover:border-indigo-400'
            }`}>
              <img
                src={getMediaUrl(activePersona?.avatar, activePersona?.displayName)}
                alt="My Status"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowComposer(true);
              }}
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-indigo-600 hover:bg-indigo-500 border border-slate-900 flex items-center justify-center text-white text-[10px] shadow"
              title="Add status update"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>
          <span className="text-[10px] font-bold text-white truncate w-full text-center">My Status</span>
          <span className="text-[9px] text-gray-400 truncate w-full text-center">
            {hasMyStatus ? `${feed.myStatuses.length} updates` : 'Add update'}
          </span>
        </div>

        {/* 2. Other Users' Statuses */}
        {allOthers.map((group, idx) => {
          const author = group.persona;
          const isSeen = !group.hasUnseen;
          const authorName = author?.displayName || author?.username || 'User';

          return (
            <div
              key={author?._id || idx}
              onClick={() => openStoryViewer(group)}
              className="flex flex-col items-center w-[58px] shrink-0 cursor-pointer group"
            >
              <div className="relative w-12 h-12 mb-1 flex items-center justify-center">
                <div className={`w-12 h-12 rounded-full p-[2px] flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
                  isSeen
                    ? 'border-2 border-white/20'
                    : 'border-2 border-indigo-500 shadow-md shadow-indigo-500/30'
                }`}>
                  <img
                    src={getMediaUrl(author?.avatar, authorName)}
                    alt={authorName}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                  isSeen ? 'bg-gray-500' : 'bg-indigo-500'
                }`} />
              </div>
              <span className="text-[10px] font-bold text-white truncate w-full text-center">{authorName}</span>
              {!isSeen && group.statuses?.length === 1 ? (
                <span className="text-[8px] font-extrabold bg-indigo-500/25 text-indigo-300 px-1 rounded">New</span>
              ) : (
                <span className="text-[9px] text-gray-400 truncate w-full text-center">
                  {isSeen ? 'Viewed' : `${group.statuses?.length} updates`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*"
        className="hidden"
      />

      {/* ======================================================== */}
      {/* PORTALED MODALS: Break out of sidebar transforms completely */}
      {/* ======================================================== */}
      {mounted && createPortal(
        <>
          {/* 1. STATUS COMPOSER MODAL */}
          {showComposer && (
            <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-fadeIn">
              <div 
                className="w-full h-full sm:max-w-lg sm:h-[92vh] sm:max-h-[640px] sm:rounded-3xl overflow-hidden border-0 sm:border border-white/15 shadow-2xl flex flex-col relative transition-all"
                style={{ 
                  background: composerMode === 'text' ? BG_GRADIENTS[bgIndex].bg : '#090d18'
                }}
              >
                {/* Top Control Bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-sm border-b border-white/10 shrink-0">
                  <button 
                    onClick={() => setShowComposer(false)} 
                    className="w-9 h-9 rounded-full bg-black/30 hover:bg-white/15 text-white flex items-center justify-center transition"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {/* Mode Switcher */}
                  <div className="flex items-center bg-black/50 p-1 rounded-full border border-white/10">
                    <button
                      onClick={() => setComposerMode('text')}
                      className={`px-3.5 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                        composerMode === 'text' ? 'bg-white/25 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Type className="w-3.5 h-3.5" /> Text
                    </button>
                    <button
                      onClick={() => {
                        if (!mediaPreview) {
                          fileInputRef.current?.click();
                        } else {
                          setComposerMode('media');
                        }
                      }}
                      className={`px-3.5 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                        composerMode === 'media' ? 'bg-white/25 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" /> Photo / Video
                    </button>
                  </div>

                  {/* Top Right Action Tools */}
                  <div className="flex items-center gap-2">
                    {composerMode === 'text' ? (
                      <button
                        onClick={() => setFontIndex(prev => (prev + 1) % FONT_OPTIONS.length)}
                        className="px-2.5 py-1.5 rounded-full bg-black/30 hover:bg-white/15 text-white text-xs font-bold transition"
                        title="Change Font Style"
                      >
                        {FONT_OPTIONS[fontIndex].label.split(' ')[1]}
                      </button>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-9 h-9 rounded-full bg-black/30 hover:bg-white/15 text-white flex items-center justify-center transition"
                        title="Change Media File"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Composer Canvas */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-y-auto">
                  {composerMode === 'text' ? (
                    <div className="w-full max-w-md flex flex-col items-center justify-center my-auto">
                      <textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="Type a status..."
                        maxLength={500}
                        rows={4}
                        className={`w-full bg-transparent text-center text-white text-3xl sm:text-4xl font-extrabold placeholder-white/50 focus:outline-none resize-none leading-snug ${FONT_OPTIONS[fontIndex].style}`}
                        autoFocus
                      />

                      {/* Color Palette Quick Selector */}
                      <div className="flex items-center justify-center gap-2 mt-8 p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                        {BG_GRADIENTS.map((g, idx) => (
                          <button
                            key={g.id}
                            onClick={() => setBgIndex(idx)}
                            className={`w-6 h-6 rounded-full transition-transform ${
                              bgIndex === idx ? 'scale-125 ring-2 ring-white shadow-lg' : 'hover:scale-110 opacity-80'
                            }`}
                            style={{ background: g.bg }}
                            title={g.name}
                          />
                        ))}
                      </div>

                      {/* Quick Emoji Bar */}
                      <div className="flex items-center justify-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-black/30 border border-white/10">
                        {['🔥', '✨', '💜', '😎', '🎉', '🚀', '❤️', '💡'].map((em) => (
                          <button
                            key={em}
                            onClick={() => setTextContent(prev => prev + em)}
                            className="text-lg hover:scale-125 transition"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : mediaPreview ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <div className="relative flex-1 w-full max-h-[380px] flex items-center justify-center rounded-2xl overflow-hidden bg-black/60 border border-white/10">
                        {mediaPreview.isVideo ? (
                          <video src={mediaPreview.url} autoPlay loop muted controls className="max-h-full max-w-full object-contain" />
                        ) : (
                          <img src={mediaPreview.url} alt="Preview" className="max-h-full max-w-full object-contain" />
                        )}
                      </div>
                      <input
                        type="text"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a caption..."
                        className="mt-4 w-full bg-black/60 border border-white/20 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition shadow-inner"
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-72 border-2 border-dashed border-white/25 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mb-3">
                        <ImageIcon className="w-8 h-8 text-indigo-400" />
                      </div>
                      <p className="text-white text-base font-bold">Choose a Photo or Video</p>
                      <p className="text-gray-400 text-xs mt-1">Supports JPG, PNG, GIF, MP4, WEBM</p>
                    </div>
                  )}
                </div>

                {/* Bottom Information & Publish Bar */}
                <div className="px-5 py-3.5 bg-black/50 backdrop-blur-md border-t border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex flex-col">
                    <button
                      onClick={() => setShowPrivacyModal(true)}
                      className="flex items-center gap-1.5 text-xs font-bold text-white hover:text-indigo-300 transition"
                      title="Configure Status Privacy"
                    >
                      <Shield className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{privacySummaryLabel()}</span>
                    </button>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> Disappears automatically in 24 hours
                    </span>
                  </div>

                  <button
                    onClick={handlePublish}
                    disabled={isPosting}
                    className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                  >
                    {isPosting ? 'Posting...' : <><Send className="w-4 h-4" /> Post Status</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. FULLSCREEN STORY VIEWER MODAL */}
          {showViewer && activeGroup && (
            <div className="fixed inset-0 z-[9999] bg-black sm:bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-fadeIn">
              <div 
                className="w-full max-w-[420px] h-full sm:h-[92vh] sm:max-h-[780px] sm:rounded-3xl overflow-hidden relative flex flex-col bg-slate-950 border-0 sm:border border-white/10 shadow-2xl select-none"
                onMouseDown={handlePointerDown}
                onMouseUp={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchEnd={handlePointerUp}
              >
                {/* Segmented Progress Bars at Top */}
                <div className="absolute top-2.5 left-3 right-3 z-30 flex items-center gap-1">
                  {(activeGroup.statuses || []).map((st, i) => (
                    <div key={st._id || i} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
                      <div
                        className="h-full bg-white transition-none"
                        style={{
                          width: i < currentIdx ? '100%' : i === currentIdx ? `${progressPercent}%` : '0%'
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Author Header */}
                <div className="absolute top-6 left-3 right-3 z-30 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={getMediaUrl(activeGroup.persona?.avatar, activeGroup.persona?.displayName)}
                      alt="Author"
                      className="w-9 h-9 rounded-full border-2 border-white object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold leading-tight">{activeGroup.persona?.displayName || 'User'}</p>
                      <p className="text-[10px] text-gray-300">24h Status Story</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Pause / Play Button */}
                    <button
                      onClick={() => setIsPaused(prev => !prev)}
                      className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
                      title={isPaused ? "Play" : "Pause"}
                    >
                      {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>

                    {String(activeGroup.persona?._id) === String(activePersona?._id) && (
                      <button
                        onClick={async () => {
                          const curr = activeGroup.statuses?.[currentIdx];
                          if (!curr) return;
                          if (confirm('Delete this status update?')) {
                            await api.delete(`/statuses/${curr._id}`);
                            setShowViewer(false);
                            fetchFeed();
                          }
                        }}
                        className="p-1.5 rounded-full hover:bg-white/20 text-rose-400 transition"
                        title="Delete Status"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setShowViewer(false)}
                      className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Main Media / Text Display */}
                <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black">
                  {(() => {
                    const curr = activeGroup.statuses?.[currentIdx];
                    if (!curr) return null;
                    if (curr.type === 'text') {
                      return (
                        <div
                          className="w-full h-full flex items-center justify-center p-8 text-center"
                          style={{ backgroundColor: curr.backgroundColor || '#6366f1' }}
                        >
                          <p className="text-white text-2xl sm:text-3xl font-extrabold leading-snug drop-shadow-md">
                            {curr.content}
                          </p>
                        </div>
                      );
                    }
                    if (curr.type === 'video') {
                      const videoSrc = getMediaUrl(curr.mediaUrl);
                      return (
                        <div className="w-full h-full flex items-center justify-center bg-black relative select-none">
                          <video
                            key={`vid_${curr._id || curr.mediaUrl}_${currentIdx}`}
                            ref={(el) => {
                              videoRef.current = el;
                              if (el) {
                                el.muted = isMuted;
                              }
                            }}
                            src={videoSrc}
                            autoPlay
                            playsInline
                            preload="auto"
                            muted={isMuted}
                            className="max-h-full max-w-full object-contain cursor-pointer"
                            onLoadStart={() => {
                              setIsVideoBuffering(true);
                              setVideoError(null);
                            }}
                            onLoadedMetadata={() => {
                              if (!isPaused) {
                                attemptPlayVideo(false);
                              }
                            }}
                            onCanPlay={() => {
                              setIsVideoBuffering(false);
                              if (!isPaused && videoRef.current?.paused) {
                                attemptPlayVideo(false);
                              }
                            }}
                            onWaiting={() => {
                              setIsVideoBuffering(true);
                            }}
                            onPlaying={() => {
                              setIsVideoBuffering(false);
                              setIsAutoplayBlocked(false);
                            }}
                            onError={(e) => {
                              console.error('Video error:', e);
                              setIsVideoBuffering(false);
                              setVideoError('Unable to play video. Tap to retry.');
                            }}
                            onTimeUpdate={(e) => {
                              if (e.currentTarget.duration) {
                                const pct = (e.currentTarget.currentTime / e.currentTarget.duration) * 100;
                                setProgressPercent(Math.min(100, Math.max(0, pct)));
                              }
                            }}
                            onEnded={() => {
                              if (currentIdx < (activeGroup?.statuses?.length || 1) - 1) {
                                setCurrentIdx(c => c + 1);
                                setProgressPercent(0);
                              } else {
                                setShowViewer(false);
                                setProgressPercent(100);
                              }
                            }}
                          />

                          {/* Buffering Spinner */}
                          {isVideoBuffering && !videoError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] z-20 pointer-events-none">
                              <div className="w-12 h-12 border-4 border-white/20 border-t-indigo-500 rounded-full animate-spin mb-3 shadow-lg" />
                              <span className="text-white text-xs font-semibold tracking-wide drop-shadow">Loading story video...</span>
                            </div>
                          )}

                          {/* Blocked Autoplay / Tap to Play Overlay */}
                          {isAutoplayBlocked && !isVideoBuffering && !videoError && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                attemptPlayVideo(false);
                              }}
                              className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 z-20 cursor-pointer"
                            >
                              <div className="w-16 h-16 rounded-full bg-indigo-600/95 hover:bg-indigo-500 text-white flex items-center justify-center shadow-2xl transition transform hover:scale-105 mb-2">
                                <Play className="w-8 h-8 fill-white ml-1" />
                              </div>
                              <span className="text-white text-xs font-bold tracking-wide bg-black/70 px-3.5 py-1.5 rounded-full border border-white/10">
                                Tap to play video
                              </span>
                            </div>
                          )}

                          {/* Video Error / Retry Overlay */}
                          {videoError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-25 p-6 text-center">
                              <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                              <p className="text-white text-sm font-semibold mb-3">{videoError}</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVideoError(null);
                                  setIsVideoBuffering(true);
                                  if (videoRef.current) {
                                    videoRef.current.load();
                                    attemptPlayVideo(false);
                                  }
                                }}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Tap to Retry
                              </button>
                            </div>
                          )}

                          {/* Muted Indicator Pill (when audio was muted by browser autoplay policy) */}
                          {isMuted && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsMuted(false);
                                if (videoRef.current) {
                                  videoRef.current.muted = false;
                                  videoRef.current.play().catch(() => {});
                                }
                              }}
                              className="absolute top-16 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 text-white text-xs font-medium backdrop-blur-md border border-white/20 shadow-lg transition"
                            >
                              <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                              <span>Tap to unmute</span>
                            </button>
                          )}

                          {/* Volume Toggle Icon in Top Right */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextMuted = !isMuted;
                              setIsMuted(nextMuted);
                              if (videoRef.current) {
                                videoRef.current.muted = nextMuted;
                              }
                            }}
                            className="absolute top-16 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white z-20 transition"
                          >
                            {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4" />}
                          </button>

                          {/* Video Caption */}
                          {curr.content && (
                            <div className="absolute bottom-20 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-xl p-3 text-center text-xs text-white z-20">
                              {curr.content}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div className="w-full h-full flex items-center justify-center bg-black relative">
                        <img
                          src={getMediaUrl(curr.mediaUrl)}
                          alt="Status"
                          className="max-h-full max-w-full object-contain"
                        />
                        {curr.content && (
                          <div className="absolute bottom-20 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-xl p-3 text-center text-xs text-white">
                            {curr.content}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Left / Center / Right Tap Navigation Hotspots */}
                  <div
                    className="absolute inset-y-0 left-0 w-1/4 cursor-pointer z-10"
                    onClick={() => handleHotspotClick('prev')}
                  />
                  <div
                    className="absolute inset-y-0 left-1/4 w-1/2 cursor-pointer z-10"
                    onClick={() => {
                      if (wasHoldRef.current) {
                        wasHoldRef.current = false;
                        return;
                      }
                      setIsPaused(prev => !prev);
                    }}
                  />
                  <div
                    className="absolute inset-y-0 right-0 w-1/4 cursor-pointer z-10"
                    onClick={() => handleHotspotClick('next')}
                  />

                  {/* Center Paused Badge */}
                  {isPaused && !isAutoplayBlocked && (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold tracking-wider uppercase pointer-events-none shadow-lg">
                      <Pause className="w-3 h-3 fill-white" />
                      <span>Paused</span>
                    </div>
                  )}
                </div>

                {/* Bottom Story Action Section */}
                <div className="p-3.5 bg-black/90 border-t border-white/10 z-30">
                  {replyToast && (
                    <div className="text-center text-xs font-bold text-emerald-400 mb-2 animate-bounce">
                      {replyToast}
                    </div>
                  )}

                  {String(activeGroup.persona?._id) === String(activePersona?._id) ? (
                    /* Author: Views Counter & Viewers Sheet Trigger */
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => setShowViewersSheet(true)}
                        className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-xs text-white flex items-center gap-2 font-bold transition"
                      >
                        <Eye className="w-4 h-4 text-indigo-400" />
                        <span>{activeGroup.statuses?.[currentIdx]?.viewers?.length || 0} views</span>
                      </button>
                    </div>
                  ) : (
                    /* Viewer: Private Story Reply & Quick Reactions */
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-around px-2">
                        {['❤️', '😂', '🔥', '👏', '😮', '😢'].map((em) => (
                          <button
                            key={em}
                            onClick={() => handleSendReply(em)}
                            className="text-2xl hover:scale-130 active:scale-95 transition"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                          onFocus={() => setIsPaused(true)}
                          onBlur={() => setIsPaused(false)}
                          placeholder={`Reply privately to ${activeGroup.persona?.displayName || 'user'}...`}
                          className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 transition"
                        />
                        <button
                          onClick={() => handleSendReply()}
                          disabled={!replyInput.trim() || isSendingReply}
                          className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition shadow-md"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Viewers Sheet (For author) */}
                {showViewersSheet && (
                  <div className="absolute inset-x-0 bottom-0 top-36 z-40 bg-slate-900/95 backdrop-blur-md rounded-t-3xl border-t border-white/20 p-4 flex flex-col animate-slideUp">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <span className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-indigo-400" /> Viewed by ({activeGroup.statuses?.[currentIdx]?.viewers?.length || 0})
                      </span>
                      <button onClick={() => setShowViewersSheet(false)} className="p-1 rounded-full hover:bg-white/10 text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-2 space-y-2">
                      {(activeGroup.statuses?.[currentIdx]?.viewers || []).length > 0 ? (
                        activeGroup.statuses[currentIdx].viewers.map((v, i) => (
                          <div key={v.personaId?._id || i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                            <img
                              src={getMediaUrl(v.personaId?.avatar, v.personaId?.displayName)}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover"
                            />
                            <div>
                              <p className="text-xs font-bold text-white">{v.personaId?.displayName || 'User'}</p>
                              <p className="text-[10px] text-gray-400">{new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center text-gray-400 text-xs">
                          No views recorded yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. STATUS PRIVACY MODAL (Mute people from seeing status) */}
          {showPrivacyModal && (
            <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
              <div className="w-full max-w-md bg-[#0f172a] rounded-3xl border border-white/15 p-6 shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-base font-bold text-white">Status Privacy</h3>
                  </div>
                  <button onClick={() => setShowPrivacyModal(false)} className="p-1 rounded-full hover:bg-white/10 text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-gray-300 my-3 leading-relaxed">
                  Choose who can view your 24-hour status updates. Selected muted users will not see any new status stories.
                </p>

                {/* Privacy Options */}
                <div className="space-y-2 mb-4">
                  <div
                    onClick={() => setSelectedPrivacyType('all_contacts')}
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                      selectedPrivacyType === 'all_contacts'
                        ? 'bg-indigo-600/20 border-indigo-500'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-indigo-400" />
                      <div>
                        <p className="text-xs font-bold text-white">My Contacts</p>
                        <p className="text-[10px] text-gray-400">Share with all your contacts</p>
                      </div>
                    </div>
                    {selectedPrivacyType === 'all_contacts' && <Check className="w-4 h-4 text-indigo-400" />}
                  </div>

                  <div
                    onClick={() => setSelectedPrivacyType('exclude')}
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                      selectedPrivacyType === 'exclude'
                        ? 'bg-rose-500/20 border-rose-500'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <UserX className="w-5 h-5 text-rose-400" />
                      <div>
                        <p className="text-xs font-bold text-white">My Contacts Except...</p>
                        <p className="text-[10px] text-gray-400">Mute specific people ({excludedContactIds.size} muted)</p>
                      </div>
                    </div>
                    {selectedPrivacyType === 'exclude' && <Check className="w-4 h-4 text-rose-400" />}
                  </div>

                  <div
                    onClick={() => setSelectedPrivacyType('everyone')}
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                      selectedPrivacyType === 'everyone'
                        ? 'bg-emerald-500/20 border-emerald-500'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Everyone</p>
                        <p className="text-[10px] text-gray-400">Public to all GenAce members</p>
                      </div>
                    </div>
                    {selectedPrivacyType === 'everyone' && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                </div>

                {/* Exclude List When 'exclude' is chosen */}
                {selectedPrivacyType === 'exclude' && (
                  <div className="flex-1 overflow-hidden flex flex-col border-t border-white/10 pt-3">
                    <span className="text-xs font-bold text-white mb-2">Select Contacts to Mute:</span>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 mb-2">
                      <Search className="w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={contactSearchQuery}
                        onChange={(e) => setContactSearchQuery(e.target.value)}
                        placeholder="Search contacts..."
                        className="w-full bg-transparent text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 max-h-48 pr-1">
                      {contactsList
                        .filter(c => {
                          const q = contactSearchQuery.toLowerCase();
                          return (c.displayName || '').toLowerCase().includes(q) || (c.username || '').toLowerCase().includes(q);
                        })
                        .map(c => {
                          const isExcluded = excludedContactIds.has(String(c._id));
                          return (
                            <div
                              key={c._id}
                              onClick={() => {
                                const idStr = String(c._id);
                                setExcludedContactIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(idStr)) next.delete(idStr);
                                  else next.add(idStr);
                                  return next;
                                });
                              }}
                              className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                                isExcluded ? 'bg-rose-500/20 border border-rose-500/40' : 'hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={getMediaUrl(c.avatar, c.displayName)}
                                  alt=""
                                  className="w-7 h-7 rounded-full object-cover"
                                />
                                <div>
                                  <p className="text-xs font-bold text-white">{c.displayName || c.username}</p>
                                  <p className="text-[10px] text-gray-400">@{c.username}</p>
                                </div>
                              </div>
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                                isExcluded ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-500'
                              }`}>
                                {isExcluded && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowPrivacyModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePrivacy}
                    disabled={isSavingPrivacy}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition"
                  >
                    {isSavingPrivacy ? 'Saving...' : 'Save Privacy'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. ALL STATUS UPDATES LIST MODAL */}
          {showUpdatesListModal && (
            <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
              <div className="w-full max-w-md bg-[#0f172a] rounded-3xl border border-white/15 p-5 shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-base font-extrabold text-white">Status Updates</h3>
                  <button onClick={() => setShowUpdatesListModal(false)} className="p-1 rounded-full hover:bg-white/10 text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-3 space-y-4">
                  {/* My Status */}
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">MY STATUS</span>
                    <div
                      onClick={() => {
                        setShowUpdatesListModal(false);
                        if (hasMyStatus) {
                          openStoryViewer({ persona: activePersona, statuses: feed.myStatuses }, 0);
                        } else {
                          setShowComposer(true);
                        }
                      }}
                      className="mt-2 flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer border border-white/5 transition"
                    >
                      <img
                        src={getMediaUrl(activePersona?.avatar, activePersona?.displayName)}
                        alt=""
                        className="w-10 h-10 rounded-full border border-indigo-500 object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white">My Status</p>
                        <p className="text-[10px] text-gray-400">{hasMyStatus ? `${feed.myStatuses.length} updates` : 'Tap to add status'}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Recent Updates */}
                  {feed.recentStatuses.length > 0 && (
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-indigo-400 tracking-wider">RECENT UPDATES</span>
                      <div className="mt-2 space-y-1.5">
                        {feed.recentStatuses.map((group, idx) => (
                          <div
                            key={group.persona?._id || idx}
                            onClick={() => {
                              setShowUpdatesListModal(false);
                              openStoryViewer(group);
                            }}
                            className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer border border-white/5 transition"
                          >
                            <img
                              src={getMediaUrl(group.persona?.avatar, group.persona?.displayName)}
                              alt=""
                              className="w-10 h-10 rounded-full border-2 border-indigo-500 object-cover"
                            />
                            <div className="flex-1">
                              <p className="text-xs font-bold text-white">{group.persona?.displayName || 'User'}</p>
                              <p className="text-[10px] text-gray-400">{group.statuses?.length} updates • New</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Viewed Updates */}
                  {feed.viewedStatuses.length > 0 && (
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">VIEWED UPDATES</span>
                      <div className="mt-2 space-y-1.5">
                        {feed.viewedStatuses.map((group, idx) => (
                          <div
                            key={group.persona?._id || idx}
                            onClick={() => {
                              setShowUpdatesListModal(false);
                              openStoryViewer(group);
                            }}
                            className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer border border-white/5 transition"
                          >
                            <img
                              src={getMediaUrl(group.persona?.avatar, group.persona?.displayName)}
                              alt=""
                              className="w-10 h-10 rounded-full border border-white/20 object-cover"
                            />
                            <div className="flex-1">
                              <p className="text-xs font-bold text-white">{group.persona?.displayName || 'User'}</p>
                              <p className="text-[10px] text-gray-400">{group.statuses?.length} updates • Viewed</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Muted Updates */}
                  {feed.mutedStatuses.length > 0 && (
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider flex items-center gap-1">
                        <VolumeX className="w-3 h-3" /> MUTED UPDATES
                      </span>
                      <div className="mt-2 space-y-1.5">
                        {feed.mutedStatuses.map((group, idx) => (
                          <div
                            key={group.persona?._id || idx}
                            className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.02] border border-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={getMediaUrl(group.persona?.avatar, group.persona?.displayName)}
                                alt=""
                                className="w-9 h-9 rounded-full border border-white/10 object-cover opacity-60"
                              />
                              <div>
                                <p className="text-xs font-bold text-gray-300">{group.persona?.displayName || 'User'}</p>
                                <p className="text-[10px] text-gray-500">Muted</p>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                await api.post(`/statuses/mute/${group.persona?._id}`, { mute: false });
                                fetchFeed();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-[10px] font-bold"
                            >
                              Unmute
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {allOthers.length === 0 && (
                    <div className="py-12 text-center text-gray-400 text-xs">
                      No status updates from your contacts yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}
