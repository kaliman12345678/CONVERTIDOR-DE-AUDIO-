import React from 'react';
import { AudioFormat } from '../types/audio';
import { CheckCircle2, ShieldCheck, FileAudio, FileType } from 'lucide-react';

interface ConversionControlsProps {
  selectedFormat: AudioFormat;
  onFormatChange: (format: AudioFormat) => void;
  filename: string;
  onFilenameChange: (name: string) => void;
  monoForCRM: boolean;
  onToggleMono: () => void;
}

export const ConversionControls: React.FC<ConversionControlsProps> = ({
  selectedFormat,
  onFormatChange,
  filename,
  onFilenameChange,
  monoForCRM,
  onToggleMono,
}) => {
  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <FileType className="w-4 h-4 text-sky-400" />
          Formato de Salida
        </h3>
        <span className="text-[11px] text-slate-400">Selecciona el formato que necesitas</span>
      </div>

      {/* Grid de Formatos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* OGG Card (Recomendado para CRM) */}
        <button
          type="button"
          onClick={() => onFormatChange('ogg')}
          className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
            selectedFormat === 'ogg'
              ? 'bg-sky-500/15 border-sky-400 ring-2 ring-sky-500/30'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-base text-white">.OGG</span>
              {selectedFormat === 'ogg' && (
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
              )}
            </div>
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1.5">
              ⭐ Ideal para CRM
            </span>
            <p className="text-[11px] text-slate-400 leading-tight">
              Opus Voice. Reconocido como nota de voz nativa en HubSpot, Kommo, Zoho y WhatsApp.
            </p>
          </div>
        </button>

        {/* MP3 Card */}
        <button
          type="button"
          onClick={() => onFormatChange('mp3')}
          className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
            selectedFormat === 'mp3'
              ? 'bg-sky-500/15 border-sky-400 ring-2 ring-sky-500/30'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-base text-white">.MP3</span>
              {selectedFormat === 'mp3' && (
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
              )}
            </div>
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 mb-1.5">
              Universal
            </span>
            <p className="text-[11px] text-slate-400 leading-tight">
              Compatible con cualquier dispositivo, software de ventas o computadora.
            </p>
          </div>
        </button>

        {/* WAV Card */}
        <button
          type="button"
          onClick={() => onFormatChange('wav')}
          className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
            selectedFormat === 'wav'
              ? 'bg-sky-500/15 border-sky-400 ring-2 ring-sky-500/30'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-base text-white">.WAV</span>
              {selectedFormat === 'wav' && (
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
              )}
            </div>
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 mb-1.5">
              Sin Pérdida
            </span>
            <p className="text-[11px] text-slate-400 leading-tight">
              Audio PCM puro de máxima fidelidad (archivos más pesados).
            </p>
          </div>
        </button>
      </div>

      {/* Nombre del archivo */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-300">
          Nombre para guardar en tu teléfono:
        </label>
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-sky-500 transition-colors">
          <input
            type="text"
            value={filename}
            onChange={(e) => onFilenameChange(e.target.value)}
            placeholder="ej. llamada_cliente_1"
            className="w-full bg-transparent text-sm text-white focus:outline-none"
          />
          <span className="text-xs font-mono font-semibold text-sky-400 ml-1.5 shrink-0">
            .{selectedFormat}
          </span>
        </div>
      </div>

      {/* Optimización de tamaño Mono para CRM */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-slate-300">
            Canal Mono (Ligero para CRM)
          </span>
          <span className="text-[10px] text-slate-400">
            Reduce el peso a la mitad para subirlo más rápido por datos móviles
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMono}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            monoForCRM ? 'bg-sky-500' : 'bg-slate-700'
          }`}
          role="switch"
          aria-checked={monoForCRM}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              monoForCRM ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
