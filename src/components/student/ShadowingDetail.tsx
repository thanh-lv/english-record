import {
  Mic,
  Square,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";
import { useRecording } from "./hooks/useRecording";
import YouTubePlayer from "../common/YouTubePlayer";

interface ShadowingDetailProps {
  user: any;
  profile: any;
  onSaveSuccess: (saved: any[]) => void;
}

export function ShadowingDetail({
  user,
  profile,
  onSaveSuccess,
}: ShadowingDetailProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { videoId } = useParams<{ videoId: string }>();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const loadVideo = async () => {
      if (!videoId) {
        setFetchError("Invalid shadowing video.");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("shadowing_videos")
          .select("*")
          .eq("id", videoId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setFetchError("Shadowing video not found.");
        } else {
          setVideo(data);
        }
      } catch (err) {
        console.error(err);
        setFetchError("Failed to load shadowing video.");
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [videoId]);

  const shadowingRecording = useRecording({
    user,
    profile,
    selectedNumber: null,
    currentTopic: video ? { id: video.id, title: video.title } : null,
    activeQuestionIndex: 0,
    shadowingVideoId: video?.id ?? null,
    onSaveSuccess: (saved) => {
      onSaveSuccess(saved);
      navigate("/student/shadowing");
    },
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const recordedBlob = shadowingRecording.bongBeAudios[0] ?? null;
  const audioUrl = recordedBlob ? URL.createObjectURL(recordedBlob) : null;

  const extractYoutubeId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const ytId = video ? extractYoutubeId(video.youtube_url) : null;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="bg-white rounded-[2rem] border-3 border-slate-200 shadow-md p-8 text-center">
        <p className="text-slate-600 font-bold">{fetchError}</p>
        <button
          type="button"
          onClick={() => navigate("/student/shadowing")}
          className="mt-6 px-4 py-2 bg-indigo-500 text-white rounded-full font-bold hover:bg-indigo-600"
        >
          {t.common.close}
        </button>
      </div>
    );
  }

  return (
    <div className="sm:bg-white/70 sm:backdrop-blur-sm sm:p-6 rounded-[2rem] border-3 sm:border-white sm:shadow-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h3 className="sm:text-2xl text-xl font-black text-slate-800 flex items-center gap-3">
            <Mic className="text-indigo-500" size={28} /> {video.title}
          </h3>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="aspect-video w-full overflow-hidden shadow-inner">
          <YouTubePlayer url={video.youtube_url} className="w-full h-full" />
        </div>

        <div className="bg-slate-50 rounded-[2rem] sm:p-4 p-2 border-2 border-slate-200">
          {shadowingRecording.appError && (
            <div className="mb-4 bg-rose-50 border-2 border-rose-200 p-4 rounded-xl flex items-start gap-3 relative">
              <AlertCircle className="text-rose-600 shrink-0 mt-0.5" />
              <p className="text-rose-700 font-bold text-sm pr-6">
                {shadowingRecording.appError}
              </p>
              <button
                type="button"
                onClick={() => shadowingRecording.setAppError("")}
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
              {shadowingRecording.isRecording ? (
                <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                  <div className="text-4xl font-black text-rose-500 font-mono tabular-nums tracking-wider drop-shadow-sm">
                    {shadowingRecording.formatTime(
                      shadowingRecording.recordingTime,
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={shadowingRecording.stopRecording}
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
                  type="button"
                  onClick={shadowingRecording.startRecording}
                  className="w-20 h-20 bg-[#FF8A80] hover:bg-[#FF5252] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all border-b-4 border-rose-800"
                >
                  <Mic size={36} />
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

              <div className="flex gap-4 w-full max-w-md flex-col sm:flex-row">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    shadowingRecording.setBongBeAudios({});
                  }}
                  disabled={shadowingRecording.isSaving}
                  className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {t.shadowing.reRecord}
                </button>
                <button
                  type="button"
                  onClick={shadowingRecording.saveRecording}
                  disabled={shadowingRecording.isSaving}
                  className="flex-1 py-3 bg-[#FF8A80] hover:bg-[#FF5252] active:scale-95 text-white font-black rounded-xl shadow-[0_4px_0_rgb(67,56,202)] hover:shadow-[0_2px_0_rgb(67,56,202)] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-1 flex items-center justify-center gap-2 text-lg"
                >
                  {shadowingRecording.isSaving ? (
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
  );
}
