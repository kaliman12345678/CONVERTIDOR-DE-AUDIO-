import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { Play, Pause, Scissors, RotateCcw, Volume2, Sparkles, FastForward, Rewind } from 'lucide-react';
import { formatTime } from '../utils/fileDownloader';
import { TrimRange } from '../types/audio';

interface WaveformEditorProps {
  audioBlob: Blob;
  duration: number;
  trimRange: TrimRange;
  onTrimChange: (range: TrimRange) => void;
  onApplyTrim: () => void;
  isTrimmed: boolean;
  onResetTrim: () => void;
  normalizeVolume: boolean;
  onToggleNormalize: () => void;
}

export const WaveformEditor: React.FC<WaveformEditorProps> = ({
  audioBlob,
  duration,
  trimRange,
  onTrimChange,
  onApplyTrim,
  isTrimmed,
  onResetTrim,
  normalizeVolume,
  onToggleNormalize,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<any>(null);
  const activeRegionRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingSelection, setIsPlayingSelection] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#334155',
      progressColor: '#38bdf8',
      cursorColor: '#0ea5e9',
      cursorWidth: 2,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      height: 96,
      normalize: true
    });

    const wsRegions = ws.registerPlugin(RegionsPlugin.create());
    wavesurferRef.current = ws;
    regionsRef.current = wsRegions;

    const blobUrl = URL.createObjectURL(audioBlob);
    ws.load(blobUrl);

    ws.on('ready', () => {
      setIsReady(true);
      const audioDuration = ws.getDuration() || duration;

      // Add default trim region
      wsRegions.clearRegions();
      const initialStart = trimRange.start || 0;
      const initialEnd = trimRange.end && trimRange.end <= audioDuration ? trimRange.end : audioDuration;

      const region = wsRegions.addRegion({
        start: initialStart,
        end: initialEnd,
        color: 'rgba(14, 165, 233, 0.28)',
        drag: true,
        resize: true
      });
      activeRegionRef.current = region;
      onTrimChange({ start: initialStart, end: initialEnd });
    });

    ws.on('timeupdate', (time) => {
      setCurrentTime(time);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => {
      setIsPlaying(false);
      setIsPlayingSelection(false);
    });

    wsRegions.on('region-updated', (region: any) => {
      activeRegionRef.current = region;
      onTrimChange({
        start: Math.max(0, region.start),
        end: Math.min(ws.getDuration(), region.end)
      });
    });

    return () => {
      ws.destroy();
      URL.revokeObjectURL(blobUrl);
    };
  }, [audioBlob]);

  const togglePlayPause = () => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.playPause();
  };

  const playSelection = () => {
    if (!activeRegionRef.current || !wavesurferRef.current) return;
    setIsPlayingSelection(true);
    activeRegionRef.current.play();
  };

  const adjustStart = (delta: number) => {
    if (!activeRegionRef.current || !wavesurferRef.current) return;
    const dur = wavesurferRef.current.getDuration() || duration;
    const newStart = Math.max(0, Math.min(activeRegionRef.current.start + delta, activeRegionRef.current.end - 0.2));
    activeRegionRef.current.setOptions({ start: newStart });
    onTrimChange({ start: newStart, end: activeRegionRef.current.end });
  };

  const adjustEnd = (delta: number) => {
    if (!activeRegionRef.current || !wavesurferRef.current) return;
    const dur = wavesurferRef.current.getDuration() || duration;
    const newEnd = Math.min(dur, Math.max(activeRegionRef.current.start + 0.2, activeRegionRef.current.end + delta));
    activeRegionRef.current.setOptions({ end: newEnd });
    onTrimChange({ start: activeRegionRef.current.start, end: newEnd });
  };

  const selectionDuration = Math.max(0, trimRange.end - trimRange.start);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col">
      {/* Waveform Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
          <h3 className="text-sm font-semibold text-white">Visualizador y Recortador</h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
          <span>{formatTime(currentTime, true)}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{formatTime(duration, true)}</span>
        </div>
      </div>

      {/* Onda gráfica */}
      <div className="w-full relative bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 mb-3 overflow-hidden">
        <div ref={containerRef} className="w-full" />
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-xs text-sky-400 font-medium">
            Cargando audio...
          </div>
        )}
      </div>

      {/* Información del recorte seleccionado */}
      <div className="w-full grid grid-cols-2 gap-2 mb-3 text-xs bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50">
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-400">Inicio de recorte</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <button
              onClick={() => adjustStart(-0.5)}
              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95"
              title="-0.5s"
            >
              -0.5s
            </button>
            <span className="font-mono text-white font-semibold">
              {formatTime(trimRange.start, true)}
            </span>
            <button
              onClick={() => adjustStart(0.5)}
              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95"
              title="+0.5s"
            >
              +0.5s
            </button>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[11px] text-slate-400">Fin de recorte</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <button
              onClick={() => adjustEnd(-0.5)}
              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95"
              title="-0.5s"
            >
              -0.5s
            </button>
            <span className="font-mono text-white font-semibold">
              {formatTime(trimRange.end, true)}
            </span>
            <button
              onClick={() => adjustEnd(0.5)}
              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95"
              title="+0.5s"
            >
              +0.5s
            </button>
          </div>
        </div>
      </div>

      {/* Duración resultante de la selección */}
      <div className="flex items-center justify-between px-1 mb-4 text-xs">
        <span className="text-slate-400">Duración del fragmento:</span>
        <span className="font-mono font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
          {formatTime(selectionDuration, true)} ({Math.round(selectionDuration)}s)
        </span>
      </div>

      {/* Controles de Reproducción y Recorte */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={togglePlayPause}
          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          {isPlaying ? <Pause className="w-4 h-4 text-sky-400" /> : <Play className="w-4 h-4 text-sky-400 fill-sky-400" />}
          <span>{isPlaying ? 'Pausar' : 'Escuchar Todo'}</span>
        </button>

        <button
          onClick={playSelection}
          className="flex-1 py-2.5 px-3 rounded-xl bg-sky-600/30 hover:bg-sky-600/40 border border-sky-500/40 text-sky-200 font-medium text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Scissors className="w-4 h-4 text-sky-400" />
          <span>Oír Selección</span>
        </button>

        {isTrimmed && (
          <button
            onClick={onResetTrim}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs flex items-center gap-1.5 active:scale-95"
            title="Restablecer recorte"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
        )}
      </div>

      {/* Opciones de Audio Inteligentes para CRM */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              Voz Nítida y Fuerte
              <Sparkles className="w-3 h-3 text-amber-400" />
            </span>
            <span className="text-[10px] text-slate-400">Amplifica audios bajitos para que se entiendan en el CRM</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleNormalize}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            normalizeVolume ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
          role="switch"
          aria-checked={normalizeVolume}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              normalizeVolume ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
