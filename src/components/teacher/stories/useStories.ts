import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { uploadToStorage } from "../../../services/storageService";
import { Story } from "../../../types";

export function useStories(t: any) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "hidden">(
    "all",
  );

  const [showCreate, setShowCreate] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [deleteStoryTarget, setDeleteStoryTarget] = useState<Story | null>(
    null,
  );
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Edit story state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Manual story state
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [manualEmoji, setManualEmoji] = useState("📚");
  const [manualType, setManualType] = useState("Truyện tranh");
  const [manualYearBorn, setManualYearBorn] = useState("2015");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState("");

  // AI Generator state
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
  const [aiError, setAiError] = useState("");

  const fetchStories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("stories")
        .select(
          "id, title, type, emoji, image_url, content, age_group, created_at, is_active",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      setStories((data || []) as Story[]);
    } catch (err) {
      console.error("Fetch stories error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const filteredStories = useMemo(() => {
    return stories.filter((s) => {
      const matchText =
        !filterText || s.title.toLowerCase().includes(filterText.toLowerCase());
      const active = s.is_active ?? true;
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && active) ||
        (filterStatus === "hidden" && !active);
      return matchText && matchStatus;
    });
  }, [stories, filterText, filterStatus]);

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

  const openEditStory = (story: Story) => {
    setEditingStory(story);
    setEditTitle(story.title);
    setEditContent(story.content);
    setEditEmoji(story.emoji || "📚");
    setEditError("");
  };

  const saveEditStory = async () => {
    if (!editingStory) return;
    const trimTitle = editTitle.trim();
    const trimContent = editContent.trim();
    if (trimTitle.length < 2 || trimContent.length < 10) {
      setEditError(
        t.common?.storyRequired || "Vui lòng nhập tiêu đề và nội dung đủ dài",
      );
      return;
    }
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from("stories")
        .update({
          title: trimTitle,
          content: trimContent,
          emoji: editEmoji.trim() || "📚",
        })
        .eq("id", editingStory.id);
      if (error) throw error;
      setStories((prev) =>
        prev.map((s) =>
          s.id === editingStory.id
            ? {
                ...s,
                title: trimTitle,
                content: trimContent,
                emoji: editEmoji.trim() || "📚",
              }
            : s,
        ),
      );
      setEditingStory(null);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
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
      setStories((prev) => prev.filter((s) => s.id !== deleteStoryTarget.id));
      setDeleteStoryTarget(null);
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteSaving(false);
    }
  };

  const handleManualSave = async () => {
    const trimTitle = manualTitle.trim();
    const trimContent = manualContent.trim();
    if (trimTitle.length < 2 || trimContent.length < 10) {
      setManualError(t.common?.storyRequired || "Vui lòng điền đủ thông tin");
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
          title: trimTitle,
          age_group: ageGroup,
          type: manualType,
          emoji: manualEmoji.trim() || "📚",
          content: trimContent,
          image_url: null,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      setStories([data as Story, ...stories]);
      setShowManual(false);
      setManualTitle("");
      setManualContent("");
      setManualEmoji("📚");
    } catch (err: any) {
      setManualError(err.message);
    } finally {
      setManualSaving(false);
    }
  };

  const handleGenerateAiStory = async () => {
    if (!prompt)
      return setAiError(t.common?.promptRequired || "Nhập gợi ý câu chuyện");
    const aiApiKey = import.meta.env.VITE_AI_API_KEY;
    if (!aiApiKey)
      return setAiError(t.common?.missingAiApiKey || "Thiếu AI API Key");

    setIsGenerating(true);
    setAiError("");
    setGeneratedStory("");
    setGeneratedImageBlob(null);
    setGeneratedImageUrl("");

    try {
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
        throw new Error(t.common?.aiTextError || "Lỗi tạo nội dung AI");
      const textData = await textRes.json();
      setGeneratedStory(textData.story);

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
      if (!imgRes.ok)
        throw new Error(t.common?.aiImageError || "Lỗi tạo ảnh AI");
      const imgBlob = await imgRes.blob();
      setGeneratedImageBlob(imgBlob);
      setGeneratedImageUrl(URL.createObjectURL(imgBlob));
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAiStory = async () => {
    if (!title || !generatedStory || !generatedImageBlob)
      return setAiError(
        t.common?.storyRequired || "Thiếu tiêu đề hoặc nội dung",
      );
    setIsSaving(true);
    setAiError("");
    try {
      const imageUrl = await uploadToStorage(
        generatedImageBlob,
        `stories/${yearBorn}`,
      );
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
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      setStories([data as Story, ...stories]);
      setShowCreate(false);
      setTitle("");
      setPrompt("");
      setGeneratedStory("");
      setGeneratedImageUrl("");
      setGeneratedImageBlob(null);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    stories,
    loading,
    filterText,
    setFilterText,
    filterStatus,
    setFilterStatus,
    filteredStories,
    showCreate,
    setShowCreate,
    showManual,
    setShowManual,
    editingStory,
    setEditingStory,
    deleteStoryTarget,
    setDeleteStoryTarget,
    deleteSaving,
    deleteError,
    editTitle,
    setEditTitle,
    editContent,
    setEditContent,
    editEmoji,
    setEditEmoji,
    editError,
    editSaving,
    manualTitle,
    setManualTitle,
    manualContent,
    setManualContent,
    manualEmoji,
    setManualEmoji,
    manualType,
    setManualType,
    manualYearBorn,
    setManualYearBorn,
    manualSaving,
    manualError,
    title,
    setTitle,
    yearBorn,
    setYearBorn,
    type,
    setType,
    emoji,
    setEmoji,
    prompt,
    setPrompt,
    isGenerating,
    generatedStory,
    generatedImageUrl,
    isSaving,
    aiError,
    toggleStoryActive,
    openEditStory,
    saveEditStory,
    confirmDeleteStory,
    handleManualSave,
    handleGenerateAiStory,
    handleSaveAiStory,
  };
}
