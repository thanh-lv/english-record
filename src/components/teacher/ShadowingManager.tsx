import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
  Youtube,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";

export function ShadowingManager() {
  const { t } = useLanguage();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("shadowing_videos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setVideos(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const extractYoutubeId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleSave = async () => {
    const trimTitle = title.trim();
    const trimUrl = youtubeUrl.trim();
    if (trimTitle.length < 2) {
      setError(t.teacherModal.videoTitleRequired);
      return;
    }
    const ytId = extractYoutubeId(trimUrl);
    if (!ytId) {
      setError(t.teacherModal.videoUrlRequired);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("shadowing_videos")
        .insert({
          title: trimTitle,
          youtube_url: trimUrl,
        })
        .select()
        .single();

      if (error) throw error;
      setVideos([data, ...videos]);
      setShowCreate(false);
      setTitle("");
      setYoutubeUrl("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (id: string, currentValue: boolean) => {
    await supabase
      .from("shadowing_videos")
      .update({ is_active: !currentValue })
      .eq("id", id);
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, is_active: !currentValue } : v)),
    );
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    setDeleteError("");
    try {
      const { error } = await supabase
        .from("shadowing_videos")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      setVideos(videos.filter((v) => v.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin mx-auto text-slate-400" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Youtube className="text-rose-600" /> {t.teacherModal.manageShadowing}
        </h3>
        <button
          onClick={() => {
            setShowCreate(true);
            setError("");
          }}
          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md text-sm"
        >
          <Plus size={16} /> {t.teacherModal.addVideoTitle}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {videos.map((video) => {
          const ytId = extractYoutubeId(video.youtube_url);
          const thumb = ytId
            ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
            : "";

          return (
            <div
              key={video.id}
              className="bg-white rounded-[1.5rem] border-2 border-slate-100 overflow-hidden shadow-sm flex flex-col"
            >
              <div className="aspect-video bg-slate-100 relative">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Youtube size={48} />
                  </div>
                )}
                {!(video.is_active ?? true) && (
                  <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                    <span className="text-white text-xs font-black bg-slate-800/70 px-2 py-1 rounded-full">
                      {t.teacherModal.filterStoryStatusHidden}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 flex flex-col flex-1">
                <h4 className="font-extrabold text-slate-800 text-sm line-clamp-2 mb-2">
                  {video.title}
                </h4>
                <div className="mt-auto flex gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setDeleteTarget(video)}
                    className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1"
                  >
                    <Trash2 size={12} /> {t.common.delete}
                  </button>
                  <button
                    onClick={() =>
                      toggleActive(video.id, video.is_active ?? true)
                    }
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-colors ${
                      (video.is_active ?? true)
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {(video.is_active ?? true)
                      ? t.teacherModal.filterStoryStatusActive
                      : t.teacherModal.filterStoryStatusHidden}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {videos.length === 0 && (
          <div className="col-span-full py-10 text-center text-slate-400 font-bold bg-white rounded-[1.5rem] border-2 border-dashed border-slate-200">
            {t.shadowing.empty}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <Youtube className="text-rose-600" />{" "}
                {t.teacherModal.addVideoTitle}
              </h4>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {t.teacherModal.videoTitle}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-rose-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {t.teacherModal.videoUrl}
                </label>
                <input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder={t.teacherModal.videoUrlPlaceholder}
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-rose-400 focus:outline-none"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-rose-100 p-6 space-y-5">
            <h4 className="font-extrabold text-slate-800 text-lg">
              {t.teacherModal.videoConfirmDelete}
            </h4>
            <p className="text-sm text-slate-600 font-medium">
              {t.teacherModal.deleteVideoWarning}
            </p>
            {deleteError && (
              <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                <AlertCircle size={14} /> {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteSaving}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-full text-sm disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {deleteSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
