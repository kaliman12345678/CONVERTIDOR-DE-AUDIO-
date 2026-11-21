import { convertBufferToMono } from './audioDecoder';

export interface OggEncodeOptions {
  mono?: boolean;
  bitrate?: number; // e.g. 32000 for voice/CRM, 64000, 128000
  sampleRate?: number; // 48000 recommended for Opus
  onProgress?: (progress: number) => void;
}

/**
 * Encodes an AudioBuffer into an Ogg Opus file Blob using client-side WebAssembly worker
 */
export function encodeAudioBufferToOgg(
  audioBuffer: AudioBuffer,
  options: OggEncodeOptions = {}
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const isMono = options.mono !== false; // Default true for CRM voice notes
      const bufferToEncode = isMono ? convertBufferToMono(audioBuffer) : audioBuffer;
      const numChannels = bufferToEncode.numberOfChannels;
      const length = bufferToEncode.length;

      const worker = new Worker('/encoderWorker.min.js');
      const pages: Uint8Array[] = [];

      worker.onmessage = (e) => {
        const data = e.data;
        if (data instanceof Uint8Array) {
          pages.push(data);
        } else if (data && typeof data === 'object') {
          if (data.message === 'done') {
            worker.terminate();
            const blob = new Blob(pages as unknown as BlobPart[], { type: 'audio/ogg; codecs=opus' });
            resolve(blob);
          } else if (data.message === 'ready') {
            // Worker is ready
          }
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(new Error(`Ogg encoding worker error: ${err.message}`));
      };

      // 1. Initialize worker
      const targetSampleRate = 48000;
      const targetBitrate = options.bitrate || 32000; // 32kbps is the sweet spot for CRM voice notes
      const bufferLength = 4096;

      worker.postMessage({
        command: 'init',
        encoderSampleRate: targetSampleRate,
        numberOfChannels: numChannels,
        encoderApplication: 2048, // 2048 = Voice optimized
        encoderBitRate: targetBitrate,
        resampleQuality: 3,
        bufferLength: bufferLength,
        originalSampleRateOverride: bufferToEncode.sampleRate
      });

      // 2. Request header pages (Ogg Opus ID header & Comment header)
      worker.postMessage({ command: 'getHeaderPages' });

      // 3. Extract channel data
      const channelsData: Float32Array[] = [];
      for (let c = 0; c < numChannels; c++) {
        channelsData.push(bufferToEncode.getChannelData(c));
      }

      // 4. Stream chunks to worker
      let offset = 0;
      const totalSamples = length;

      while (offset < totalSamples) {
        const chunkSize = Math.min(bufferLength, totalSamples - offset);
        const buffers: Float32Array[] = [];

        for (let c = 0; c < numChannels; c++) {
          buffers.push(channelsData[c].slice(offset, offset + chunkSize));
        }

        worker.postMessage({
          command: 'encode',
          buffers: buffers
        });

        offset += chunkSize;

        if (options.onProgress) {
          options.onProgress(Math.min(0.95, offset / totalSamples));
        }
      }

      // 5. Finalize
      worker.postMessage({ command: 'done' });

    } catch (err) {
      reject(err);
    }
  });
}
