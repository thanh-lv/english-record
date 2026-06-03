import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Pencil,
  Save,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { S3_BUCKET, s3Client } from "../../lib/s3";

// We'll declare supabaseForStudents just in case
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";
const supabaseForStudents = createClient(supabaseUrl, supabaseAnonKey);

export function StoriesManager() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingStory, setEditingStory] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editEmoji, setEditEmoji] = useState("");

  const [deleteStoryTarget, setDeleteStoryTarget] = useState<any>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const { data, error } = await supabaseForStudents
        .from("stories")
        .select("*")
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
    if (!prompt) return setError("Vui lòng nhập chủ đề (Prompt).");
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
      return setError("Vui lòng nhập tên truyện và tạo nội dung.");
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

      const { data, error } = await supabaseForStudents
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

  const openEditStory = (story: any) => {
    setEditingStory(story);
    setEditTitle(story.title);
    setEditContent(story.content);
    setEditEmoji(story.emoji);
  };

  const handleUpdateStory = async () => {
    try {
      const { data, error } = await supabaseForStudents
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
      const { error } = await supabaseForStudents
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
          Quản lý Truyện AI 📚
        </h3>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md"
        >
          <Wand2 size={18} /> Tạo Truyện Mới
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {stories.map((story) => (
          <div
            key={story.id}
            className="bg-white rounded-[1.5rem] border-2 border-slate-100 overflow-hidden shadow-sm flex flex-col"
          >
            <div className="aspect-video bg-slate-100 relative">
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
            </div>
            <div className="p-4 flex flex-col flex-1">
              <h4 className="font-extrabold text-slate-800 line-clamp-1 mb-1">
                {story.title}
              </h4>
              <p className="text-xs font-bold text-purple-600 mb-3">
                {story.type} • {story.age_group}
              </p>
              <div className="mt-auto flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openEditStory(story)}
                  className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1"
                >
                  <Pencil size={14} /> Sửa
                </button>
                <button
                  onClick={(e) => handleDeleteStory(story, e)}
                  className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1"
                >
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            </div>
          </div>
        ))}
        {stories.length === 0 && (
          <div className="col-span-full py-10 text-center text-slate-400 font-bold bg-white rounded-[1.5rem] border-2 border-dashed border-slate-200">
            Chưa có truyện nào. Hãy tạo truyện đầu tiên nhé!
          </div>
        )}
      </div>

      {editingStory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl border-4 border-amber-100 p-6 space-y-5 my-8">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
              <h4 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <Pencil className="text-amber-500" /> Sửa thông tin Truyện
              </h4>
              <button
                onClick={() => setEditingStory(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    Tên truyện
                  </label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    Emoji đại diện
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
                  Nội dung truyện
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
                Hủy
              </button>
              <button
                onClick={handleUpdateStory}
                disabled={!editTitle || !editContent}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle size={18} /> Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteStoryTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-rose-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg leading-tight">
                  Xóa truyện kể
                </h4>
                <p className="text-sm text-slate-600 font-bold mt-0.5 line-clamp-1">
                  {deleteStoryTarget.title}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-500 font-medium">
              Bạn có chắc chắn muốn xóa bộ truyện này không? Học sinh sẽ không
              thể đọc được nữa.
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
                Hủy
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
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl border-4 border-purple-100 p-6 space-y-5 my-8">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
              <h4 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <Wand2 className="text-purple-500" /> Sáng tác Truyện AI
              </h4>
              <button
                onClick={() => setShowCreate(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    Tên truyện
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    Năm sinh mục tiêu
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
                    Thể loại
                  </label>
                  <input
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="VD: Truyện tranh, Cổ tích"
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    Emoji đại diện
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
                    Chủ đề (Prompt tiếng Anh)
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
                  {isGenerating
                    ? "AI đang vẽ và viết truyện..."
                    : "Phép thuật Winx: Tạo nội dung!"}
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
                    Kết quả xem trước:
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
                Hủy
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
                Lưu Truyện
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
