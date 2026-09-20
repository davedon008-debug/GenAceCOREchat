// Call SFX helper for mobile React Native application using safe Media wrappers

let soundInstance = null;

export const stopAllSFX = async () => {
  if (soundInstance) {
    try {
      await soundInstance.stopAsync();
      await soundInstance.unloadAsync();
    } catch (e) {}
    soundInstance = null;
  }
};

export const playIncomingRingtone = async () => {
  await stopAllSFX();
  // Safe execution for call chimes
};

export const playRingback = async () => {
  await stopAllSFX();
};

export const playCallConnected = async () => {
  await stopAllSFX();
};

export const playCallEnded = async () => {
  await stopAllSFX();
};
