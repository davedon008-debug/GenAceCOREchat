'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Image as ImageIcon, Camera, Mic, X, ChevronRight, RefreshCw, Check, FlipHorizontal, Grid, Timer } from 'lucide-react';

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

  const startCamera = async (overrideFacing) => {
    setCameraError(null);
    setCapturedPhoto(null);
    capturedPhotoRef.current = null;
    setShowCameraStream(true);
    stopCameraStream();

    const targetFacing = overrideFacing || facingMode;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: targetFacing }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Webcam stream failed:', err);
      setCameraError('Camera access denied or unavailable. You can pick a photo instead.');
    }
  };

  const flipCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
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

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200 select-none">
      {/* Backdrop overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-[#111625] border border-indigo-500/30 rounded-3xl p-5 shadow-2xl z-10 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col overflow-hidden">

        {/* Live HD Camera View Mode */}
        {showCameraStream ? (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {/* Header Controls */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-outfit">
                  <Camera className="w-4 h-4 text-pink-400" /> HD Camera Studio
                </h3>
                <p className="text-[11px] text-gray-400">Take a high-quality live snapshot</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Grid Toggle */}
                {!capturedPhoto && !cameraError && (
                  <button
                    onClick={() => setShowGrid(prev => !prev)}
                    className={`p-2 rounded-xl border transition ${showGrid ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/10 border-white/10 text-gray-300 hover:text-white'}`}
                    title="Toggle Camera Grid"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                )}

                {/* Countdown Timer Toggle */}
                {!capturedPhoto && !cameraError && (
                  <button
                    onClick={() => setCountdown(prev => prev === 0 ? 3 : prev === 3 ? 5 : 0)}
                    className={`p-2 rounded-xl border transition flex items-center gap-1 ${countdown > 0 ? 'bg-pink-600 border-pink-500 text-white font-bold text-xs' : 'bg-white/10 border-white/10 text-gray-300 hover:text-white'}`}
                    title="Camera Timer"
                  >
                    <Timer className="w-4 h-4" />
                    {countdown > 0 && <span className="text-[10px]">{countdown}s</span>}
                  </button>
                )}

                {/* Flip Camera */}
                {!capturedPhoto && !cameraError && (
                  <button
                    onClick={flipCamera}
                    className="p-2 rounded-xl bg-white/10 border border-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition"
                    title="Flip Camera"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                )}

                {/* Close Button */}
                <button
                  onClick={() => {
                    stopCameraStream();
                    setShowCameraStream(false);
                    setCapturedPhoto(null);
                  }}
                  className="p-2 rounded-xl bg-white/10 border border-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Camera Viewfinder Box */}
            <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black aspect-[4/3] flex items-center justify-center shadow-inner">
              {cameraError ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex flex-col items-center text-center gap-3">
                  <p>{cameraError}</p>
                  <button
                    onClick={() => {
                      stopCameraStream();
                      setShowCameraStream(false);
                      onSelectCameraFile(null);
                    }}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold text-xs transition shadow-lg"
                  >
                    Open Media Gallery Instead
                  </button>
                </div>
              ) : capturedPhoto ? (
                <img src={capturedPhoto} alt="Snapshot Preview" className="w-full h-full object-cover" />
              ) : (
                <>
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
                  {/* Countdown overlay */}
                  {isCountingDown && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-6xl font-black text-white animate-bounce font-mono">
                        {countdown}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action Buttons */}
            {!cameraError && (
              <div className="flex items-center gap-3 pt-1">
                {capturedPhoto ? (
                  <>
                    <button
                      onClick={() => startCamera()}
                      className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition"
                    >
                      <RefreshCw className="w-4 h-4" /> Retake
                    </button>
                    <button
                      onClick={confirmCapturedPhoto}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition shadow-xl shadow-pink-600/30"
                    >
                      <Check className="w-4 h-4" /> Send Snapshot
                    </button>
                  </>
                ) : (
                  <button
                    onClick={triggerCapture}
                    disabled={isCountingDown}
                    className="w-full py-3.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:opacity-90 active:scale-98 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition shadow-xl shadow-pink-600/30"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isCountingDown ? 'Taking Photo...' : 'Snap Photo'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Main Attachment Options List */
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
                  <h4 className="text-xs font-bold text-white group-hover:text-pink-400 transition">HD Camera Studio</h4>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">Live photo with flip & timer controls</p>
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
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
