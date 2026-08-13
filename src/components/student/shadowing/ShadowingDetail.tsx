import {
  Mic,
  Square,
  X,
  Play,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "../../../i18n/LanguageContext";
import { supabase } from "../../../lib/supabase";
import { useRecording } from "../hooks/useRecording";
import YouTubePlayer from "../../common/YouTubePlayer";

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

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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

  const [player, setPlayer] = useState<any>(null);
  const playIntervalRef = useRef<any>(null);

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

  // Auto transition to step 3 when recording stops and blob is created
  useEffect(() => {
    if (recordedBlob && currentStep === 2) {
      setCurrentStep(3);
    }
  }, [recordedBlob, currentStep]);

  useEffect(() => {
    if (!player || !video) return;

    try {
      if (!player.getIframe()) return;
    } catch (e) {
      return;
    }

    if (playIntervalRef.current) clearInterval(playIntervalRef.current);

    try {
      if (currentStep === 1) {
        const prevStart = video.preview_start || 0;
        const prevEnd = video.preview_end || 999999;
        player.unMute();

        playIntervalRef.current = setInterval(async () => {
          try {
            const currentTime = await player.getCurrentTime();
            if (currentTime >= prevEnd) {
              player.pauseVideo();
              if (playIntervalRef.current)
                clearInterval(playIntervalRef.current);
            }
          } catch (err) {}
        }, 500);
      } else if (currentStep === 2) {
        const recStart = video.record_start || 0;
        const recEnd = video.record_end || 999999;

        if (shadowingRecording.isRecording) {
          player.mute();
          player.seekTo(recStart);
          player.playVideo();

          playIntervalRef.current = setInterval(async () => {
            try {
              const currentTime = await player.getCurrentTime();
              if (currentTime >= recEnd) {
                player.pauseVideo();
                if (playIntervalRef.current)
                  clearInterval(playIntervalRef.current);
                shadowingRecording.stopRecording();
              }
            } catch (err) {}
          }, 500);
        } else {
          player.seekTo(recStart);
          player.pauseVideo();
        }
      } else if (currentStep === 3) {
        player.pauseVideo();
      }
    } catch (error) {
      console.warn("YouTube player action failed", error);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [currentStep, shadowingRecording.isRecording, player, video]);

  const onPlayerReady = (event: any) => {
    setPlayer(event.target);
    try {
      event.target.setOption("captions", "track", {});
      event.target.unloadModule("captions");
      event.target.unloadModule("cc");
    } catch (e) {
      console.warn("Could not unload captions module", e);
    }
  };

  const onPlayerStateChange = (event: any) => {
    try {
      event.target.setOption("captions", "track", {});
      event.target.unloadModule("captions");
      event.target.unloadModule("cc");
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-lg animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="bg-white rounded-lg border-3 border-slate-200 shadow-md p-8 text-center">
        <p className="text-slate-600 font-bold">{fetchError}</p>
        <button
          type="button"
          onClick={() => navigate("/student/shadowing")}
          className="mt-6 px-4 py-2 bg-indigo-500 text-white rounded-lg font-bold hover:bg-indigo-600"
        >
          {t.common.close}
        </button>
      </div>
    );
  }

  return (
    <div className="sm:bg-white/70 sm:backdrop-blur-sm sm:p-6 rounded-lg border-3 sm:border-white sm:shadow-md animate-in fade-in duration-300">
      {/* Progress Bar */}
      <div className="mb-4 mt-2 px-2 sm:px-8">
        <div className="relative z-0 flex justify-between items-start">
          {/* Connecting lines */}
          <div className="absolute top-5 left-[16.66%] right-[16.66%] h-1 bg-slate-200 -z-10 rounded-full"></div>
          <div
            className="absolute top-5 left-[16.66%] h-1 bg-indigo-500 -z-10 transition-all duration-500 rounded-full"
            style={{
              width:
                currentStep === 1
                  ? "0%"
                  : currentStep === 2
                    ? "33.33%"
                    : "66.66%",
            }}
          ></div>

          {/* Step 1 */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${currentStep >= 1 ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30 scale-110" : "bg-slate-200 text-slate-400"}`}
            >
              1
            </div>
            <span
              className={`text-xs sm:text-sm font-bold text-center mt-1 ${currentStep >= 1 ? "text-indigo-600" : "text-slate-400"}`}
            >
              {t.shadowing.step1Title}
            </span>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${currentStep >= 2 ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30 scale-110" : "bg-slate-200 text-slate-400"}`}
            >
              2
            </div>
            <span
              className={`text-xs sm:text-sm font-bold text-center mt-1 ${currentStep >= 2 ? "text-indigo-600" : "text-slate-400"}`}
            >
              {t.shadowing.step2Title}
            </span>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${currentStep >= 3 ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30 scale-110" : "bg-slate-200 text-slate-400"}`}
            >
              3
            </div>
            <span
              className={`text-xs sm:text-sm font-bold text-center mt-1 ${currentStep >= 3 ? "text-indigo-600" : "text-slate-400"}`}
            >
              {t.shadowing.step3Title}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-3 text-center sm:text-left">
        <h3 className="sm:text-2xl text-xl font-black text-slate-800 flex items-center justify-center sm:justify-start gap-3">
          <Mic className="text-indigo-500 shrink-0" size={28} /> {video.title}
        </h3>
      </div>

      <div className="grid gap-6">
        <div
          className={`aspect-video w-full overflow-hidden shadow-inner bg-slate-900 rounded-lg transition-all duration-500 pointer-events-none select-none ${currentStep === 3 ? "hidden" : "block"}`}
        >
          <YouTubePlayer
            url={video.youtube_url}
            className="w-full h-full"
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            opts={{
              playerVars: {
                start: video.preview_start || 0,
                autoplay: 0,
                cc_load_policy: 0,
                iv_load_policy: 3,
                controls: 0,
                disablekb: 1,
              },
            }}
          />
        </div>

        <div className="bg-slate-50 rounded-lg sm:p-4 p-2 border-2 border-slate-200 min-h-[160px] flex flex-col justify-center">
          {shadowingRecording.appError && (
            <div className="mb-4 bg-rose-50 border-2 border-rose-200 p-4 rounded-lg flex items-start gap-3 relative">
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

          {currentStep === 1 && (
            <div className="flex flex-col items-center gap-4 py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="text-slate-600 font-bold text-center">
                {t.shadowing.step1Desc}
              </p>
              <div className="flex gap-4 flex-col sm:flex-row mt-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (player && video) {
                      const prevStart = video.preview_start || 0;
                      player.seekTo(prevStart);
                      player.playVideo();
                    }
                  }}
                  className="flex-1 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black rounded-lg shadow-[0_4px_0_rgb(4,120,87)] hover:shadow-[0_2px_0_rgb(4,120,87)] hover:translate-y-[2px] transition-all text-base sm:text-lg flex items-center justify-center gap-2"
                >
                  <Play size={20} className="fill-current" />{" "}
                  {t.shadowing.practiceListen}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 px-8 py-3 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-black rounded-lg shadow-[0_4px_0_rgb(67,56,202)] hover:shadow-[0_2px_0_rgb(67,56,202)] hover:translate-y-[2px] transition-all text-base sm:text-lg"
                >
                  {t.shadowing.startRecording}
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col items-center gap-4 py-2 animate-in fade-in zoom-in-95 duration-300">
              <p className="text-slate-600 font-bold text-center max-w-sm">
                {t.shadowing.step2Desc}
              </p>

              {shadowingRecording.isRecording ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="text-4xl font-black text-rose-500 font-mono tabular-nums tracking-wider drop-shadow-md">
                    {shadowingRecording.formatTime(
                      shadowingRecording.recordingTime,
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={shadowingRecording.stopRecording}
                    className="w-20 h-20 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-lg flex items-center justify-center shadow-md hover:shadow-rose-500/30 transition-all border-4 border-white group"
                  >
                    <Square
                      size={28}
                      className="fill-current group-hover:scale-90 transition-transform"
                    />
                  </button>
                </div>
              ) : (
                <div className="flex gap-6 flex-col-reverse sm:flex-row items-center mt-2 w-full justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (player && video) {
                        player.pauseVideo();
                        player.seekTo(video.preview_start || 0);
                      }
                      setCurrentStep(1);
                    }}
                    className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-lg shadow-[0_4px_0_rgb(203,213,225)] hover:shadow-[0_2px_0_rgb(203,213,225)] hover:translate-y-[2px] transition-all text-sm sm:text-base h-fit"
                  >
                    {t.shadowing.backToListen}
                  </button>

                  <button
                    type="button"
                    onClick={shadowingRecording.startRecording}
                    className="w-20 h-20 bg-[#FF8A80] hover:bg-[#FF5252] text-white rounded-lg flex items-center justify-center shadow-md hover:shadow-md hover:scale-105 active:scale-95 transition-all border-b-4 border-rose-800 shrink-0"
                  >
                    <Mic size={36} />
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex flex-col items-center gap-6 py-2 animate-in zoom-in-95 duration-300">
              <p className="text-slate-600 font-bold text-center">
                {t.shadowing.step3Desc}
              </p>

              <div className="w-full max-w-md bg-white p-4 rounded-lg shadow-md border-2 border-indigo-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
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
                    setCurrentStep(2);
                  }}
                  disabled={shadowingRecording.isSaving}
                  className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-lg transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {t.shadowing.reRecord}
                </button>
                <button
                  type="button"
                  onClick={shadowingRecording.saveRecording}
                  disabled={shadowingRecording.isSaving}
                  className="flex-1 py-3 bg-[#FF8A80] hover:bg-[#FF5252] active:scale-95 text-white font-black rounded-lg shadow-[0_4px_0_rgb(67,56,202)] hover:shadow-[0_2px_0_rgb(67,56,202)] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-1 flex items-center justify-center gap-2 text-base sm:text-lg"
                >
                  {shadowingRecording.isSaving ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <CheckCircle size={24} />
                  )}
                  {t.shadowing.submit}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
