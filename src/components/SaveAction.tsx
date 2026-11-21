import React from 'react';
import { Download, CheckCircle2, Loader2, RotateCcw, FileAudio, FolderHeart } from 'lucide-react';
import { formatBytes } from '../utils/fileDownloader';

interface SaveActionProps {
  isConverting: boolean;
  conversionProgress: number;
  conversionStatus: string;
  onConvertAndSave: () => void;
  savedFile: {
    name: string;
    size: number;
    format: string;
    blobUrl?: string;
  } | null;
  onReset: () => void;
  onGoToHistory?: () => void;
}

export const SaveAction: React.FC<SaveActionProps> = ({
  isConverting,
  conversionProgress,
  conversionStatus,
  onConvertAndSave,
  savedFile,
  onReset,
  onGoToHistory,
}) => {
  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col items-center">
      {isConverting ? (
        <div className="w-full flex flex-col items-center py-4">
          <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-3" />
          <h4 className="text-sm font-semibold text-white mb-1">
            {conversionStatus || 'Procesando tu audio...'}
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            Esto se procesa 100% en tu teléfono en segundos
          </p>

          {/* Barra de progreso */}
          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 mb-2">
            <div
              className="bg-gradient-to-r from-sky-500 to-cyan-400 h-full rounded-full transition-all duration-200"
              style={{ width: `${Math.round(conversionProgress * 100)}%` }}
            />
          </div>
          <span className="text-xs font-mono font-medium text-sky-400">
            {Math.round(conversionProgress * 100)}%
          </span>
        </div>
      ) : savedFile ? (
        <div className="w-full flex flex-col items-center py-2 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>

          <h4 className="text-base font-bold text-white mb-1">
            ¡Audio Listo y Guardado!
          </h4>
          <p className="text-xs text-slate-300 mb-3 max-w-sm">
            Guardado en <strong>Mis Audios</strong>. Toca el botón para descargarlo a los archivos de tu móvil y adjuntarlo en tu CRM.
          </p>

          <div className="w-full bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between mb-4 text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileAudio className="w-5 h-5 text-sky-400 shrink-0" />
              <span className="font-mono text-slate-200 truncate">{savedFile.name}</span>
            </div>
            <span className="font-mono text-slate-400 shrink-0 ml-2">
              {formatBytes(savedFile.size)}
            </span>
          </div>

          {/* Botón de descarga directa con tag <a> para compatibilidad 100% móvil */}
          {savedFile.blobUrl ? (
            <a
              href={savedFile.blobUrl}
              download={savedFile.name}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 hover:brightness-110 mb-3"
            >
              <Download className="w-5 h-5" />
              <span>📥 Descargar Archivo en el Teléfono</span>
            </a>
          ) : (
            <button
              onClick={onConvertAndSave}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 hover:brightness-110 mb-3"
            >
              <Download className="w-5 h-5" />
              <span>📥 Descargar Archivo en el Teléfono</span>
            </button>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 w-full">
            {onGoToHistory && (
              <button
                onClick={onGoToHistory}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 font-medium text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <FolderHeart className="w-4 h-4" />
                <span>Ver en Mis Audios</span>
              </button>
            )}

            <button
              onClick={onReset}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Grabar / Convertir Otro</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          <button
            onClick={onConvertAndSave}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-cyan-500 text-white font-bold text-base shadow-xl shadow-sky-500/25 active:scale-98 transition-all flex items-center justify-center gap-2.5 hover:brightness-110"
          >
            <Download className="w-5 h-5" />
            <span>Convertir y Guardar en el Teléfono</span>
          </button>
          <span className="text-[11px] text-slate-400 mt-2 text-center">
            Se descargará en tu teléfono y quedará en tu historial de Mis Audios
          </span>
        </div>
      )}
    </div>
  );
};
