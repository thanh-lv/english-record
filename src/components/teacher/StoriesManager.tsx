import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Pencil,
  Save,
  Search,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { useEscapeToClose } from "../../hooks/useEscapeToClose";
import { S3_BUCKET, s3Client } from "../../lib/s3";
import { supabase } from "../../lib/supabase";

export function StoriesManager() {
  const { t } = useLanguage();
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "hidden">(
    "all",
  );
  const [showCreate, setShowCreate] = useState(false);
  const [editingStory, setEditingStory] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editEmoji, setEditEmoji] = useState("");

  const [deleteStoryTarget, setDeleteStoryTarget] = useState<any>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Manual write
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [manualEmoji, setManualEmoji] = useState("📚");
  const [manualType, setManualType] = useState("Truyện tranh");
  const [manualYearBorn, setManualYearBorn] = useState("2015");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState("");

  const [title, setTitle] = useState("");
  const [yearBorn, setYearBorn] = useState("2015");
  const [type, setType] = useState("Truyện tranh");
  const [emoji, setEmoji] = useState("📚");
  const [prompt, setPrompt] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedStory, setGeneratedStory] = useState("");
  const [generatedImageBlob, setGeneratedImageBlob] = useState<Blob | null>(
    null,
  );
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEscapeToClose(() => setEditingStory(null), !!editingStory);
  useEscapeToClose(() => setDeleteStoryTarget(null), !!deleteStoryTarget);
  useEscapeToClose(() => setShowManual(false), showManual);
  useEscapeToClose(() => setShowCreate(false), showCreate);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from("stories")
        .select(
          "id, title, type, emoji, image_url, content, age_group, created_at, is_active",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      setStories(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return setError(t.common.promptRequired);
    const aiApiKey = import.meta.env.VITE_AI_API_KEY;
    if (!aiApiKey) return setError("Thiếu VITE_AI_API_KEY trong file .env");

    setIsGenerating(true);
    setError("");
    setGeneratedStory("");
    setGeneratedImageBlob(null);
    setGeneratedImageUrl("");

    try {
      // 1. Generate text
      const age = parseInt(yearBorn)
        ? new Date().getFullYear() - parseInt(yearBorn)
        : 5;
      const textPrompt = `You are a friendly storyteller for children. Write a short, simple, and engaging English story based on the prompt: ${prompt}. Keep it under 150 words. The story is for a ${age}-year-old child, so use appropriate simple vocabulary and short sentences. Return only the story text.`;

      const textRes = await fetch(
        "https://free-image-generation-api.levanthanh29111999.workers.dev/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${aiApiKey}`,
          },
          body: JSON.stringify({ prompt: textPrompt, type: "text" }),
        },
      );
      if (!textRes.ok)
        throw new Error("Lỗi khi tạo chữ. Kiểm tra lại API Key.");
      const textData = await textRes.json();
      setGeneratedStory(textData.story);

      // 2. Generate image
      const imgRes = await fetch(
        "https://free-image-generation-api.levanthanh29111999.workers.dev/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${aiApiKey}`,
          },
          body: JSON.stringify({ prompt, type: "image" }),
        },
      );
      if (!imgRes.ok) throw new Error("Lỗi khi tạo ảnh.");
      const imgBlob = await imgRes.blob();
      setGeneratedImageBlob(imgBlob);
      setGeneratedImageUrl(URL.createObjectURL(imgBlob));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!title || !generatedStory || !generatedImageBlob)
      return setError(t.common.storyRequired);
    setIsSaving(true);
    setError("");
    try {
      const ext = generatedImageBlob.type.split("/")[1] || "jpg";
      const fileName = `${yearBorn}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: fileName,
          Body: new Uint8Array(await generatedImageBlob.arrayBuffer()),
          ContentType: generatedImageBlob.type,
        }),
      );

      const publicBaseUrl = import.meta.env.VITE_R2_PUBLIC_URL;
      let imageUrl = "";
      if (publicBaseUrl) {
        imageUrl = `${publicBaseUrl.replace(/\/$/, "")}/${fileName}`;
      } else {
        const endpoint = import.meta.env.VITE_S3_ENDPOINT || "";
        imageUrl = endpoint.includes(S3_BUCKET)
          ? `${endpoint}/${fileName}`
          : `${endpoint}/${S3_BUCKET}/${fileName}`;
      }

      const ageGroup =
        parseInt(yearBorn) >= new Date().getFullYear() - 5
          ? "kindergarten"
          : "primary";

      const { data, error } = await supabase
        .from("stories")
        .insert({
          title,
          age_group: ageGroup,
          type,
          emoji,
          content: generatedStory,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) throw error;
      setStories([data, ...stories]);
      setShowCreate(false);
      setTitle("");
      setPrompt("");
      setGeneratedStory("");
      setGeneratedImageUrl("");
      setGeneratedImageBlob(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (!manualTitle.trim() || !manualContent.trim()) {
      setManualError("Please enter both title and content.");
      return;
    }
    setManualSaving(true);
    setManualError("");
    try {
      const ageGroup =
        parseInt(manualYearBorn) >= new Date().getFullYear() - 5
          ? "kindergarten"
          : "primary";
      const { data, error } = await supabase
        .from("stories")
        .insert({
          title: manualTitle,
          age_group: ageGroup,
          type: manualType,
          emoji: manualEmoji,
          content: manualContent,
          image_url: null,
        })
        .select()
        .single();
      if (error) throw error;
      setStories([data, ...stories]);
      setShowManual(false);
      setManualTitle("");
      setManualContent("");
      setManualEmoji("📚");
      setManualType("Truyện tranh");
    } catch (err: any) {
      setManualError(err.message);
    } finally {
      setManualSaving(false);
    }
  };

  const toggleStoryActive = async (storyId: string, currentValue: boolean) => {
    await supabase
      .from("stories")
      .update({ is_active: !currentValue })
      .eq("id", storyId);
    setStories((prev) =>
      prev.map((s) =>
        s.id === storyId ? { ...s, is_active: !currentValue } : s,
      ),
    );
  };

  const openEditStory = (story: any) => {
    setEditingStory(story);
    setEditTitle(story.title);
    setEditContent(story.content);
    setEditEmoji(story.emoji);
  };

  const handleUpdateStory = async () => {
    try {
      const { data, error } = await supabase
        .from("stories")
        .update({ title: editTitle, content: editContent, emoji: editEmoji })
        .eq("id", editingStory.id)
        .select()
        .single();
      if (error) throw error;
      setStories(stories.map((s) => (s.id === data.id ? data : s)));
      setEditingStory(null);
    } catch (err: any) {
      alert("Lỗi sửa truyện: " + err.message);
    }
  };

  const handleDeleteStory = (story: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteStoryTarget(story);
    setDeleteError("");
  };

  const confirmDeleteStory = async () => {
    if (!deleteStoryTarget) return;
    setDeleteSaving(true);
    setDeleteError("");
    try {
      const { error } = await supabase
        .from("stories")
        .delete()
        .eq("id", deleteStoryTarget.id);
      if (error) throw error;
      setStories(stories.filter((s) => s.id !== deleteStoryTarget.id));
      setDeleteStoryTarget(null);
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteSaving(false);
    }
  };

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      if (
        filterText &&
        !story.title.toLowerCase().includes(filterText.toLowerCase())
      ) {
        return false;
      }
      const isActive = story.is_active ?? true;
      if (filterStatus === "active" && !isActive) return false;
      if (filterStatus === "hidden" && isActive) return false;
      return true;
    });
  }, [stories, filterText, filterStatus]);

  if (loading)
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin mx-auto text-slate-400" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-800">
          {t.common.manageStories}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowManual(true);
              setManualError("");
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md text-sm"
          >
            <Pencil size={16} /> Write
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md text-sm"
          >
            <Wand2 size={16} /> AI
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={t.teacherModal.filterStoryPlaceholder}
            className="w-full pl-8 pr-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-400"
        >
          <option value="all">{t.teacherModal.filterStoryStatusAll}</option>
          <option value="active">
            {t.teacherModal.filterStoryStatusActive}
          </option>
          <option value="hidden">
            {t.teacherModal.filterStoryStatusHidden}
          </option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
        {filteredStories.map((story) => (
          <div
            key={story.id}
            className="bg-white rounded-[1.5rem] border-2 border-slate-100 overflow-hidden shadow-sm flex flex-col"
          >
            <div className="aspect-square sm:aspect-video bg-slate-100 relative">
              {story.image_url ? (
                <img
                  src={story.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  {story.emoji}
                </div>
              )}
              {!(story.is_active ?? true) && (
                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center rounded-t-[1.5rem]">
                  <span className="text-white text-xs font-black bg-slate-800/70 px-2 py-1 rounded-full">
                    Hidden
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 flex flex-col flex-1">
              <h4 className="font-extrabold text-slate-800 text-sm line-clamp-1 mb-0.5">
                {story.title}
              </h4>
              <p className="text-xs font-bold text-purple-600 mb-2 line-clamp-1">
                {story.type}
              </p>
              <div className="mt-auto flex gap-1.5 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openEditStory(story)}
                  className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1"
                >
                  <Pencil size={12} /> {t.common.edit}
                </button>
                <button
                  onClick={(e) => handleDeleteStory(story, e)}
                  className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1"
                >
                  <Trash2 size={12} /> {t.common.delete}
                </button>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStoryActive(story.id, story.is_active ?? true);
                }}
                className={`w-full mt-1 py-1 rounded-lg text-[10px] font-black transition-colors ${
                  (story.is_active ?? true)
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {(story.is_active ?? true) ? "✓ Active" : "✕ Hidden"}
              </button>
            </div>
          </div>
        ))}
        {filteredStories.length === 0 && (
          <div className="col-span-full py-10 text-center text-slate-400 font-bold bg-white rounded-[1.5rem] border-2 border-dashed border-slate-200">
            {stories.length === 0
              ? t.common.storyEmpty
              : t.teacherModal.noStoriesFound}
          </div>
        )}
      </div>

      {editingStory && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-story-title"
        >
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl border-4 border-amber-100 p-6 space-y-5 my-8">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
              <h4
                id="edit-story-title"
                className="font-black text-xl text-slate-800 flex items-center gap-2"
              >
                <Pencil className="text-amber-500" /> {t.common.editStoryInfo}
              </h4>
              <button
                onClick={() => setEditingStory(null)}
                aria-label={t.common.close}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {t.common.storyTitle}
                  </label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {t.common.storyEmoji}
                  </label>
                  <input
                    value={editEmoji}
                    onChange={(e) => setEditEmoji(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {t.common.storyContent}
                </label>
                <textarea
                  rows={10}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t-2 border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setEditingStory(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleUpdateStory}
                disabled={!editTitle || !editContent}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle size={18} /> {t.common.saveChanges}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteStoryTarget && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-story-title"
        >
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-rose-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4
                  id="delete-story-title"
                  className="font-extrabold text-slate-800 text-lg leading-tight"
                >
                  {t.common.deleteStoryConfirm}
                </h4>
                <p className="text-sm text-slate-600 font-bold mt-0.5 line-clamp-1">
                  {deleteStoryTarget.title}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-500 font-medium">
              {t.teacherModal.deleteStoryWarning}
            </p>

            {deleteError && (
              <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                <AlertCircle size={14} className="shrink-0" />
                {deleteError}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeleteStoryTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={confirmDeleteStory}
                disabled={deleteSaving}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-full text-sm transition-colors shadow-md border-b-4 border-rose-900 flex items-center justify-center gap-2"
              >
                {deleteSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                {t.common.storyConfirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Write Modal */}
      {showManual && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-story-title"
        >
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl border-4 border-emerald-100 p-5 space-y-4 my-4">
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
              <h4
                id="manual-story-title"
                className="font-black text-lg text-slate-800 flex items-center gap-2"
              >
                <Pencil className="text-emerald-500" size={20} /> Write a Story
              </h4>
              <button
                onClick={() => setShowManual(false)}
                aria-label={t.common.close}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {t.common.storyTitle}
                </label>
                <input
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {t.common.storyYearBorn}
                </label>
                <input
                  type="number"
                  value={manualYearBorn}
                  onChange={(e) => setManualYearBorn(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {t.common.storyGenre}
                </label>
                <input
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value)}
                  placeholder={t.common.storyGenrePlaceholder}
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {t.common.storyEmoji}
                </label>
                <input
                  value={manualEmoji}
                  onChange={(e) => setManualEmoji(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                {t.common.storyContent}
              </label>
              <textarea
                rows={8}
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="Write the story content in English..."
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-400 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {manualError && (
              <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                <AlertCircle size={14} /> {manualError}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowManual(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleManualSave}
                disabled={manualSaving}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-full text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {manualSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-story-title"
        >
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl border-4 border-purple-100 p-4 sm:p-6 space-y-4 my-4 sm:my-8">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
              <h4
                id="ai-story-title"
                className="font-black text-xl text-slate-800 flex items-center gap-2"
              >
                <Wand2 className="text-purple-500" /> {t.common.aiStoryCreate}
              </h4>
              <button
                onClick={() => setShowCreate(false)}
                aria-label={t.common.close}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {t.common.storyTitle}
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {t.common.storyYearBorn}
                  </label>
                  <input
                    type="number"
                    value={yearBorn}
                    onChange={(e) => setYearBorn(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {t.common.storyGenre}
                  </label>
                  <input
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder={t.common.storyGenrePlaceholder}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {t.common.storyEmoji}
                  </label>
                  <input
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-purple-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-3">
                <div>
                  <label className="block text-xs font-black text-purple-800 mb-1.5 uppercase">
                    {t.common.storyPromptLabel}
                  </label>
                  <textarea
                    rows={2}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="VD: A cute robot cooking breakfast..."
                    className="w-full px-4 py-2 bg-white border-2 border-purple-200 rounded-xl text-sm font-bold focus:border-purple-400 focus:outline-none resize-none"
                  />
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Wand2 size={18} />
                  )}
                  {isGenerating ? t.common.aiGenerating : t.common.aiGenerate}
                </button>
              </div>

              {error && (
                <div className="text-rose-600 text-sm font-bold bg-rose-50 p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {(generatedStory || generatedImageUrl) && (
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border-2 border-slate-100">
                  <h5 className="font-black text-slate-800">
                    {t.common.storyPreview}
                  </h5>
                  {generatedImageUrl && (
                    <img
                      src={generatedImageUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-xl border border-slate-200"
                    />
                  )}
                  {generatedStory && (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-sm whitespace-pre-wrap font-medium text-slate-700">
                      {generatedStory}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t-2 border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !generatedStory || !generatedImageBlob}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}{" "}
                {t.teacherModal.saveStory}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
