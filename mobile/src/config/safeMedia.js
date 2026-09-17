// Safe wrapper around native Expo modules (expo-audio and expo-image-picker)
let RawAudio = null;
let ImagePicker = null;
let DocumentPicker = null;

try {
  const expoAv = require('expo-av');
  if (expoAv && expoAv.Audio) {
    RawAudio = expoAv.Audio;
  }
} catch (e) {
  try {
    const ea = require('expo-audio');
    if (ea) {
      RawAudio = ea.Audio || ea;
    }
  } catch (err) {}
}

try {
  const ip = require('expo-image-picker');
  if (ip) {
    ImagePicker = ip;
  }
} catch (err) {
  // Handle missing native module
}

try {
  const dp = require('expo-document-picker');
  if (dp) {
    DocumentPicker = dp;
  }
} catch (err) {
  // Handle missing native module
}

export const Audio = RawAudio;
export { ImagePicker, DocumentPicker };
