import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  Mic,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";
import { AudioPlayer } from "../common/AudioPlayer";
import { StudentSummary } from "./hooks/useRecordings";

export function RecordingsPanel({
  summaries,
  loading,
  formatDate,
  onDeleteRequest,
  onSelectStudent,
}: {
  summaries: StudentSummary[];
  loading: boolean;
  formatDate: (ts: string) => string;
  onDeleteRequest: (id: string) => void;
  onSelectStudent: (studentName: string, avatar?: string) => void;
}) {
  const { t } = useLanguage();

  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // 'all', 'graded', 'ungraded'
  const [showFilters, setShowFilters] = useState(false);
  const [studentAvatars, setStudentAvatars] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("name, avatar")
          .eq("role", "student");
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((p: any) => {
            if (p.name && p.avatar) {
              map[p.name.trim().toLowerCase()] = p.avatar;
            }
          });
          setStudentAvatars(map);
        }
      } catch (err) {
        console.error("Error fetching avatars", err);
      }
    };
    fetchAvatars();
  }, []);

  const filteredSummaries = React.useMemo(() => {
    return summaries.filter((s) => {
      if (
        filterName &&
        !s.studentName.toLowerCase().includes(filterName.toLowerCase())
      ) {
        return false;
      }
      if (filterStatus === "graded" && s.hasUngraded) return false;
      if (filterStatus === "ungraded" && !s.hasUngraded) return false;
      return true;
    });
  }, [summaries, filterName, filterStatus]);

  const avatarColors = [
    "bg-[#E3F2FD] text-[#1E88E5] border-[#90CAF9]",
    "bg-[#F3E5F5] text-[#8E24AA] border-[#CE93D8]",
    "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]",
    "bg-[#FFF3E0] text-[#E65100] border-[#FFCC80]",
    "bg-[#FCE4EC] text-[#C62828] border-[#F48FB1]",
    "bg-[#E0F7FA] text-[#00838F] border-[#80DEEA]",
  ];

  return (
    <div className="bg-white rounded-[2rem] shadow-md border-3 border-[#FFF59D] overflow-hidden">
      <div className="p-4 border-b-2 border-slate-100 flex items-center justify-between bg-[#FFFDF6]">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-slate-500" />
          <h3 className="font-extrabold text-slate-700 text-md">
            {t.recordings.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-extrabold transition-colors border-2 ${
            showFilters || filterName || filterStatus !== "all"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Filter size={16} /> {t.recordings.filter}
        </button>
      </div>

      {showFilters && (
        <div className="p-4 bg-slate-50 border-b-2 border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase">
              {t.recordings.filterName}
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder={t.recordings.searchPlaceholder}
                className="w-full pl-8 pr-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase">
              {t.recordings.filterStatus}
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-amber-400 appearance-none"
            >
              <option value="all">{t.recordings.filterAll}</option>
              <option value="ungraded">{t.recordings.filterUngraded}</option>
              <option value="graded">{t.recordings.filterGraded}</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold animate-pulse">
          {t.recordings.loading}
        </div>
      ) : filteredSummaries.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-bold">{t.recordings.empty}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filteredSummaries.map((s, idx) => {
            const avatar = studentAvatars[s.key];
            const colorClass = avatarColors[idx % avatarColors.length];
            const initials = s.studentName
              .split(" ")
              .map((w: string) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const latestDate = formatDate(s.latestCreatedAt);

            return (
              <button
                key={s.key}
                type="button"
                onClick={() => onSelectStudent(s.studentName, avatar)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
              >
                <span
                  className={`w-10 h-10 rounded-2xl border-2 font-black flex items-center justify-center shrink-0 ${
                    avatar
                      ? "bg-amber-50 text-2xl shadow-sm border-amber-200"
                      : `text-sm ${colorClass}`
                  }`}
                >
                  {avatar || initials}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-slate-800 text-base truncate">
                    {s.studentName}
                  </p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                    {t.recordings.latest} {latestDate}
                  </p>
                </div>

                {s.hasUngraded && (
                  <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-rose-400" />
                )}

                <span className="shrink-0 px-3 py-1 bg-[#E3F2FD] text-[#1E88E5] text-xs font-black rounded-full border border-[#90CAF9]">
                  {s.count} {t.recordings.lessons}
                </span>

                <ChevronRight size={18} className="shrink-0 text-slate-400" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RecordingItem({
  rec,
  formatDate,
  onDeleteRequest,
  isHighlighted,
}: {
  rec: any;
  formatDate: (ts: string) => string;
  onDeleteRequest: (id: string) => void;
  isHighlighted: boolean;
}) {
  const { t } = useLanguage();
  const [rating, setRating] = useState<number>(rec.teacher_rating || 0);
  const [feedback, setFeedback] = useState<string>(rec.teacher_feedback || "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const itemRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isHighlighted) return;
    setTimeout(() => {
      itemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  }, [isHighlighted]);

  const doSave = async (newRating: number, newFeedback: string) => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError("");
    try {
      const { error } = await supabase
        .from("recordings")
        .update({ teacher_rating: newRating, teacher_feedback: newFeedback })
        .eq("id", rec.id);
      if (error) throw error;
      rec.teacher_rating = newRating;
      rec.teacher_feedback = newFeedback;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      console.error("Lỗi lưu nhận xét:", err);
      setSaveError(t.common.saveFeedbackError);
    } finally {
      setSaving(false);
    }
  };

  const handleRatingClick = (star: number) => {
    setRating(star);
    doSave(star, feedback);
  };

  const handleFeedbackBlur = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    doSave(rating, feedback);
  };

  const handleFeedbackChange = (val: string) => {
    setFeedback(val);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => doSave(rating, val), 1500);
  };

  return (
    <div
      ref={itemRef}
      className={`px-4 py-3 flex flex-col gap-2.5 transition-colors ${
        isHighlighted
          ? "bg-emerald-50 ring-2 ring-inset ring-emerald-400"
          : "hover:bg-white"
      }`}
    >
      {/* Row 1: topic number + date + badges + action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#E3F2FD] border border-[#90CAF9] text-[#1E88E5] font-black text-xs shadow-sm shrink-0">
          {rec.topicNumber}
        </span>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded font-bold">
          {formatDate(rec.createdAt)}
        </span>
        {rec.student_reaction === "heart" && (
          <span className="text-xs text-rose-500" title={t.recordings.heartReaction}>❤️</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDeleteRequest(rec.id);
            }}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent"
            title={t.common.delete}
            aria-label={t.common.delete}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Row 2: topic + question + audio inline */}
      <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-3 py-2 min-w-0">
        <span className="text-[10px] font-black text-slate-400 shrink-0 uppercase tracking-wide">{t.recordings.topic}</span>
        <span className="text-xs font-bold text-slate-700 shrink-0 max-w-[80px] truncate">{rec.topic}</span>
        <span className="text-slate-200 shrink-0">·</span>
        <span className="text-[10px] font-black text-slate-400 shrink-0 uppercase tracking-wide">{t.recordings.question.replace(":", "")}</span>
        <span className="text-xs font-bold text-slate-600 flex-1 min-w-0 truncate">{rec.questionText}</span>
        <AudioPlayer src={rec.audioUrl} compact />
      </div>

      {/* Inline feedback panel */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5" role="radiogroup" aria-label={t.recordings.feedback}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingClick(star)}
              role="radio"
              aria-checked={star === rating}
              aria-label={`${star} star`}
              className="transition-transform hover:scale-110 focus:outline-none"
            >
              <Star
                size={16}
                className={star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}
              />
            </button>
          ))}
        </div>
        <input
          type="text"
          value={feedback}
          onChange={(e) => handleFeedbackChange(e.target.value)}
          onBlur={handleFeedbackBlur}
          placeholder={t.recordings.feedbackPlaceholder}
          className="flex-1 px-2.5 py-1 bg-white border border-slate-200 focus:border-blue-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
        />
        {saving && <Loader2 size={12} className="animate-spin text-slate-400 shrink-0" />}
        {saveSuccess && <Check size={12} className="text-emerald-500 shrink-0" />}
        {saveError && <span title={saveError}><AlertCircle size={12} className="text-rose-500 shrink-0" /></span>}
      </div>
    </div>
  );
}
