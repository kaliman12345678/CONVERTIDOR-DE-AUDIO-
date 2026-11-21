export type AudioFormat = 'ogg' | 'mp3' | 'wav';

export type AudioQuality = 'crm' | 'high' | 'standard';

export interface AudioMetadata {
  name: string;
  duration: number; // in seconds
  sampleRate: number;
  numberOfChannels: number;
  sizeBytes: number;
  originalFormat: string;
}

export interface TrimRange {
  start: number; // in seconds
  end: number;   // in seconds
}

export interface ConversionOptions {
  format: AudioFormat;
  quality: AudioQuality;
  normalizeVolume: boolean;
  monoForCRM: boolean;
}
