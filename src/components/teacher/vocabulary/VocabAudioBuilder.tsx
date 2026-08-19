import {
  AudioBuilderConfig,
  generateVocabularyAudio,
  fetchWordAudioBuffer,
  RenderedAudioResult,
  WordTimestamp,
} from '../../../utils/audioEncoder';
import { useLanguage } from '../../../i18n/LanguageContext';
import {
  AlertCircle,
  Clock,
  Download,
  FileAudio,
  ListPlus,
  Loader2,
  Music,
  Pause,
  Play,
  Save,
  Library,
  Trash2,
  Sliders,
  Sparkles,
  Volume2,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { s3Client, S3_BUCKET } from '../../../lib/s3';
import { DeleteConfirmModal } from '../shared/DeleteConfirmModal';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { sanitizeText } from '../../../utils/validators';

export function VocabAudioBuilder() {
  const { t } = useLanguage();
  const tAudio = t.audioBuilder;

  const [inputText, setInputText] = useState<string>('');
  const [repetitions, setRepetitions] = useState<number>(3);
  const [wordDuration, setWordDuration] = useState<number>(3);
  const [gapDuration, setGapDuration] = useState<number>(4);
  const [voiceLang, setVoiceLang] = useState<string>('en-US');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [audioResult, setAudioResult] = useState<RenderedAudioResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [savedAudios, setSavedAudios] = useState<any[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [audioTitle, setAudioTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [audioToDelete, setAudioToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);

  const parsedWords = React.useMemo(() => {
    if (!inputText) return [];
    return inputText
      .split(/[\n,;]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
  }, [inputText]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const cur = audio.currentTime;
      setCurrentTime(cur);

      if (audioResult && audioResult.wordTimestamps) {
        const foundIdx = audioResult.wordTimestamps.findIndex(
          wt => cur >= wt.startTime && cur < wt.endTime + gapDuration
        );
        setActiveWordIndex(foundIdx);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setActiveWordIndex(-1);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioResult, gapDuration]);

  const fetchLibrary = async () => {
    setIsLibraryLoading(true);
    try {
      const { data, error } = await supabase
        .from('vocab_audios')
        .select('*')
        .order('created_at', { ascending: false });
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
    const cleanTitle = sanitizeText(audioTitle);
    if (!audioResult || !cleanTitle) return;
    if (cleanTitle.length < 2 || cleanTitle.length > 100) {
      setErrorMsg('Tên bài nghe phải từ 2 đến 100 ký tự.');
      return;
    }
    if (!Array.isArray(parsedWords) || parsedWords.length === 0) {
      setErrorMsg('Danh sách từ vựng không được để trống.');
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const fileKey = `vocab-audio/${Date.now()}-${cleanTitle.replace(/[^a-zA-Z0-9_-]/g, '')}.wav`;
      const arrayBuffer = await audioResult.blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const uploadParams = {
        Bucket: S3_BUCKET,
        Key: fileKey,
        Body: uint8Array,
        ContentType: 'audio/wav',
      };
      await s3Client.send(new PutObjectCommand(uploadParams));
      const publicBaseUrl = import.meta.env.VITE_R2_PUBLIC_URL;
      let fileUrl = '';
      if (publicBaseUrl) {
        fileUrl = `${publicBaseUrl.replace(/\/$/, '')}/${fileKey}`;
      } else {
        const endpoint = import.meta.env.VITE_S3_ENDPOINT || '';
        fileUrl = endpoint.includes(S3_BUCKET)
          ? `${endpoint}/${fileKey}`
          : `${endpoint}/${S3_BUCKET}/${fileKey}`;
      }

      const configSummary = `${repetitions}x rep • ${gapDuration}s gap`;
      const { error } = await supabase.from('vocab_audios').insert({
        title: cleanTitle,
        audio_url: fileUrl,
        word_list: parsedWords,
        words_count: parsedWords.length,
        duration: audioResult.totalDuration,
        config_summary: configSummary,
      });

      if (error) throw error;

      setShowSaveModal(false);
      setAudioTitle('');
      fetchLibrary();
    } catch (err: any) {
      console.error('Save error:', err);
      setErrorMsg(err.message || t.audioBuilder.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSavedAudio = async (audio: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setAudioToDelete(audio);
  };

  const confirmDeleteAudio = async () => {
    if (!audioToDelete) return;
    setIsDeleting(true);
    try {
      await supabase.from('vocab_audios').delete().eq('id', audioToDelete.id);
      setSavedAudios(prev => prev.filter(a => a.id !== audioToDelete.id));
      setAudioToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const speakSingleWord = async (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const buffer = await fetchWordAudioBuffer(word, audioCtx, voiceLang);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start();
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch API audio for preview, falling back to browser TTS', err);
    }

    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = voiceLang;
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  const handleGenerateAudio = async () => {
    if (parsedWords.length === 0) {
      setErrorMsg(tAudio.errorEmpty);
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    setProgressPercent(5);
    setProgressStatus('Preparing audio engine...');

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

      const result = await generateVocabularyAudio(parsedWords, config, (percent, statusMsg) => {
        setProgressPercent(percent);
        setProgressStatus(statusMsg);
      });

      setAudioResult(result);
      setIsGenerating(false);
    } catch (err: any) {
      console.error('Audio generation error:', err);
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
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 rounded-2xl p-5 sm:p-7 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-xl text-xs font-black text-blue-100 border border-white/20">
            <Sparkles size={14} />
            <span>{tAudio.badge}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">{tAudio.title}</h1>
          <p className="text-blue-100 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
            {tAudio.description}
          </p>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
          <FileAudio size={220} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Word List & Settings */}
        <div className="lg:col-span-7 space-y-5">
          {/* Word List Input Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <ListPlus size={18} />
                </span>
                {tAudio.wordListLabel}
              </label>
              <div className="flex items-center gap-2">
                {inputText && (
                  <button
                    onClick={() => setInputText('')}
                    className="text-xs font-black text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    {tAudio.clearAll}
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={4}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={tAudio.inputPlaceholder}
              className="w-full p-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 outline-none text-slate-800 font-bold text-sm transition-all resize-none bg-slate-50 focus:bg-white shadow-2xs"
            />

            {parsedWords.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-black text-slate-500">
                  <span>
                    {tAudio.recognizedWords.replace('{count}', parsedWords.length.toString())}
                  </span>
                  <span className="text-blue-600">{tAudio.clickToListen}</span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                  {parsedWords.map((word, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 text-blue-800 rounded-xl text-xs font-black transition-all shadow-2xs"
                    >
                      <span>{word}</span>
                      <button
                        onClick={e => speakSingleWord(word, e)}
                        title={tAudio.listenTo.replace('{word}', word)}
                        className="text-blue-500 hover:text-blue-700 p-0.5 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <Volume2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Settings Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Sliders size={18} />
              </span>
              <h2 className="font-black text-slate-800 text-sm sm:text-base">
                {tAudio.settingsTitle}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                  <span>{tAudio.repetitionsLabel}</span>
                  <span className="text-blue-600 font-black bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
                    {repetitions} {tAudio.times}
                  </span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={repetitions}
                  onChange={e => setRepetitions(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 font-bold block">
                  {tAudio.defaultTimes}
                </span>
              </div>

              <div className="space-y-1.5 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                  <span>{tAudio.durationLabel}</span>
                  <span className="text-blue-600 font-black bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
                    {wordDuration} {tAudio.seconds}
                  </span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={6}
                  step={0.5}
                  value={wordDuration}
                  onChange={e => setWordDuration(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 font-bold block">
                  {tAudio.defaultDuration}
                </span>
              </div>

              <div className="space-y-1.5 sm:col-span-2 bg-blue-50/70 p-4 rounded-xl border border-blue-200/70">
                <label className="text-xs font-black text-blue-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock size={16} className="text-blue-600" />
                    {tAudio.gapLabel}
                  </span>
                  <span className="text-blue-700 font-black text-xs bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                    {gapDuration} {tAudio.seconds}
                  </span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={gapDuration}
                  onChange={e => setGapDuration(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer mt-1"
                />
                <div className="flex justify-between text-[10px] text-blue-700 font-bold">
                  <span>{tAudio.gapFast}</span>
                  <span>{tAudio.gapDefault}</span>
                  <span>{tAudio.gapSlow}</span>
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-black flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerateAudio}
            disabled={isGenerating || parsedWords.length === 0}
            className={`w-full py-3.5 rounded-xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 ${
              isGenerating || parsedWords.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>{tAudio.generating.replace('{percent}', progressPercent.toString())}</span>
              </>
            ) : (
              <>
                <Music size={18} />
                <span>{tAudio.generateButton}</span>
              </>
            )}
          </button>

          {isGenerating && (
            <div className="space-y-1.5">
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 font-bold text-center">{progressStatus}</p>
            </div>
          )}
        </div>

        {/* Right Column: Audio Player & Result */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-[84px]">
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 min-h-[420px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
                    <FileAudio size={18} />
                  </span>
                  <h2 className="font-black text-slate-800 text-sm sm:text-base">
                    {tAudio.resultTitle}
                  </h2>
                </div>
                {audioResult && (
                  <span className="text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    {formatTime(audioResult.totalDuration)}
                  </span>
                )}
              </div>

              {!audioResult ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 text-slate-400">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100 shadow-2xs">
                    <Music size={32} />
                  </div>
                  <div>
                    <p className="font-black text-slate-700 text-sm">{tAudio.notGenerated}</p>
                    <p className="text-xs text-slate-400 max-w-xs mt-1 font-medium">
                      {tAudio.notGeneratedDesc}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <audio ref={audioRef} src={audioResult.audioUrl} />

                  <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-md border border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-indigo-300 font-black uppercase tracking-wider">
                          {tAudio.readyBadge}
                        </p>
                        <p className="font-black text-base text-white">
                          {tAudio.wordsCount.replace('{count}', parsedWords.length.toString())}
                        </p>
                      </div>
                      <span className="text-[11px] px-2.5 py-1 bg-indigo-900/80 rounded-xl font-black text-indigo-200 border border-indigo-700/60 shadow-2xs">
                        {tAudio.configSummary
                          .replace('{rep}', repetitions.toString())
                          .replace('{gap}', gapDuration.toString())}
                      </span>
                    </div>

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
                      <div className="flex justify-between text-[11px] font-mono text-indigo-300 font-bold">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(audioResult.totalDuration)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 pt-1">
                      <button
                        onClick={togglePlayPause}
                        className="w-16 h-16 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95"
                      >
                        {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-1" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
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
                                ? 'bg-blue-50 border-blue-400 text-blue-900 font-black shadow-2xs'
                                : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 font-bold'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-lg bg-slate-200 text-slate-600 text-[10px] font-black flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-black">{wt.word}</span>
                              {isActive && (
                                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-md font-black animate-pulse">
                                  {tAudio.playing}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono text-slate-400 font-bold">
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

            {audioResult && (
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 mt-4">
                <a
                  href={audioResult.audioUrl}
                  download={`vocab-audio-${parsedWords.slice(0, 3).join('-')}-${Date.now()}.wav`}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <Download size={16} />
                  <span>{tAudio.downloadButton}</span>
                </a>
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <Save size={16} />
                  <span>{tAudio.saveToLibrary}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved Audios Library Grid */}
      <div className="mt-8 bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <Library size={18} />
            </span>
            <h2 className="font-black text-slate-800 text-base">{tAudio.libraryTitle}</h2>
          </div>
          <span className="text-xs font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
            {savedAudios.length} {tAudio.libraryTitle.toLowerCase()}
          </span>
        </div>

        {isLibraryLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : savedAudios.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-bold bg-slate-50/50 rounded-xl border border-slate-100">
            {tAudio.emptyLibrary}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {savedAudios.map(audio => (
              <div
                key={audio.id}
                className="bg-slate-50/70 hover:bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all flex flex-col gap-3 group relative"
              >
                <div className="flex justify-between items-start gap-2">
                  <h3
                    className="font-black text-slate-800 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors"
                    title={audio.title}
                  >
                    {audio.title}
                  </h3>
                  <button
                    onClick={e => handleDeleteSavedAudio(audio, e)}
                    className="text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 p-1.5 rounded-xl border border-slate-200/60 transition-all shrink-0"
                    title={tAudio.delete}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px] font-black text-slate-600">
                  <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    📁 {audio.words_count} từ
                  </span>
                  <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    ⏱️ {formatTime(audio.duration)}
                  </span>
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                    ⚙️ {audio.config_summary}
                  </span>
                </div>
                <audio controls src={audio.audio_url} className="w-full h-9 mt-1 rounded-xl" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="!m-0 fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overscroll-contain">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <Save size={18} />
              </span>
              {tAudio.saveTitle}
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 uppercase">
                {tAudio.audioTitle}
              </label>
              <input
                type="text"
                autoFocus
                value={audioTitle}
                maxLength={100}
                onChange={e => setAudioTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !isSaving && audioTitle.trim()) {
                    handleSaveToLibrary();
                  }
                }}
                placeholder={tAudio.audioTitlePlaceholder}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 outline-none text-slate-800 font-bold text-sm bg-slate-50 focus:bg-white"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl font-black text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {tAudio.close}
              </button>
              <button
                onClick={handleSaveToLibrary}
                disabled={isSaving || !audioTitle.trim()}
                className="flex-1 py-2.5 rounded-xl font-black text-xs text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {isSaving ? tAudio.saving : tAudio.saveToLibrary}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
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
export default VocabAudioBuilder;
