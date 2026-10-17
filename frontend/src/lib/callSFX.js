import {
  playActiveRingtone,
  stopRingtoneAudio,
  stopCallVibration
} from './ringtoneManager';

// Ringtone & Call Audio Engine
let audioCtx = null;
let activeLoopInterval = null;
let activeOscillators = [];

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Auto-unlock audio playback on first user gesture
export const unlockAudio = () => {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch (e) {}
};

export const stopAllSFX = () => {
  stopRingtoneAudio();
  stopCallVibration();

  if (activeLoopInterval) {
    clearInterval(activeLoopInterval);
    activeLoopInterval = null;
  }
  activeOscillators.forEach(osc => {
    try { osc.stop(); osc.disconnect(); } catch (e) {}
  });
  activeOscillators = [];
};

export const playIncomingRingtone = () => {
  stopAllSFX();
  playActiveRingtone().catch(err => {
    console.warn('[CallSFX] Error playing active ringtone:', err);
  });
};

export const playRingback = () => {
  stopAllSFX();
  const ctx = getAudioContext();
  if (!ctx) return;

  const playPulse = () => {
    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(425, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gain.gain.setValueAtTime(0.12, now + 1.0);
      gain.gain.linearRampToValueAtTime(0, now + 1.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.1);
      activeOscillators.push(osc);
    } catch (e) {}
  };

  playPulse();
  activeLoopInterval = setInterval(playPulse, 3000);
};

export const playCallConnected = () => {
  stopAllSFX();
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.25);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (e) {}
};

export const playCallEnded = () => {
  stopAllSFX();
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {}
};
