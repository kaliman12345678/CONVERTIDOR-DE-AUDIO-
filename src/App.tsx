import React, { useState } from 'react';
import { Header } from './components/Header';
import { AudioRecorder } from './components/AudioRecorder';
import { AudioUploader } from './components/AudioUploader';
import { WaveformEditor } from './components/WaveformEditor';
import { ConversionControls } from './components/ConversionControls';
import { SaveAction } from './components/SaveAction';
import { AudioFormat, TrimRange } from './types/audio';
import {
  decodeAudioFile,
  sliceAudioBuffer,
  normalizeAudioBuffer,
} from './utils/audioDecoder';
import { encodeAudioBufferToOgg } from './utils/oggEncoder';
import { encodeAudioBufferToMp3 } from './utils/mp3Encoder';
import { encodeAudioBufferToWav } from './utils/wavEncoder';
import { downloadFile, generateAudioFilename, formatBytes } from './utils/fileDownloader';
import { Mic, UploadCloud, RotateCcw, AlertTriangle, FileAudio } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');

  // Loaded Audio State
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioName, setAudioName] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit / Trim State
  const [trimRange, setTrimRange] = useState<TrimRange>({ start: 0, end: 0 });
  const [isTrimmed, setIsTrimmed] = useState(false);
  const [normalizeVolume, setNormalizeVolume] = useState(true);

  // Conversion Options
  const [selectedFormat, setSelectedFormat] = useState<AudioFormat>('ogg');
  const [customFilename, setCustomFilename] = useState<string>('nota_voz_crm');
  const [monoForCRM, setMonoForCRM] = useState(true);

  // Processing & Download State
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionStatus, setConversionStatus] = useState('');
  const [savedFile, setSavedFile] = useState<{
    name: string;
    size: number;
    format: string;
  } | null>(null);

  // Handle file upload
  const handleFileSelected = async (file: File) => {
    setIsLoadingAudio(true);
    setErrorMsg(null);
    try {
      const buffer = await decodeAudioFile(file);
      setOriginalBlob(file);
      setAudioBuffer(buffer);
      setDuration(buffer.duration);
      setTrimRange({ start: 0, end: buffer.duration });
      setIsTrimmed(false);

      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
      setAudioName(file.name);
      setCustomFilename(baseName || 'audio_crm');
      setSavedFile(null);
    } catch (err: unknown) {
      console.error('Error al decodificar audio:', err);
      setErrorMsg('No se pudo procesar este audio. Asegúrate de que no esté corrupto o intenta con otro archivo.');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Handle recorded audio
  const handleAudioRecorded = async (blob: Blob, recDuration: number) => {
    setIsLoadingAudio(true);
    setErrorMsg(null);
    try {
      const buffer = await decodeAudioFile(blob);
      setOriginalBlob(blob);
      setAudioBuffer(buffer);
      setDuration(buffer.duration || recDuration);
      setTrimRange({ start: 0, end: buffer.duration || recDuration });
      setIsTrimmed(false);

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}_${pad(now.getSeconds())}`;
      setAudioName(`grabacion_${timeStr}`);
      setCustomFilename(`nota_voz_crm_${timeStr}`);
      setSavedFile(null);
    } catch (err: unknown) {
      console.error('Error al decodificar grabación:', err);
      setErrorMsg('Error al procesar la grabación del micrófono. Intenta de nuevo.');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleResetTrim = () => {
    if (audioBuffer) {
      setTrimRange({ start: 0, end: audioBuffer.duration });
      setIsTrimmed(false);
    }
  };

  const handleResetAll = () => {
    setOriginalBlob(null);
    setAudioBuffer(null);
    setAudioName('');
    setDuration(0);
    setTrimRange({ start: 0, end: 0 });
    setIsTrimmed(false);
    setSavedFile(null);
    setErrorMsg(null);
  };

  // Convert & Save Directly to Phone
  const handleConvertAndSave = async () => {
    if (!audioBuffer) return;

    setIsConverting(true);
    setConversionProgress(0.1);
    setConversionStatus('Recortando y preparando audio...');
    setErrorMsg(null);

    try {
      // 1. Slice trimmed region
      let processedBuffer = sliceAudioBuffer(audioBuffer, trimRange.start, trimRange.end);
      setConversionProgress(0.3);

      // 2. Normalize volume if enabled
      if (normalizeVolume) {
        setConversionStatus('Optimizando volumen de voz...');
        processedBuffer = normalizeAudioBuffer(processedBuffer);
      }
      setConversionProgress(0.4);

      // 3. Encode into target format
      let resultBlob: Blob;
      const targetFormat = selectedFormat;

      if (targetFormat === 'ogg') {
        setConversionStatus('Codificando a OGG Opus (optimizado para CRM)...');
        resultBlob = await encodeAudioBufferToOgg(processedBuffer, {
          mono: monoForCRM,
          bitrate: 32000,
          onProgress: (p) => setConversionProgress(0.4 + p * 0.5)
        });
      } else if (targetFormat === 'mp3') {
        setConversionStatus('Codificando a MP3...');
        resultBlob = await encodeAudioBufferToMp3(processedBuffer, {
          mono: monoForCRM,
          bitrate: 160,
          onProgress: (p) => setConversionProgress(0.4 + p * 0.5)
        });
      } else {
        setConversionStatus('Generando archivo WAV...');
        resultBlob = encodeAudioBufferToWav(processedBuffer, {
          mono: monoForCRM
        });
      }

      setConversionProgress(0.95);
      setConversionStatus('Guardando en tu teléfono...');

      // 4. Download directly to device
      const cleanName = (customFilename.trim() || 'audio_crm').replace(/\.[^/.]+$/, '');
      const finalFilename = `${cleanName}.${targetFormat}`;

      downloadFile(resultBlob, finalFilename);

      setConversionProgress(1);
      setSavedFile({
        name: finalFilename,
        size: resultBlob.size,
        format: targetFormat
      });

    } catch (err: unknown) {
      console.error('Error durante la conversión:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Error al procesar el audio: ${msg}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5 pb-16">
        {/* Error notification */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Loading overlay for audio file decoding */}
        {isLoadingAudio && (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold text-white">Cargando y procesando audio...</p>
            <p className="text-xs text-slate-400 mt-1">Decodificando ondas de sonido</p>
          </div>
        )}

        {/* Initial Screen: Tabs for Record or Upload */}
        {!audioBuffer && !isLoadingAudio && (
          <div className="flex flex-col gap-4">
            {/* Tabs selector */}
            <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setActiveTab('record')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'record'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Grabar Nota de Voz</span>
              </button>

              <button
                onClick={() => setActiveTab('upload')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'upload'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Subir Audio Existente</span>
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'record' ? (
              <AudioRecorder onAudioRecorded={handleAudioRecorded} />
            ) : (
              <AudioUploader onFileSelected={handleFileSelected} />
            )}

            {/* Quick CRM Info Card */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400 flex flex-col gap-2">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                💡 ¿Por qué convertir a OGG para tu CRM?
              </span>
              <p className="leading-relaxed">
                Plataformas como HubSpot, Kommo/AmoCRM, Zoho, Bitrix24 y WhatsApp requieren audios en formato <strong>.OGG Opus</strong> para mostrarlos con reproductor interactivo de notas de voz. Si subes un .m4a o .wav grande, muchos CRMs no lo reproducen o tardan en cargar.
              </p>
            </div>
          </div>
        )}

        {/* Audio Loaded: Editor, Controls & Save */}
        {audioBuffer && originalBlob && !isLoadingAudio && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* Audio Info Bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileAudio className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                  {audioName}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  ({formatBytes(originalBlob.size)})
                </span>
              </div>

              <button
                onClick={handleResetAll}
                className="text-slate-400 hover:text-rose-400 flex items-center gap-1 text-[11px] font-medium transition-colors"
                title="Cambiar audio"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cambiar</span>
              </button>
            </div>

            {/* Visual Waveform Trimmer */}
            <WaveformEditor
              audioBlob={originalBlob}
              duration={duration}
              trimRange={trimRange}
              onTrimChange={(range) => {
                setTrimRange(range);
                setIsTrimmed(range.start > 0 || range.end < duration);
              }}
              onApplyTrim={() => setIsTrimmed(true)}
              isTrimmed={isTrimmed}
              onResetTrim={handleResetTrim}
              normalizeVolume={normalizeVolume}
              onToggleNormalize={() => setNormalizeVolume(!normalizeVolume)}
            />

            {/* Conversion Settings */}
            <ConversionControls
              selectedFormat={selectedFormat}
              onFormatChange={setSelectedFormat}
              filename={customFilename}
              onFilenameChange={setCustomFilename}
              monoForCRM={monoForCRM}
              onToggleMono={() => setMonoForCRM(!monoForCRM)}
            />

            {/* Save directly to phone */}
            <SaveAction
              isConverting={isConverting}
              conversionProgress={conversionProgress}
              conversionStatus={conversionStatus}
              onConvertAndSave={handleConvertAndSave}
              savedFile={savedFile}
              onReset={handleResetAll}
            />
          </div>
        )}
      </main>
    </div>
  );
};
