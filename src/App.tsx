import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AudioRecorder } from './components/AudioRecorder';
import { AudioUploader } from './components/AudioUploader';
import { WaveformEditor } from './components/WaveformEditor';
import { ConversionControls } from './components/ConversionControls';
import { SaveAction } from './components/SaveAction';
import { AudioHistory } from './components/AudioHistory';
import { AudioFormat, TrimRange } from './types/audio';
import {
  decodeAudioFile,
  sliceAudioBuffer,
  normalizeAudioBuffer,
} from './utils/audioDecoder';
import { encodeAudioBufferToOgg } from './utils/oggEncoder';
import { encodeAudioBufferToMp3 } from './utils/mp3Encoder';
import { encodeAudioBufferToWav } from './utils/wavEncoder';
import { downloadFile, formatBytes } from './utils/fileDownloader';
import { saveAudioToHistory, getAudioHistory, SavedAudio } from './utils/audioStorage';
import { Mic, UploadCloud, RotateCcw, AlertTriangle, FileAudio, FolderOpen } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'record' | 'upload' | 'history'>('record');
  const [historyCount, setHistoryCount] = useState<number>(0);

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
    blobUrl?: string;
  } | null>(null);

  // Load history count on mount
  useEffect(() => {
    updateHistoryCount();
  }, []);

  const updateHistoryCount = async () => {
    try {
      const items = await getAudioHistory();
      setHistoryCount(items.length);
    } catch (_) {}
  };

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
      const audioDuration = buffer.duration || recDuration;
      setDuration(audioDuration);
      setTrimRange({ start: 0, end: audioDuration });
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

  // Handle selecting an audio from history to re-edit
  const handleSelectFromHistory = async (item: SavedAudio) => {
    setIsLoadingAudio(true);
    setErrorMsg(null);
    try {
      const buffer = await decodeAudioFile(item.blob);
      setOriginalBlob(item.blob);
      setAudioBuffer(buffer);
      setDuration(buffer.duration || item.duration);
      setTrimRange({ start: 0, end: buffer.duration || item.duration });
      setIsTrimmed(false);

      const baseName = item.name.replace(/\.[^/.]+$/, '');
      setAudioName(item.name);
      setCustomFilename(`${baseName}_editado`);
      setSelectedFormat(item.format);
      setSavedFile(null);
      setActiveTab('record');
    } catch (err: unknown) {
      console.error('Error al cargar audio del historial:', err);
      setErrorMsg('No se pudo abrir el audio para edición.');
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

  // Convert & Save Directly to Phone and to "Mis Audios" History
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

      setConversionProgress(0.9);
      setConversionStatus('Guardando en tu teléfono y en Mis Audios...');

      const cleanName = (customFilename.trim() || 'audio_crm').replace(/\.[^/.]+$/, '');
      const finalFilename = `${cleanName}.${targetFormat}`;

      // Save to IndexedDB history
      await saveAudioToHistory({
        name: finalFilename,
        date: Date.now(),
        duration: processedBuffer.duration,
        format: targetFormat,
        size: resultBlob.size,
        blob: resultBlob
      });
      await updateHistoryCount();

      // Trigger browser download and get blob url
      const blobUrl = downloadFile(resultBlob, finalFilename);

      setConversionProgress(1);
      setSavedFile({
        name: finalFilename,
        size: resultBlob.size,
        format: targetFormat,
        blobUrl: blobUrl
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

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 pb-16">
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

        {/* Navigation Tabs (Grabar, Subir, Mis Audios) */}
        {!audioBuffer && !isLoadingAudio && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setActiveTab('record')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'record'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span className="truncate">Grabar</span>
              </button>

              <button
                onClick={() => setActiveTab('upload')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'upload'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span className="truncate">Subir</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('history');
                  updateHistoryCount();
                }}
                className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all relative ${
                  activeTab === 'history'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="truncate">Mis Audios</span>
                {historyCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'history' ? 'bg-white text-sky-600' : 'bg-slate-800 text-sky-400'
                  }`}>
                    {historyCount}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Views */}
            {activeTab === 'record' && (
              <AudioRecorder onAudioRecorded={handleAudioRecorded} />
            )}

            {activeTab === 'upload' && (
              <AudioUploader onFileSelected={handleFileSelected} />
            )}

            {activeTab === 'history' && (
              <AudioHistory
                onSelectForEdit={handleSelectFromHistory}
                onGoToRecord={() => setActiveTab('record')}
              />
            )}

            {activeTab !== 'history' && (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400 flex flex-col gap-1.5">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  💡 ¿Por qué convertir a OGG para tu CRM?
                </span>
                <p className="leading-relaxed">
                  HubSpot, Kommo, Zoho, Bitrix24 y WhatsApp requieren audios en <strong>.OGG Opus</strong> para reproducirlos con barra interactiva de notas de voz.
                </p>
              </div>
            )}
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

            {/* Save directly to phone & history */}
            <SaveAction
              isConverting={isConverting}
              conversionProgress={conversionProgress}
              conversionStatus={conversionStatus}
              onConvertAndSave={handleConvertAndSave}
              savedFile={savedFile}
              onReset={handleResetAll}
              onGoToHistory={() => {
                handleResetAll();
                setActiveTab('history');
                updateHistoryCount();
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
};
