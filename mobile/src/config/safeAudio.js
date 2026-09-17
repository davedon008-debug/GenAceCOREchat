import { Platform, Vibration } from 'react-native';

const NOTIFICATION_SOUND_ASSET = require('../../assets/notification.wav');

/**
 * Play single GenAce notification sound chime using Expo SDK 57 expo-audio
 */
export const playChimeSound = async () => {
  try {
    // 1. Trigger subtle haptic vibration on mobile devices
    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate([0, 100, 50, 100]);
      } catch (e) {
        // Ignore vibration error if unsupported
      }
    }

    // 2. Mobile Native: Play bundled WAV sound asset via Expo SDK 57 native expo-audio module
    if (Platform.OS !== 'web') {
      try {
        const expoAudio = require('expo-audio');
        if (expoAudio && typeof expoAudio.createAudioPlayer === 'function') {
          if (typeof expoAudio.setAudioModeAsync === 'function') {
            await expoAudio.setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
          }

          const player = expoAudio.createAudioPlayer(NOTIFICATION_SOUND_ASSET);
          if (player) {
            if (typeof player.volume !== 'undefined') player.volume = 1.0;
            if (typeof player.play === 'function') {
              player.play();
            }
          }
        }
      } catch (expoAudioErr) {
        // Ignore fallback
      }
      return; // Stop execution immediately so no secondary/extra sound plays on mobile
    }

    // 3. Web Browsers: Play Web Audio API synthesizer matching DONCHAT Web Application
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            await ctx.resume().catch(() => {});
          }

          const now = ctx.currentTime;

          // High tone oscillator (Ding - D5 note to A5 note)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(587.33, now); // D5
          osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

          gain1.gain.setValueAtTime(0, now);
          gain1.gain.linearRampToValueAtTime(0.35, now + 0.02);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          osc1.connect(gain1);
          gain1.connect(ctx.destination);

          osc1.start(now);
          osc1.stop(now + 0.35);

          // Warm lower tone for depth (A4 note to E5 note)
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();

          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(440, now); // A4
          osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5

          gain2.gain.setValueAtTime(0, now);
          gain2.gain.linearRampToValueAtTime(0.2, now + 0.03);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

          osc2.connect(gain2);
          gain2.connect(ctx.destination);

          osc2.start(now + 0.02);
          osc2.stop(now + 0.32);

          setTimeout(() => {
            ctx.close().catch(() => {});
          }, 500);

          return;
        } catch (synthErr) {}
      }
    }
  } catch (err) {
    console.warn('[playChimeSound] error:', err);
  }
};
