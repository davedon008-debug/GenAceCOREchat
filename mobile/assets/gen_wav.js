const fs = require('fs');
const path = require('path');

const sampleRate = 22050; // 22.05 kHz sample rate for crisp quality
const totalDuration = 0.45; // 0.45 seconds
const numSamples = Math.floor(sampleRate * totalDuration);

// WAV Header (44 bytes for 16-bit PCM Mono)
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + numSamples * 2, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
header.writeUInt16LE(1, 22);  // NumChannels (1 mono)
header.writeUInt32LE(sampleRate, 24); // SampleRate
header.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * 2)
header.writeUInt16LE(2, 32);  // BlockAlign
header.writeUInt16LE(16, 34); // BitsPerSample (16 bits)
header.write('data', 36);
header.writeUInt32LE(numSamples * 2, 40);

const pcmData = Buffer.alloc(numSamples * 2);

// DONCHAT Web Chime Sweep: Note D5 (587.33Hz)->A5 (880Hz) + A4 (440Hz)->E5 (659.25Hz)
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;

  // Sweep 1: D5 -> A5 (0.35s duration)
  const freq1 = 587.33 + (880 - 587.33) * Math.min(1, t / 0.08);
  const env1 = Math.min(1, t / 0.02) * Math.exp(-t * 8);
  const sine1 = Math.sin(2 * Math.PI * freq1 * t) * env1 * 0.45;

  // Sweep 2: A4 -> E5 (0.32s duration)
  const freq2 = 440 + (659.25 - 440) * Math.min(1, t / 0.10);
  const env2 = Math.min(1, Math.max(0, (t - 0.02) / 0.03)) * Math.exp(-(t - 0.02) * 9);
  const sine2 = Math.sin(2 * Math.PI * freq2 * t) * env2 * 0.35;

  const sampleFloat = Math.max(-1.0, Math.min(1.0, sine1 + sine2));
  const sample16 = Math.floor(sampleFloat * 32767);
  pcmData.writeInt16LE(sample16, i * 2);
}

const wavBuffer = Buffer.concat([header, pcmData]);
const targetPath = path.join(__dirname, 'notification.wav');
fs.writeFileSync(targetPath, wavBuffer);

console.log('Successfully generated local asset:', targetPath, wavBuffer.length, 'bytes');
