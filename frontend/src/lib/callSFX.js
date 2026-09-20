// Web Audio API Synthesized Call SFX (Zero External MP3 Assets Required)

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
    audioCtx.resume();
  }
  return audioCtx;
};

export const stopAllSFX = () => {
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
  const ctx = getAudioContext();
  if (!ctx) return;

  const playToneBurst = () => {
    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now); // A4
      osc2.frequency.setValueAtTime(480, now); // Harmonic pair

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.setValueAtTime(0.15, now + 1.2);
      gain.gain.linearRampToValueAtTime(0, now + 1.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.4);
      osc2.stop(now + 1.4);

      activeOscillators.push(osc1, osc2);
    } catch (err) {
      console.warn('Audio synthesis error:', err);
    }
  };

  playToneBurst();
  activeLoopInterval = setInterval(playToneBurst, 2400);
};

export const playRingback = () => {
  stopAllSFX();
  const ctx = getAudioContext();
  if (!ctx) return;

  const playPulse = () => {
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(425, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
      gain.gain.setValueAtTime(0.1, now + 1.0);
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
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5

    gain.gain.setValueAtTime(0.12, now);
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
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {}
};
