import React, { useRef, useState } from 'react';
import { UploadCloud, Music, AlertCircle } from 'lucide-react';
import { formatBytes } from '../utils/fileDownloader';

interface AudioUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({ onFileSelected, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);
    const file = files[0];

    // Check if likely an audio file
    const isAudioType = file.type.startsWith('audio/') || 
      /\.(mp3|m4a|aac|wav|ogg|opus|webm|flac|wma|caf)$/i.test(file.name);

    if (!isAudioType) {
      setErrorMsg('Por favor selecciona un archivo de audio válido (.mp3, .m4a, .aac, .wav, .ogg, etc.)');
      return;
    }

    onFileSelected(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac,.wma,.webm"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        onClick={() => !isLoading && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`w-full p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center text-center ${
          isDragging
            ? 'border-sky-400 bg-sky-500/10'
            : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700'
        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center mb-3 shadow-inner group-hover:scale-105 transition-transform">
          <UploadCloud className="w-7 h-7 text-sky-400" />
        </div>

        <h3 className="text-sm font-semibold text-white mb-1">
          Subir audio desde el teléfono
        </h3>
        <p className="text-xs text-slate-400 mb-3 max-w-xs">
          Toca aquí para seleccionar cualquier archivo: MP3, M4A, AAC, WAV, OGG, llamadas grabadas o notas de WhatsApp
        </p>

        <div className="flex flex-wrap justify-center gap-1.5 text-[10px] text-slate-400">
          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono">.MP3</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono">.M4A / .AAC</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono">.WAV</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono">.OGG</span>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
