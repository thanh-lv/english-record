import { AlertCircle, Pause, Play } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";

export function AudioPlayer({
  src,
  compact,
}: {
  src: string;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playError, setPlayError] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlayError(false);
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [src]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      document.querySelectorAll("audio").forEach((el) => {
        if (el !== audioRef.current) el.pause();
      });
      setPlayError(false);
      audioRef.current.play().catch((err) => {
        console.error("Lỗi phát âm thanh:", err);
        setPlayError(true);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const changeSpeed = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rates = [1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (playError) {
    return (
      <div className="flex items-center gap-2 bg-rose-50 border-2 border-rose-200 rounded-2xl p-3 w-full max-w-sm sm:max-w-md text-rose-600 text-xs font-bold">
        <AlertCircle size={16} className="shrink-0" />
        <span className="flex-1">{t.common.audioPlayError}</span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPlayError(false);
            audioRef.current?.load();
          }}
          className="shrink-0 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 rounded-xl font-black transition-colors"
        >
          {t.common.retry}
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <audio
          ref={audioRef}
          src={src}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={() =>
            setCurrentTime(audioRef.current?.currentTime || 0)
          }
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={() => setIsPlaying(false)}
          onError={() => setPlayError(true)}
        />
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? t.common.pause : t.common.play}
          className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-white transition-all shadow-sm active:scale-95 ${
            isPlaying
              ? "bg-amber-400 hover:bg-amber-500"
              : "bg-[#1E88E5] hover:bg-blue-700"
          }`}
        >
          {isPlaying ? (
            <Pause size={12} />
          ) : (
            <Play size={12} className="ml-0.5" />
          )}
        </button>
        <span className="text-[10px] font-bold text-slate-400 tabular-nums">
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </span>
        {playError && (
          <AlertCircle size={12} className="text-rose-500 shrink-0" />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-row items-center gap-3 bg-slate-50 border-2 border-slate-200 rounded-2xl p-2.5 w-full max-w-sm sm:max-w-md shadow-inner">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setPlayError(true)}
      />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? t.common.pause : t.common.play}
        className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-white transition-all shadow-md active:scale-95 border-b-4 ${
          isPlaying
            ? "bg-[#FFB74D] border-orange-800 hover:bg-[#FFA726]"
            : "bg-[#1E88E5] border-blue-800 hover:bg-blue-700"
        }`}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          aria-label={t.common.seek}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1E88E5]"
        />
        <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={changeSpeed}
        className={`shrink-0 font-black text-xs px-2.5 py-1.5 rounded-xl transition-all active:scale-95 border-b-2 min-w-[42px] text-center ${
          playbackRate === 1
            ? "bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200"
            : playbackRate === 1.25
              ? "bg-blue-100 border-blue-300 text-blue-600"
              : playbackRate === 1.5
                ? "bg-amber-100 border-amber-300 text-amber-600"
                : "bg-rose-100 border-rose-300 text-rose-600"
        }`}
        title={t.common.changeSpeed}
        aria-label={`${t.common.changeSpeed}: ${playbackRate}x`}
      >
        {playbackRate}x
      </button>
    </div>
  );
}
