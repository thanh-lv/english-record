import {
  Play,
  Video,
  Sparkles,
  Search,
  X,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { useLanguage, interpolate } from "../../../i18n/LanguageContext";
import { supabase } from "../../../lib/supabase";

interface ShadowingTabProps {
  onVideoClick: (video: any) => void;
  studentGrade?: number | string | null;
  myRecordings?: any[];
}

export function ShadowingTab({
  onVideoClick,
  studentGrade,
  myRecordings,
}: ShadowingTabProps) {
  const { t } = useLanguage();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const parsedStudentGrade = studentGrade ? Number(studentGrade) : null;
  const [filterMode, setFilterMode] = useState<string>(
    parsedStudentGrade ? "myGrade" : "all",
  );

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const { data, error } = await supabase
          .from("shadowing_videos")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setVideos(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const extractYoutubeId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const isVideoForGrade = (video: any, grade: number) => {
    if (
      !video.grades ||
      !Array.isArray(video.grades) ||
      video.grades.length === 0
    ) {
      return true;
    }
    return video.grades.includes(grade);
  };

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      // Grade filter mode
      if (filterMode === "myGrade" && parsedStudentGrade) {
        if (!isVideoForGrade(video, parsedStudentGrade)) return false;
      } else if (filterMode !== "all") {
        const specificGrade = Number(filterMode);
        if (!isNaN(specificGrade) && !isVideoForGrade(video, specificGrade)) {
          return false;
        }
      }

      // Search text filter
      if (!filterText.trim()) return true;
      const q = filterText.toLowerCase().trim();
      return video.title?.toLowerCase().includes(q);
    });
  }, [videos, filterMode, parsedStudentGrade, filterText]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white/80 backdrop-blur-md rounded-3xl border border-white/80 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <div className="w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
        <p className="text-xs font-bold text-slate-400">Đang tải danh sách video...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white/95 via-indigo-50/40 to-purple-50/40 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-white/80 shadow-sm">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-gradient-to-br from-indigo-400/10 to-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                <Video size={20} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                {t.shadowing.title}
              </h2>
              {parsedStudentGrade && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs">
                  {interpolate(t.common?.gradeLabel || "Lớp {grade}", {
                    grade: parsedStudentGrade,
                  })}
                </span>
              )}
            </div>
            <p className="text-slate-500 font-semibold text-xs sm:text-sm max-w-xl">
              {t.shadowing.subtitle}
            </p>
          </div>

          {/* Video count badge */}
          <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3 self-start md:self-auto">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
              🎬
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng số video</p>
              <p className="text-sm font-black text-slate-800">{filteredVideos.length} bài luyện</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-5 pt-4 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3">
          {/* Grade Filter Tabs */}
          {parsedStudentGrade && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setFilterMode("myGrade")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  filterMode === "myGrade"
                    ? "bg-white text-indigo-600 shadow-2xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Sparkles size={13} className={filterMode === "myGrade" ? "text-indigo-600" : "text-slate-400"} />
                {interpolate(t.shadowing.myGradeOnly, {
                  grade: parsedStudentGrade,
                })}
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  filterMode === "all"
                    ? "bg-white text-indigo-600 shadow-2xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.shadowing.allVideos} ({videos.length})
              </button>
            </div>
          )}

          {/* Search box */}
          <div className="relative min-w-[200px] flex-1 sm:flex-none">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Tìm video luyện nói..."
              className="w-full sm:w-56 pl-9 pr-8 py-2 bg-white rounded-xl border border-slate-200/80 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-500 transition-all shadow-2xs"
            />
            {filterText && (
              <button
                type="button"
                onClick={() => setFilterText("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
        <div className="py-16 text-center bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200 p-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto text-2xl text-indigo-500">
            <Video size={28} />
          </div>
          <p className="font-black text-slate-700 text-base">
            {t.shadowing.empty}
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
            Hãy thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc &quot;Tất cả bài học&quot; nhé!
          </p>
          {(filterText || filterMode !== "all") && (
            <button
              type="button"
              onClick={() => {
                setFilterText("");
                setFilterMode("all");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all active:scale-95 shadow-sm"
            >
              <RotateCcw size={13} /> Xem tất cả video
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filteredVideos.map((video) => {
            const ytId = extractYoutubeId(video.youtube_url);
            const thumb = ytId
              ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
              : "";

            return (
              <button
                key={video.id}
                type="button"
                onClick={() => onVideoClick(video)}
                className="group relative bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-300 hover:-translate-y-1.5 transition-all duration-300 text-left flex flex-col cursor-pointer active:scale-95"
              >
                {/* Thumbnail 16:9 container */}
                <div className="aspect-video bg-slate-900 relative overflow-hidden">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-950 text-indigo-300">
                      <Video size={40} />
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/95 text-indigo-600 shadow-md flex items-center justify-center transform group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      <Play className="ml-0.5" size={20} fill="currentColor" />
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      {Array.isArray(video.grades) && video.grades.length > 0 ? (
                        <span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-lg border border-indigo-200/60">
                          {interpolate(t.shadowing.forGrades, {
                            grades: video.grades
                              .slice()
                              .sort((a: number, b: number) => a - b)
                              .join(", "),
                          })}
                        </span>
                      ) : (
                        <span className="inline-block bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-lg border border-emerald-200/60">
                          {t.shadowing.forAllGrades}
                        </span>
                      )}

                      {myRecordings?.some(
                        (rec: any) => rec.shadowing_video_id === video.id,
                      ) && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-lg border border-emerald-200/60 shadow-2xs">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          {t.shadowing.completedBadge || "Đã thu âm"}
                        </span>
                      )}
                    </div>

                    <h4 className="font-black text-slate-800 text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {video.title}
                    </h4>
                  </div>

                  {/* Card footer CTA */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
                    <span>
                      {myRecordings?.some(
                        (rec: any) => rec.shadowing_video_id === video.id,
                      )
                        ? "Xem lại & Luyện tập"
                        : "Luyện tập ngay"}
                    </span>
                    <ArrowRight size={13} className="transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

