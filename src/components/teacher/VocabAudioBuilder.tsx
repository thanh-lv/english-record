import {
  AudioBuilderConfig,
  generateVocabularyAudio,
  RenderedAudioResult,
  WordTimestamp,
} from "../../utils/audioEncoder";
import { useLanguage } from "../../i18n/LanguageContext";
import {
  Clock,
  Download,
  FileAudio,
  ListPlus,
  Loader2,
  Music,
  Pause,
  Play,
  RotateCcw,
  Save,
  Library,
  Trash2,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { s3Client, S3_BUCKET } from "../../lib/s3";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const DEMO_PRESETS = [
  {
    name: "Fruits 🍎",
    words: "apple, grapes, pineapple, strawberry",
  },
  {
    name: "Animals 🐶",
    words: "elephant, giraffe, kangaroo, penguin, tiger",
  },
  {
    name: "School items ✏️",
    words: "pencil, notebook, backpack, scissors, eraser",
  },
];

export function VocabAudioBuilder() {
  const { t } = useLanguage();
  const tAudio = (t as any).audioBuilder;

  // Input State
  const [inputText, setInputText] = useState<string>(
    "apple, grapes, pineapple, strawberry",
  );

  // Settings State
  const [repetitions, setRepetitions] = useState<number>(3);
  const [wordDuration, setWordDuration] = useState<number>(3);
  const [gapDuration, setGapDuration] = useState<number>(4);
  const [voiceLang, setVoiceLang] = useState<string>("en-US");

  // Generator & Audio State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [audioResult, setAudioResult] = useState<RenderedAudioResult | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Library & Save State
  const [savedAudios, setSavedAudios] = useState<any[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [audioTitle, setAudioTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [audioToDelete, setAudioToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Playback state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);

  // Parse raw text into unique non-empty words
  const parsedWords = React.useMemo(() => {
    if (!inputText) return [];
    return inputText
      .split(/[\n,;]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
  }, [inputText]);

  // Audio playback position listener & word highlighter
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const cur = audio.currentTime;
      setCurrentTime(cur);

      if (audioResult && audioResult.wordTimestamps) {
        const foundIdx = audioResult.wordTimestamps.findIndex(
          (wt) => cur >= wt.startTime && cur < wt.endTime + gapDuration,
        );
        setActiveWordIndex(foundIdx);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setActiveWordIndex(-1);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioResult, gapDuration]);

  // Library Fetching
  const fetchLibrary = async () => {
    setIsLibraryLoading(true);
    try {
      const { data, error } = await supabase
        .from("vocab_audios")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setSavedAudios(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLibraryLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleSaveToLibrary = async () => {
    if (!audioResult || !audioTitle.trim()) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      // 1. Upload to S3
      const fileKey = `vocab-audio/${Date.now()}-${audioTitle.replace(/[^a-zA-Z0-9_-]/g, "")}.wav`;
      // Convert Blob to Uint8Array to bypass AWS SDK stream bug in Vite
      const arrayBuffer = await audioResult.blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const uploadParams = {
        Bucket: S3_BUCKET,
        Key: fileKey,
        Body: uint8Array,
        ContentType: "audio/wav",
      };
      await s3Client.send(new PutObjectCommand(uploadParams));
      const publicBaseUrl = import.meta.env.VITE_R2_PUBLIC_URL;
      let fileUrl = "";
      if (publicBaseUrl) {
        fileUrl = `${publicBaseUrl.replace(/\/$/, "")}/${fileKey}`;
      } else {
        const endpoint = import.meta.env.VITE_S3_ENDPOINT || "";
        fileUrl = endpoint.includes(S3_BUCKET)
          ? `${endpoint}/${fileKey}`
          : `${endpoint}/${S3_BUCKET}/${fileKey}`;
      }

      // 2. Save to DB
      const configSummary = `${repetitions}x rep • ${gapDuration}s gap`;
      const { error } = await supabase.from("vocab_audios").insert({
        title: audioTitle.trim(),
        audio_url: fileUrl,
        word_list: parsedWords,
        words_count: parsedWords.length,
        duration: audioResult.totalDuration,
        config_summary: configSummary,
      });

      if (error) throw error;

      setShowSaveModal(false);
      setAudioTitle("");
      fetchLibrary(); // refresh
      // We could show a toast here, but for now just close modal
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMsg(err.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSavedAudio = async (audio: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setAudioToDelete(audio);
  };

  const confirmDeleteAudio = async (e: React.MouseEvent) => {
    if (!audioToDelete) return;
    setIsDeleting(true);
    try {
      await supabase.from("vocab_audios").delete().eq("id", audioToDelete.id);
      setSavedAudios((prev) => prev.filter((a) => a.id !== audioToDelete.id));
      setAudioToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Preview single word via browser Web Speech API
  const speakSingleWord = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = voiceLang;
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  // Generate continuous stitched audio track
  const handleGenerateAudio = async () => {
    if (parsedWords.length === 0) {
      setErrorMsg(tAudio.errorEmpty);
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    setProgressPercent(5);
    setProgressStatus("Preparing audio engine...");

    // Stop current playback if playing
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    try {
      const config: AudioBuilderConfig = {
        repetitionsPerWord: repetitions,
        wordDurationSlot: wordDuration,
        gapBetweenWords: gapDuration,
        voiceLang,
      };

      const result = await generateVocabularyAudio(
        parsedWords,
        config,
        (percent, statusMsg) => {
          setProgressPercent(percent);
          setProgressStatus(statusMsg);
        },
      );

      setAudioResult(result);
      setIsGenerating(false);
    } catch (err: any) {
      console.error("Audio generation error:", err);
      setErrorMsg(err.message || tAudio.errorFailed);
      setIsGenerating(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !audioResult) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const jumpToWord = (wt: WordTimestamp) => {
    if (audioRef.current) {
      audioRef.current.currentTime = wt.startTime;
      setCurrentTime(wt.startTime);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-[2rem] p-4 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-blue-100">
            <Sparkles size={14} />
            <span>{tAudio.badge}</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight">
            {tAudio.title}
          </h1>
          <p className="text-blue-100 text-sm sm:text-base max-w-2xl">
            {tAudio.description}
          </p>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
          <FileAudio size={220} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Input & Controls Section */}
        <div className="lg:col-span-7 space-y-6">
          {/* Word Input Card */}
          <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                <ListPlus className="text-blue-500" size={20} />
                {tAudio.wordListLabel}
              </label>
              <div className="flex items-center gap-2">
                {inputText && (
                  <button
                    onClick={() => setInputText("")}
                    className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    {tAudio.clearAll}
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={tAudio.inputPlaceholder}
              className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-slate-700 font-semibold text-base transition-all resize-none"
            />

            {/* Demo Presets */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {tAudio.presetsLabel}
              </span>
              <div className="flex flex-wrap gap-2">
                {DEMO_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setInputText(preset.words)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Parsed word tags preview */}
            {parsedWords.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>
                    {tAudio.recognizedWords.replace(
                      "{count}",
                      parsedWords.length.toString(),
                    )}
                  </span>
                  <span className="text-blue-600">{tAudio.clickToListen}</span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                  {parsedWords.map((word, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl text-sm font-extrabold transition-all"
                    >
                      <span>{word}</span>
                      <button
                        onClick={(e) => speakSingleWord(word, e)}
                        title={tAudio.listenTo.replace("{word}", word)}
                        className="text-blue-500 hover:text-blue-700 p-0.5 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timing & Settings Card */}
          <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="text-blue-500" size={20} />
              <h2 className="font-extrabold text-slate-800 text-base">
                {tAudio.settingsTitle}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Repetitions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 flex items-center justify-between">
                  <span>{tAudio.repetitionsLabel}</span>
                  <span className="text-blue-600 font-extrabold">
                    {repetitions} {tAudio.times}
                  </span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={repetitions}
                  onChange={(e) => setRepetitions(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 block">
                  {tAudio.defaultTimes}
                </span>
              </div>

              {/* Time for repetitions slot */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 flex items-center justify-between">
                  <span>{tAudio.durationLabel}</span>
                  <span className="text-blue-600 font-extrabold">
                    {wordDuration} {tAudio.seconds}
                  </span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={6}
                  step={0.5}
                  value={wordDuration}
                  onChange={(e) => setWordDuration(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 block">
                  {tAudio.defaultDuration}
                </span>
              </div>

              {/* Gap between words */}
              <div className="space-y-1.5 sm:col-span-2 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                <label className="text-xs font-extrabold text-blue-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock size={16} className="text-blue-600" />
                    {tAudio.gapLabel}
                  </span>
                  <span className="text-blue-700 font-black text-sm bg-blue-200/80 px-2 py-0.5 rounded-md">
                    {gapDuration} {tAudio.seconds}
                  </span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={gapDuration}
                  onChange={(e) => setGapDuration(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer mt-1"
                />
                <div className="flex justify-between text-[11px] text-blue-600/80 font-medium">
                  <span>{tAudio.gapFast}</span>
                  <span>{tAudio.gapDefault}</span>
                  <span>{tAudio.gapSlow}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-bold">
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleGenerateAudio}
            disabled={isGenerating || parsedWords.length === 0}
            className={`w-full py-4 rounded-2xl font-black text-base shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 ${
              isGenerating || parsedWords.length === 0
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>
                  {tAudio.generating.replace(
                    "{percent}",
                    progressPercent.toString(),
                  )}
                </span>
              </>
            ) : (
              <>
                <Music size={20} />
                <span>{tAudio.generateButton}</span>
              </>
            )}
          </button>

          {/* Progress bar during generation */}
          {isGenerating && (
            <div className="space-y-1">
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 font-bold text-center">
                {progressStatus}
              </p>
            </div>
          )}
        </div>

        {/* Right Output & Audio Player Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 min-h-[420px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileAudio className="text-blue-500" size={20} />
                  <h2 className="font-extrabold text-slate-800 text-base">
                    {tAudio.resultTitle}
                  </h2>
                </div>
                {audioResult && (
                  <span className="text-xs font-bold text-slate-400">
                    {formatTime(audioResult.totalDuration)}
                  </span>
                )}
              </div>

              {!audioResult ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 text-slate-400">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-400">
                    <Music size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-600 text-sm">
                      {tAudio.notGenerated}
                    </p>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      {tAudio.notGeneratedDesc}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Hidden HTML Audio element */}
                  <audio ref={audioRef} src={audioResult.audioUrl} />

                  {/* Player controls box */}
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider">
                          {tAudio.readyBadge}
                        </p>
                        <p className="font-black text-lg text-white">
                          {tAudio.wordsCount.replace(
                            "{count}",
                            parsedWords.length.toString(),
                          )}
                        </p>
                      </div>
                      <span className="text-xs px-2.5 py-1 bg-indigo-800/60 rounded-full font-bold text-indigo-200 border border-indigo-700">
                        {tAudio.configSummary
                          .replace("{rep}", repetitions.toString())
                          .replace("{gap}", gapDuration.toString())}
                      </span>
                    </div>

                    {/* Progress Slider */}
                    <div className="space-y-1">
                      <input
                        type="range"
                        min={0}
                        max={audioResult.totalDuration || 100}
                        step={0.1}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full accent-blue-400 cursor-pointer h-1.5 rounded-lg"
                      />
                      <div className="flex justify-between text-[11px] font-mono text-indigo-300">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(audioResult.totalDuration)}</span>
                      </div>
                    </div>

                    {/* Play/Pause & Actions */}
                    <div className="flex items-center justify-center gap-4 pt-1">
                      <button
                        onClick={togglePlayPause}
                        className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                      >
                        {isPlaying ? (
                          <Pause size={24} />
                        ) : (
                          <Play size={24} className="ml-1" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Interactive Word Timeline */}
                  <div className="space-y-2">
                    <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      {tAudio.progressTitle}
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {audioResult.wordTimestamps.map((wt, idx) => {
                        const isActive = activeWordIndex === idx;
                        return (
                          <div
                            key={idx}
                            onClick={() => jumpToWord(wt)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isActive
                                ? "bg-blue-50 border-blue-400 text-blue-900 font-extrabold shadow-sm"
                                : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="text-sm font-bold">
                                {wt.word}
                              </span>
                              {isActive && (
                                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-extrabold animate-pulse">
                                  {tAudio.playing}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono text-slate-400">
                              {formatTime(wt.startTime)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Download & Save Buttons */}
            {audioResult && (
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                <a
                  href={audioResult.audioUrl}
                  download={`vocab-audio-${parsedWords
                    .slice(0, 3)
                    .join("-")}-${Date.now()}.wav`}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <Download size={18} />
                  <span>{tAudio.downloadButton}</span>
                </a>
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <Save size={18} />
                  <span>{tAudio.saveToLibrary}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Library Section */}
      <div className="mt-12 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
          <Library className="text-purple-500" size={24} />
          <h2 className="font-extrabold text-slate-800 text-lg">
            {tAudio.libraryTitle}
          </h2>
        </div>

        {isLibraryLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : savedAudios.length === 0 ? (
          <div className="text-center p-8 text-slate-400 font-medium">
            {tAudio.emptyLibrary}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {savedAudios.map((audio) => (
              <div
                key={audio.id}
                className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3 group relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <h3
                    className="font-bold text-slate-800 line-clamp-1"
                    title={audio.title}
                  >
                    {audio.title}
                  </h3>
                  <button
                    onClick={(e) => handleDeleteSavedAudio(audio, e)}
                    className="text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title={tAudio.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-500">
                  <span className="bg-slate-200/50 px-2 py-0.5 rounded-full">
                    {audio.words_count} words
                  </span>
                  <span className="bg-slate-200/50 px-2 py-0.5 rounded-full">
                    {formatTime(audio.duration)}
                  </span>
                  <span className="bg-slate-200/50 px-2 py-0.5 rounded-full">
                    {audio.config_summary}
                  </span>
                </div>
                <audio
                  controls
                  src={audio.audio_url}
                  className="w-full h-10 mt-2"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-black text-xl text-slate-800">
              {tAudio.saveTitle}
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">
                {tAudio.audioTitle}
              </label>
              <input
                type="text"
                autoFocus
                value={audioTitle}
                onChange={(e) => setAudioTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSaving && audioTitle.trim()) {
                    handleSaveToLibrary();
                  }
                }}
                placeholder={tAudio.audioTitlePlaceholder}
                className="w-full p-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-slate-700 font-semibold"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl border border-rose-100">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                disabled={isSaving}
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {tAudio.close}
              </button>
              <button
                onClick={handleSaveToLibrary}
                disabled={isSaving || !audioTitle.trim()}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                {isSaving ? tAudio.saving : tAudio.saveToLibrary}
              </button>
            </div>
          </div>
        </div>
      )}
      {audioToDelete && (
        <DeleteConfirmModal
          title={tAudio.confirmDelete}
          description={`"${audioToDelete.title}"`}
          confirmLabel={tAudio.delete}
          saving={isDeleting}
          onConfirm={confirmDeleteAudio}
          onCancel={() => setAudioToDelete(null)}
        />
      )}
    </div>
  );
}
