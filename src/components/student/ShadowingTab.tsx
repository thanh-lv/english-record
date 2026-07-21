import { Play, Video } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";
import { OfflineBanner } from "../common/OfflineBanner";

interface ShadowingTabProps {
  onVideoClick: (video: any) => void;
}

export function ShadowingTab({ onVideoClick }: ShadowingTabProps) {
  const { t } = useLanguage();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-[2rem] border-3 border-white shadow-md">
      <div className="mb-6 space-y-1">
        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Video className="text-indigo-500" /> {t.shadowing.title}
        </h3>
        <p className="text-slate-500 font-bold text-sm">
          {t.shadowing.subtitle}
        </p>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <Video className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500 font-bold">{t.shadowing.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {videos.map((video) => {
            const ytId = extractYoutubeId(video.youtube_url);
            const thumb = ytId
              ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
              : "";

            return (
              <button
                key={video.id}
                onClick={() => onVideoClick(video)}
                className="group relative bg-white rounded-[1.5rem] border-3 border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-2 hover:border-indigo-200 transition-all text-left flex flex-col"
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
                    <div className="w-12 h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-indigo-600 opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300">
                      <Play className="ml-1" size={24} />
                    </div>
                  </div>
                </div>
                <div className="p-4 flex-1">
                  <h4 className="font-extrabold text-slate-800 text-sm line-clamp-2">
                    {video.title}
                  </h4>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
