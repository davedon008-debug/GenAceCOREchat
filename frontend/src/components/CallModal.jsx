'use client';

import { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, Maximize2, Minimize2 } from 'lucide-react';
import { getMediaUrl, DEFAULT_AVATAR } from '../lib/api';

export default function CallModal({
  call,
  localStream,
  remoteStream,
  isCallConnected,
  onEndCall,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  isMicMuted,
  isCameraOff,
  isScreenSharing
}) {
  const [duration, setDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Attach local media stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote media stream to dedicated audio & video elements
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(err => console.log('[Audio Playback Error]', err));
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(err => console.log('[Video Playback Error]', err));
    }
  }, [remoteStream, isVideo]);

  // Call timer counter
  useEffect(() => {
    let timer = null;
    if (isCallConnected) {
      timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCallConnected]);

  if (!call) return null;

  const { peerPersona, isVideo } = call;
  const peerName = peerPersona?.displayName || 'Chat Partner';
  const peerAvatar = getMediaUrl(peerPersona?.avatarUrl, peerName) || DEFAULT_AVATAR;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render Minimized Floating Call Bar
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] bg-[#101625] border border-indigo-500/40 rounded-2xl p-3 shadow-2xl flex items-center gap-4 animate-bounce">
        <div className="relative">
          <img
            src={peerAvatar}
            alt={peerName}
            className="w-10 h-10 rounded-full object-cover border border-white/20"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#101625]" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white truncate max-w-[120px]">{peerName}</h4>
          <p className="text-[10px] text-emerald-400 font-mono">
            {isCallConnected ? formatDuration(duration) : 'Connecting...'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 transition"
            title="Expand Call Window"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onEndCall}
            className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition"
            title="End Call"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-6 animate-fadeIn select-none">
      {/* Hidden Audio element ensuring remote voice stream plays through speakers */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div className="relative w-full max-w-4xl h-[85vh] bg-[#0c101c] border border-indigo-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Floating Control Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <h3 className="text-xs font-bold text-white truncate max-w-[160px] font-outfit">{peerName}</h3>
              <p className="text-[10px] text-emerald-400 font-mono">
                {isCallConnected ? formatDuration(duration) : 'Ringing...'}
              </p>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-gray-300 hover:text-white border border-white/10 shadow-lg transition"
              title="Minimize Call Window"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video / Audio Canvas Main Container */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {/* Remote Video Stream (Main Feed) */}
          {isVideo && remoteStream && !isCameraOff ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            /* Voice Call or Video Disabled Avatar Screen */
            <div className="flex flex-col items-center justify-center text-center p-6">
              <div className="relative mb-6">
                {isCallConnected && (
                  <div className="absolute inset-0 rounded-full bg-indigo-500/30 blur-2xl animate-pulse" />
                )}
                <img
                  src={peerAvatar}
                  alt={peerName}
                  className="relative w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-indigo-500/50 shadow-2xl"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                />
              </div>

              <h2 className="text-2xl font-bold text-white font-outfit">{peerName}</h2>
              <p className="text-xs text-indigo-300 mt-1 font-mono">
                {isCallConnected ? (isVideo ? 'Video Connected' : 'Voice Connected') : 'Calling...'}
              </p>

              {/* Animated Audio Equalizer Bars */}
              {isCallConnected && (
                <div className="flex items-center gap-1.5 mt-6 h-8">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-8 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  <span className="w-1.5 h-7 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
                  <span className="w-1.5 h-4 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '600ms' }} />
                </div>
              )}
            </div>
          )}

          {/* Local Video Stream (PIP Window) */}
          {isVideo && localStream && (
            <div className="absolute bottom-4 right-4 z-10 w-32 h-44 md:w-44 md:h-56 bg-slate-900 border-2 border-indigo-500/50 rounded-2xl overflow-hidden shadow-2xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`}
              />
              {isCameraOff && (
                <div className="w-full h-full flex items-center justify-center bg-slate-950 text-gray-500 text-xs">
                  Camera Off
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Call Action Control Bar */}
        <div className="h-20 bg-[#0a0e1a] border-t border-indigo-500/20 px-6 flex items-center justify-center gap-4 z-20">
          {/* Mute Mic Button */}
          <button
            onClick={onToggleMic}
            className={`p-3.5 rounded-2xl border transition hover:scale-105 active:scale-95 ${
              isMicMuted
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
            }`}
            title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Video Camera Toggle */}
          {isVideo && (
            <button
              onClick={onToggleCamera}
              className={`p-3.5 rounded-2xl border transition hover:scale-105 active:scale-95 ${
                isCameraOff
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
              }`}
              title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          {/* Screen Share Toggle */}
          {isVideo && (
            <button
              onClick={onToggleScreenShare}
              className={`p-3.5 rounded-2xl border transition hover:scale-105 active:scale-95 ${
                isScreenSharing
                  ? 'bg-indigo-500/30 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/20'
                  : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
              }`}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              <Monitor className="w-5 h-5" />
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={onEndCall}
            className="py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 flex items-center gap-2 transition hover:scale-105 active:scale-95"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}
