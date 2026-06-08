import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { AIQuestionParserModal } from "./AIQuestionParserModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { useEscapeToClose } from "../../hooks/useEscapeToClose";
import { S3_BUCKET, s3Client } from "../../lib/s3";
import { supabase } from "../../lib/supabase";

export function TopicsManager() {
  const { t } = useLanguage();
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [questionModal, setQuestionModal] = useState<{
    mode: "add" | "edit";
    topicId: string;
    topicType: string;
    question?: any;
  } | null>(null);
  useEscapeToClose(() => setQuestionModal(null), !!questionModal);
  const [editValues, setEditValues] = useState({
    text: "",
    translation: "",
    sample_answer: "",
    target: "",
    image_url: "",
  });
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    translation: "",
    sample_answer: "",
    target: "",
    image_url: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [aiParserTopicId, setAiParserTopicId] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editTopicTitle, setEditTopicTitle] = useState("");
  const [addingTopic, setAddingTopic] = useState<"standard" | "bongbe" | null>(
    null,
  );
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [activeType, setActiveType] = useState<"standard" | "bongbe">(
    "standard",
  );
  const [saving, setSaving] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "hidden">(
    "all",
  );
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "topic" | "question";
    id: string;
    label: string;
  } | null>(null);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("topics")
        .select("*, questions(*)")
        .order("order_index");
      if (error) throw error;
      const normalized = (data || []).map((t: any) => ({
        ...t,
        questions: (t.questions || []).sort(
          (a: any, b: any) => a.order_index - b.order_index,
        ),
      }));
      setTopics(normalized);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

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

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isNew: boolean,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setImageUploadError("");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `question_images/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: fileName,
          Body: new Uint8Array(await file.arrayBuffer()),
          ContentType: file.type,
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

      if (isNew) {
        setNewQuestion((prev) => ({ ...prev, image_url: imageUrl }));
      } else {
        setEditValues((prev) => ({ ...prev, image_url: imageUrl }));
      }
    } catch (err) {
      console.error("Lỗi upload ảnh:", err);
      setImageUploadError(t.common.uploadImageError);
    } finally {
      setUploadingImage(false);
      // Reset input value so same file can be selected again
      e.target.value = "";
    }
  };

  const saveQuestion = async () => {
    const trimText = editValues.text.trim();
    if (
      !questionModal ||
      questionModal.mode !== "edit" ||
      !questionModal.question ||
      trimText.length < 2
    )
      return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("questions")
        .update({
          text: trimText,
          translation: editValues.translation.trim() || null,
          sample_answer: editValues.sample_answer.trim() || null,
          target: editValues.target.trim() || null,
          image_url: editValues.image_url || null,
        })
        .eq("id", questionModal.question.id);
      if (error) throw error;
      setQuestionModal(null);
      fetchTopics();
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = (id: string, text: string) => {
    setDeleteTarget({ type: "question", id, label: text });
  };

  const addQuestion = async (topicId: string) => {
    const trimText = newQuestion.text.trim();
    if (trimText.length < 2) return;
    setSaving(true);
    try {
      const topic = topics.find((t) => t.id === topicId);
      const maxOrder = topic?.questions?.length || 0;
      const { error } = await supabase.from("questions").insert({
        topic_id: topicId,
        text: trimText,
        translation: newQuestion.translation.trim() || null,
        sample_answer: newQuestion.sample_answer.trim() || null,
        target: newQuestion.target.trim() || null,
        image_url: newQuestion.image_url || null,
        order_index: maxOrder,
      });
      if (error) throw error;
      setQuestionModal(null);
      setNewQuestion({
        text: "",
        translation: "",
        sample_answer: "",
        target: "",
        image_url: "",
      });
      fetchTopics();
    } finally {
      setSaving(false);
    }
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

  const deleteTopic = (topicId: string, title: string) => {
    setDeleteTarget({ type: "topic", id: topicId, label: title });
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
      });
      if (error) throw error;
      setAddingTopic(null);
      setNewTopicTitle("");
      fetchTopics();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab type */}
      <div className="flex flex-wrap gap-2">
        {(["standard", "bongbe"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setActiveType(type);
              setPage(0);
            }}
            className={`px-5 py-2 rounded-full font-extrabold text-sm border-2 transition-all ${activeType === type ? "bg-[#1E88E5] text-white border-blue-800 shadow" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
          >
            {type === "standard" ? `📚 ${t.teacherNav.students}` : "🌸 Bông bé"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setAddingTopic(activeType);
            setNewTopicTitle("");
          }}
          className="ml-auto px-4 py-2 rounded-full font-extrabold text-sm bg-emerald-50 text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1"
        >
          <Plus size={15} /> {t.common.addTopic}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <input
            value={filterText}
            onChange={(e) => {
              setFilterText(e.target.value);
              setPage(0);
            }}
            placeholder={t.teacherModal.filterTopicPlaceholder}
            className="w-full pl-3 pr-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as any);
            setPage(0);
          }}
          className="px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-400"
        >
          <option value="all">
            {t.teacherModal.ageAll} ({filteredTopics.length})
          </option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      {/* Add topic form */}
      {addingTopic && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex gap-2 items-center">
          <input
            autoFocus
            value={newTopicTitle}
            onChange={(e) => setNewTopicTitle(e.target.value)}
            placeholder={t.common.newTopicPlaceholder}
            onKeyDown={(e) => e.key === "Enter" && addTopic()}
            className="flex-1 px-4 py-2 rounded-xl border-2 border-emerald-200 text-sm font-bold focus:outline-none focus:border-emerald-400"
          />
          <button
            type="button"
            onClick={addTopic}
            disabled={saving}
            aria-label={t.common.confirm}
            className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => setAddingTopic(null)}
            aria-label={t.common.cancel}
            className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#1E88E5]" />
        </div>
      ) : (
        <div className="space-y-3">
          {pagedTopics.map((topic, idx) => (
            <div
              key={topic.id}
              className={`bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm${!(topic.is_active ?? true) ? " opacity-60" : ""}`}
            >
              {/* Topic header */}
              {editingTopic === topic.id ? (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border-b-2 border-blue-100">
                  <span className="w-7 h-7 rounded-xl bg-[#E3F2FD] text-[#1E88E5] font-black text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    autoFocus
                    value={editTopicTitle}
                    onChange={(e) => setEditTopicTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveTopic(topic.id)}
                    className="flex-1 px-3 py-2 rounded-xl border-2 border-blue-300 text-sm font-bold focus:outline-none focus:border-blue-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => saveTopic(topic.id)}
                    disabled={saving}
                    aria-label={t.common.save}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shrink-0"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTopic(null)}
                    aria-label={t.common.cancel}
                    className="p-2 bg-white text-slate-500 rounded-xl hover:bg-slate-100 border border-slate-200 shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer"
                  onClick={() =>
                    setExpandedTopic(
                      expandedTopic === topic.id ? null : topic.id,
                    )
                  }
                >
                  {expandedTopic === topic.id ? (
                    <ChevronDown
                      size={18}
                      className="text-slate-400 shrink-0"
                    />
                  ) : (
                    <ChevronRight
                      size={18}
                      className="text-slate-400 shrink-0"
                    />
                  )}
                  <span className="w-7 h-7 rounded-xl bg-[#E3F2FD] text-[#1E88E5] font-black text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex-1 font-extrabold text-slate-800 truncate">
                    {topic.title}
                  </span>
                  <span className="text-xs text-slate-400 font-bold shrink-0">
                    {topic.questions.length} {t.common.questionCount}
                  </span>
                  <div
                    className="flex gap-1 shrink-0 items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTopicActive(topic.id, topic.is_active ?? true);
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black transition-colors ${
                        (topic.is_active ?? true)
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {(topic.is_active ?? true) ? "Active" : "Hidden"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTopic(topic.id);
                        setEditTopicTitle(topic.title);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTopic(topic.id, topic.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Questions */}
              {expandedTopic === topic.id && (
                <div className="border-t-2 border-slate-100 divide-y divide-gray-500">
                  {topic.questions.map((q: any) => (
                    <div key={q.id} className="px-4 py-3">
                      <div className="flex items-start gap-2 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800">
                            {q.text}
                          </p>
                          {q.translation && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {q.translation}
                            </p>
                          )}
                          {q.sample_answer && (
                            <p className="text-xs text-emerald-600 mt-0.5 italic">
                              {q.sample_answer}
                            </p>
                          )}
                          {q.target && (
                            <p className="text-xs text-purple-500 mt-0.5">
                              🎯 {q.target}
                            </p>
                          )}
                        </div>
                        {q.image_url && (
                          <img
                            src={q.image_url}
                            alt="Question"
                            className="w-12 h-12 object-cover rounded-xl border-2 border-slate-100 shrink-0 ml-2"
                          />
                        )}
                        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => {
                              setQuestionModal({
                                mode: "edit",
                                topicId: topic.id,
                                topicType: topic.type,
                                question: q,
                              });
                              setEditValues({
                                text: q.text,
                                translation: q.translation || "",
                                sample_answer: q.sample_answer || "",
                                target: q.target || "",
                                image_url: q.image_url || "",
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteQuestion(q.id, q.text)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add question buttons */}
                  <div className="px-4 py-2 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setQuestionModal({
                          mode: "add",
                          topicId: topic.id,
                          topicType: topic.type,
                        });
                        setNewQuestion({
                          text: "",
                          translation: "",
                          sample_answer: "",
                          target: "",
                          image_url: "",
                        });
                      }}
                      className="text-sm text-slate-400 hover:text-emerald-600 font-bold flex items-center gap-1 py-1"
                    >
                      <Plus size={14} /> {t.common.addQuestion}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiParserTopicId(topic.id)}
                      className="text-sm text-violet-400 hover:text-violet-600 font-bold flex items-center gap-1 py-1"
                    >
                      <Sparkles size={14} /> {t.aiParser.openButton}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Empty state */}
          {pagedTopics.length === 0 && !loading && (
            <div className="py-12 text-center text-slate-400 font-bold bg-white rounded-2xl border-2 border-dashed border-slate-200">
              {filterText || filterStatus !== "all"
                ? t.teacherModal.noTopicsFound
                : t.teacherModal.noTopicsYet}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-slate-400">
                {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, filteredTopics.length)} /{" "}
                {filteredTopics.length} topics
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs font-black rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                >
                  {t.teacherModal.paginationPrev}
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    className={`w-7 h-7 text-xs font-black rounded-lg transition-colors ${page === i ? "bg-[#1E88E5] text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-xs font-black rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                >
                  {t.teacherModal.paginationNext}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Question modal (add / edit) */}
      {questionModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="question-modal-title"
        >
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl border-4 border-blue-100 p-6 space-y-4 my-4">
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
              <h4
                id="question-modal-title"
                className="font-black text-lg text-slate-800"
              >
                {questionModal.mode === "add"
                  ? t.common.addQuestion
                  : t.common.edit +
                    " " +
                    t.common.questionLabel.replace(":", "")}
              </h4>
              <button
                onClick={() => setQuestionModal(null)}
                aria-label={t.common.close}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-600 uppercase mb-1 block">
                  {t.common.questionLabel.replace(":", "")}
                </label>
                <input
                  autoFocus
                  value={
                    questionModal.mode === "add"
                      ? newQuestion.text
                      : editValues.text
                  }
                  onChange={(e) =>
                    questionModal.mode === "add"
                      ? setNewQuestion({ ...newQuestion, text: e.target.value })
                      : setEditValues({ ...editValues, text: e.target.value })
                  }
                  placeholder={t.common.questionPlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-blue-200 text-sm font-bold focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-600 uppercase mb-1 block">
                  {t.common.translationLabel.replace(":", "")}
                </label>
                <input
                  value={
                    questionModal.mode === "add"
                      ? newQuestion.translation
                      : editValues.translation
                  }
                  onChange={(e) =>
                    questionModal.mode === "add"
                      ? setNewQuestion({
                          ...newQuestion,
                          translation: e.target.value,
                        })
                      : setEditValues({
                          ...editValues,
                          translation: e.target.value,
                        })
                  }
                  placeholder={t.common.translationPlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-600 uppercase mb-1 block">
                  {t.common.sampleAnswerLabel.replace(":", "")}
                </label>
                <input
                  value={
                    questionModal.mode === "add"
                      ? newQuestion.sample_answer
                      : editValues.sample_answer
                  }
                  onChange={(e) =>
                    questionModal.mode === "add"
                      ? setNewQuestion({
                          ...newQuestion,
                          sample_answer: e.target.value,
                        })
                      : setEditValues({
                          ...editValues,
                          sample_answer: e.target.value,
                        })
                  }
                  placeholder={t.common.sampleAnswerPlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm focus:outline-none"
                />
              </div>
              {questionModal.topicType === "bongbe" && (
                <div>
                  <label className="text-xs font-black text-slate-600 uppercase mb-1 block">
                    {t.common.targetPlaceholder}
                  </label>
                  <input
                    value={
                      questionModal.mode === "add"
                        ? newQuestion.target
                        : editValues.target
                    }
                    onChange={(e) =>
                      questionModal.mode === "add"
                        ? setNewQuestion({
                            ...newQuestion,
                            target: e.target.value,
                          })
                        : setEditValues({
                            ...editValues,
                            target: e.target.value,
                          })
                    }
                    placeholder={t.common.targetPlaceholder}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-black text-slate-600 uppercase mb-1 block">
                  {t.common.imageOptional.replace(":", "")}
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center justify-center w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer border-2 border-slate-200 transition-colors">
                    {uploadingImage ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ImagePlus size={18} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleImageUpload(e, questionModal.mode === "add")
                      }
                      disabled={uploadingImage}
                    />
                  </label>
                  {(
                    questionModal.mode === "add"
                      ? newQuestion.image_url
                      : editValues.image_url
                  ) ? (
                    <div className="relative group">
                      <img
                        src={
                          questionModal.mode === "add"
                            ? newQuestion.image_url
                            : editValues.image_url
                        }
                        alt=""
                        className="h-10 w-10 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          questionModal.mode === "add"
                            ? setNewQuestion({ ...newQuestion, image_url: "" })
                            : setEditValues({ ...editValues, image_url: "" })
                        }
                        aria-label={t.common.delete}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-bold">
                      {t.common.noImageYet}
                    </span>
                  )}
                </div>
                {imageUploadError && (
                  <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mt-2">
                    <AlertCircle size={14} className="shrink-0" />{" "}
                    {imageUploadError}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuestionModal(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  questionModal.mode === "add"
                    ? addQuestion(questionModal.topicId)
                    : saveQuestion()
                }
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-full text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                {questionModal.mode === "add" ? t.common.add : t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {aiParserTopicId && (
        <AIQuestionParserModal
          onAddAll={(qs) => addParsedQuestions(aiParserTopicId, qs)}
          onClose={() => setAiParserTopicId(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title={
            deleteTarget.type === "topic"
              ? t.common.deleteTopicConfirm
              : t.common.deleteQuestionConfirm
          }
          description={deleteTarget.label}
          confirmLabel={t.common.confirmDelete}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
