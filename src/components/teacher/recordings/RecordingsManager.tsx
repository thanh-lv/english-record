import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock,
  Filter,
  GraduationCap,
  Loader2,
  Mic,
  Play,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useLanguage, interpolate } from "../../../i18n/LanguageContext";
import { supabase } from "../../../lib/supabase";
import { AudioPlayer } from "../../common/AudioPlayer";
import { StudentSummary } from "../hooks/useRecordings";
import YouTubePlayer from "../../common/YouTubePlayer";

export function RecordingsManager({
  summaries,
  loading,
  formatDate,
  onDeleteRequest: _onDeleteRequest,
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
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [studentInfo, setStudentInfo] = useState<
    Record<string, { avatar?: string; grade?: string | number }>
  >({});

  useEffect(() => {
    const fetchStudentProfiles = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("name, avatar, grade")
          .eq("role", "student");
        if (data) {
          const map: Record<
            string,
            { avatar?: string; grade?: string | number }
          > = {};
          data.forEach((p: any) => {
            if (p.name) {
              map[p.name.trim().toLowerCase()] = {
                avatar: p.avatar || undefined,
                grade: p.grade || undefined,
              };
            }
          });
          setStudentInfo(map);
        }
      } catch (err) {
        console.error("Error fetching student profiles", err);
      }
    };
    fetchStudentProfiles();
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

      const info = studentInfo[s.key];
      const gStr = info?.grade ? String(info.grade) : "unassigned";
      if (filterGrade !== "all" && gStr !== filterGrade) {
        return false;
      }

      return true;
    });
  }, [summaries, filterName, filterStatus, filterGrade, studentInfo]);

  const groupedSummaries = React.useMemo(() => {
    const groups: Record<string, StudentSummary[]> = {};
    for (const s of filteredSummaries) {
      const info = studentInfo[s.key];
      const gradeKey = info?.grade ? String(info.grade) : "other";
      if (!groups[gradeKey]) {
        groups[gradeKey] = [];
      }
      groups[gradeKey].push(s);
    }
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "other") return 1;
      if (b === "other") return -1;
      return parseInt(a, 10) - parseInt(b, 10);
    });
    return sortedKeys.map((key) => ({
      gradeKey: key,
      items: groups[key],
    }));
  }, [filteredSummaries, studentInfo]);

  const avatarColors = [
    "bg-[#E3F2FD] text-[#1E88E5] border-[#90CAF9]",
    "bg-[#F3E5F5] text-[#8E24AA] border-[#CE93D8]",
    "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]",
    "bg-[#FFF3E0] text-[#E65100] border-[#FFCC80]",
    "bg-[#FCE4EC] text-[#C62828] border-[#F48FB1]",
    "bg-[#E0F7FA] text-[#00838F] border-[#80DEEA]",
  ];

  const totalSubmissions = React.useMemo(() => {
    return summaries.reduce((acc, curr) => acc + (curr.count || 0), 0);
  }, [summaries]);

  const ungradedCount = React.useMemo(() => {
    return summaries.filter((s) => s.hasUngraded).length;
  }, [summaries]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shadow-xs shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base sm:text-lg">
              {t.recordings.title}
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5 flex items-center gap-2 flex-wrap">
              <span>
                {summaries.length} {t.recordings.students}
              </span>
              <span>·</span>
              <span>
                {totalSubmissions} {t.recordings.lessons}
              </span>
              {ungradedCount > 0 && (
                <>
                  <span>·</span>
                  <span className="text-rose-500 font-black flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    {ungradedCount} {t.recordings.filterUngraded.toLowerCase()}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
              showFilters ||
              filterName ||
              filterStatus !== "all" ||
              filterGrade !== "all"
                ? "bg-blue-50 text-blue-600 border-blue-200 shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800 shadow-xs"
            }`}
          >
            <Filter size={15} /> {t.recordings.filter}
            {(filterName ||
              filterStatus !== "all" ||
              filterGrade !== "all") && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </button>
        </div>
      </div>

      {/* Filter drawer */}
      {showFilters && (
        <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              {t.recordings.filterName}
            </label>
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder={t.recordings.searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-xs"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              {t.recordings.filterGrade}
            </label>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-xs"
            >
              <option value="all">{t.recordings.filterAllGrades}</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={String(g)}>
                  {interpolate(t.common.gradeLabel, { grade: g })}
                </option>
              ))}
              <option value="unassigned">{t.recordings.unassignedGrade}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              {t.recordings.filterStatus}
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-xs"
            >
              <option value="all">{t.recordings.filterAll}</option>
              <option value="ungraded">{t.recordings.filterUngraded}</option>
              <option value="graded">{t.recordings.filterGraded}</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-400 font-bold flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-blue-500" />
          <p className="text-xs font-extrabold">{t.recordings.loading}</p>
        </div>
      ) : filteredSummaries.length === 0 ? (
        <div className="p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Mic size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-extrabold text-sm">
            {t.recordings.empty}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100/80">
          {groupedSummaries.map((group) => {
            const isOther = group.gradeKey === "other";
            const groupTitle = isOther
              ? t.recordings.unassignedGrade
              : interpolate(t.common.gradeLabel, { grade: group.gradeKey });

            return (
              <div key={group.gradeKey} className="bg-white">
                <div className="bg-slate-50/90 px-5 py-2.5 flex items-center justify-between border-y border-slate-200/70 sticky top-0 z-10 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={16} className="text-emerald-600" />
                    <span className="font-black text-xs text-slate-700 uppercase tracking-wide">
                      {groupTitle}
                    </span>
                  </div>
                  <span className="bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/80 text-[11px] font-black text-slate-600 shadow-xs">
                    {group.items.length} {t.recordings.students}
                  </span>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {group.items.map((s, idx) => {
                    const info = studentInfo[s.key];
                    const avatar = info?.avatar;
                    const grade = info?.grade;
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
                        className="group relative flex items-center gap-3.5 p-4 bg-slate-50/60 hover:bg-white rounded-xl border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <span
                          className={`w-11 h-11 rounded-xl border-2 font-black flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform ${
                            avatar
                              ? "bg-amber-50 text-2xl shadow-xs border-amber-200"
                              : `text-sm ${colorClass}`
                          }`}
                        >
                          {avatar || initials}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-black text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                              {s.studentName}
                            </p>
                            {grade && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded-md font-black shrink-0 border border-emerald-200/80">
                                {interpolate(t.common.gradeLabel, {
                                  grade,
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-bold mt-1 truncate">
                            {t.recordings.latest} {latestDate}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className="flex items-center gap-1.5">
                            {s.hasUngraded && (
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-100 animate-pulse" />
                            )}
                            <span className="px-2.5 py-1 bg-blue-50 text-[#1E88E5] text-xs font-black rounded-lg border border-blue-200/80 group-hover:bg-[#1E88E5] group-hover:text-white transition-colors">
                              {s.count} {t.recordings.lessons}
                            </span>
                          </div>
                          <ChevronRight
                            size={16}
                            className="text-slate-300 group-hover:text-[#1E88E5] group-hover:translate-x-0.5 transition-all"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const RecordingsPanel = RecordingsManager;

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

  const [showVideo, setShowVideo] = useState(false);

  return (
    <div
      ref={itemRef}
      className={`bg-white rounded-xl border transition-all duration-200 p-3 sm:p-3.5 space-y-2 shadow-2xs hover:shadow-xs ${
        isHighlighted
          ? "border-emerald-400 ring-2 ring-emerald-300/40 bg-emerald-50/20"
          : "border-slate-200/80 hover:border-blue-300"
      }`}
    >
      {/* Line 1: Meta + Question + Timestamp & Delete */}
      <div className="flex items-center justify-between gap-2">
        {rec.shadowing_video_id ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
              🎬 Shadowing
            </span>
            <p
              className="text-xs font-black text-slate-800 truncate"
              title={rec.topic}
            >
              {rec.topic || "Bài Shadowing"}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {rec.topic_number != null && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-blue-50 border border-blue-200 text-[#1E88E5] font-black text-[11px] shrink-0">
                #{rec.topic_number}
              </span>
            )}
            {rec.topic && (
              <span className="text-[11px] font-black text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md shrink-0">
                {rec.topic}
              </span>
            )}
            {rec.question_text && rec.question_text !== rec.topic && (
              <p
                className="text-xs font-black text-slate-800 truncate"
                title={rec.question_text}
              >
                Q: {rec.question_text}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {rec.student_reaction === "heart" && (
            <span
              className="text-xs text-rose-500"
              title={t.recordings.heartReaction}
            >
              ❤️
            </span>
          )}
          <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">
            {formatDate(rec.created_at)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDeleteRequest(rec.id);
            }}
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            title={t.common.delete}
            aria-label={t.common.delete}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Line 2: Audio Player + Stars + Feedback input all in one row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-0.5">
        {/* Audio / Video player */}
        {rec.shadowing_video_id ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowVideo(!showVideo)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black transition-all shadow-2xs border ${
                showVideo
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-red-50 text-red-600 border-red-200/80 hover:bg-red-100"
              }`}
              title="Xem video YouTube mẫu"
            >
              <Play
                size={12}
                className={showVideo ? "fill-white" : "fill-red-600"}
              />
              <span>{showVideo ? "Đóng video" : "Video mẫu"}</span>
            </button>
            <div className="shrink-0 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 flex items-center">
              <AudioPlayer src={rec.audio_url} compact />
            </div>
          </div>
        ) : (
          <div className="shrink-0 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 flex items-center">
            <AudioPlayer src={rec.audio_url} compact />
          </div>
        )}

        {/* Rating Stars */}
        <div
          className="flex items-center gap-0.5 px-2 py-1 bg-amber-50/60 border border-amber-200/60 rounded-lg shrink-0"
          role="radiogroup"
          aria-label={t.recordings.feedback}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingClick(star)}
              role="radio"
              aria-checked={star === rating}
              aria-label={`${star} star`}
              className="transition-transform hover:scale-125 focus:outline-none p-0.5"
            >
              <Star
                size={14}
                className={
                  star <= rating
                    ? "text-amber-400 fill-amber-400"
                    : "text-slate-200 fill-slate-200"
                }
              />
            </button>
          ))}
        </div>

        {/* Feedback Input with inline indicator */}
        <div className="flex-1 relative flex items-center min-w-0">
          <input
            type="text"
            value={feedback}
            onChange={(e) => handleFeedbackChange(e.target.value)}
            onBlur={handleFeedbackBlur}
            placeholder={t.recordings.feedbackPlaceholder}
            className="w-full h-8 px-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-200 transition-all shadow-2xs pr-16"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-black">
            {saving && (
              <span className="text-blue-500 flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" />
              </span>
            )}
            {saveSuccess && (
              <span className="text-emerald-600 flex items-center gap-0.5 animate-in fade-in">
                <Check size={11} />
                <span className="hidden md:inline">Lưu</span>
              </span>
            )}
            {saveError && (
              <span className="text-rose-500" title={saveError}>
                <AlertCircle size={11} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expandable YouTube Video Preview */}
      {showVideo && rec.youtube_url && (
        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-start gap-3 animate-in fade-in duration-200">
          <div className="w-full sm:w-80 max-w-full aspect-video rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-black shrink-0">
            <YouTubePlayer url={rec.youtube_url} className="w-full h-full" />
          </div>
          <div className="text-xs text-slate-500 font-bold space-y-1 py-1">
            <p className="font-black text-slate-700">🎬 {rec.topic}</p>
            <p className="text-[11px] text-slate-400 font-medium">
              Bấm "Đóng video" để thu gọn danh sách.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
