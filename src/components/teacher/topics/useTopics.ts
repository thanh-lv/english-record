import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { Topic, Question } from "../../../types";

export function useTopics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeType, setActiveType] = useState<"standard" | "bongbe">(
    "standard",
  );
  const [filterText, setFilterText] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "hidden">(
    "all",
  );
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editTopicTitle, setEditTopicTitle] = useState("");
  const [addingTopic, setAddingTopic] = useState<"standard" | "bongbe" | null>(
    null,
  );
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "topic" | "question";
    id: string;
    label: string;
  } | null>(null);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from("topics")
        .select("*, questions(*)")
        .order("order_index");

      if (error) throw error;

      const normalized: Topic[] = (data || []).map((t: any) => ({
        ...t,
        questions: (t.questions || []).sort(
          (a: any, b: any) => a.order_index - b.order_index,
        ),
      }));

      setTopics(normalized);
    } catch (err) {
      console.error("Fetch topics error:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const filteredTopics = topics
    .filter((t) => t.type === activeType)
    .filter(
      (t) =>
        !filterText || t.title.toLowerCase().includes(filterText.toLowerCase()),
    )
    .filter((t) => {
      if (filterStatus === "active") return t.is_active ?? true;
      if (filterStatus === "hidden") return !(t.is_active ?? true);
      return true;
    });

  const totalPages = Math.ceil(filteredTopics.length / PAGE_SIZE);
  const pagedTopics = filteredTopics.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  const toggleTopicActive = async (topicId: string, currentValue: boolean) => {
    await supabase
      .from("topics")
      .update({ is_active: !currentValue })
      .eq("id", topicId);
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId ? { ...t, is_active: !currentValue } : t,
      ),
    );
  };

  const saveTopic = async (topicId: string) => {
    const trimTitle = editTopicTitle.trim();
    if (trimTitle.length < 2) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("topics")
        .update({ title: trimTitle })
        .eq("id", topicId);
      if (error) throw error;
      setEditingTopic(null);
      fetchTopics();
    } finally {
      setSaving(false);
    }
  };

  const addTopic = async () => {
    const trimTitle = newTopicTitle.trim();
    if (trimTitle.length < 2 || !addingTopic) return;
    setSaving(true);
    try {
      const maxOrder = topics.filter((t) => t.type === addingTopic).length + 1;
      const { error } = await supabase.from("topics").insert({
        title: trimTitle,
        type: addingTopic,
        order_index: maxOrder,
        is_active: true,
      });
      if (error) throw error;
      setNewTopicTitle("");
      setAddingTopic(null);
      fetchTopics();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;
    if (deleteTarget.type === "question") {
      await supabase.from("questions").delete().eq("id", deleteTarget.id);
    } else {
      await supabase.from("topics").delete().eq("id", deleteTarget.id);
    }
    setDeleteTarget(null);
    fetchTopics();
  };

  const addParsedQuestions = async (
    topicId: string,
    parsed: { text: string; sample_answer: string }[],
  ) => {
    const topic = topics.find((t) => t.id === topicId);
    let nextOrder = topic?.questions?.length || 0;
    const rows = parsed.map((q) => ({
      topic_id: topicId,
      text: q.text,
      sample_answer: q.sample_answer || null,
      order_index: nextOrder++,
    }));
    const { error } = await supabase.from("questions").insert(rows);
    if (error) throw error;
    fetchTopics();
  };

  return {
    topics,
    loading,
    loadError,
    activeType,
    setActiveType,
    filterText,
    setFilterText,
    filterStatus,
    setFilterStatus,
    page,
    setPage,
    totalPages,
    pagedTopics,
    expandedTopic,
    setExpandedTopic,
    editingTopic,
    setEditingTopic,
    editTopicTitle,
    setEditTopicTitle,
    addingTopic,
    setAddingTopic,
    newTopicTitle,
    setNewTopicTitle,
    saving,
    deleteTarget,
    setDeleteTarget,
    fetchTopics,
    toggleTopicActive,
    saveTopic,
    addTopic,
    confirmDelete,
    addParsedQuestions,
  };
}
