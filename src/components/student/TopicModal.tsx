import {
  AlertCircle,
  Award,
  CheckCircle,
  Eye,
  HelpCircle,
  ImageOff,
  Loader2,
  Mic,
  Square,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";
import { useEscapeToClose } from "../../hooks/useEscapeToClose";
import { TeacherFeedback } from "../common/TeacherFeedback";

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
  audioBase64: Blob | null;
  bongBeAudios: Record<number, Blob>;
  isSaving: boolean;
  appError: string;
  matchedRecording: any;
  matchedQuestionRecording: any;
  isTopicFullyRecorded: boolean;
  canRetry: boolean;
  hasPendingAudios: boolean;
  onClose: () => void;
  onPlayTopicAudio: (e: React.MouseEvent) => void;
  onStartRecording: (e: React.MouseEvent) => void;
  onStopRecording: (e?: React.MouseEvent) => void;
  onSaveRecording: (e: React.MouseEvent) => void;
  onDeleteAudio: (e: React.MouseEvent) => void;
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
  audioBase64,
  bongBeAudios,
  isSaving,
  appError,
  matchedRecording,
  matchedQuestionRecording,
  isTopicFullyRecorded,
  hasPendingAudios,
  canRetry,
  onClose,
  onPlayTopicAudio,
  onStartRecording,
  onStopRecording,
  onSaveRecording,
  onDeleteAudio,
  onDeleteBongBeAudio,
  onQuestionChange,
  onDismissError,
  formatTime,
}: TopicModalProps) {
  const { t } = useLanguage();
  useEscapeToClose(onClose, !isRecording && !isSaving);
  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center p-4 z-50 overflow-y-auto items-start py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="topic-modal-title"
    >
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border-4 border-[#FFF59D] my-auto relative">
        <div className="p-4 md:p-8 space-y-4 md:space-y-6">
          <div className="flex items-center gap-3 border-b-4 border-dashed border-[#FFF0F0] pb-3 md:pb-4 pr-10">
            <div
              className={`inline-flex items-center justify-center w-10 h-10 md:w-16 md:h-16 text-white rounded-[1rem] md:rounded-[1.5rem] font-black text-base md:text-2xl shadow-lg border-b-4 shrink-0 ${matchedRecording ? "bg-gradient-to-br from-[#81C784] to-[#4CAF50] border-[#388E3C]" : "bg-gradient-to-br from-[#64B5F6] to-[#1E88E5] border-blue-800"}`}
            >
              {isBongBe ? `T${selectedNumber}` : selectedNumber}
            </div>
            <div className="min-w-0">
              <span
                className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${canRetry ? "text-amber-500" : matchedRecording ? "text-emerald-500" : "text-blue-500"}`}
              >
                {canRetry
                  ? t.topic.retry
                  : matchedRecording
                    ? t.topic.done
                    : "Topic"}
              </span>
              <h3
                id="topic-modal-title"
                className="text-lg md:text-3xl font-black text-slate-800 leading-tight tracking-tight truncate"
              >
                {currentTopic.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="absolute top-4 right-4 md:top-6 md:right-6 p-1.5 md:p-2 text-slate-400 hover:text-rose-500 hover:bg-[#FFF0F0] rounded-full transition-all border-2 border-transparent hover:border-[#FFCDD2] z-10"
          >
            <X size={20} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-5 space-y-5 flex flex-col items-center bg-[#F4F9FF] p-5 rounded-[2rem] border-2 border-[#E3F2FD] shadow-inner">
              {/* Ẩn image box trên mobile khi không có ảnh */}
              <div
                className={`w-full aspect-square bg-white rounded-3xl border-3 border-[#FFFDE7] flex flex-col items-center justify-center overflow-hidden relative group shadow-md ${!topicImage && !imageLoading ? "hidden md:flex" : "flex"}`}
              >
                {imageLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-10 h-10 text-[#FF8A80] animate-spin" />
                    <span className="text-xs text-slate-400 font-extrabold animate-pulse">
                      {t.topic.loadingImage}
                    </span>
                  </div>
                ) : topicImage ? (
                  <img
                    src={topicImage}
                    alt={currentTopic.title}
                    className="w-full h-full object-contain p-4 animate-in fade-in duration-500"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ImageOff
                      size={48}
                      className="text-slate-200"
                      strokeWidth={1.5}
                    />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                      {t.topic.noImage}
                    </span>
                  </div>
                )}
              </div>

              {ttsLoading ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-4 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center gap-2 border-2 border-slate-200 font-bold"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.topic.loadingAudio + "..."}
                </button>
              ) : topicAudio ? (
                <button
                  type="button"
                  onClick={onPlayTopicAudio}
                  className={`w-full py-4 rounded-full font-black text-md flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 border-b-4 ${isPlayingTopicAudio ? "bg-[#FFB74D] border-orange-800 text-white hover:bg-[#FFA726]" : "bg-[#E3F2FD] hover:bg-[#BBDEFB] border-[#90CAF9] text-[#1E88E5]"}`}
                >
                  <Volume2
                    className={isPlayingTopicAudio ? "animate-bounce" : ""}
                    size={20}
                  />
                  {isPlayingTopicAudio ? t.topic.stopAudio : t.topic.playAudio}
                </button>
              ) : (
                <div className="text-xs text-slate-400 py-3 font-extrabold flex items-center gap-2 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-[#1E88E5]" />
                  {t.topic.loadingAudio}
                </div>
              )}

              {!isBongBe &&
                (matchedRecording ? (
                  <div className="w-full pt-2 border-t-2 border-dashed border-slate-200 space-y-3">
                    <div className="bg-[#E8F5E9] border-2 border-[#A5D6A7] rounded-2xl p-4 flex flex-col items-center gap-3 shadow-inner">
                      <span className="text-xs font-black text-[#2E7D32] flex items-center gap-1">
                        <Eye size={16} /> {t.topic.saved}
                      </span>
                      <audio
                        controls
                        src={matchedRecording.audioUrl}
                        className="w-full h-11"
                      />
                    </div>
                    <TeacherFeedback recording={matchedRecording} />
                    {canRetry && (
                      <div className="space-y-2">
                        <p className="text-xs font-black text-amber-600 text-center">
                          {t.topic.retryHint}
                        </p>
                        <RecordingControls
                          isRecording={isRecording}
                          recordingTime={recordingTime}
                          audioBlob={audioBase64}
                          onStart={onStartRecording}
                          onStop={onStopRecording}
                          onDelete={onDeleteAudio}
                          formatTime={formatTime}
                          size="lg"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <RecordingControls
                    isRecording={isRecording}
                    recordingTime={recordingTime}
                    audioBlob={audioBase64}
                    onStart={onStartRecording}
                    onStop={onStopRecording}
                    onDelete={onDeleteAudio}
                    formatTime={formatTime}
                    size="lg"
                  />
                ))}

              {!isBongBe && (
                <div className="w-full bg-[#FFFDE7] border-3 border-[#FFF59D] rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                  <AlertCircle
                    className="text-amber-500 shrink-0 mt-0.5"
                    size={24}
                  />
                  <p className="text-sm font-black text-amber-900 leading-relaxed text-left">
                    {t.topic.note}
                  </p>
                </div>
              )}
            </div>

            <div className="md:col-span-7 space-y-6">
              {isBongBe ? (
                <BongBeQuestionPanel
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
              ) : (
                <StandardQuestionsPanel currentTopic={currentTopic} />
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center gap-4 text-[10px] text-slate-300 font-bold">
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-400 font-mono">
                Space
              </kbd>{" "}
              play audio
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-400 font-mono">
                R
              </kbd>{" "}
              record
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-400 font-mono">
                Esc
              </kbd>{" "}
              close
            </span>
          </div>

          {appError && (
            <div className="bg-[#FFEBEE] border-2 border-[#FFCDD2] text-rose-700 text-sm px-5 py-4 rounded-2xl flex items-start gap-2 text-left relative mt-4">
              <AlertCircle size={20} className="shrink-0" />
              <span className="pr-4 font-bold">{appError}</span>
              <button
                type="button"
                onClick={onDismissError}
                aria-label={t.common.close}
                className="absolute top-3.5 right-3.5 text-rose-400 hover:text-rose-600"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="bg-[#FFFDF6] px-6 py-5 flex justify-center items-center border-t-4 border-[#FFF0F0]">
          {isTopicFullyRecorded && !hasPendingAudios ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full max-w-sm py-4 bg-gradient-to-r from-[#4CAF50] to-[#81C784] hover:from-[#388E3C] hover:to-[#4CAF50] text-white font-black text-lg rounded-full transition-all shadow-md hover:shadow-lg border-b-4 border-emerald-800 text-center"
            >
              {t.topic.close}
            </button>
          ) : (
            <button
              type="button"
              disabled={
                (isBongBe
                  ? Object.keys(bongBeAudios).length === 0
                  : !audioBase64) || isSaving
              }
              onClick={onSaveRecording}
              className={`w-full max-w-sm py-4 rounded-full font-black text-xl flex items-center justify-center gap-2 transition-all shadow-md border-b-4 ${
                (isBongBe
                  ? Object.keys(bongBeAudios).length === 0
                  : !audioBase64) || isSaving
                  ? "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#1E88E5] to-[#42A5F5] hover:from-[#1565C0] hover:to-[#1976D2] text-white border-blue-900 hover:shadow-lg"
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 size={20} className="animate-spin" />{" "}
                  {t.topic.submitting}
                </>
              ) : (
                <>
                  <CheckCircle size={20} /> {t.topic.submit}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface RecordingControlsProps {
  isRecording: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  onStart: (e: React.MouseEvent) => void;
  onStop: (e?: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  formatTime: (seconds: number) => string;
  size: "sm" | "lg";
}

function RecordingControls({
  isRecording,
  recordingTime,
  audioBlob,
  onStart,
  onStop,
  onDelete,
  formatTime,
  size,
}: RecordingControlsProps) {
  const { t } = useLanguage();
  const btnSize =
    size === "lg" ? "w-16 h-16 md:w-20 md:h-20" : "w-14 h-14 md:w-16 md:h-16";
  const pingSize =
    size === "lg" ? "w-20 h-20 md:w-24 md:h-24" : "w-18 h-18 md:w-20 md:h-20";
  const iconSize = size === "lg" ? 28 : 22;

  return (
    <div className="w-full pt-2 border-t-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
      {!isRecording && !audioBlob && (
        <div className="flex flex-col items-center gap-2.5 py-2">
          <button
            type="button"
            onClick={onStart}
            aria-label={t.topic.startRecord}
            className={`${btnSize} bg-[#FF8A80] hover:bg-[#FF5252] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all border-b-4 border-rose-800`}
          >
            <Mic size={iconSize} />
          </button>
          <span className="text-xs font-black text-slate-500">
            {t.topic.startRecord}
          </span>
        </div>
      )}

      {isRecording && (
        <div className="flex flex-col items-center space-y-4 py-2">
          <div className="relative flex items-center justify-center">
            <div
              className={`absolute ${pingSize} bg-rose-400/30 rounded-full animate-ping`}
            ></div>
            <button
              type="button"
              onClick={onStop}
              aria-label={t.topic.stopAudio}
              className={`${btnSize} bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg z-10 hover:scale-105 active:scale-95 transition-all border-b-4 border-rose-900`}
            >
              <Square size={size === "lg" ? 28 : 24} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-[#E53935] font-mono text-xl font-black bg-[#FFEBEE] px-4 py-1.5 rounded-full border border-rose-200">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse"></span>
            {formatTime(recordingTime)} / 2:00
          </div>
        </div>
      )}

      {audioBlob && !isRecording && (
        <div className="w-full space-y-4 bg-white p-4 rounded-2xl border-2 border-amber-200 shadow-md">
          <audio
            controls
            src={URL.createObjectURL(audioBlob)}
            className="w-full h-12"
          />
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={onDelete}
              className="px-5 py-2.5 text-sm font-black text-slate-600 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 rounded-full flex items-center gap-2 transition-colors shadow-sm"
            >
              <Trash2 size={16} /> {t.topic.reRecord}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface BongBeQuestionPanelProps {
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

function BongBeQuestionPanel({
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
}: BongBeQuestionPanelProps) {
  const { t } = useLanguage();
  const audioBlob = bongBeAudios[activeQuestionIndex] || null;

  return (
    <div className="bg-white rounded-[2rem] p-6 border-3 border-dashed border-[#FF8A80] space-y-6 shadow-sm text-center">
      <div className="bg-pink-50 border-2 border-pink-200 rounded-full py-2 px-5 inline-block">
        <span className="text-sm font-black text-pink-600 uppercase tracking-widest">
          {t.topic.question} {activeQuestionIndex + 1} {t.topic.of}{" "}
          {currentTopic.questions.length}
        </span>
      </div>

      <div className="py-6 space-y-5 bg-[#FAFAFA] rounded-3xl p-5 border-2 border-slate-100">
        {matchedQuestionRecording ? (
          <div className="space-y-3">
            <div className="bg-[#E8F5E9] border-2 border-[#A5D6A7] rounded-2xl p-4 flex flex-col items-center gap-3 shadow-inner">
              <span className="text-sm font-black text-[#2E7D32] flex items-center gap-1">
                <Eye size={16} /> {t.topic.saved}
              </span>
              <audio
                controls
                src={matchedQuestionRecording.audioUrl}
                className="w-full h-11"
              />
            </div>
            <TeacherFeedback recording={matchedQuestionRecording} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            {!isRecording && !audioBlob && (
              <div className="flex flex-col items-center gap-2.5">
                <button
                  type="button"
                  onClick={onStart}
                  aria-label={t.topic.startRecord}
                  className="w-20 h-20 bg-[#FF8A80] hover:bg-[#FF5252] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all border-b-4 border-rose-800"
                >
                  <Mic size={36} />
                </button>
                <span className="text-sm font-black text-slate-500">
                  {t.topic.startRecord}
                </span>
              </div>
            )}

            {isRecording && (
              <div className="flex flex-col items-center space-y-3">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-20 h-20 bg-rose-400/30 rounded-full animate-ping"></div>
                  <button
                    type="button"
                    onClick={onStop}
                    aria-label={t.topic.stopAudio}
                    className="w-16 h-16 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg z-10 hover:scale-105 active:scale-95 transition-all border-b-4 border-rose-900"
                  >
                    <Square size={24} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[#E53935] font-mono text-lg font-black bg-[#FFEBEE] px-4 py-1 rounded-full border border-rose-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                  {formatTime(recordingTime)} / 2:00
                </div>
              </div>
            )}

            {audioBlob && !isRecording && (
              <div className="w-full max-w-md space-y-4 bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-md">
                <audio
                  controls
                  src={URL.createObjectURL(audioBlob)}
                  className="w-full h-12"
                />
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={(e) => onDeleteBongBeAudio(activeQuestionIndex, e)}
                    className="px-5 py-2.5 text-sm font-black text-slate-600 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 rounded-full flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Trash2 size={16} /> {t.topic.reRecord}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t-2 border-dashed border-slate-100">
        <button
          type="button"
          disabled={activeQuestionIndex === 0}
          onClick={() => onQuestionChange(Math.max(0, activeQuestionIndex - 1))}
          className={`px-5 py-2.5 font-bold rounded-full border-2 text-sm transition-all ${activeQuestionIndex === 0 ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
        >
          {t.common.prevQuestion}
        </button>

        <button
          type="button"
          disabled={activeQuestionIndex === currentTopic.questions.length - 1}
          onClick={() =>
            onQuestionChange(
              Math.min(
                currentTopic.questions.length - 1,
                activeQuestionIndex + 1,
              ),
            )
          }
          className={`px-6 py-2.5 font-black rounded-full text-white text-sm transition-all border-b-4 ${activeQuestionIndex === currentTopic.questions.length - 1 ? "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed" : "bg-[#1E88E5] hover:bg-blue-600 border-blue-800 shadow-md"}`}
        >
          {t.common.nextQuestion}
        </button>
      </div>
    </div>
  );
}

function StandardQuestionsPanel({ currentTopic }: { currentTopic: any }) {
  const { t } = useLanguage();
  return (
    <div className="bg-white rounded-[2rem] p-6 border-3 border-[#FFF0F0] space-y-5 shadow-sm">
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b-2 border-dashed border-slate-100 pb-3">
        <HelpCircle size={16} className="text-[#FF8A80]" />{" "}
        {t.common.questionNav}
      </h4>

      <div className="space-y-6">
        {currentTopic.questions.map((q: any, i: number) => (
          <div
            key={q.id || i}
            className="space-y-3 pl-4 border-l-4 border-[#FF8A80]"
          >
            <div className="space-y-1">
              <p className="text-lg font-black text-slate-700 leading-snug">
                {q.text}
              </p>
              <p className="text-sm text-slate-400 italic font-bold">
                {q.translation || ""}
              </p>
            </div>
            {q.sample_answer && (
              <div className="bg-[#FFFDF6] rounded-2xl p-4 border-2 border-[#FFF59D]">
                <p className="text-sm font-extrabold text-slate-600 leading-relaxed bg-white px-4 py-2.5 rounded-xl border border-amber-100">
                  <span className="text-[#FFB74D] inline-flex items-center gap-1 mr-1.5 align-middle">
                    <Award size={14} /> Example:
                  </span>
                  {q.sample_answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
