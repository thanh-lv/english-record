import {
  Mic,
  Square,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import React, { useRef } from "react";
import { useLanguage } from "../../i18n/LanguageContext";

interface ShadowingModalProps {
  video: any;
  onClose: () => void;
  // Recording props
  isRecording: boolean;
  recordingTime: number;
  bongBeAudios: Record<number, Blob>;
  isSaving: boolean;
  appError: string;
  onStartRecording: (e: React.MouseEvent) => void;
  onStopRecording: () => void;
  onSaveRecording: (e: React.MouseEvent) => void;
  onDeleteAudio: (e: React.MouseEvent) => void;
  onDismissError: (e: React.MouseEvent) => void;
  formatTime: (seconds: number) => string;
}

export function ShadowingModal({
  video,
  onClose,
  isRecording,
  recordingTime,
  bongBeAudios,
  isSaving,
  appError,
  onStartRecording,
  onStopRecording,
  onSaveRecording,
  onDeleteAudio,
  onDismissError,
  formatTime,
}: ShadowingModalProps) {
  const { t } = useLanguage();
  const audioRef = useRef<HTMLAudioElement>(null);

  const extractYoutubeId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const ytId = extractYoutubeId(video.youtube_url);
  // The recording hook always stores into bongBeAudios[questionIndex=0]
  const recordedBlob = bongBeAudios[0] ?? null;
  const audioUrl = recordedBlob ? URL.createObjectURL(recordedBlob) : null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex justify-center items-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl border-4 border-indigo-100 flex flex-col relative max-h-[90vh] my-auto">
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:scale-110 transition-all border-4 border-indigo-100 z-10"
        >
          <X size={24} strokeWidth={3} />
        </button>

        <div className="p-4 border-b-2 border-slate-100 flex items-center gap-3">
          <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
            <Mic size={24} />
          </div>
          <h2 className="text-xl font-black text-slate-800 line-clamp-1">
            {video.title}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="aspect-video w-full bg-black rounded-[1.5rem] overflow-hidden shadow-inner border-4 border-slate-900">
            {ytId ? (
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                Invalid Video URL
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-[2rem] p-6 border-2 border-slate-200">
            {appError && (
              <div className="mb-4 bg-rose-50 border-2 border-rose-200 p-4 rounded-xl flex items-start gap-3 relative">
                <AlertCircle className="text-rose-600 shrink-0 mt-0.5" />
                <p className="text-rose-700 font-bold text-sm pr-6">
                  {appError}
                </p>
                <button
                  onClick={onDismissError}
                  className="absolute right-3 top-3 text-rose-400 hover:text-rose-600"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {!recordedBlob ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-slate-600 font-bold text-center">
                  {t.shadowing.subtitle}
                </p>
                {isRecording ? (
                  <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                    <div className="text-4xl font-black text-rose-500 font-mono tabular-nums tracking-wider drop-shadow-sm">
                      {formatTime(recordingTime)}
                    </div>
                    <button
                      onClick={onStopRecording}
                      className="w-20 h-20 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-rose-500/30 transition-all border-4 border-white group"
                    >
                      <Square
                        size={28}
                        className="fill-current group-hover:scale-90 transition-transform"
                      />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onStartRecording}
                    className="w-20 h-20 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-indigo-500/30 transition-all border-4 border-white group animate-bounce-soft"
                  >
                    <Mic
                      size={32}
                      className="group-hover:scale-110 transition-transform"
                    />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                <div className="w-full max-w-md bg-white p-4 rounded-2xl shadow-sm border-2 border-indigo-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <Mic size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <audio
                      ref={audioRef}
                      src={audioUrl || ""}
                      controls
                      className="w-full h-10"
                    />
                  </div>
                </div>

                <div className="flex gap-4 w-full max-w-md">
                  <button
                    onClick={onDeleteAudio}
                    disabled={isSaving}
                    className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {t.shadowing.reRecord}
                  </button>
                  <button
                    onClick={onSaveRecording}
                    disabled={isSaving}
                    className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-black rounded-xl shadow-[0_4px_0_rgb(67,56,202)] hover:shadow-[0_2px_0_rgb(67,56,202)] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-1 flex items-center justify-center gap-2 text-lg"
                  >
                    {isSaving ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      <CheckCircle size={24} />
                    )}
                    {t.shadowing.save}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
