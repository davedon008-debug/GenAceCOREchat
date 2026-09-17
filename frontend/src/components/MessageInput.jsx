'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Plus, Square, Trash2, Reply, X, FileText, Image as ImageIcon } from 'lucide-react';
import api from '../lib/api';
import AttachmentPickerModal from './AttachmentPickerModal';

export default function MessageInput({ onSendMessage, onTyping, replyingTo, onCancelReply, onFocus }) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null); // { name, size, type, isImage, base64, previewUrl }
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inputError, setInputError] = useState(null);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const processFileObject = (file) => {
    if (!file) return;

    const maxMB = 250;
    if (file.size > maxMB * 1024 * 1024) {
      setInputError(`File size limit is ${maxMB}MB. Please select a smaller file.`);
      return;
    }

    const sizeFormatted = file.size > 1024 * 1024 
      ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' 
      : (file.size / 1024).toFixed(1) + ' KB';

    const fileType = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();

    const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
    const isVideo = fileType.startsWith('video/') || fileType.includes('video') || /\.(mp4|webm|mov|m4v|mkv|3gp|avi|m2ts|ogv|wmv|flv)$/i.test(fileName);

    let previewUrl = null;
    if (isImage || isVideo) {
      previewUrl = URL.createObjectURL(file);
    }

    setSelectedFile({
      file,
      name: file.name,
      size: sizeFormatted,
      type: file.type,
      isImage,
      isVideo,
      previewUrl
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFileObject(file);
    e.target.value = '';
  };

  const removeSelectedFile = () => {
    if (selectedFile?.previewUrl) {
      URL.revokeObjectURL(selectedFile.previewUrl);
    }
    setSelectedFile(null);
    setIsReadingFile(false);
  };

  const handleSend = async () => {
    const messageText = text.trim();
    const fileToUpload = selectedFile;
    const currentReplyTo = replyingTo;

    const hasText = messageText.length > 0;
    const hasFile = !!fileToUpload;

    if (!hasText && !hasFile) return;
    if (isReadingFile || isSending) return;

    // ⚡ OPTIMISTIC CLEAR: Instantly clear text and file inputs (0ms delay)
    setText('');
    setSelectedFile(null);
    if (onCancelReply) onCancelReply();
    if (onTyping) onTyping(false);

    setIsSending(true);
    try {
      if (hasFile) {
        let contentType = 'file';
        if (fileToUpload.isImage) contentType = 'image';
        else if (fileToUpload.isVideo) contentType = 'video';

        let uploadedMediaUrl = '';

        try {
          const formData = new FormData();
          formData.append('file', fileToUpload.file);

          const uploadRes = await api.post('/upload', formData);
          if (uploadRes.data.success && uploadRes.data.url) {
            uploadedMediaUrl = uploadRes.data.url;
          }
        } catch (uploadErr) {
          console.warn('FormData upload failed, trying Base64 payload fallback:', uploadErr);
          try {
            const base64Data = await new Promise((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result);
              r.onerror = reject;
              r.readAsDataURL(fileToUpload.file);
            });

            const uploadRes = await api.post('/upload', {
              fileData: base64Data,
              fileName: fileToUpload.name
            });
            if (uploadRes.data.success && uploadRes.data.url) {
              uploadedMediaUrl = uploadRes.data.url;
            }
          } catch (fallbackErr) {
            console.error('Base64 fallback upload also failed:', fallbackErr);
            setInputError('Failed to upload attachment. Please check your network connection.');
            setSelectedFile(fileToUpload);
            setIsSending(false);
            return;
          }
        }

        if (uploadedMediaUrl && uploadedMediaUrl.includes('/uploads/')) {
          uploadedMediaUrl = '/uploads/' + uploadedMediaUrl.split('/uploads/')[1];
        }

        await onSendMessage({
          content: hasText ? messageText : fileToUpload.name,
          contentType,
          mediaUrl: uploadedMediaUrl,
          replyTo: currentReplyTo ? currentReplyTo._id : null
        });
      } else {
        await onSendMessage({
          content: messageText,
          contentType: 'text',
          replyTo: currentReplyTo ? currentReplyTo._id : null
        });
      }
    } catch (err) {
      console.error('Send error:', err);
      // Restore input text if send failed
      setText(messageText);
      setInputError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);

      setIsRecording(true);
      setRecordTime(0);

      timerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access failed:', err);
      setInputError('Microphone permission is required to record voice notes.');
    }
  };

  const stopRecordingAndSend = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;

    const currentDuration = recordTime || 1;

    mediaRecorder.onstop = () => {
      let rawMimeType = mediaRecorder.mimeType || 'audio/webm';
      let cleanMimeType = rawMimeType.split(';')[0] || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: cleanMimeType });

      console.log(`[Voice Note] Blob created. Size: ${audioBlob.size} bytes, Clean Type: ${cleanMimeType}`);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (audioBlob.size < 100) {
        console.warn('[Voice Note] Recorded audio blob is empty or too small.');
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        const base64Audio = reader.result;
        console.log(`[Voice Note] Base64 audio ready. Length: ${base64Audio.length} chars`);
        onSendMessage({
          content: '🎙️ Voice Message',
          contentType: 'voice',
          mediaUrl: base64Audio,
          voiceDuration: currentDuration
        });
      };
    };

    if (mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.requestData();
      } catch (e) {}
      mediaRecorder.stop();
    }

    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordTime(0);
  };

  return (
    <div className="p-3 md:p-4 glass-panel border-t border-white/10 select-none">
      {/* Attachment Picker Modal */}
      <AttachmentPickerModal
        isOpen={isAttachmentModalOpen}
        onClose={() => setIsAttachmentModalOpen(false)}
        onSelectDocument={() => docInputRef.current?.click()}
        onSelectGallery={() => galleryInputRef.current?.click()}
        onSelectCameraFile={(capturedFile) => {
          if (capturedFile) {
            processFileObject(capturedFile);
          } else {
            cameraInputRef.current?.click();
          }
        }}
        onSelectVoice={() => startRecording()}
      />

      {/* Hidden File Inputs for Different Types */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="*/*"
        className="hidden"
      />
      <input
        type="file"
        ref={docInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.7z,*/*"
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleFileSelect}
        accept="image/*,video/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Input Error Warning Banner */}
      {inputError && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs rounded-xl mb-2 animate-in fade-in duration-200">
          <span className="truncate">{inputError}</span>
          <button onClick={() => setInputError(null)} className="p-1 text-rose-300 hover:text-white rounded-md">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Reply Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-xs rounded-xl mb-2">
          <div className="flex items-center gap-2 truncate">
            <Reply className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-gray-300 truncate">
              Replying to: <span className="text-cyan-300 italic font-medium">"{replyingTo.content || 'Voice message'}"</span>
            </span>
          </div>
          <button onClick={onCancelReply} className="text-gray-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment Reading Loading Banner */}
      {isReadingFile && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs rounded-xl mb-2 animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Reading file attachment... Please wait.</span>
        </div>
      )}

      {/* Attachment Preview Banner */}
      {selectedFile && (
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800/90 border border-cyan-500/30 rounded-xl mb-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-3 min-w-0">
            {selectedFile.isImage ? (
              <img
                src={selectedFile.previewUrl}
                alt="Upload preview"
                className="w-10 h-10 object-cover rounded-lg border border-white/15 shrink-0"
              />
            ) : selectedFile.isVideo ? (
              <video
                src={selectedFile.previewUrl}
                className="w-10 h-10 object-cover rounded-lg border border-white/15 shrink-0 bg-black"
                muted
              />
            ) : (
              <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-gray-400">
                {selectedFile.size} {isSending && <span className="text-cyan-300 italic font-medium ml-1.5 animate-pulse">⚡ Uploading...</span>}
              </p>
            </div>
          </div>
          <button
            onClick={removeSelectedFile}
            disabled={isSending}
            className="p-1 rounded-full text-gray-400 hover:text-rose-400 hover:bg-white/10 transition shrink-0 disabled:opacity-30"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Input Bar Container (Panel 3) */}
      <div className="flex items-center gap-2 bg-[#1e293b] border border-[#2b374e] rounded-full p-2 focus-within:border-indigo-500/60 shadow-lg transition">
        {/* Attachment Button (+) */}
        <button
          onClick={() => setIsAttachmentModalOpen(true)}
          className="p-2 text-gray-400 hover:text-indigo-400 rounded-full hover:bg-white/5 transition shrink-0"
          title="Add Attachment"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Input Text / Voice Recording Bar */}
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between px-3 py-1">
            <div className="flex items-center gap-2 text-xs text-rose-400 font-semibold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>Recording Voice Note ({recordTime}s)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelRecording}
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-white/5 transition"
                title="Cancel Recording"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={stopRecordingAndSend}
                className="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md transition flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-white" /> Send Note
              </button>
            </div>
          </div>
        ) : (
          <textarea
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (onTyping) onTyping(e.target.value.length > 0);
            }}
            onFocus={() => {
              if (onFocus) onFocus();
            }}
            onKeyDown={handleKeyDown}
            placeholder={selectedFile ? "Add a caption or press send..." : "Type a message..."}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-400 focus:outline-none resize-none max-h-24 pt-1 px-1"
          />
        )}

        {/* Media / Mic / Send Buttons */}
        {!isRecording && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAttachmentModalOpen(true)}
              className="p-2 rounded-full text-gray-400 hover:text-indigo-400 hover:bg-white/5 transition"
              title="Add Media Attachment"
            >
              <ImageIcon className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={startRecording}
              className="p-2 rounded-full text-gray-400 hover:text-indigo-400 hover:bg-white/5 transition"
              title="Record Voice Note"
            >
              <Mic className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={handleSend}
              disabled={!text.trim() && !selectedFile}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-40 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center transition shrink-0"
              title="Send Message"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
