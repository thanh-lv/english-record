import { Play, Video, Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLanguage, interpolate } from "../../../i18n/LanguageContext";
import { supabase } from "../../../lib/supabase";

interface ShadowingTabProps {
  onVideoClick: (video: any) => void;
  studentGrade?: number | string | null;
}

export function ShadowingTab({
  onVideoClick,
  studentGrade,
}: ShadowingTabProps) {
  const { t } = useLanguage();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-lg animate-spin" />
      </div>
    );
  }

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

  const filteredVideos = videos.filter((video) => {
    if (filterMode === "all") return true;
    if (filterMode === "myGrade" && parsedStudentGrade) {
      return isVideoForGrade(video, parsedStudentGrade);
    }
    const specificGrade = Number(filterMode);
    if (!isNaN(specificGrade)) {
      return isVideoForGrade(video, specificGrade);
    }
    return true;
  });

  return (
    <div className="sm:bg-white/70 sm:backdrop-blur-sm sm:p-6 rounded-lg border-3 sm:border-white sm:shadow-md">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Video className="text-indigo-500" /> {t.shadowing.title}
          </h3>
          <p className="text-slate-500 font-bold text-sm">
            {t.shadowing.subtitle}
          </p>
        </div>

        {/* Grade Filter Tabs */}
        {parsedStudentGrade && (
          <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setFilterMode("myGrade")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                filterMode === "myGrade"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles size={14} className="text-indigo-500" />
              {interpolate(t.shadowing.myGradeOnly, {
                grade: parsedStudentGrade,
              })}
            </button>
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                filterMode === "all"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.shadowing.allVideos}
            </button>
          </div>
        )}
      </div>

      {filteredVideos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-slate-200">
          <Video className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500 font-bold">{t.shadowing.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6">
          {filteredVideos.map((video) => {
            const ytId = extractYoutubeId(video.youtube_url);
            const thumb = ytId
              ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
              : "";

            return (
              <button
                key={video.id}
                onClick={() => onVideoClick(video)}
                className="group relative bg-white rounded-lg border-3 border-slate-100 overflow-hidden shadow-md hover:shadow-md hover:-translate-y-2 hover:border-indigo-200 transition-all text-left flex flex-col"
              >
                <div className="aspect-video bg-slate-100 relative overflow-hidden">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-300">
                      <Video size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-lg bg-white/90 shadow-md flex items-center justify-center text-indigo-600 opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300">
                      <Play className="ml-1" size={24} />
                    </div>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {Array.isArray(video.grades) && video.grades.length > 0 ? (
                      <span className="inline-block bg-indigo-50 text-indigo-700 text-[11px] font-black px-2 py-0.5 rounded-md border border-indigo-100 mb-1.5">
                        {interpolate(t.shadowing.forGrades, {
                          grades: video.grades
                            .slice()
                            .sort((a: number, b: number) => a - b)
                            .join(", "),
                        })}
                      </span>
                    ) : (
                      <span className="inline-block bg-emerald-50 text-emerald-700 text-[11px] font-black px-2 py-0.5 rounded-md border border-emerald-100 mb-1.5">
                        {t.shadowing.forAllGrades}
                      </span>
                    )}
                    <h4 className="font-extrabold text-slate-800 text-sm line-clamp-2">
                      {video.title}
                    </h4>
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
