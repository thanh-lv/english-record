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
import { useLanguage } from "../../../i18n/LanguageContext";
import { supabase } from "../../../lib/supabase";

export function ShadowingManager() {
  const { t } = useLanguage();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [previewStart, setPreviewStart] = useState("");
  const [previewEnd, setPreviewEnd] = useState("");
  const [recordStart, setRecordStart] = useState("");
  const [recordEnd, setRecordEnd] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetchVideos();
  }, []);

  const formatTime = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || seconds === "") return "";
    const m = Math.floor(Number(seconds) / 60);
    const s = Math.floor(Number(seconds) % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const parseTime = (timeStr: string): number | null => {
    if (!timeStr || !timeStr.trim()) return null;
    if (!timeStr.includes(":")) {
      const val = Number(timeStr);
      return isNaN(val) ? null : val;
    }
    const parts = timeStr.split(":");
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return m * 60 + s;
  };

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
      const parsedPreviewStart = parseTime(previewStart);
      const parsedPreviewEnd = parseTime(previewEnd);
      const parsedRecordStart = parseTime(recordStart);
      const parsedRecordEnd = parseTime(recordEnd);

      if (editingVideo) {
        const { data, error } = await supabase
          .from("shadowing_videos")
          .update({
            title: trimTitle,
            youtube_url: trimUrl,
            preview_start: parsedPreviewStart,
            preview_end: parsedPreviewEnd,
            record_start: parsedRecordStart,
            record_end: parsedRecordEnd,
          })
          .eq("id", editingVideo.id)
          .select()
          .single();

        if (error) throw error;
        setVideos(videos.map((v) => (v.id === editingVideo.id ? data : v)));
      } else {
        const { data, error } = await supabase
          .from("shadowing_videos")
          .insert({
            title: trimTitle,
            youtube_url: trimUrl,
            preview_start: parsedPreviewStart,
            preview_end: parsedPreviewEnd,
            record_start: parsedRecordStart,
            record_end: parsedRecordEnd,
          })
          .select()
          .single();

        if (error) throw error;
        setVideos([data, ...videos]);
      }

      setShowCreate(false);
      setEditingVideo(null);
      setTitle("");
      setYoutubeUrl("");
      setPreviewStart("");
      setPreviewEnd("");
      setRecordStart("");
      setRecordEnd("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (video: any) => {
    setEditingVideo(video);
    setTitle(video.title);
    setYoutubeUrl(video.youtube_url);
    setPreviewStart(formatTime(video.preview_start));
    setPreviewEnd(formatTime(video.preview_end));
    setRecordStart(formatTime(video.record_start));
    setRecordEnd(formatTime(video.record_end));
    setShowCreate(true);
    setError("");
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
            setEditingVideo(null);
            setTitle("");
            setYoutubeUrl("");
            setPreviewStart("");
            setPreviewEnd("");
            setRecordStart("");
            setRecordEnd("");
            setShowCreate(true);
            setError("");
          }}
          className="bg-[#1E88E5] hover:bg-[#1565C0] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md text-sm"
        >
          <Plus size={16} /> {t.teacherModal.addVideoTitle}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {videos.map((video) => {
          const ytId = extractYoutubeId(video.youtube_url);
          const thumb = ytId
            ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
            : "";

          return (
            <div
              key={video.id}
              className="bg-white rounded-lg border-2 border-slate-100 overflow-hidden shadow-md flex flex-col"
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
                    <span className="text-white text-xs font-black bg-slate-800/70 px-2 py-1 rounded-lg">
                      {t.teacherModal.filterStoryStatusHidden}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 flex flex-col flex-1">
                <h4 className="font-extrabold text-slate-800 text-sm line-clamp-2 mb-2">
                  {video.title}
                </h4>
                <div className="flex-1 text-xs font-bold text-slate-500 mb-2 space-y-1">
                  <p>
                    Preview: {formatTime(video.preview_start) || "00:00"} -{" "}
                    {formatTime(video.preview_end) || "Hết"}
                  </p>
                  <p>
                    Record: {formatTime(video.record_start) || "00:00"} -{" "}
                    {formatTime(video.record_end) || "Hết"}
                  </p>
                </div>
                <div className="mt-auto flex gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                  <button
                    onClick={() => handleEdit(video)}
                    className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1 min-w-[60px]"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => setDeleteTarget(video)}
                    className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1 min-w-[60px]"
                  >
                    <Trash2 size={12} /> Xóa
                  </button>
                  <button
                    onClick={() =>
                      toggleActive(video.id, video.is_active ?? true)
                    }
                    className={`w-full mt-1 py-1.5 rounded-lg text-xs font-black transition-colors ${
                      (video.is_active ?? true)
                        ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {(video.is_active ?? true)
                      ? t.teacherModal.filterStoryStatusHidden
                      : t.teacherModal.filterStoryStatusActive}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {videos.length === 0 && (
          <div className="col-span-full py-10 text-center text-slate-400 font-bold bg-white rounded-lg border-2 border-dashed border-slate-200">
            {t.shadowing.empty}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md shadow-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <Youtube className="text-rose-600" />{" "}
                {editingVideo ? "Sửa Video" : t.teacherModal.addVideoTitle}
              </h4>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
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
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-rose-400 focus:outline-none"
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
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-rose-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    Preview Start (mm:ss)
                  </label>
                  <input
                    type="text"
                    placeholder="00:00"
                    value={previewStart}
                    onChange={(e) => setPreviewStart(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-rose-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    Preview End (mm:ss)
                  </label>
                  <input
                    type="text"
                    placeholder="00:00"
                    value={previewEnd}
                    onChange={(e) => setPreviewEnd(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-rose-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    Record Start (mm:ss)
                  </label>
                  <input
                    type="text"
                    placeholder="00:00"
                    value={recordStart}
                    onChange={(e) => setRecordStart(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-rose-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    Record End (mm:ss)
                  </label>
                  <input
                    type="text"
                    placeholder="00:00"
                    value={recordEnd}
                    onChange={(e) => setRecordEnd(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-rose-400 focus:outline-none"
                  />
                </div>
              </div>
              {error && (
                <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-md flex items-center gap-1.5"
              >
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-sm shadow-md p-6 space-y-4 text-center">
            <Trash2 size={36} className="mx-auto text-rose-500" />
            <h4 className="font-extrabold text-slate-800 text-base">
              {(t as any).common?.deleteVideoConfirm || "Xác nhận xóa video"}?
            </h4>
            <p className="text-xs font-bold text-slate-500 line-clamp-2">
              "{deleteTarget.title}"
            </p>
            {deleteError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded">
                {deleteError}
              </p>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteSaving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-md flex items-center gap-1.5"
              >
                {deleteSaving && <Loader2 size={14} className="animate-spin" />}
                {t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ShadowingManager;
