import {
  AlertCircle,
  Award,
  CheckCircle2,
  Loader2,
  Mic,
  Square,
  Trash2,
  Volume2,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
} from 'lucide-react';
import { useMemo, useEffect } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useEscapeToClose } from '../../../hooks/useEscapeToClose';
import { TeacherFeedback } from '../../common/TeacherFeedback';

interface TopicModalProps {
  selectedNumber: number;
  currentTopic: any;
  isBongBe: boolean;
  activeQuestionIndex: number;
  topicImage: string | null;
  imageLoading: boolean;
  topicAudio: string | null;
  ttsLoading: boolean;
  isPlayingTopicAudio: boolean;
  isRecording: boolean;
  recordingTime: number;
  bongBeAudios: Record<number, Blob>;
  isSaving: boolean;
  appError: string;
  matchedQuestionRecording: any;
  isTopicFullyRecorded: boolean;
  canRetry: boolean;
  hasPendingAudios: boolean;
  onClose: () => void;
  onPlayTopicAudio: (e: React.MouseEvent) => void;
  onStartRecording: (e: React.MouseEvent) => void;
  onStopRecording: (e?: React.MouseEvent) => void;
  onSaveRecording: (e: React.MouseEvent) => void;
  onDeleteBongBeAudio: (questionIndex: number, e: React.MouseEvent) => void;
  onQuestionChange: (index: number) => void;
  onDismissError: (e: React.MouseEvent) => void;
  formatTime: (seconds: number) => string;
}

export function TopicModal({
  selectedNumber,
  currentTopic,
  isBongBe,
  activeQuestionIndex,
  topicImage,
  imageLoading,
  topicAudio,
  ttsLoading,
  isPlayingTopicAudio,
  isRecording,
  recordingTime,
  bongBeAudios,
  isSaving,
  appError,
  matchedQuestionRecording,
  isTopicFullyRecorded,
  hasPendingAudios,
  canRetry,
  onClose,
  onPlayTopicAudio,
  onStartRecording,
  onStopRecording,
  onSaveRecording,
  onDeleteBongBeAudio,
  onQuestionChange,
  onDismissError,
  formatTime,
}: TopicModalProps) {
  const { t } = useLanguage();
  useEscapeToClose(onClose, !isRecording && !isSaving);

  const totalQuestions = currentTopic?.questions?.length || 0;

  return (
    <div
      className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center p-3 sm:p-6 z-[100] overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="topic-modal-title"
    >
      <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-100 my-auto relative flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`inline-flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 text-white rounded-2xl font-black text-sm sm:text-xl shadow-sm shrink-0 ${
                canRetry
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/20'
                  : isTopicFullyRecorded
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20'
                    : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/20'
              }`}
            >
              {isBongBe ? `T${selectedNumber}` : selectedNumber}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    canRetry
                      ? 'bg-amber-100 text-amber-700'
                      : isTopicFullyRecorded
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {canRetry
                    ? t.topic.retry
                    : isTopicFullyRecorded
                      ? t.topic.done
                      : isBongBe
                        ? 'Test Đặc Biệt'
                        : 'Bài Học'}
                </span>
                {totalQuestions > 0 && (
                  <span className="text-[11px] font-bold text-slate-400">
                    • {totalQuestions} câu hỏi
                  </span>
                )}
              </div>
              <h3
                id="topic-modal-title"
                className="text-base sm:text-xl font-black text-slate-800 leading-tight truncate mt-0.5"
              >
                {currentTopic.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center shrink-0 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-7 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Image, TTS Audio & Note */}
            <div className="md:col-span-5 space-y-4 flex flex-col items-center">
              {/* Illustration Image */}
              {imageLoading ? (
                <div className="w-full aspect-square bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center p-4 shadow-inner">
                  <Loader2 className="w-9 h-9 text-blue-500 animate-spin" />
                  <span className="text-xs text-slate-400 font-extrabold mt-2 animate-pulse">
                    {t.topic.loadingImage}
                  </span>
                </div>
              ) : topicImage ? (
                <div className="w-full aspect-square bg-gradient-to-b from-slate-50 to-slate-100/60 rounded-2xl border border-slate-200/80 flex items-center justify-center overflow-hidden p-3 shadow-inner group">
                  <img
                    src={topicImage}
                    alt={currentTopic.title}
                    className="w-full h-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ) : null}

              {/* TTS Audio Player Button */}
              {ttsLoading ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-4 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center gap-2 border border-slate-200 text-xs font-bold"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  {t.topic.loadingAudio + '...'}
                </button>
              ) : topicAudio ? (
                <button
                  type="button"
                  onClick={onPlayTopicAudio}
                  className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-95 ${
                    isPlayingTopicAudio
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-orange-500/25 ring-2 ring-orange-400/30'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25'
                  }`}
                >
                  <Volume2 className={isPlayingTopicAudio ? 'animate-bounce' : ''} size={18} />
                  {isPlayingTopicAudio ? t.topic.stopAudio : t.topic.playAudio}
                </button>
              ) : (
                <div className="text-xs text-slate-400 py-2 font-bold flex items-center gap-2 justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  {t.topic.loadingAudio}
                </div>
              )}

              {/* Instruction Note */}
              <div className="w-full bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 shadow-2xs">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                <p className="text-xs font-bold text-amber-900 leading-relaxed text-left">
                  {t.topic.note}
                </p>
              </div>
            </div>

            {/* Right Column: Question Panel & Voice Studio */}
            <div className="md:col-span-7 space-y-4">
              <QuestionPanel
                currentTopic={currentTopic}
                activeQuestionIndex={activeQuestionIndex}
                isRecording={isRecording}
                recordingTime={recordingTime}
                bongBeAudios={bongBeAudios}
                matchedQuestionRecording={matchedQuestionRecording}
                onStart={onStartRecording}
                onStop={onStopRecording}
                onDeleteBongBeAudio={onDeleteBongBeAudio}
                onQuestionChange={onQuestionChange}
                formatTime={formatTime}
              />
            </div>
          </div>

          {/* Error Message */}
          {appError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm px-4 py-3 rounded-2xl flex items-start gap-2 text-left relative shadow-2xs animate-in fade-in">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-500" />
              <span className="pr-6 font-bold">{appError}</span>
              <button
                type="button"
                onClick={onDismissError}
                aria-label={t.common.close}
                className="absolute top-3 right-3 text-rose-400 hover:text-rose-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer / Submit Bar */}
        <div className="bg-slate-50 px-5 sm:px-7 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Keyboard Shortcuts Hint */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400 font-bold">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-slate-500 font-mono text-[10px]">
                Space
              </kbd>{' '}
              {t.topic.kbPlayAudio}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-slate-500 font-mono text-[10px]">
                R
              </kbd>{' '}
              {t.topic.kbRecord}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-slate-500 font-mono text-[10px]">
                Esc
              </kbd>{' '}
              {t.topic.kbClose}
            </span>
          </div>

          {/* Main Action Button */}
          {isTopicFullyRecorded && !hasPendingAudios ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm rounded-2xl transition-all shadow-md shadow-emerald-500/20 active:scale-95 text-center flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} /> {t.topic.close}
            </button>
          ) : (
            <button
              type="button"
              disabled={Object.keys(bongBeAudios).length === 0 || isSaving}
              onClick={onSaveRecording}
              className={`w-full sm:w-auto px-8 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                Object.keys(bongBeAudios).length === 0 || isSaving
                  ? 'bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-blue-600/25'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> {t.topic.submitting}
                </>
              ) : (
                <>
                  <Sparkles size={16} /> {t.topic.submit}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface QuestionPanelProps {
  currentTopic: any;
  activeQuestionIndex: number;
  isRecording: boolean;
  recordingTime: number;
  bongBeAudios: Record<number, Blob>;
  matchedQuestionRecording: any;
  onStart: (e: React.MouseEvent) => void;
  onStop: (e?: React.MouseEvent) => void;
  onDeleteBongBeAudio: (questionIndex: number, e: React.MouseEvent) => void;
  onQuestionChange: (index: number) => void;
  formatTime: (seconds: number) => string;
}

function QuestionPanel({
  currentTopic,
  activeQuestionIndex,
  isRecording,
  recordingTime,
  bongBeAudios,
  matchedQuestionRecording,
  onStart,
  onStop,
  onDeleteBongBeAudio,
  onQuestionChange,
  formatTime,
}: QuestionPanelProps) {
  const { t } = useLanguage();
  const audioBlob = bongBeAudios[activeQuestionIndex] || null;
  const questions = currentTopic?.questions || [];
  const q = questions[activeQuestionIndex];
  const total = questions.length;

  const audioBlobUrl = useMemo(
    () => (audioBlob ? URL.createObjectURL(audioBlob) : null),
    [audioBlob]
  );

  useEffect(() => {
    return () => {
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    };
  }, [audioBlobUrl]);

  return (
    <div className="bg-slate-50/60 rounded-3xl p-4 sm:p-6 border border-slate-200/80 space-y-5">
      {/* Question Steps Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-2xs">
          <span>
            {t.topic.question} {activeQuestionIndex + 1} / {total || 1}
          </span>
        </div>

        {/* Step Indicator Pills (when > 1 question) */}
        {total > 1 && (
          <div className="flex items-center gap-1.5">
            {questions.map((_: any, idx: number) => {
              const isDone = Boolean(bongBeAudios[idx]);
              const isCurrent = idx === activeQuestionIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onQuestionChange(idx)}
                  className={`w-7 h-7 rounded-xl text-[11px] font-black flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-2xs scale-105'
                      : isDone
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title={`Câu hỏi ${idx + 1}`}
                >
                  {isDone && !isCurrent ? <Check size={12} /> : idx + 1}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Question Content Card */}
      {q && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
          <p className="text-base sm:text-lg font-black text-slate-800 leading-snug">{q.text}</p>
          {q.translation && (
            <p className="text-xs sm:text-sm text-slate-400 italic font-semibold">
              {q.translation}
            </p>
          )}

          {q.sample_answer && (
            <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3 text-xs sm:text-sm font-bold text-slate-700 leading-relaxed space-y-1">
              <span className="text-amber-600 inline-flex items-center gap-1 font-black text-xs">
                <Award size={14} /> {t.topic.sampleAnswer}
              </span>
              <p className="text-slate-800">{q.sample_answer}</p>
            </div>
          )}

          {q.target && (
            <div className="bg-purple-50/70 border border-purple-200/70 rounded-xl p-2.5 text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <span className="text-purple-600 font-black">🎯 {t.topic.target || 'Mục tiêu:'}</span>
              <span>{q.target}</span>
            </div>
          )}
        </div>
      )}

      {/* Voice Recording Studio Area */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
        {matchedQuestionRecording ? (
          <div className="space-y-3">
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center">
              <span className="text-xs font-black text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" /> {t.topic.saved}
              </span>
              <audio
                controls
                src={matchedQuestionRecording.audio_url}
                className="w-full h-10 mt-1"
              />
            </div>
            <TeacherFeedback recording={matchedQuestionRecording} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 space-y-4">
            {/* Idle state: Big mic button */}
            {!isRecording && !audioBlob && (
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={onStart}
                  aria-label={t.topic.startRecord}
                  className="w-20 h-20 bg-gradient-to-tr from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <Mic size={34} />
                </button>
                <span className="text-xs sm:text-sm font-black text-slate-600">
                  {t.topic.startRecord}
                </span>
              </div>
            )}

            {/* Recording state: Live pulse & stop button */}
            {isRecording && (
              <div className="flex flex-col items-center space-y-3 py-1">
                <div className="relative flex items-center justify-center my-2">
                  <div className="absolute w-24 h-24 bg-rose-500/25 rounded-3xl animate-ping pointer-events-none" />
                  <button
                    type="button"
                    onClick={onStop}
                    aria-label={t.topic.stopAudio}
                    className="w-20 h-20 bg-rose-600 hover:bg-rose-700 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-rose-600/35 z-10 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Square size={24} className="fill-white" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-rose-600 font-mono text-sm font-black bg-rose-50 px-3.5 py-1 rounded-xl border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                  {formatTime(recordingTime)} / 2:00
                </div>
              </div>
            )}

            {/* Recorded audio review state */}
            {audioBlob && !isRecording && (
              <div className="w-full space-y-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <audio controls src={audioBlobUrl || ''} className="w-full h-10" />
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={e => onDeleteBongBeAudio(activeQuestionIndex, e)}
                    className="px-4 py-2 text-xs font-black text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
                  >
                    <Trash2 size={14} /> {t.topic.reRecord}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prev / Next Question Navigation */}
      {total > 1 && (
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            disabled={activeQuestionIndex === 0}
            onClick={() => onQuestionChange(Math.max(0, activeQuestionIndex - 1))}
            className={`px-4 py-2 font-black rounded-xl border text-xs flex items-center gap-1 transition-all active:scale-95 ${
              activeQuestionIndex === 0
                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs'
            }`}
          >
            <ChevronLeft size={16} /> {t.common.prevQuestion}
          </button>

          <button
            type="button"
            disabled={activeQuestionIndex === total - 1}
            onClick={() => onQuestionChange(Math.min(total - 1, activeQuestionIndex + 1))}
            className={`px-4 py-2 font-black rounded-xl text-xs flex items-center gap-1 transition-all active:scale-95 ${
              activeQuestionIndex === total - 1
                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
            }`}
          >
            {t.common.nextQuestion} <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
