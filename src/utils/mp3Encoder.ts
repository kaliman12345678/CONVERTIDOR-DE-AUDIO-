import { Mp3Encoder } from '@breezystack/lamejs';
import { convertBufferToMono } from './audioDecoder';

export interface Mp3EncodeOptions {
  mono?: boolean;
  bitrate?: number; // e.g. 128, 192, 320 kbps
  onProgress?: (progress: number) => void;
}

function floatToInt16(float32Array: Float32Array): Int16Array {
  const len = float32Array.length;
  const int16Array = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

/**
 * Encodes an AudioBuffer into an MP3 file Blob
 */
export async function encodeAudioBufferToMp3(
  audioBuffer: AudioBuffer,
  options: Mp3EncodeOptions = {}
): Promise<Blob> {
  const isMono = options.mono ?? false;
  const bufferToEncode = isMono ? convertBufferToMono(audioBuffer) : audioBuffer;
  const numChannels = bufferToEncode.numberOfChannels;
  const sampleRate = bufferToEncode.sampleRate;
  const kbps = options.bitrate || 160;

  const encoder = new Mp3Encoder(numChannels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];

  const leftChannel = floatToInt16(bufferToEncode.getChannelData(0));
  const rightChannel = numChannels > 1 ? floatToInt16(bufferToEncode.getChannelData(1)) : undefined;

  const sampleBlockSize = 1152;
  const totalSamples = leftChannel.length;

  for (let i = 0; i < totalSamples; i += sampleBlockSize) {
    const leftChunk = leftChannel.subarray(i, i + sampleBlockSize);
    let chunkResult: Uint8Array;

    if (numChannels === 1) {
      chunkResult = encoder.encodeBuffer(leftChunk);
    } else {
      const rightChunk = rightChannel!.subarray(i, i + sampleBlockSize);
      chunkResult = encoder.encodeBuffer(leftChunk, rightChunk);
    }

    if (chunkResult.length > 0) {
      mp3Data.push(chunkResult);
    }

    if (options.onProgress && i % (sampleBlockSize * 10) === 0) {
      options.onProgress(Math.min(0.95, i / totalSamples));
    }
  }

  const finalChunk = encoder.flush();
  if (finalChunk.length > 0) {
    mp3Data.push(finalChunk);
  }

  if (options.onProgress) {
    options.onProgress(1);
  }

  return new Blob(mp3Data as BlobPart[], { type: 'audio/mp3' });
}
