// Web Audio API Sound Synthesizer for DONCHAT Notifications

export const NOTIF_PREFS_KEY = 'donchat_notif_prefs';

export const DEFAULT_NOTIF_PREFS = {
  messageNotifications: true,
  spaceMentions: true,
  soundEffects: true,
  emailDigest: false,
};

/** Read prefs from localStorage (safe for SSR). */
export function getNotifPrefs() {
  if (typeof window === 'undefined') return { ...DEFAULT_NOTIF_PREFS };
  try {
    const raw = localStorage.getItem(NOTIF_PREFS_KEY);
    return raw ? { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_NOTIF_PREFS };
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

/** Persist prefs to localStorage. */
export function saveNotifPrefs(prefs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
}

let globalAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!globalAudioCtx) {
    globalAudioCtx = new AudioContextClass();
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      }).catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

export function playNotificationSound() {
  if (typeof window === 'undefined') return;

  // Respect the Sound Effects toggle
  if (!getNotifPrefs().soundEffects) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // High tone oscillator (Ding)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5 note
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5 note

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.35, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);

    // Warm lower tone for depth
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(440, now); // A4 note
    osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5 note

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.02);
    osc2.stop(now + 0.32);

  } catch (err) {
    console.warn('Could not play notification sound:', err);
  }
}
