'use client';

import { useState, useRef, useEffect } from 'react';
import { Flame, Smile, Play, Pause, CheckCheck, Trash2, Copy, Reply, Check, X, Plus, FileText, Download, Lock, Clock, Shield, EyeOff, Ghost, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AvatarViewerModal from './AvatarViewerModal';

const EMOJI_CATEGORIES = [
  {
    id: 'popular',
    label: '🔥 Popular',
    emojis: ['👍', '👎', '❤️', '🔥', '🚀', '🧠', '👏', '😂', '😍', '😮', '😢', '😡', '🎉', '🙏', '💯', '✨', '🥳', '😴', '🤔', '👀', '💩', '🤡', '🙌', '💪']
  },
  {
    id: 'faces',
    label: '😀 Faces',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'
    ]
  },
  {
    id: 'hands',
    label: '👋 Hands',
    emojis: [
      '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦵', '🦶', '👂', '🦻', '👃', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '🖕', '👀', '👁️', '🧠'
    ]
  },
  {
    id: 'hearts',
    label: '❤️ Hearts & Symbols',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '⭐️', '🌟', '💫', '💥', '💢', '💦', '💧', '💨', '⚡️', '🌈', '🎉', '🎊', '🎈', '🔮', '💯', '🎯', '✅', '❌', '⚠️', '⛔️', '🛑', '💬', '💭', '💡'
    ]
  },
  {
    id: 'objects',
    label: '🚀 Objects & Food',
    emojis: [
      '👑', '💎', '🏆', '🥇', '🥈', '🥉', '⚽️', '🏀', '🏈', '⚾️', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥊', '🎯', '🎮', '🎲', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🥁', '🎷', '🎺', '🎸', '🎹', '📱', '💻', '🖥️', '📷', '📸', '📹', '💡', '💰', '💵', '💳', '🎁', '🚀', '🛸', '✈️', '🚗', '🚲', '🍕', '🍔', '🍟', '🌭', '🍿', '🥓', '🥚', '🥞', '🧇', '🧀', '🥗', '☕️', '🍺', '🍻', '🥂', '🍷', '🍹', '🍾', '🎂', '🍰', '🍩', '🍦'
    ]
  }
];

function VoicePlayer({ src, duration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef(null);

  // Sanitize Data URI MIME type by removing codecs parameter for native HTML5 audio compatibility
  const cleanSrc = src ? src.replace(/data:audio\/([^;]+);codecs=[^;]+;base64,/, 'data:audio/$1;base64,') : src;

  const togglePlay = () => {
    if (!audioRef.current || !cleanSrc) {
      console.warn("No audio source available");
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setHasError(false);
      const promise = audioRef.current.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            console.log("Audio playback started successfully");
          })
          .catch((err) => {
            console.error("Audio play error:", err);
            setHasError(true);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
        setAudioDuration(Math.round(audioRef.current.duration));
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col gap-1 min-w-[210px] sm:min-w-[250px]">
      <div className="flex items-center gap-3 p-2 rounded-xl bg-white/10 border border-white/15">
        <audio
          ref={audioRef}
          src={cleanSrc}
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleEnded}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
          onError={(e) => {
            console.error("Audio element error:", e);
            setHasError(true);
          }}
        />
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold flex items-center justify-center shadow-md transition shrink-0"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-slate-950" />
          ) : (
            <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
          )}
        </button>
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between text-[10px] text-gray-200 font-medium">
            <span>🎙️ Voice Note</span>
            <span>{formatTime(currentTime)} / {formatTime(audioDuration || duration || 1)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={audioDuration || duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>
      {hasError && (
        <p className="text-[10px] text-rose-300 italic px-1">Audio playback error or format unsupported.</p>
      )}
    </div>
  );
}

export default function MessageItem({
  message,
  currentPersonaId,
  activePersona: propPersona,
  onReaction,
  onBurnMessage,
  onDeleteMessage,
  onReplyMessage
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState('popular');
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [showMobileActionSheet, setShowMobileActionSheet] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [lightboxImgError, setLightboxImgError] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [burnCountdown, setBurnCountdown] = useState(10);
  const touchTimerRef = useRef(null);
  const burnIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (burnIntervalRef.current) clearInterval(burnIntervalRef.current);
    };
  }, []);

  const handleStartReveal = (e) => {
    e.stopPropagation();
    setIsRevealed(true);
    setBurnCountdown(10);

    if (burnIntervalRef.current) clearInterval(burnIntervalRef.current);
    burnIntervalRef.current = setInterval(() => {
      setBurnCountdown(prev => {
        if (prev <= 1) {
          clearInterval(burnIntervalRef.current);
          if (onBurnMessage) onBurnMessage(message._id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleForceBurnNow = (e) => {
    e.stopPropagation();
    if (burnIntervalRef.current) clearInterval(burnIntervalRef.current);
    if (onBurnMessage) onBurnMessage(message._id);
  };

  const { activePersona: contextPersona } = useAuth();

  // Instant fallback to localStorage so activePersona is never null during async re-renders
  const getSavedPersona = () => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('donchat_persona');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const resolvedPersona = propPersona || contextPersona || getSavedPersona();

  // Touch Long-Press handlers for phone devices
  const handleTouchStart = () => {
    touchTimerRef.current = setTimeout(() => {
      setShowMobileActionSheet(true);
    }, 450); // 450ms long press threshold
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
  };

  const handleTouchMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setShowMobileActionSheet(true);
  };

  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
    setShowMobileActionSheet(false);
  };

  const handleReply = () => {
    if (onReplyMessage) {
      onReplyMessage(message);
    }
    setShowMobileActionSheet(false);
  };

  // Strictly extract valid persona ID string (avoiding '[object Object]')
  const getPersonaId = (p) => {
    if (!p) return null;
    if (typeof p === 'string' || typeof p === 'number') {
      const s = String(p);
      return s !== '[object Object]' ? s : null;
    }
    if (typeof p === 'object') {
      const val = p._id || p.id || p.personaId;
      if (val) {
        if (typeof val === 'object' && val._id) return String(val._id);
        const s = String(val);
        return s !== '[object Object]' ? s : null;
      }
      if (typeof p.toString === 'function') {
        const s = p.toString();
        if (s && s !== '[object Object]') return s;
      }
    }
    return null;
  };

  const extractUsername = (p) => {
    if (!p) return null;
    if (typeof p === 'object' && p.username) return String(p.username).toLowerCase().replace(/^@/, '');
    return null;
  };

  const senderId = getPersonaId(message.senderPersonaId || message.senderId || message.sender);
  const currentId = getPersonaId(currentPersonaId || resolvedPersona?._id || resolvedPersona?.id || resolvedPersona);

  const senderUsername = extractUsername(message.senderPersonaId || message.sender);
  const currentUsername = extractUsername(resolvedPersona);

  // Determine if message belongs to current persona:
  let isMe = false;
  if (senderId && currentId) {
    isMe = String(senderId) === String(currentId);
  } else if (senderUsername && currentUsername) {
    isMe = senderUsername === currentUsername;
  }

  const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('data:')) {
      return url.replace(/data:video\/([^;]+);codecs=[^;]+;base64,/, 'data:video/$1;base64,');
    }
    
    // Extract relative /uploads/... path if present in URL
    const uploadsMatch = url.match(/\/uploads\/[^\s?#]+/);
    if (uploadsMatch && typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      return `http://${hostname}:5005${uploadsMatch[0]}`;
    }
    
    if (url.startsWith('/') && typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      return `http://${hostname}:5005${url}`;
    }
    return url;
  };

  const isAnonymous = message.privacyMode === 'anonymous';
  const rawSender = typeof message.senderPersonaId === 'object' && message.senderPersonaId
    ? message.senderPersonaId
    : { displayName: 'User', username: 'user' };

  const sender = isAnonymous
    ? { displayName: 'Anonymous Persona', username: 'anonymous', avatar: '' }
    : rawSender;

  const quickEmojis = ['👍', '❤️', '🔥', '🚀', '🧠', '👏'];
  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Group reactions by emoji count & active user status
  const groupedReactions = (message.reactions || []).reduce((acc, r) => {
    const emoji = r.emoji;
    if (!emoji) return acc;
    if (!acc[emoji]) {
      acc[emoji] = { emoji, count: 0, users: [], hasReacted: false };
    }
    acc[emoji].count += 1;
    const reactorId = getPersonaId(r.personaId);
    const reactorName = typeof r.personaId === 'object' && r.personaId
      ? r.personaId.displayName || r.personaId.username
      : 'User';
    if (reactorName) acc[emoji].users.push(reactorName);

    if (currentId && reactorId && String(reactorId) === String(currentId)) {
      acc[emoji].hasReacted = true;
    }
    return acc;
  }, {});

  if (message.isBurned) {
    return (
      <div className="flex justify-center my-2 w-full">
        <div className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 italic">
          <Flame className="w-4 h-4 text-rose-400 animate-pulse" /> This message was burned and destroyed.
        </div>
      </div>
    );
  }

  const resolvedMediaUrl = getMediaUrl(message.mediaUrl);

  const renderPrivacyBadge = () => {
    switch (message.privacyMode) {
      case 'disappearing':
        return <span className="inline-flex items-center gap-0.5 text-[9px] text-purple-300 font-medium bg-purple-500/10 px-1 rounded" title="Disappearing 24h"><Clock className="w-2.5 h-2.5" /> 24h</span>;
      case 'burn':
        return <span className="inline-flex items-center gap-0.5 text-[9px] text-rose-300 font-medium bg-rose-500/10 px-1 rounded" title="Burn on Read"><Flame className="w-2.5 h-2.5" /> Burn</span>;
      case 'private':
        return <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-300 font-medium bg-amber-500/10 px-1 rounded" title="Private Mode"><Lock className="w-2.5 h-2.5" /> Private</span>;
      case 'vault':
        return <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-300 font-medium bg-emerald-500/10 px-1 rounded" title="Vault Encrypted"><Shield className="w-2.5 h-2.5" /> Vault</span>;
      case 'anonymous':
        return <span className="inline-flex items-center gap-0.5 text-[9px] text-gray-300 font-medium bg-gray-500/10 px-1 rounded" title="Anonymous Persona"><Ghost className="w-2.5 h-2.5" /> Anon</span>;
      default:
        return null;
    }
  };

  const renderTickStatus = () => {
    if (!isMe) return null;

    const isPending = message.pending === true || message.sending === true || message.status === 'pending' || (!message._id && !message.id);
    if (isPending) return null;

    const isRead = message.status === 'read' ||
                   message.read === true ||
                   message.isRead === true ||
                   (Array.isArray(message.readBy) && message.readBy.some(pId => {
                     const idStr = typeof pId === 'object' ? (pId._id || pId.id) : pId;
                     return idStr && String(idStr) !== String(senderId);
                   }));

    if (isRead) {
      return <CheckCheck className="w-3.5 h-3.5 text-cyan-300 inline" title="Seen" />;
    }

    return <Check className="w-3.5 h-3.5 text-gray-300/80 inline" title="Sent" />;
  };

  return (
    <div className={`flex w-full my-1.5 px-2 group ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        
        {/* WhatsApp-Style Message Content Bubble */}
        <div className="relative group/bubble flex flex-col max-w-full">
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onContextMenu={handleContextMenu}
            className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed relative shadow-sm cursor-pointer select-none active:scale-[0.99] transition ${
              isMe
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-br-xs shadow-lg shadow-indigo-950/40 border border-indigo-400/20'
                : 'bg-[#0f172a] text-gray-100 border border-slate-700/60 rounded-bl-xs shadow-md'
            }`}
          >
            {/* Display Sender Handle in Group/Space chats for incoming messages */}
            {!isMe && message.spaceId && (
              <span
                className="block text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:underline mb-0.5 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAvatarViewer(true);
                }}
                title="Click to view sender profile picture"
              >
                @{sender.username || sender.displayName}
              </span>
            )}

            {/* Burn on Read Initial Hidden Card for incoming unrevealed messages (images, text, audio, video) */}
            {message.privacyMode === 'burn' && !isMe && !isRevealed ? (
              <div className="space-y-2 py-1 select-none min-w-[200px]">
                <p className="font-medium text-rose-300 flex items-center gap-1.5 text-xs">
                  <Flame className="w-4 h-4 text-rose-400 animate-pulse" /> Confidential Burn Message
                </p>
                <button
                  type="button"
                  onClick={handleStartReveal}
                  className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> Tap to Reveal Message
                </button>
              </div>
            ) : message.contentType === 'voice' ? (
              <div className="space-y-1">
                {message.privacyMode === 'burn' && !isMe && isRevealed && (
                  <div className="mb-2 p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-between text-[11px] text-rose-200 select-none">
                    <span className="flex items-center gap-1 font-medium">
                      <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> Burning in {burnCountdown}s...
                    </span>
                    <button
                      type="button"
                      onClick={handleForceBurnNow}
                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[10px] transition"
                    >
                      Burn Now
                    </button>
                  </div>
                )}
                <VoicePlayer src={resolvedMediaUrl} duration={message.voiceDuration} />
                <div className="flex items-center gap-1 justify-end text-[10px] text-gray-300 pt-0.5">
                  <span>{formattedTime}</span>
                  {renderTickStatus()}
                </div>
              </div>
            ) : (message.contentType === 'image' || (message.mediaUrl && (message.mediaUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i.test(message.mediaUrl)))) ? (
              <div className="space-y-1.5 max-w-sm py-0.5">
                {message.privacyMode === 'burn' && !isMe && isRevealed && (
                  <div className="mb-2 p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-between text-[11px] text-rose-200 select-none">
                    <span className="flex items-center gap-1 font-medium">
                      <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> Burning in {burnCountdown}s...
                    </span>
                    <button
                      type="button"
                      onClick={handleForceBurnNow}
                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[10px] transition"
                    >
                      Burn Now
                    </button>
                  </div>
                )}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImgError(false);
                    setShowImageLightbox(true);
                  }}
                  className="rounded-xl overflow-hidden border border-white/10 bg-black/20 group/img relative cursor-pointer"
                >
                  <img
                    src={resolvedMediaUrl}
                    alt={message.content || 'Image Attachment'}
                    className="max-h-60 sm:max-h-72 w-full object-cover group-hover/img:scale-[1.02] hover:opacity-95 transition duration-200"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-[11px] font-medium backdrop-blur-[2px] transition duration-200 select-none">
                    🔍 Click for Full Screen
                  </div>
                </div>
                {message.content && message.content !== 'Image Attachment' && (
                  <p className="text-xs text-gray-100 whitespace-pre-wrap break-words px-0.5">{message.content}</p>
                )}
                <div className="flex items-center gap-1 justify-end text-[10px] opacity-75 shrink-0 select-none pt-0.5">
                  <span>{formattedTime}</span>
                  {renderTickStatus()}
                </div>
              </div>
            ) : (message.contentType === 'video' || (message.mediaUrl && (message.mediaUrl.startsWith('data:video/') || /\.(mp4|webm|mov|m4v|mkv|3gp|avi|m2ts|ogv|wmv|flv)($|\?)/i.test(message.mediaUrl) || /\.(mp4|webm|mov|m4v|mkv|3gp|avi|m2ts|ogv|wmv|flv)($|\?)/i.test(message.content)))) ? (
              <div className="space-y-1.5 max-w-sm sm:max-w-md py-0.5 min-w-[220px]">
                {message.privacyMode === 'burn' && !isMe && isRevealed && (
                  <div className="mb-2 p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-between text-[11px] text-rose-200 select-none">
                    <span className="flex items-center gap-1 font-medium">
                      <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> Burning in {burnCountdown}s...
                    </span>
                    <button
                      type="button"
                      onClick={handleForceBurnNow}
                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[10px] transition"
                    >
                      Burn Now
                    </button>
                  </div>
                )}
                <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 relative min-h-[120px] flex items-center justify-center">
                  {resolvedMediaUrl ? (
                    <video
                      src={resolvedMediaUrl}
                      controls
                      preload="metadata"
                      playsInline
                      className="max-h-64 sm:max-h-72 w-full object-contain rounded-xl"
                      onError={(e) => {
                        console.error('Video load error:', e);
                      }}
                    />
                  ) : (
                    <div className="p-4 text-center text-xs text-rose-300 italic">
                      🎬 Video attachment unavailable or media link expired.
                    </div>
                  )}
                </div>
                {message.content && message.content !== 'Video Attachment' && message.content !== message.mediaUrl && (
                  <p className="text-xs text-gray-100 whitespace-pre-wrap break-words px-0.5">{message.content}</p>
                )}
                <div className="flex items-center justify-between text-[10px] opacity-75 shrink-0 select-none pt-0.5">
                  {resolvedMediaUrl ? (
                    <a
                      href={resolvedMediaUrl}
                      download={message.content || 'video.mp4'}
                      className="text-cyan-300 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Download className="w-3 h-3" /> Download Video
                    </a>
                  ) : (
                    <span className="text-gray-400 font-medium">🎥 Video Note</span>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <span>{formattedTime}</span>
                    {renderTickStatus()}
                  </div>
                </div>
              </div>
            ) : (message.contentType === 'file' || (message.mediaUrl && message.contentType !== 'voice')) ? (
              <div className="space-y-1.5 min-w-[210px] sm:min-w-[250px] py-0.5">
                {message.privacyMode === 'burn' && !isMe && isRevealed && (
                  <div className="mb-2 p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-between text-[11px] text-rose-200 select-none">
                    <span className="flex items-center gap-1 font-medium">
                      <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> Burning in {burnCountdown}s...
                    </span>
                    <button
                      type="button"
                      onClick={handleForceBurnNow}
                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[10px] transition"
                    >
                      Burn Now
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/10 border border-white/15 gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">{message.content || 'Attached File'}</p>
                      <span className="text-[10px] text-gray-300 block truncate">Attachment</span>
                    </div>
                  </div>
                  {message.mediaUrl && (
                    <a
                      href={message.mediaUrl}
                      download={message.content || 'attachment'}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-cyan-500/20 text-cyan-300 transition shrink-0"
                      title="Download File"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1 justify-end text-[10px] opacity-75 shrink-0 select-none pt-0.5">
                  <span>{formattedTime}</span>
                  {renderTickStatus()}
                </div>
              </div>
            ) : (
              /* Revealed Content or Standard Text Content */
              <div className="flex flex-col w-full">
                {message.privacyMode === 'burn' && !isMe && isRevealed && (
                  <div className="mb-2 p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-between text-[11px] text-rose-200 select-none">
                    <span className="flex items-center gap-1 font-medium">
                      <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> Burning in {burnCountdown}s...
                    </span>
                    <button
                      type="button"
                      onClick={handleForceBurnNow}
                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[10px] transition"
                    >
                      Burn Now
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                  <p className="whitespace-pre-wrap break-words text-xs leading-relaxed flex-1 min-w-0">
                    {message.content}
                  </p>
                  <div className="flex items-center gap-1.5 ml-auto text-[10px] opacity-75 shrink-0 select-none self-end mt-0.5">
                    {renderPrivacyBadge()}
                    <span>{formattedTime}</span>
                    {renderTickStatus()}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Action Trigger Buttons (Reactions & Delete on Hover / Desktop) */}
          <div className={`absolute top-1 ${isMe ? '-right-16' : '-left-8'} opacity-0 group-hover/bubble:opacity-100 transition hidden sm:flex items-center gap-1 z-10`}>
            {isMe && onDeleteMessage && (
              <button
                onClick={() => onDeleteMessage(message._id)}
                className="p-1 rounded-full bg-slate-800/90 text-gray-400 hover:text-rose-400 border border-white/10 transition shadow-md"
                title="Delete Message for Everyone"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 rounded-full bg-slate-800/90 text-gray-400 hover:text-cyan-400 border border-white/10 transition shadow-md"
              title="Add Reaction"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Emoji Picker Bar (Hover / Desktop) */}
          {showEmojiPicker && (
            <div className={`absolute -top-12 ${isMe ? 'right-0' : 'left-0'} bg-[#162132]/95 backdrop-blur-2xl border border-white/20 rounded-full px-2.5 py-1.5 flex items-center gap-1 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap`}>
              {quickEmojis.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    onReaction(message._id, e);
                    setShowEmojiPicker(false);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center text-lg hover:scale-125 transition active:scale-95 leading-none shrink-0"
                >
                  {e}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setShowFullEmojiPicker(true);
                  setShowEmojiPicker(false);
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-cyan-500/30 text-gray-300 hover:text-cyan-300 border border-white/15 transition flex items-center justify-center shrink-0 ml-0.5"
                title="More Emojis"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Display Reactions Bar with Count Badges */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-start' : 'justify-end'}`}>
            {Object.values(groupedReactions).map((item) => (
              <button
                key={item.emoji}
                onClick={() => onReaction(message._id, item.emoji)}
                title={item.users.length > 0 ? `Reacted by: ${item.users.join(', ')}` : ''}
                className={`px-2 py-0.5 rounded-full border text-[11px] flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                  item.hasReacted
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold shadow-xs'
                    : 'bg-white/10 border-white/10 text-gray-200 hover:bg-white/20'
                }`}
              >
                <span>{item.emoji}</span>
                <span className="text-[10px] opacity-80">{item.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Long-Press Action Sheet Modal */}
      {showMobileActionSheet && (
        <div 
          onClick={() => setShowMobileActionSheet(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 transition-opacity"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 border border-white/15 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <p className="text-xs font-bold text-gray-300">Message Actions</p>
              <button
                onClick={() => setShowMobileActionSheet(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Emoji Quick Reactions Bar with '+' button */}
            <div className="flex justify-between items-center bg-white/5 p-2 rounded-2xl border border-white/10 gap-1 overflow-x-auto">
              {quickEmojis.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    onReaction(message._id, e);
                    setShowMobileActionSheet(false);
                  }}
                  className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center text-xl hover:scale-125 transition active:scale-95 leading-none shrink-0"
                >
                  {e}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setShowMobileActionSheet(false);
                  setShowFullEmojiPicker(true);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-cyan-500/20 text-gray-300 hover:text-cyan-300 border border-white/10 transition flex items-center justify-center shrink-0 ml-1"
                title="More Emojis"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Action Buttons List */}
            <div className="space-y-1">
              <button
                onClick={handleReply}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-white/10 text-white text-xs font-semibold transition"
              >
                <Reply className="w-4 h-4 text-cyan-400" /> Reply to Message
              </button>

              {message.contentType !== 'voice' && (
                <button
                  onClick={handleCopyText}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-white/10 text-white text-xs font-semibold transition"
                >
                  <Copy className="w-4 h-4 text-emerald-400" /> Copy Text
                </button>
              )}

              {onDeleteMessage && (
                <button
                  onClick={() => {
                    onDeleteMessage(message._id, 'me');
                    setShowMobileActionSheet(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-white/10 text-rose-300 text-xs font-semibold transition"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" /> Delete for Me
                </button>
              )}

              {isMe && onDeleteMessage && (
                <button
                  onClick={() => {
                    onDeleteMessage(message._id, 'everyone');
                    setShowMobileActionSheet(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition font-bold"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" /> Delete for Everyone
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Full Emoji Picker Modal */}
      {showFullEmojiPicker && (
        <div
          onClick={() => setShowFullEmojiPicker(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-white/20 rounded-3xl p-4 sm:p-5 w-full max-w-md max-h-[85vh] flex flex-col gap-3 shadow-2xl animate-in zoom-in-95 duration-200 text-white"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Smile className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-gray-100">React with Emoji</h3>
              </div>
              <button
                onClick={() => setShowFullEmojiPicker(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom Emoji Input Field */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customEmojiInput.trim()) {
                  onReaction(message._id, customEmojiInput.trim());
                  setCustomEmojiInput('');
                  setShowFullEmojiPicker(false);
                }
              }}
              className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-xl p-1.5 focus-within:border-cyan-400/60 transition"
            >
              <input
                type="text"
                value={customEmojiInput}
                onChange={(e) => setCustomEmojiInput(e.target.value)}
                placeholder="Type or paste any custom emoji..."
                className="flex-1 bg-transparent px-2.5 py-1 text-xs text-white placeholder-gray-400 outline-none"
              />
              <button
                type="submit"
                disabled={!customEmojiInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition shrink-0"
              >
                Add
              </button>
            </form>

            {/* Category Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-white/10 text-xs">
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap text-[11px] font-medium transition ${
                    activeCategory === cat.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Emojis Grid */}
            <div className="flex-1 overflow-y-auto max-h-[280px] p-1 grid grid-cols-7 sm:grid-cols-8 gap-2 custom-scrollbar">
              {(EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0]).emojis.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onReaction(message._id, emoji);
                    setShowFullEmojiPicker(false);
                  }}
                  className="w-10 h-10 rounded-xl hover:bg-white/15 active:scale-90 transition text-xl flex items-center justify-center border border-transparent hover:border-white/20"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Lightbox Modal */}
      {showImageLightbox && (
        <div
          onClick={() => setShowImageLightbox(false)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
        >
          {/* Lightbox Header Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl flex items-center justify-between z-10 py-2"
          >
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                {message.content && message.content !== 'Image Attachment' ? message.content : 'Image Viewer'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {resolvedMediaUrl && (
                <a
                  href={resolvedMediaUrl}
                  download={message.content || 'image'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg transition"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              )}
              <button
                onClick={() => setShowImageLightbox(false)}
                className="p-2 rounded-full text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 transition cursor-pointer"
                title="Close Viewer"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          {/* Lightbox Image View */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center w-full max-w-5xl my-auto p-2"
          >
            {lightboxImgError ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-white/15 text-center text-rose-300 space-y-2">
                <FileText className="w-8 h-8 text-rose-400 mx-auto" />
                <p className="text-xs font-semibold">Image could not be loaded.</p>
                <p className="text-[10px] text-gray-400 font-mono max-w-md truncate">{resolvedMediaUrl}</p>
              </div>
            ) : (
              <img
                src={resolvedMediaUrl}
                alt={message.content || 'Full View'}
                onError={() => setLightboxImgError(true)}
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10 select-none bg-slate-950/40 p-1"
              />
            )}
          </div>

          {/* Lightbox Footer Caption */}
          {message.content && message.content !== 'Image Attachment' && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900/90 border border-white/15 px-4 py-2 rounded-xl max-w-xl text-center text-xs text-gray-200 mb-2 shadow-xl"
            >
              {message.content}
            </div>
          )}
        </div>
      )}

      {/* Copy Toast Feedback */}
      {copiedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-800 border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl z-50 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" /> Copied text to clipboard!
        </div>
      )}

      <AvatarViewerModal
        isOpen={showAvatarViewer}
        onClose={() => setShowAvatarViewer(false)}
        avatarUrl={sender.avatar}
        name={sender.displayName || sender.username}
        handle={sender.username}
      />
    </div>
  );
}
