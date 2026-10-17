// Ringtone & Audio Preference Manager for DONCHAT / GenAce
// Supports:
// 1. Phone / System Native Default (Device alert & hardware vibration, zero synthetic sounds)
// 2. Custom Phone Ringtone (User can upload any audio file from their phone storage)

const DB_NAME = 'donchat_audio_db';
const STORE_NAME = 'ringtone_store';
const RINGTONE_KEY = 'user_call_ringtone';

export const RINGTONE_MODE_KEY = 'donchat_ringtone_mode'; // 'phone_default' | 'custom'
export const RINGTONE_VIBRATE_KEY = 'donchat_ringtone_vibrate'; // 'true' | 'false'
export const RINGTONE_META_KEY = 'donchat_ringtone_meta';

// Helper to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Get ringtone configuration */
export function getRingtoneSettings() {
  if (typeof window === 'undefined') {
    return { mode: 'phone_default', vibrate: true, customFileName: null, customFileSize: null };
  }
  const mode = localStorage.getItem(RINGTONE_MODE_KEY) || 'phone_default';
  const vibrate = localStorage.getItem(RINGTONE_VIBRATE_KEY) !== 'false';
  let meta = null;
  try {
    const raw = localStorage.getItem(RINGTONE_META_KEY);
    if (raw) meta = JSON.parse(raw);
  } catch {}

  return {
    mode,
    vibrate,
    customFileName: meta?.name || null,
    customFileSize: meta?.size || null
  };
}

/** Update mode ('phone_default' or 'custom') */
export function setRingtoneMode(mode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RINGTONE_MODE_KEY, mode);
}

/** Update vibration setting */
export function setVibrateEnabled(enabled) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RINGTONE_VIBRATE_KEY, enabled ? 'true' : 'false');
}

/** Store user's uploaded phone ringtone into IndexedDB */
export async function uploadCustomRingtone(file) {
  if (!file) throw new Error('No file provided');
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const putReq = store.put(file, RINGTONE_KEY);
    putReq.onsuccess = () => {
      localStorage.setItem(RINGTONE_META_KEY, JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type,
        updatedAt: Date.now()
      }));
      setRingtoneMode('custom');
      resolve({ name: file.name, size: file.size });
    };
    putReq.onerror = () => reject(putReq.error);
  });
}

/** Retrieve the custom ringtone Blob from IndexedDB */
export async function getCustomRingtoneBlob() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RINGTONE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Error reading ringtone from IndexedDB:', err);
    return null;
  }
}

/** Delete custom ringtone and reset to phone default */
export async function deleteCustomRingtone() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(RINGTONE_KEY);
      req.onsuccess = () => {
        localStorage.removeItem(RINGTONE_META_KEY);
        setRingtoneMode('phone_default');
        resolve(true);
      };
      req.onerror = () => resolve(false);
    });
  } catch {
    setRingtoneMode('phone_default');
    return false;
  }
}

// In-memory active audio & vibration handles
let activeAudio = null;
let activeBlobUrl = null;
let activeVibrationTimer = null;

export function stopCallVibration() {
  if (activeVibrationTimer) {
    clearInterval(activeVibrationTimer);
    activeVibrationTimer = null;
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(0); } catch (e) {}
  }
}

export function triggerCallVibration() {
  stopCallVibration();
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const pattern = [1000, 500, 1000, 500, 1000, 500, 1000];
    try { navigator.vibrate(pattern); } catch (e) {}
    activeVibrationTimer = setInterval(() => {
      try { navigator.vibrate(pattern); } catch (e) {}
    }, 4500);
  }
}

export async function stopRingtoneAudio() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch (e) {}
    activeAudio = null;
  }
  if (activeBlobUrl) {
    try { URL.revokeObjectURL(activeBlobUrl); } catch (e) {}
    activeBlobUrl = null;
  }
}

/** Play custom ringtone if present, or trigger phone vibration */
export async function playActiveRingtone() {
  await stopRingtoneAudio();
  stopCallVibration();

  const settings = getRingtoneSettings();

  // Trigger hardware vibration if enabled
  if (settings.vibrate) {
    triggerCallVibration();
  }

  // If set to custom mode, play the user's uploaded phone ringtone
  if (settings.mode === 'custom') {
    const blob = await getCustomRingtoneBlob();
    if (blob) {
      try {
        activeBlobUrl = URL.createObjectURL(blob);
        activeAudio = new Audio(activeBlobUrl);
        activeAudio.loop = true;
        activeAudio.volume = 0.95;
        const promise = activeAudio.play();
        if (promise !== undefined) {
          promise.catch((err) => {
            console.warn('[Ringtone] Audio playback error:', err);
          });
        }
      } catch (err) {
        console.warn('[Ringtone] Failed to load custom audio blob:', err);
      }
    }
  }
  // If settings.mode === 'phone_default', no synthetic audio is played.
  // The phone uses its native system notification ringtone & vibration!
}
