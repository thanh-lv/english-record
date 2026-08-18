import {
  Mic,
  Square,
  X,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Headphones,
  RotateCcw,
  Check,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
        setFetchError(t.shadowing.invalidVideo);
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
          setFetchError(t.shadowing.videoNotFound);
        } else {
          setVideo(data);
        }
      } catch (err) {
        console.error(err);
        setFetchError(t.shadowing.loadError);
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [videoId, t.shadowing]);

  const [player, setPlayer] = useState<any>(null);
  const playIntervalRef = useRef<any>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const shadowingRecording = useRecording({
    user,
    profile,
    selectedNumber: null,
    currentTopic: video ? { id: video.id, title: video.title } : null,
    activeQuestionIndex: 0,
    shadowingVideoId: video?.id ?? null,
    onSaveSuccess: (saved) => {
      onSaveSuccess(saved);
      setShowSuccessModal(true);
    },
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const recordedBlob = shadowingRecording.bongBeAudios[0] ?? null;
  const audioUrl = useMemo(
    () => (recordedBlob ? URL.createObjectURL(recordedBlob) : null),
    [recordedBlob],
  );

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Auto transition to step 3 when recording stops and blob is created
  useEffect(() => {
    if (recordedBlob && currentStep === 2) {
      setCurrentStep(3);
    }
  }, [recordedBlob, currentStep]);

  // Effect for Step 1: Preview playback
  useEffect(() => {
    if (currentStep !== 1 || !player || !video) return;

    try {
      if (!player.getIframe()) return;
    } catch (e) {
      return;
    }

    if (playIntervalRef.current) clearInterval(playIntervalRef.current);

    try {
      const prevStart = video.preview_start || 0;
      const prevEnd = video.preview_end || 999999;
      player.unMute();

      playIntervalRef.current = setInterval(async () => {
        try {
          const currentTime = await player.getCurrentTime();
          if (currentTime >= prevEnd) {
            player.pauseVideo();
            if (playIntervalRef.current) clearInterval(playIntervalRef.current);
          }
        } catch (err) {}
      }, 500);
    } catch (error) {
      console.warn("YouTube player action failed", error);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [currentStep, player, video]);

  // Effect for Step 2: Recording with muted playback
  useEffect(() => {
    if (currentStep !== 2 || !player || !video) return;

    try {
      if (!player.getIframe()) return;
    } catch (e) {
      return;
    }

    if (playIntervalRef.current) clearInterval(playIntervalRef.current);

    try {
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
    } catch (error) {
      console.warn("YouTube player action failed", error);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [currentStep, shadowingRecording.isRecording, player, video]);

  // Effect for Step 3: Pause video
  useEffect(() => {
    if (currentStep !== 3 || !player) return;

    try {
      if (!player.getIframe()) return;
    } catch (e) {
      return;
    }

    try {
      player.pauseVideo();
    } catch (error) {
      console.warn("YouTube player action failed", error);
    }
  }, [currentStep, player]);

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
      <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white/80 backdrop-blur-md rounded-3xl border border-white/80 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <div className="w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
        <p className="text-xs font-bold text-slate-400">Đang tải video bài học...</p>
      </div>
    );
  }

  if (fetchError || !video) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-sm p-8 text-center space-y-4 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto text-2xl">
          <AlertCircle size={28} />
        </div>
        <p className="text-slate-700 font-black text-base">{fetchError || t.shadowing.videoNotFound}</p>
        <button
          type="button"
          onClick={() => navigate("/student/shadowing")}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
        >
          {t.common.close}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-7 border border-white/80 shadow-sm space-y-6 animate-in fade-in duration-300">
      {/* Top bar: Back Button & Step Navigator */}
      <div className="flex items-center justify-between gap-4 pb-1">
        <button
          type="button"
          onClick={() => navigate("/student/shadowing")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100/80 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all active:scale-95 border border-slate-200/60 shadow-2xs shrink-0"
        >
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>

        <div className="flex items-center gap-2 min-w-0 justify-end flex-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/60 shrink-0">
            🎬 Shadowing
          </span>
          <h2 className="text-sm sm:text-lg font-black text-slate-800 truncate text-right" title={video.title}>
            {video.title}
          </h2>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/60">
        <div className="relative flex justify-between items-start max-w-lg mx-auto">
          {/* Connector Line - precisely positioned at vertical center of circles (top-5 = 20px) */}
          <div className="absolute top-5 left-[16%] right-[16%] h-1 bg-slate-200 -z-0 rounded-full" />
          <div
            className="absolute top-5 left-[16%] right-[16%] h-1 -z-0 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 rounded-full"
              style={{
                width:
                  currentStep === 1
                    ? "0%"
                    : currentStep === 2
                      ? "50%"
                      : "100%",
              }}
            />
          </div>

          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="relative z-10 flex flex-col items-center gap-2 focus:outline-none cursor-pointer group flex-1"
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm transition-all duration-300 ${
                currentStep === 1
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-110 ring-4 ring-indigo-100"
                  : currentStep > 1
                    ? "bg-emerald-500 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-400"
              }`}
            >
              {currentStep > 1 ? <Check size={16} /> : 1}
            </div>
            <span
              className={`text-xs font-black transition-colors ${
                currentStep === 1 ? "text-indigo-600" : "text-slate-500"
              }`}
            >
              {t.shadowing.step1Title}
            </span>
          </button>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className="relative z-10 flex flex-col items-center gap-2 focus:outline-none cursor-pointer group flex-1"
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm transition-all duration-300 ${
                currentStep === 2
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-110 ring-4 ring-indigo-100"
                  : currentStep > 2
                    ? "bg-emerald-500 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-400"
              }`}
            >
              {currentStep > 2 ? <Check size={16} /> : 2}
            </div>
            <span
              className={`text-xs font-black transition-colors ${
                currentStep === 2 ? "text-indigo-600" : "text-slate-500"
              }`}
            >
              {t.shadowing.step2Title}
            </span>
          </button>

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => recordedBlob && setCurrentStep(3)}
            disabled={!recordedBlob}
            className={`relative z-10 flex flex-col items-center gap-2 focus:outline-none flex-1 ${recordedBlob ? "cursor-pointer group" : "cursor-not-allowed opacity-60"}`}
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm transition-all duration-300 ${
                currentStep === 3
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-110 ring-4 ring-indigo-100"
                  : "bg-white border border-slate-200 text-slate-400"
              }`}
            >
              3
            </div>
            <span
              className={`text-xs font-black transition-colors ${
                currentStep === 3 ? "text-indigo-600" : "text-slate-500"
              }`}
            >
              {t.shadowing.step3Title}
            </span>
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Video Player (Col 12 on mobile, Col 7 on desktop) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="aspect-video w-full overflow-hidden bg-slate-950 rounded-2xl shadow-md border border-slate-200/80 pointer-events-none select-none relative">
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

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-bold">
            <span className="flex items-center gap-1.5">
              <Headphones size={15} className="text-indigo-500" />
              Đoạn luyện: {video.preview_start || 0}s – {video.preview_end || "Hết"}s
            </span>
            <span className="text-indigo-600 font-black">
              Bước {currentStep}/3
            </span>
          </div>
        </div>

        {/* Step Action Studio Card (Col 12 on mobile, Col 5 on desktop) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-50/90 to-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-5 flex flex-col justify-between min-h-[300px]">
          {/* Error Alert */}
          {shadowingRecording.appError && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-start gap-2.5 relative text-xs font-bold text-rose-700 shadow-2xs animate-in fade-in">
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="pr-5">{shadowingRecording.appError}</p>
              <button
                type="button"
                onClick={() => shadowingRecording.setAppError("")}
                className="absolute right-2.5 top-2.5 text-rose-400 hover:text-rose-600"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Step 1: Practice & Listen */}
          {currentStep === 1 && (
            <div className="space-y-5 my-auto text-center animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <h3 className="font-black text-slate-800 text-base sm:text-lg">
                  Luyện nghe trước khi ghi âm
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
                  {t.shadowing.step1Desc}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (player && video) {
                      const prevStart = video.preview_start || 0;
                      player.seekTo(prevStart);
                      player.playVideo();
                    }
                  }}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-black rounded-2xl shadow-md shadow-emerald-500/20 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Play size={18} fill="currentColor" /> {t.shadowing.practiceListen}
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-95 text-white font-black rounded-2xl shadow-md shadow-indigo-500/20 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Mic size={18} /> {t.shadowing.startRecording}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Voice Studio / Record */}
          {currentStep === 2 && (
            <div className="space-y-5 my-auto text-center animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <h3 className="font-black text-slate-800 text-base sm:text-lg">
                  Lồng tiếng cho video
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
                  {t.shadowing.step2Desc}
                </p>
              </div>

              {shadowingRecording.isRecording ? (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="text-3xl sm:text-4xl font-black text-rose-600 font-mono tracking-wider tabular-nums bg-rose-50 px-5 py-2 rounded-2xl border border-rose-200 shadow-2xs">
                    {shadowingRecording.formatTime(shadowingRecording.recordingTime)}
                  </div>
                  <div className="relative flex items-center justify-center my-2">
                    <div className="absolute w-24 h-24 bg-rose-500/25 rounded-3xl animate-ping pointer-events-none" />
                    <button
                      type="button"
                      onClick={shadowingRecording.stopRecording}
                      className="w-20 h-20 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-rose-600/35 z-10 transition-all cursor-pointer"
                    >
                      <Square size={26} className="fill-white" />
                    </button>
                  </div>
                  <p className="text-xs font-black text-rose-600 animate-pulse">
                    Đang ghi âm... Nhấn nút vuông để dừng
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-2">
                  <button
                    type="button"
                    onClick={shadowingRecording.startRecording}
                    className="w-20 h-20 bg-gradient-to-tr from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Mic size={36} />
                  </button>
                  <p className="text-xs sm:text-sm font-black text-slate-600">
                    Bấm nút đỏ để bắt đầu lồng tiếng 🎙️
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      if (player && video) {
                        player.pauseVideo();
                        player.seekTo(video.preview_start || 0);
                      }
                      setCurrentStep(1);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 mt-2"
                  >
                    <RotateCcw size={13} /> {t.shadowing.backToListen}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {currentStep === 3 && (
            <div className="space-y-5 my-auto text-center animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <h3 className="font-black text-slate-800 text-base sm:text-lg">
                  Nghe lại và Gửi bài
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
                  {t.shadowing.step3Desc}
                </p>
              </div>

              {/* Recorded Audio Player */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                <audio
                  ref={audioRef}
                  src={audioUrl || ""}
                  controls
                  className="w-full h-10"
                />
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={shadowingRecording.saveRecording}
                  disabled={shadowingRecording.isSaving}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-black rounded-2xl shadow-md shadow-emerald-500/25 transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {shadowingRecording.isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Đang gửi bài...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> {t.shadowing.submit} 🚀
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    shadowingRecording.setBongBeAudios({});
                    setCurrentStep(2);
                  }}
                  disabled={shadowingRecording.isSaving}
                  className="w-full py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={14} /> {t.shadowing.reRecord}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Celebration Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col justify-center items-center z-[100] animate-in fade-in duration-300 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner text-4xl">
              🏆
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-800">
                {t.shadowing.saved}
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Con đã hoàn thành bài luyện Shadowing xuất sắc! 🎉
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                navigate("/student/shadowing");
              }}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black rounded-2xl shadow-md shadow-emerald-500/25 active:scale-95 transition-all text-sm"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

