import React, { useState, useEffect } from 'react';
import { SavedAudio, getAudioHistory, deleteAudioFromHistory } from '../utils/audioStorage';
import { formatBytes, formatTime, formatDate } from '../utils/fileDownloader';
import { Play, Pause, Download, Trash2, Scissors, Music, FolderOpen, Mic } from 'lucide-react';

interface AudioHistoryProps {
  onSelectForEdit: (audio: SavedAudio) => void;
  onGoToRecord: () => void;
}

export const AudioHistory: React.FC<AudioHistoryProps> = ({ onSelectForEdit, onGoToRecord }) => {
  const [history, setHistory] = useState<SavedAudio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadHistory();
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const list = await getAudioHistory();
      setHistory(list);
    } catch (e) {
      console.error('Error cargando historial de audios:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = (item: SavedAudio) => {
    if (currentlyPlayingId === item.id) {
      if (audioElement) {
        audioElement.pause();
      }
      setCurrentlyPlayingId(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const url = URL.createObjectURL(item.blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setCurrentlyPlayingId(null);
        URL.revokeObjectURL(url);
      };
      audio.play().catch((err) => console.error('Audio play error:', err));
      setAudioElement(audio);
      setCurrentlyPlayingId(item.id);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar este audio de tu historial?')) {
      if (currentlyPlayingId === id && audioElement) {
        audioElement.pause();
        setCurrentlyPlayingId(null);
      }
      await deleteAudioFromHistory(id);
      await loadHistory();
    }
  };

  const handleDownload = (item: SavedAudio, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = URL.createObjectURL(item.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-white">Mis Audios Guardados</h3>
          <span className="text-xs bg-slate-800 text-sky-400 px-2 py-0.5 rounded-full font-mono border border-slate-700">
            {history.length}
          </span>
        </div>
        <span className="text-[11px] text-slate-400">Guardados en tu teléfono</span>
      </div>

      {isLoading ? (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center">
          <div className="w-7 h-7 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-xs text-slate-400">Cargando tus audios...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
            <Music className="w-6 h-6 text-slate-500" />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">Aún no tienes audios guardados</h4>
          <p className="text-xs text-slate-400 mb-4 max-w-xs">
            Cada nota de voz que grabes o conviertas se guardará aquí automáticamente para que nunca la pierdas.
          </p>
          <button
            onClick={onGoToRecord}
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs flex items-center gap-2 active:scale-95 transition-all shadow-md shadow-sky-500/20"
          >
            <Mic className="w-4 h-4" />
            <span>Grabar mi Primer Audio</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {history.map((item) => {
            const isPlaying = currentlyPlayingId === item.id;
            const blobUrl = URL.createObjectURL(item.blob);

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2.5 ${
                  isPlaying
                    ? 'bg-sky-500/10 border-sky-500/40 ring-1 ring-sky-500/20'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Cabecera del audio */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => handlePlayPause(item)}
                      className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center transition-all ${
                        isPlaying
                          ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                          : 'bg-slate-800 text-sky-400 hover:bg-slate-700'
                      }`}
                      title={isPlaying ? 'Pausar' : 'Reproducir'}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-sky-400 ml-0.5" />
                      )}
                    </button>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white truncate">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{formatDate(item.date)}</span>
                        <span>•</span>
                        <span className="font-mono">{formatTime(item.duration)}</span>
                        <span>•</span>
                        <span className="font-mono">{formatBytes(item.size)}</span>
                      </div>
                    </div>
                  </div>

                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 uppercase">
                    .{item.format}
                  </span>
                </div>

                {/* Botones de acción directa */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                  <div className="flex items-center gap-2">
                    <a
                      href={blobUrl}
                      download={item.name}
                      className="px-3 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/40 text-sky-300 border border-sky-500/30 text-[11px] font-medium flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar</span>
                    </a>

                    <button
                      onClick={() => onSelectForEdit(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1.5 active:scale-95"
                    >
                      <Scissors className="w-3.5 h-3.5 text-sky-400" />
                      <span>Editar</span>
                    </button>
                  </div>

                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Eliminar audio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
