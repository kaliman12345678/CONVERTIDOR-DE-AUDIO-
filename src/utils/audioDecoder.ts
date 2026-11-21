// Singleton AudioContext with iOS unlocking
let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Decodes any audio file (MP3, M4A, AAC, WAV, OGG, FLAC, etc.) into an AudioBuffer
 */
export async function decodeAudioFile(fileOrBlob: Blob | File): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const arrayBuffer = await fileOrBlob.arrayBuffer();
  // Decode audio data (creates PCM float32 buffers)
  return await ctx.decodeAudioData(arrayBuffer.slice(0));
}

/**
 * Trims an AudioBuffer between start and end seconds
 */
export function sliceAudioBuffer(
  buffer: AudioBuffer,
  startTime: number,
  endTime: number
): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;

  const validStart = Math.max(0, Math.min(startTime, buffer.duration));
  const validEnd = Math.max(validStart, Math.min(endTime, buffer.duration));

  const startOffset = Math.floor(validStart * sampleRate);
  const endOffset = Math.floor(validEnd * sampleRate);
  const frameCount = Math.max(1, endOffset - startOffset);

  const trimmed = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    const subArray = channelData.subarray(startOffset, endOffset);
    trimmed.copyToChannel(subArray, channel);
  }

  return trimmed;
}

/**
 * Normalizes audio volume to peak at ~95% (-0.5 dB) so low voice recordings become loud and clear
 */
export function normalizeAudioBuffer(buffer: AudioBuffer): AudioBuffer {
  const ctx = getAudioContext();
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;

  let maxPeak = 0;
  for (let c = 0; c < numChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      const absVal = Math.abs(data[i]);
      if (absVal > maxPeak) {
        maxPeak = absVal;
      }
    }
  }

  if (maxPeak === 0 || maxPeak >= 0.98) {
    // Already loud enough or silent
    return buffer;
  }

  const gain = 0.95 / maxPeak;
  const normalized = ctx.createBuffer(numChannels, length, buffer.sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      dst[i] = src[i] * gain;
    }
    normalized.copyToChannel(dst, c);
  }

  return normalized;
}

/**
 * Converts stereo buffer to mono (best for voice notes in CRM and small file size)
 */
export function convertBufferToMono(buffer: AudioBuffer): AudioBuffer {
  if (buffer.numberOfChannels === 1) return buffer;

  const ctx = getAudioContext();
  const length = buffer.length;
  const mono = ctx.createBuffer(1, length, buffer.sampleRate);
  const monoData = new Float32Array(length);

  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    monoData[i] = (ch0[i] + ch1[i]) * 0.5;
  }

  mono.copyToChannel(monoData, 0);
  return mono;
}
