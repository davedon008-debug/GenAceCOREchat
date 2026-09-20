'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Image as ImageIcon, Camera, Mic, X, ChevronRight, RefreshCw, Check, FlipHorizontal, Grid, Timer, Zap, Hexagon } from 'lucide-react';

export default function AttachmentPickerModal({
  isOpen,
  onClose,
  onSelectDocument,
  onSelectGallery,
  onSelectCameraFile,
  onSelectVoice
}) {
  const [mounted, setMounted] = useState(false);
  const [showCameraStream, setShowCameraStream] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [showGrid, setShowGrid] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('4:3'); // '4:3' | '16:9' | '1:1'
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const capturedPhotoRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setShowCameraStream(false);
      setCapturedPhoto(null);
      capturedPhotoRef.current = null;
      setCameraError(null);
      setCountdown(0);
      setIsCountingDown(false);
    }
  }, [isOpen]);

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    if (showCameraStream && videoRef.current && mediaStreamRef.current) {
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
      }
    }
  }, [showCameraStream, capturedPhoto]);

  const startCamera = async (overrideFacing) => {
    setCameraError(null);
    setCapturedPhoto(null);
    capturedPhotoRef.current = null;
    setShowCameraStream(true);
    stopCameraStream();

    const targetFacing = overrideFacing || facingMode;

    try {
      let stream = null;
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: targetFacing }
          });
        } catch (firstErr) {
          // Fallback for mobile browsers that fail on facingMode / resolution constraints
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      } else if (navigator.getUserMedia) {
        stream = await new Promise((resolve, reject) => {
          navigator.getUserMedia({ video: true }, resolve, reject);
        });
      } else {
        throw new Error('MediaDevices unavailable');
      }

      mediaStreamRef.current = stream;
      setCameraError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Webcam stream failed:', err);
      setCameraError('Camera access denied or unavailable. You can upload or select photos instead.');
    }
  };

  const flipCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const toggleAspectRatio = () => {
    const next = aspectRatio === '4:3' ? '16:9' : aspectRatio === '16:9' ? '1:1' : '4:3';
    setAspectRatio(next);
  };

  const triggerCapture = () => {
    if (countdown > 0 && !isCountingDown) {
      setIsCountingDown(true);
      let current = countdown;
      const interval = setInterval(() => {
        current -= 1;
        if (current <= 0) {
          clearInterval(interval);
          setIsCountingDown(false);
          performCapture();
        }
      }, 1000);
    } else {
      performCapture();
    }
  };

  const performCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    // Flip canvas horizontally if using front camera for natural mirroring
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedPhoto(dataUrl);
    capturedPhotoRef.current = dataUrl;
    stopCameraStream();
  };

  const confirmCapturedPhoto = () => {
    const targetDataUrl = capturedPhoto || capturedPhotoRef.current;
    if (!targetDataUrl) return;

    fetch(targetDataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `camera_snapshot_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onSelectCameraFile(file);
        onClose();
      })
      .catch((err) => {
        console.error('Failed to process captured image:', err);
      });
  };

  if (!isOpen || !mounted) return null;

  const modalContent = showCameraStream ? (
    /* ── FULL SCREEN NATIVE CAMERA INTERFACE (Matching Reference Screenshot) ── */
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col justify-between select-none animate-in fade-in duration-200">
      {/* 1. TOP CONTROL BAR */}
      <div className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Settings / Grid Icon */}
        <button
          onClick={() => setShowGrid(prev => !prev)}
          className={`p-2.5 rounded-full transition ${showGrid ? 'bg-white/30 text-white ring-2 ring-white/50' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
          title="Toggle Grid Overlay"
        >
          <Hexagon className="w-6 h-6" />
        </button>

        {/* Timer Toggle Icon */}
        <button
          onClick={() => setCountdown(prev => prev === 0 ? 3 : prev === 3 ? 5 : 0)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition flex items-center gap-1 ${countdown > 0 ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
          title="Camera Timer"
        >
          <Timer className="w-5 h-5" />
          {countdown > 0 && <span>{countdown}s</span>}
        </button>

        {/* Aspect Ratio Badge */}
        <button
          onClick={toggleAspectRatio}
          className="px-2.5 py-1 rounded-md border border-white/40 text-white font-mono text-[11px] font-bold tracking-wider hover:bg-white/10 transition"
          title="Toggle Aspect Ratio"
        >
          {aspectRatio}
        </button>

        {/* Close Button */}
        <button
          onClick={() => {
            stopCameraStream();
            setShowCameraStream(false);
            setCapturedPhoto(null);
          }}
          className="p-2.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
          title="Close Camera"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* 2. CENTER VIEWFINDER DISPLAY */}
      <div className="flex-1 w-full relative bg-black flex items-center justify-center overflow-hidden">
        {cameraError ? (
          <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-3xl text-rose-300 text-xs flex flex-col items-center text-center gap-4 max-w-sm mx-4">
            <p className="text-sm font-semibold">{cameraError}</p>
            <button
              onClick={() => {
                stopCameraStream();
                setShowCameraStream(false);
                onSelectCameraFile(null);
              }}
              className="px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-bold text-xs transition shadow-xl"
            >
              Open Gallery Instead
            </button>
          </div>
        ) : capturedPhoto ? (
          <img src={capturedPhoto} alt="Snapshot Preview" className="w-full h-full object-contain" />
        ) : (
          <div className={`w-full h-full relative flex items-center justify-center ${aspectRatio === '1:1' ? 'aspect-square max-h-[70vh]' : ''}`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
            />
            {/* Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-white/20" />
                <div className="border-r border-white/20" />
                <div />
              </div>
            )}
            {/* Countdown Overlay */}
            {isCountingDown && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-8xl font-black text-white animate-pulse font-mono drop-shadow-2xl">
                  {countdown}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. BOTTOM CONTROL BAR (Matching Reference Screenshot 1-to-1) */}
      <div className="w-full bg-black/90 py-8 px-10 flex items-center justify-between relative z-20">
        {capturedPhoto ? (
          /* Snapshot Review Actions */
          <div className="w-full flex items-center justify-around">
            <button
              onClick={() => startCamera()}
              className="flex flex-col items-center gap-1.5 text-white/80 hover:text-white transition group"
            >
              <div className="w-14 h-14 rounded-full bg-white/15 border border-white/20 flex items-center justify-center group-hover:scale-105 transition">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium">Retake</span>
            </button>

            <button
              onClick={confirmCapturedPhoto}
              className="flex flex-col items-center gap-1.5 text-white transition group"
            >
              <div className="w-20 h-20 rounded-full border-4 border-white bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-2xl group-hover:scale-105 transition">
                <Check className="w-10 h-10 text-white stroke-[3]" />
              </div>
              <span className="text-xs font-bold text-emerald-400">Use Photo</span>
            </button>
          </div>
        ) : (
          /* Live Shutter Controls matching screenshot */
          <div className="w-full flex items-center justify-between max-w-md mx-auto">
            {/* Left Spacer / Secondary Action */}
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/60">
              <Camera className="w-5 h-5 opacity-40" />
            </div>

            {/* Center Main Shutter Button (Double Ring White Circle) */}
            <button
              onClick={triggerCapture}
              disabled={isCountingDown || !!cameraError}
              className="w-20 h-20 rounded-full border-4 border-white bg-white/10 hover:bg-white/20 active:scale-90 transition-all flex items-center justify-center shadow-2xl shadow-white/20 cursor-pointer"
            >
              <span className="w-14 h-14 rounded-full bg-white block shadow-inner" />
            </button>

            {/* Right Flip Camera Button */}
            <button
              onClick={flipCamera}
              disabled={!!cameraError}
              className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition active:scale-90 shadow-lg"
              title="Flip Camera"
            >
              <FlipHorizontal className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  ) : (
    /* ── ATTACHMENT MENU MODAL ── */
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200 select-none">
      {/* Backdrop overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-[#111625] border border-indigo-500/30 rounded-3xl p-5 shadow-2xl z-10 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-1 border-b border-[#1f293d]">
            <div>
              <h3 className="text-base font-extrabold text-white font-outfit">Add Attachment</h3>
              <p className="text-xs text-gray-400 mt-0.5">Select media or document to send</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Options List */}
          <div className="flex flex-col gap-2.5 my-1">
            {/* Document & Files */}
            <button
              onClick={() => {
                onClose();
                onSelectDocument();
              }}
              className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#151c2e] hover:bg-[#1c263e] border border-[#222f48] hover:border-purple-500/40 transition text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <FileText className="w-5 h-5 text-purple-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition">Document & Files</h4>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">PDF, Word, Excel, TXT, Zip archives</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-300 group-hover:translate-x-0.5 transition shrink-0" />
            </button>

            {/* Photo & Video Gallery */}
            <button
              onClick={() => {
                onClose();
                onSelectGallery();
              }}
              className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#151c2e] hover:bg-[#1c263e] border border-[#222f48] hover:border-blue-500/40 transition text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <ImageIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition">Photo & Video Gallery</h4>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">Choose photos or media from device</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition shrink-0" />
            </button>

            {/* Camera Snapshot */}
            <button
              onClick={() => startCamera()}
              className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#151c2e] hover:bg-[#1c263e] border border-[#222f48] hover:border-pink-500/40 transition text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Camera className="w-5 h-5 text-pink-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white group-hover:text-pink-400 transition">Full-Screen Native Camera</h4>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">Live full-screen camera with shutter & flip</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-pink-400 group-hover:translate-x-0.5 transition shrink-0" />
            </button>

            {/* Voice Message */}
            <button
              onClick={() => {
                onClose();
                onSelectVoice();
              }}
              className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#151c2e] hover:bg-[#1c263e] border border-[#222f48] hover:border-emerald-500/40 transition text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Mic className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition">Voice Message</h4>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">Record high-quality voice audio</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition shrink-0" />
            </button>
          </div>

          {/* Cancel Button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#151c2e] hover:bg-[#1c263e] text-white font-bold text-xs rounded-2xl border border-[#222f48] transition mt-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
