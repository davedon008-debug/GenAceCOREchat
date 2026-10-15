'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Heart, X, Plus, Trash2, Edit3, Check, Eye, Play, Sparkles,
  Flame, Lock, Shield, ArrowRight, RefreshCw, Trophy, Clock, ChevronRight, Zap,
  Mic, Camera, Square, Image as ImageIcon, Volume2
} from 'lucide-react';
import api, { getMediaUrl, DEFAULT_AVATAR, isImageIcon, isAudioMedia } from '../../lib/api';
import {
  playTileFlipSFX,
  playSecretRevealSFX,
  playCompletedSFX,
  playTurnChangeSFX
} from '../../lib/secretLoversSFX';

const PRESET_CATEGORIES = [
  { id: 'Romantic', label: '❤️ Romantic', icon: '❤️' },
  { id: 'Questions', label: '💬 Questions', icon: '💬' },
  { id: 'Deep', label: '🧠 Deep', icon: '🧠' },
  { id: 'Memories', label: '💭 Memories', icon: '💭' },
  { id: 'Funny', label: '😂 Funny', icon: '😂' },
  { id: 'Challenge', label: '🎯 Challenge', icon: '🎯' },
  { id: 'Private', label: '🔥 Private', icon: '🔥' }
];

const PRESET_INSPIRATIONS = [
  { category: 'Romantic', text: 'What was your exact first impression of me when we first met?' },
  { category: 'Romantic', text: 'What is one thing I do that secretly makes your heart melt?' },
  { category: 'Deep', text: 'Tell me something you have never shared with anyone else.' },
  { category: 'Memories', text: 'What is your absolute favorite memory of us together?' },
  { category: 'Challenge', text: 'Give me your best 10-second romantic compliment right now.' },
  { category: 'Funny', text: 'What is the funniest or most awkward thing that happened on one of our dates?' },
  { category: 'Private', text: 'If we could escape anywhere in the world together tomorrow, where would we go?' },
  { category: 'Questions', text: 'What is one habit of mine that you find adorable?' }
];

const getIDStr = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);

  let target = val;
  if (typeof target === 'object' && target !== null) {
    if (target._id && target._id !== target) {
      target = target._id;
    } else if (target.id && target.id !== target) {
      target = target.id;
    } else if (target.personaId && target.personaId !== target) {
      target = target.personaId;
    }
  }

  if (typeof target === 'string') return target.trim();
  if (typeof target === 'number') return String(target);
  if (target && typeof target.toString === 'function') {
    const str = target.toString();
    if (str && str !== '[object Object]') return str;
  }
  return '';
};

export default function SecretLoversModal({
  isOpen,
  onClose,
  conversationId,
  partnerPersona,
  activePersona,
  activeGameId,
  socket
}) {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState('creator'); // 'creator' | 'waiting' | 'board' | 'reveal' | 'completed'
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isCreatingNewGame, setIsCreatingNewGame] = useState(false);

  const [questionCount, setQuestionCount] = useState(10);
  const [creatorSkipOwnQuestions, setCreatorSkipOwnQuestions] = useState(true);
  const [customQuestions, setCustomQuestions] = useState([
    { text: 'What was your first impression of me?', category: 'Romantic' },
    { text: 'Tell me something you secretly appreciate about me.', category: 'Romantic' },
    { text: 'What is your favorite memory of us together?', category: 'Memories' },
    { text: 'What is one goal you want us to achieve together?', category: 'Deep' },
    { text: 'Give me a 10-second heartfelt compliment.', category: 'Challenge' }
  ]);
  const [previewMode, setPreviewMode] = useState(false);

  // Active Game State
  const [selectedTile, setSelectedTile] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [userAnswerInput, setUserAnswerInput] = useState('');
  const [answerMediaUrl, setAnswerMediaUrl] = useState('');
  const [answerMediaType, setAnswerMediaType] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [inspectedTile, setInspectedTile] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch or refresh game state when activeGameId changes or modal opens
  const fetchGameState = async (id = null) => {
    if (isCreatingNewGame && !id) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const url = id
        ? `/games/secret-lovers/${id}`
        : conversationId
        ? `/games/secret-lovers/conversation/${conversationId}`
        : null;

      if (!url) {
        setCurrentStep('creator');
        setGame(null);
        return;
      }

      const res = await api.get(url);
      if (res.data?.success && res.data?.game) {
        const fetchedGame = res.data.game;
        setGame(fetchedGame);

        if (fetchedGame.status === 'invited') {
          const isCreatorCheck = getIDStr(fetchedGame.creatorPersonaId) === getIDStr(activePersona);
          if (isCreatorCheck) {
            setCurrentStep('waiting');
          } else {
            // Invited partner automatically accepts invitation on join so game becomes active!
            await handleAcceptInvite(fetchedGame._id, fetchedGame);
          }
        } else if (fetchedGame.status === 'active') {
          setCurrentStep('board');
        } else if (fetchedGame.status === 'completed') {
          setCurrentStep('completed');
        }
      } else {
        setCurrentStep('creator');
        setGame(null);
      }
    } catch (err) {
      console.error('Error fetching game state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeGameId) {
        setIsCreatingNewGame(false);
        fetchGameState(activeGameId);
      } else if (!isCreatingNewGame) {
        fetchGameState(null);
      }
    }
  }, [isOpen, activeGameId, conversationId]);

  // Socket listener for real-time game updates
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleGameUpdate = (data) => {
      if (data?.game) {
        const updatedGame = data.game;
        const currentTileNum = game?.currentRevealedTile?.number;
        const newTileNum = updatedGame?.currentRevealedTile?.number;

        // Play SFX on turn change or reveal
        if (!currentTileNum && newTileNum) {
          playSecretRevealSFX();
        } else if (updatedGame.currentTurnPersonaId !== game?.currentTurnPersonaId) {
          playTurnChangeSFX();
        }

        setGame(updatedGame);

        if (updatedGame.status === 'active') {
          setCurrentStep('board');
        } else if (updatedGame.status === 'completed') {
          setCurrentStep('completed');
          playCompletedSFX();
        }
      }
    };

    socket.on('secret_lovers:updated', handleGameUpdate);
    return () => {
      socket.off('secret_lovers:updated', handleGameUpdate);
    };
  }, [socket, isOpen, game]);

  // Helper functions for question creator
  const handleSetQuestionCount = (count) => {
    setQuestionCount(count);
    setCustomQuestions(prev => {
      if (prev.length < count) {
        const newItems = [...prev];
        while (newItems.length < count) {
          const idx = newItems.length + 1;
          const inspiration = PRESET_INSPIRATIONS[(idx - 1) % PRESET_INSPIRATIONS.length];
          newItems.push({
            text: inspiration ? inspiration.text : `Secret Question #${idx}`,
            category: inspiration ? inspiration.category : 'Romantic'
          });
        }
        return newItems;
      } else {
        return prev.slice(0, count);
      }
    });
  };

  const handleUpdateQuestion = (index, text, category) => {
    setCustomQuestions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], text, category: category || next[index]?.category || 'Romantic' };
      return next;
    });
  };

  const handleAddQuestionItem = () => {
    setCustomQuestions(prev => [
      ...prev,
      { text: `Secret Question #${prev.length + 1}`, category: 'Romantic' }
    ]);
    setQuestionCount(prev => prev + 1);
  };

  const handleRemoveQuestionItem = (index) => {
    if (customQuestions.length <= 1) return;
    setCustomQuestions(prev => prev.filter((_, i) => i !== index));
    setQuestionCount(prev => prev - 1);
  };

  const handleAutoFillInspiration = () => {
    setCustomQuestions(prev => {
      return prev.map((q, idx) => {
        const insp = PRESET_INSPIRATIONS[idx % PRESET_INSPIRATIONS.length];
        return {
          text: insp ? insp.text : q.text,
          category: insp ? insp.category : q.category
        };
      });
    });
  };

  // Submit & Create Game
  const handleStartGameSession = async () => {
    const targetPartner = partnerPersona || (game ? (getIDStr(game.creatorPersonaId) === getIDStr(activePersona) ? game.partnerPersonaId : game.creatorPersonaId) : null);
    const targetPartnerId = getIDStr(targetPartner);

    if (!conversationId || !targetPartnerId) {
      setErrorMsg('Missing conversation or partner info.');
      return;
    }

    const validQuestions = customQuestions.filter(q => q.text.trim().length > 0);
    if (validQuestions.length === 0) {
      setErrorMsg('Please enter at least one question.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await api.post('/games/secret-lovers/create', {
        conversationId,
        partnerPersonaId: targetPartnerId,
        questions: validQuestions,
        creatorSkipOwnQuestions
      });

      if (res.data?.success && res.data?.game) {
        setIsCreatingNewGame(false);
        setGame(res.data.game);
        setCurrentStep('waiting');
      }
    } catch (err) {
      console.error('Error starting Secret Lovers game:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to start game session.');
    } finally {
      setLoading(false);
    }
  };

  // Accept Game Invitation
  const handleAcceptInvite = async (gId = null, gameData = null) => {
    const targetId = gId || game?._id;
    const currentGameData = gameData || game;
    const isCreatorCheck = currentGameData ? getIDStr(currentGameData.creatorPersonaId) === getIDStr(activePersona) : false;
    if (!targetId || isCreatorCheck) return null;
    try {
      setLoading(true);
      const res = await api.post(`/games/secret-lovers/${targetId}/accept`);
      if (res.data?.success && res.data?.game) {
        setGame(res.data.game);
        setCurrentStep('board');
        return res.data.game;
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      if (!isCreatorCheck) {
        setErrorMsg('Failed to accept game invitation.');
      }
    } finally {
      setLoading(false);
    }
    return null;
  };

  // Select Number Tile on Turn
  const handleSelectTile = async (tileNum) => {
    if (!game?._id) return;
    let currentGame = game;
    const isCreatorCheck = getIDStr(currentGame.creatorPersonaId) === getIDStr(activePersona);

    if (currentGame.status === 'invited') {
      if (isCreatorCheck) {
        setErrorMsg(`Waiting for ${partnerName} to accept the invitation before tiles can be chosen.`);
        return;
      }
      const acceptedGame = await handleAcceptInvite(currentGame._id);
      if (acceptedGame) currentGame = acceptedGame;
    }

    const isMyTurnCheck = getIDStr(currentGame.currentTurnPersonaId) === getIDStr(activePersona);
    if (!isMyTurnCheck || currentGame.status !== 'active') return;

    if ((currentGame.selectedNumbers || []).includes(tileNum)) return;

    playTileFlipSFX();
    setIsFlipping(true);

    try {
      const res = await api.post(`/games/secret-lovers/${currentGame._id}/select-number`, { number: tileNum });
      if (res.data?.success && res.data?.game) {
        setGame(res.data.game);
        playSecretRevealSFX();
      }
    } catch (err) {
      console.error('Error selecting tile number:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to select tile.');
    } finally {
      setIsFlipping(false);
    }
  };

  // Handle Image Answer Upload
  const handleImageAnswerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingMedia(true);
      setErrorMsg(null);
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData);
      if (res.data?.success && (res.data?.fileUrl || res.data?.url)) {
        setAnswerMediaUrl(res.data.fileUrl || res.data.url);
        setAnswerMediaType('image');
      }
    } catch (err) {
      console.error('Image upload error:', err);
      setErrorMsg('Failed to upload image response.');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Handle Voice Note Recording
  const startVoiceRecording = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result;
          try {
            setUploadingMedia(true);
            const res = await api.post('/upload', { fileData: base64data, fileName: 'voice_answer.webm' });
            if (res.data?.success && (res.data?.fileUrl || res.data?.url)) {
              setAnswerMediaUrl(res.data.fileUrl || res.data.url);
              setAnswerMediaType('voice');
            } else {
              setAnswerMediaUrl(base64data);
              setAnswerMediaType('voice');
            }
          } catch {
            setAnswerMediaUrl(base64data);
            setAnswerMediaType('voice');
          } finally {
            setUploadingMedia(false);
          }
        };
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      setErrorMsg('Microphone access denied. Please allow mic permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // Complete or Skip Turn
  const handleActionTurn = async (action) => {
    if (!game?._id) return;
    const isMyTurnCheck = getIDStr(game.currentTurnPersonaId) === getIDStr(activePersona);
    if (!isMyTurnCheck) return;

    try {
      setLoading(true);
      if (action === 'done') playCompletedSFX();
      const res = await api.post(`/games/secret-lovers/${game._id}/action-turn`, {
        action,
        answerText: userAnswerInput,
        answerMediaUrl,
        answerMediaType
      });
      if (res.data?.success && res.data?.game) {
        setGame(res.data.game);
        setUserAnswerInput('');
        setAnswerMediaUrl('');
        setAnswerMediaType('');
      }
    } catch (err) {
      console.error('Error completing turn action:', err);
      setErrorMsg('Failed to submit response.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const resolvedPartner = partnerPersona || (
    game
      ? (getIDStr(game.creatorPersonaId) === getIDStr(activePersona) ? game.partnerPersonaId : game.creatorPersonaId)
      : null
  );
  const isMyTurn = game ? getIDStr(game.currentTurnPersonaId) === getIDStr(activePersona) : true;
  const isCreator = game ? getIDStr(game.creatorPersonaId) === getIDStr(activePersona) : true;
  const partnerName = resolvedPartner?.displayName || resolvedPartner?.username || 'Partner';
  const partnerHandle = resolvedPartner?.username ? `@${resolvedPartner.username}` : partnerName;
  const revealedTile = game?.currentRevealedTile;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-6 animate-in fade-in duration-300 select-none overflow-y-auto custom-scrollbar">
      {/* Background Floating Hearts Particle Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-1/4 left-1/6 text-rose-500 text-6xl animate-bounce duration-1000">❤️</div>
        <div className="absolute top-2/3 right-1/4 text-pink-500 text-5xl animate-pulse">✨</div>
        <div className="absolute bottom-1/4 left-1/3 text-rose-600 text-7xl animate-bounce">💖</div>
        <div className="absolute top-1/3 right-1/6 text-rose-400 text-4xl animate-pulse">❤️</div>
      </div>

      {/* Main Container Modal Window */}
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#1c0612] via-[#12030a] to-[#0a0106] border border-rose-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl z-10 my-auto flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-500/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/40">
              <Heart className="w-5 h-5 fill-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-outfit tracking-wide flex items-center gap-1.5">
                Secret Lovers <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">Couples Game</span>
              </h2>
              <p className="text-[11px] text-rose-300/80 font-medium">
                {partnerName ? `Playing with ${partnerHandle}` : 'Private Couples Game'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentStep !== 'creator' && (
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNewGame(true);
                  setGame(null);
                  setCurrentStep('creator');
                  setErrorMsg(null);
                }}
                className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/40 transition flex items-center gap-1"
                title="Create a new Secret Lovers game"
              >
                <Plus className="w-3.5 h-3.5 text-rose-400" /> New Game
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/5 hover:bg-rose-500/20 text-gray-300 hover:text-white border border-white/10 transition"
              title="Close Game"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="my-2 p-3 bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs rounded-xl flex items-center justify-between shrink-0">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-300 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 1: QUESTION CREATOR INTERFACE */}
        {/* ============================================================ */}
        {currentStep === 'creator' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 py-4 pr-1">
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-rose-400" /> Create Your Secrets & Challenges
                </h3>
                <button
                  type="button"
                  onClick={handleAutoFillInspiration}
                  className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 text-[11px] font-bold border border-rose-500/40 transition flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-amber-400" /> Auto-Fill Ideas
                </button>
              </div>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                Type the secret questions or challenges that will be hidden behind the mystery tiles. Your partner won't see them until they pick a tile!
              </p>
            </div>

            {/* Question Creator Setting Toggle */}
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  🛡️ Creator Rule: Skip Own Questions
                </span>
                <p className="text-[11px] text-rose-200/70 leading-normal">
                  If enabled, you don't have to answer questions you created (Pass to partner or skip).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={creatorSkipOwnQuestions}
                  onChange={(e) => setCreatorSkipOwnQuestions(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>

            {/* Question Count Selector Chips */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 block">How many questions?</label>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15, 20, 30].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => handleSetQuestionCount(cnt)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                      questionCount === cnt
                        ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white border-rose-400 shadow-md shadow-rose-600/30'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                    }`}
                  >
                    {cnt} Questions
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-rose-300 font-mono">
                  Secrets Board List ({customQuestions.length})
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewMode(!previewMode)}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> {previewMode ? 'Edit Mode' : 'Preview Cards'}
                </button>
              </div>

              {customQuestions.map((q, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-[#14060e] border border-rose-500/20 space-y-2.5 group hover:border-rose-500/40 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-400 font-mono">
                      Secret #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Category Selector */}
                      <select
                        value={q.category}
                        onChange={(e) => handleUpdateQuestion(idx, q.text, e.target.value)}
                        className="bg-[#240a18] border border-rose-500/30 text-rose-200 text-[11px] rounded-lg px-2 py-1 font-semibold focus:outline-none"
                      >
                        {PRESET_CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                      </select>
                      {customQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestionItem(idx)}
                          className="p-1 text-gray-400 hover:text-rose-400 rounded-md transition"
                          title="Remove Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {previewMode ? (
                    <div className="p-3 rounded-xl bg-black/40 border border-rose-500/30 text-xs text-rose-100 font-medium italic">
                      "{q.text || 'Empty Question'}"
                    </div>
                  ) : (
                    <textarea
                      rows={2}
                      value={q.text}
                      onChange={(e) => handleUpdateQuestion(idx, e.target.value, q.category)}
                      placeholder={`Type question or challenge #${idx + 1}...`}
                      className="w-full bg-[#1b0813] border border-rose-500/30 rounded-xl p-2.5 text-xs text-white placeholder-rose-300/40 focus:outline-none focus:border-rose-500 transition resize-none"
                    />
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddQuestionItem}
                className="w-full py-2.5 rounded-2xl border border-dashed border-rose-500/40 text-rose-300 text-xs font-bold hover:bg-rose-500/10 transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Another Question
              </button>
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-rose-500/20 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleStartGameSession}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-sm shadow-xl shadow-rose-600/30 transition flex items-center justify-center gap-2"
              >
                <Heart className="w-4 h-4 fill-white animate-pulse" /> Start Secret Lovers & Invite Partner
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: WAITING FOR INVITATION ACCEPTANCE */}
        {/* ============================================================ */}
        {currentStep === 'waiting' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white shadow-2xl shadow-rose-600/50 animate-pulse">
                <Heart className="w-12 h-12 fill-white animate-ping" />
              </div>
            </div>

            <div className="space-y-2 max-w-sm">
              <h3 className="text-lg font-extrabold text-white">Invitation Sent!</h3>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                Waiting for <span className="text-white font-bold">{partnerName}</span> to open the game in chat... As soon as {partnerName} opens it, you can spectate live!
              </p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: NUMBERED MYSTERY BOARD & GAMEPLAY */}
        {/* ============================================================ */}
        {(currentStep === 'board' || currentStep === 'reveal') && game && (
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 py-3">
            
            {/* Status Header Bar */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 to-purple-950/60 border border-rose-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={getMediaUrl(isMyTurn ? activePersona?.avatar : game.partnerPersonaId?.avatar) || DEFAULT_AVATAR}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border-2 border-rose-500"
                  />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 absolute bottom-0 right-0 border-2 border-[#12030a]" />
                </div>
                <div>
                  <p className="text-xs font-black text-white flex items-center gap-1.5">
                    {isMyTurn ? "❤️ Your Turn! Pick & answer a mystery secret tile" : `👀 Watching ${partnerName}'s turn (Live Spectator Mode)`}
                  </p>
                  <p className="text-[11px] text-rose-300">
                    {game.completedNumbers?.length || 0} completed • {game.questions?.length - (game.selectedNumbers?.length || 0)} tiles remaining
                  </p>
                </div>
              </div>

              {!isMyTurn && (
                <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold animate-pulse">
                  Spectating...
                </span>
              )}
            </div>

            {/* Revealed Tile Active Challenge Card (If a tile is currently revealed!) */}
            {revealedTile && revealedTile.number && revealedTile.status === 'pending' && (
              <div className="p-5 rounded-3xl bg-gradient-to-b from-rose-900/90 to-purple-950/90 border-2 border-rose-400 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-rose-400/30">
                  <span className="px-3 py-1 rounded-full bg-rose-500 text-white font-black text-xs font-mono shadow-md">
                    🔐 SECRET #{revealedTile.number}
                  </span>
                  <span className="text-xs font-bold text-rose-200">
                    {revealedTile.category || 'Romantic'}
                  </span>
                </div>

                <div className="text-center py-4 space-y-2">
                  <Heart className="w-8 h-8 text-pink-400 mx-auto fill-pink-400 animate-bounce" />
                  <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug px-2">
                    "{revealedTile.text}"
                  </h3>
                </div>

                {isMyTurn ? (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-rose-300 block">Your Answer / Secret Response (Optional Text, Photo or Voice Note):</label>
                      <textarea
                        rows={2}
                        value={userAnswerInput}
                        onChange={(e) => setUserAnswerInput(e.target.value)}
                        placeholder="Type your answer or response here..."
                        className="w-full bg-[#1b0813] border border-rose-500/30 rounded-xl p-2.5 text-xs text-white placeholder-rose-300/40 focus:outline-none focus:border-rose-500 transition resize-none"
                      />
                    </div>

                    {/* Media Attachments Bar (Photo or Voice Note) */}
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={imageInputRef}
                        accept="image/*"
                        onChange={handleImageAnswerUpload}
                        className="hidden"
                      />

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={uploadingMedia || isRecording}
                          className="flex-1 py-2 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/30 text-rose-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
                          <span>{uploadingMedia ? 'Uploading...' : 'Attach Photo'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                          disabled={uploadingMedia}
                          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            isRecording
                              ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                              : 'bg-rose-950/60 hover:bg-rose-900/80 border-rose-500/30 text-rose-200'
                          }`}
                        >
                          {isRecording ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-white" />
                              <span>Stop ({recordingTime}s)</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-3.5 h-3.5 text-rose-400" />
                              <span>Record Voice</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Display attached image or voice note preview */}
                      {answerMediaUrl && (
                        <div className="p-2.5 rounded-xl bg-black/50 border border-rose-500/40 relative flex items-center justify-between gap-2">
                          {isAudioMedia(answerMediaUrl, answerMediaType) ? (
                            <div className="flex-1">
                              <span className="text-[11px] font-bold text-rose-300 block mb-1">🎤 Voice Note Attached:</span>
                              <audio controls src={getMediaUrl(answerMediaUrl)} className="w-full h-8" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 overflow-hidden">
                              <img
                                src={getMediaUrl(answerMediaUrl)}
                                alt="Answer photo"
                                className="w-14 h-14 object-cover rounded-lg border border-rose-400/50"
                              />
                              <span className="text-xs font-semibold text-rose-200 truncate">Photo Attached</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setAnswerMediaUrl('');
                              setAnswerMediaType('');
                            }}
                            className="p-1 rounded-lg bg-white/10 hover:bg-rose-500/30 text-rose-300 hover:text-white transition"
                            title="Remove attachment"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleActionTurn('skip')}
                        disabled={loading}
                        className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/20"
                      >
                        Skip Secret
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionTurn('done')}
                        disabled={loading || uploadingMedia}
                        className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4 stroke-[3]" /> Submit Answer & Complete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-black/50 border border-rose-500/30 text-center space-y-2">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-rose-300 font-bold">
                      <Eye className="w-4 h-4 text-rose-400 animate-pulse" />
                      <span>Live Spectator Mode: Waiting for {partnerName}'s answer...</span>
                    </div>
                    {revealedTile.answerText && (
                      <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-100 italic">
                        "{revealedTile.answerText}"
                      </div>
                    )}
                    {revealedTile.answerMediaUrl && (
                      <div className="pt-2">
                        {isAudioMedia(revealedTile.answerMediaUrl, revealedTile.answerMediaType) ? (
                          <audio controls src={getMediaUrl(revealedTile.answerMediaUrl)} className="w-full h-10 rounded-lg mx-auto" />
                        ) : (
                          <img
                            src={getMediaUrl(revealedTile.answerMediaUrl)}
                            alt="Answer photo"
                            className="max-h-48 mx-auto rounded-xl border border-rose-500/40 object-cover shadow-lg"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Inspected Tile Answer Viewer Card */}
            {inspectedTile && (
              <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-950/90 to-rose-950/90 border border-purple-500/50 text-white space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-purple-500/30 pb-2">
                  <span className="text-xs font-black text-purple-300 font-mono">
                    🔐 SECRET #{inspectedTile.number} ({inspectedTile.category || 'Romantic'})
                  </span>
                  <button
                    type="button"
                    onClick={() => setInspectedTile(null)}
                    className="text-gray-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded-lg bg-white/10"
                  >
                    Close
                  </button>
                </div>
                <p className="text-xs font-bold text-white leading-relaxed">
                  "{inspectedTile.text}"
                </p>
                {inspectedTile.answerText && (
                  <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/30 text-xs text-emerald-300 font-medium">
                    💬 <span className="font-bold text-gray-200">Answer:</span> "{inspectedTile.answerText}"
                  </div>
                )}
                {inspectedTile.answerMediaUrl && (
                  <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/30 space-y-1.5">
                    <span className="text-[11px] font-bold text-emerald-300 block">
                      {isAudioMedia(inspectedTile.answerMediaUrl, inspectedTile.answerMediaType) ? '🎤 Attached Voice Note:' : '📷 Attached Photo:'}
                    </span>
                    {isAudioMedia(inspectedTile.answerMediaUrl, inspectedTile.answerMediaType) ? (
                      <audio controls src={getMediaUrl(inspectedTile.answerMediaUrl)} className="w-full h-10" />
                    ) : (
                      <img
                        src={getMediaUrl(inspectedTile.answerMediaUrl)}
                        alt="Submitted Answer"
                        className="max-h-52 max-w-full rounded-xl object-cover border border-emerald-500/40 shadow-md"
                      />
                    )}
                  </div>
                )}
                {!inspectedTile.answerText && !inspectedTile.answerMediaUrl && (
                  <div className="p-2.5 rounded-xl bg-black/40 text-[11px] text-gray-400 italic">
                    Completed challenge without written response or media.
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Numbered Tiles Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-300 font-mono px-1">
                Mystery Secret Board ({game.questions?.length || 0} Tiles - Click completed to view answers)
              </h4>

              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                {(game.questions || []).map((q) => {
                  const tileNum = q.number;
                  const isSelected = (game.selectedNumbers || []).includes(tileNum);
                  const isCompleted = (game.completedNumbers || []).includes(tileNum);
                  const isSkipped = (game.skippedNumbers || []).includes(tileNum);

                  return (
                    <button
                      key={tileNum}
                      type="button"
                      disabled={!isMyTurn && !isSelected}
                      onClick={() => {
                        if (isSelected) {
                          setInspectedTile(q);
                        } else if (isMyTurn) {
                          handleSelectTile(tileNum);
                        }
                      }}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center font-mono font-black text-base transition-all duration-200 relative group overflow-hidden ${
                        isSelected
                          ? isCompleted
                            ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 cursor-pointer hover:scale-105'
                            : isSkipped
                            ? 'bg-amber-950/60 border border-amber-500/50 text-amber-400 cursor-pointer hover:scale-105'
                            : 'bg-purple-950/60 border border-purple-500/50 text-purple-300 cursor-pointer hover:scale-105'
                          : isMyTurn
                          ? 'bg-gradient-to-b from-rose-900/80 to-[#2c0819] border border-rose-500/40 text-white hover:scale-105 hover:border-rose-400 hover:shadow-xl hover:shadow-rose-600/30 active:scale-95'
                          : 'bg-[#180611] border border-rose-500/20 text-rose-300/50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {isSelected ? (
                        <div className="flex flex-col items-center gap-0.5">
                          {isCompleted ? <Check className="w-5 h-5 text-emerald-400 stroke-[3]" /> : <X className="w-5 h-5 text-amber-400" />}
                          <span className="text-[10px] font-mono">#{tileNum}</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-lg drop-shadow">{tileNum}</span>
                          <span className="text-[9px] text-rose-300/60 font-sans font-medium">{q.category}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 4: GAME COMPLETE SUMMARY */}
        {/* ============================================================ */}
        {currentStep === 'completed' && game && (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-slate-950 shadow-2xl shadow-rose-500/40 animate-bounce">
              <Trophy className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-extrabold text-white font-outfit">Game Completed! 🎉</h3>
              <p className="text-xs text-rose-200/80">
                You and {partnerName} finished all secret challenges!
              </p>
            </div>

            {/* Stats Card */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                <p className="text-2xl font-black text-emerald-400 font-mono">{game.completedNumbers?.length || 0}</p>
                <p className="text-[11px] font-bold text-gray-300">Secrets Done</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-center">
                <p className="text-2xl font-black text-amber-400 font-mono">{game.skippedNumbers?.length || 0}</p>
                <p className="text-[11px] font-bold text-gray-300">Secrets Skipped</p>
              </div>
            </div>

            <div className="flex gap-3 w-full max-w-sm">
              <button
                type="button"
                onClick={() => setCurrentStep('creator')}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold text-xs shadow-lg transition"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
              >
                Return To Chat
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
