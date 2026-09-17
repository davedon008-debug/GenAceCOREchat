'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Image as ImageIcon, Camera, Mic, X, ChevronRight, RefreshCw, Check } from 'lucide-react';

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
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setShowCameraStream(false);
      setCapturedPhoto(null);
      setCameraError(null);
    }
  }, [isOpen]);

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setShowCameraStream(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Webcam stream failed, using native input capture:', err);
      setCameraError('Camera access denied or unavailable. You can upload or pick a photo instead.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(dataUrl);
    stopCameraStream();
  };

  const confirmCapturedPhoto = () => {
    if (!capturedPhoto) return;
    // Convert DataURL to File object
    fetch(capturedPhoto)
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
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* Backdrop overlay touch dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full md:max-w-md bg-[#18181b] border border-white/10 md:rounded-2xl rounded-t-3xl p-5 shadow-2xl z-10 animate-in slide-in-from-bottom-6 duration-300 max-h-[90vh] overflow-y-auto">
        {/* Top Handle bar for mobile style */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 md:hidden" />

        {/* Live Camera View Mode */}
        {showCameraStream ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-pink-400" /> Camera Snapshot
                </h3>
                <p className="text-xs text-gray-400">Take a live photo from your device camera</p>
              </div>
              <button
                onClick={() => {
                  stopCameraStream();
                  setShowCameraStream(false);
                  setCapturedPhoto(null);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex flex-col gap-3">
                <p>{cameraError}</p>
                <button
                  onClick={() => {
                    stopCameraStream();
                    setShowCameraStream(false);
                    onSelectCameraFile(null); // Fallback to file picker
                  }}
                  className="px-3 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-medium self-start transition"
                >
                  Open Photo Picker Instead
                </button>
              </div>
            ) : capturedPhoto ? (
              <div className="relative rounded-xl overflow-hidden border border-white/15 bg-black aspect-video flex items-center justify-center">
                <img src={capturedPhoto} alt="Snapshot Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-white/15 bg-black aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              </div>
            )}

            {!cameraError && (
              <div className="flex items-center gap-3 pt-1">
                {capturedPhoto ? (
                  <>
                    <button
                      onClick={startCamera}
                      className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retake
                    </button>
                    <button
                      onClick={confirmCapturedPhoto}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-pink-600/30"
                    >
                      <Check className="w-3.5 h-3.5" /> Use Snapshot
                    </button>
                  </>
                ) : (
                  <button
                    onClick={capturePhoto}
                    className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-pink-600/30"
                  >
                    <Camera className="w-4 h-4" /> Snap Photo
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Main Option Menu */
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-lg font-bold text-white">Add Attachment</h3>
                <p className="text-xs text-gray-400 mt-0.5">Select media or document type to send</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
              >
                <X className="w-4.5 h-4.5" />
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
                className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-purple-500/40 transition text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <FileText className="w-5 h-5 text-purple-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition">Document & Files</h4>
                  <p className="text-xs text-gray-400 truncate mt-0.5">PDF, Word, Excel, TXT, Zip archives</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-300 group-hover:translate-x-0.5 transition shrink-0" />
              </button>

              {/* Photo & Video Gallery */}
              <button
                onClick={() => {
                  onClose();
                  onSelectGallery();
                }}
                className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-blue-500/40 transition text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition">Photo & Video Gallery</h4>
                  <p className="text-xs text-gray-400 truncate mt-0.5">Choose photos or media from device</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition shrink-0" />
              </button>

              {/* Camera Snapshot */}
              <button
                onClick={startCamera}
                className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-pink-500/40 transition text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Camera className="w-5 h-5 text-pink-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white group-hover:text-pink-400 transition">Camera Snapshot</h4>
                  <p className="text-xs text-gray-400 truncate mt-0.5">Capture photo using camera</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-pink-400 group-hover:translate-x-0.5 transition shrink-0" />
              </button>

              {/* Voice Message */}
              <button
                onClick={() => {
                  onClose();
                  onSelectVoice();
                }}
                className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-emerald-500/40 transition text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Mic className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition">Voice Message</h4>
                  <p className="text-xs text-gray-400 truncate mt-0.5">Record high-quality voice audio</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            </div>

            {/* Cancel Button */}
            <button
              onClick={onClose}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm rounded-xl border border-white/10 transition mt-1"
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
