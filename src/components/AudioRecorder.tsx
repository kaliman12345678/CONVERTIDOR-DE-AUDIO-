import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Pause, Play, RotateCcw, ArrowRight } from 'lucide-react';
import { formatTime } from '../utils/fileDownloader';

interface AudioRecorderProps {
  onAudioRecorded: (blob: Blob, duration: number) => void;
  onCancel?: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioRecorded, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // References to avoid React state closure stale values
  const startTimeRef = useRef<number>(0);
  const elapsedTimeRef = useRef<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, []);

  const cleanupStream = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / (bufferLength / 2)) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength / 2; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#0284c7');
        gradient.addColorStop(1, '#38bdf8');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Setup Web Audio Analyser for live visualizer
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        drawVisualizer();
      } catch (e) {
        console.warn('Audio visualizer init error:', e);
      }

      // Setup MediaRecorder with best supported mimeType
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        const types = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4',
          'audio/aac'
        ];
        for (const t of types) {
          if (MediaRecorder.isTypeSupported(t)) {
            mimeType = t;
            break;
          }
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const finalDuration = elapsedTimeRef.current > 0
          ? elapsedTimeRef.current
          : (Date.now() - startTimeRef.current) / 1000;

        cleanupStream();
        setIsRecording(false);
        setIsPaused(false);

        if (fullBlob.size > 0) {
          onAudioRecorded(fullBlob, Math.max(0.5, finalDuration));
        } else {
          setErrorMsg('No se capturó audio del micrófono. Revisa los permisos e intenta de nuevo.');
        }
      };

      startTimeRef.current = Date.now();
      elapsedTimeRef.current = 0;
      setElapsedTime(0);
      setIsRecording(true);
      setIsPaused(false);

      recorder.start(200); // Collect slice every 200ms

      timerIntervalRef.current = window.setInterval(() => {
        elapsedTimeRef.current += 0.1;
        setElapsedTime(elapsedTimeRef.current);
      }, 100);

    } catch (err: unknown) {
      console.error('Error al acceder al micrófono:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setErrorMsg('Permiso de micrófono denegado. Permite el acceso al micrófono en tu navegador para grabar.');
      } else {
        setErrorMsg('No se pudo iniciar la grabación: ' + msg);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        timerIntervalRef.current = window.setInterval(() => {
          elapsedTimeRef.current += 0.1;
          setElapsedTime(elapsedTimeRef.current);
        }, 100);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    cleanupStream();
    setIsRecording(false);
    setIsPaused(false);
    setElapsedTime(0);
    elapsedTimeRef.current = 0;
    audioChunksRef.current = [];
    if (onCancel) onCancel();
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col items-center">
      {errorMsg && (
        <div className="w-full mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
          {errorMsg}
        </div>
      )}

      {!isRecording ? (
        <div className="flex flex-col items-center py-4 text-center">
          <button
            onClick={startRecording}
            className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 p-1 shadow-xl shadow-sky-500/30 active:scale-95 transition-all flex items-center justify-center group mb-4 hover:brightness-110"
            aria-label="Iniciar grabación de audio"
          >
            <div className="w-full h-full rounded-full bg-slate-950/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Mic className="w-10 h-10 text-white animate-pulse" />
            </div>
          </button>
          <span className="text-sm font-semibold text-white">Toca para Grabar</span>
          <span className="text-xs text-slate-400 mt-1 max-w-xs">
            Graba notas de voz de cualquier duración para tu CRM
          </span>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          {/* Visualizador de audio y tiempo */}
          <div className="w-full flex flex-col items-center mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-rose-500 animate-ping'}`} />
              <span className="text-2xl font-mono font-bold tracking-wider text-white">
                {formatTime(elapsedTime, true)}
              </span>
            </div>
            <span className="text-xs text-slate-400 mb-3">
              {isPaused ? 'En pausa' : 'Grabando audio...'}
            </span>

            {/* Canvas de ondas */}
            <div className="w-full h-16 bg-slate-950/60 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                width={300}
                height={60}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Botones de control durante grabación */}
          <div className="flex items-center justify-center gap-3 w-full">
            <button
              onClick={cancelRecording}
              className="p-3.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-medium"
              title="Cancelar"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Descartar</span>
            </button>

            <button
              onClick={pauseRecording}
              className={`p-3.5 rounded-xl border text-xs font-medium active:scale-95 transition-all flex items-center gap-1.5 ${
                isPaused
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span>{isPaused ? 'Reanudar' : 'Pausa'}</span>
            </button>

            <button
              onClick={stopRecording}
              className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-semibold text-xs active:scale-95 transition-all shadow-lg shadow-sky-500/20 flex items-center gap-2 hover:brightness-110"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Terminar y Editar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
