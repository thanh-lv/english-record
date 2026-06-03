import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { S3_BUCKET, s3Client } from "../../lib/s3";
import { supabase } from "../../lib/supabase";

// We'll declare supabaseForStudents just in case
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";
const supabaseForStudents = createClient(supabaseUrl, supabaseAnonKey);

export function TopicsManager() {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editValues, setEditValues] = useState({
    text: "",
    translation: "",
    sample_answer: "",
    target: "",
    image_url: "",
  });
  const [addingQuestion, setAddingQuestion] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    translation: "",
    sample_answer: "",
    target: "",
    image_url: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
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

  const filteredTopics = topics.filter((t) => t.type === activeType);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isNew: boolean,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
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
      alert("Không thể upload ảnh, vui lòng thử lại.");
    } finally {
      setUploadingImage(false);
      // Reset input value so same file can be selected again
      e.target.value = "";
    }
  };

  const saveQuestion = async () => {
    if (!editingQuestion || !editValues.text.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("questions")
        .update({
          text: editValues.text,
          translation: editValues.translation || null,
          sample_answer: editValues.sample_answer || null,
          target: editValues.target || null,
          image_url: editValues.image_url || null,
        })
        .eq("id", editingQuestion.id);
      if (error) throw error;
      setEditingQuestion(null);
      fetchTopics();
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Xóa câu hỏi này?")) return;
    await supabase.from("questions").delete().eq("id", id);
    fetchTopics();
  };

  const addQuestion = async (topicId: string) => {
    if (!newQuestion.text.trim()) return;
    setSaving(true);
    try {
      const topic = topics.find((t) => t.id === topicId);
      const maxOrder = topic?.questions?.length || 0;
      const { error } = await supabase.from("questions").insert({
        topic_id: topicId,
        text: newQuestion.text,
        translation: newQuestion.translation || null,
        sample_answer: newQuestion.sample_answer || null,
        target: newQuestion.target || null,
        image_url: newQuestion.image_url || null,
        order_index: maxOrder,
      });
      if (error) throw error;
      setAddingQuestion(null);
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

  const saveTopic = async (topicId: string) => {
    if (!editTopicTitle.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("topics")
        .update({ title: editTopicTitle })
        .eq("id", topicId);
      if (error) throw error;
      setEditingTopic(null);
      fetchTopics();
    } finally {
      setSaving(false);
    }
  };

  const deleteTopic = async (topicId: string) => {
    if (!confirm("Xóa topic này và toàn bộ câu hỏi?")) return;
    await supabase.from("topics").delete().eq("id", topicId);
    fetchTopics();
  };

  const addTopic = async () => {
    if (!newTopicTitle.trim() || !addingTopic) return;
    setSaving(true);
    try {
      const maxOrder = topics.filter((t) => t.type === addingTopic).length + 1;
      const { error } = await supabase.from("topics").insert({
        title: newTopicTitle,
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
      <div className="flex gap-2">
        {(["standard", "bongbe"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(type)}
            className={`px-5 py-2 rounded-full font-extrabold text-sm border-2 transition-all ${activeType === type ? "bg-[#1E88E5] text-white border-blue-800 shadow" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
          >
            {type === "standard" ? "📚 Học sinh" : "🌸 Bông bé"}
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
          <Plus size={15} /> Thêm topic
        </button>
      </div>

      {/* Add topic form */}
      {addingTopic && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex gap-2 items-center">
          <input
            autoFocus
            value={newTopicTitle}
            onChange={(e) => setNewTopicTitle(e.target.value)}
            placeholder="Tên topic mới..."
            onKeyDown={(e) => e.key === "Enter" && addTopic()}
            className="flex-1 px-4 py-2 rounded-xl border-2 border-emerald-200 text-sm font-bold focus:outline-none focus:border-emerald-400"
          />
          <button
            type="button"
            onClick={addTopic}
            disabled={saving}
            className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => setAddingTopic(null)}
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
          {filteredTopics.map((topic, idx) => (
            <div
              key={topic.id}
              className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm"
            >
              {/* Topic header */}
              <div
                className="flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer"
                onClick={() =>
                  setExpandedTopic(expandedTopic === topic.id ? null : topic.id)
                }
              >
                {expandedTopic === topic.id ? (
                  <ChevronDown size={18} className="text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight size={18} className="text-slate-400 shrink-0" />
                )}
                <span className="w-7 h-7 rounded-xl bg-[#E3F2FD] text-[#1E88E5] font-black text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>

                {editingTopic === topic.id ? (
                  <input
                    autoFocus
                    value={editTopicTitle}
                    onChange={(e) => setEditTopicTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveTopic(topic.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 px-3 py-1 rounded-lg border-2 border-blue-300 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <span className="flex-1 font-extrabold text-slate-800">
                    {topic.title}
                  </span>
                )}

                <span className="text-xs text-slate-400 font-bold shrink-0">
                  {topic.questions.length} câu
                </span>

                <div
                  className="flex gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {editingTopic === topic.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveTopic(topic.id)}
                        disabled={saving}
                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTopic(null)}
                        className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
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
                        onClick={() => deleteTopic(topic.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Questions */}
              {expandedTopic === topic.id && (
                <div className="border-t-2 border-slate-100 divide-y divide-gray-500">
                  {topic.questions.map((q: any) => (
                    <div key={q.id} className="px-4 py-3">
                      {editingQuestion?.id === q.id ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-slate-600 font-extrabold text-sm">
                              Câu hỏi:
                            </label>
                            <input
                              value={editValues.text}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  text: e.target.value,
                                })
                              }
                              placeholder="Câu hỏi*"
                              className="w-full px-3 py-2 rounded-xl border-2 border-blue-200 text-sm font-bold focus:outline-none focus:border-blue-400"
                            />
                          </div>
                          <div>
                            <label className="text-slate-600 font-extrabold text-sm">
                              Dịch nghĩa:
                            </label>
                            <input
                              value={editValues.translation}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  translation: e.target.value,
                                })
                              }
                              placeholder="Dịch nghĩa"
                              className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:border-slate-400"
                            />
                          </div>
                          <div>
                            <label className="text-slate-600 font-extrabold text-sm">
                              Câu trả lời mẫu:
                            </label>
                            <input
                              value={editValues.sample_answer}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  sample_answer: e.target.value,
                                })
                              }
                              placeholder="Câu trả lời mẫu"
                              className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:border-slate-400"
                            />
                          </div>
                          {topic.type === "bongbe" && (
                            <input
                              value={editValues.target}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  target: e.target.value,
                                })
                              }
                              placeholder="Target (từ vựng cho ảnh)"
                              className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:border-slate-400"
                            />
                          )}
                          <div className="flex flex-col gap-1">
                            <label className="text-slate-600 font-extrabold text-sm">
                              Ảnh minh hoạ (Tùy chọn):
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
                                  onChange={(e) => handleImageUpload(e, false)}
                                  disabled={uploadingImage}
                                />
                              </label>
                              {editValues.image_url ? (
                                <div className="relative group">
                                  <img
                                    src={editValues.image_url}
                                    alt="Minh hoạ"
                                    className="h-10 w-10 object-cover rounded-lg border border-slate-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditValues({
                                        ...editValues,
                                        image_url: "",
                                      })
                                    }
                                    className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 font-bold">
                                  Chưa có ảnh
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              type="button"
                              onClick={saveQuestion}
                              disabled={saving}
                              className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              {saving ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Check size={14} />
                              )}{" "}
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingQuestion(null)}
                              className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
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
                          <div className="flex gap-1 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingQuestion(q);
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
                              onClick={() => deleteQuestion(q.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add question */}
                  {addingQuestion === topic.id ? (
                    <div className="px-4 py-3 bg-slate-50 space-y-2">
                      <input
                        autoFocus
                        value={newQuestion.text}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            text: e.target.value,
                          })
                        }
                        placeholder="Câu hỏi*"
                        className="w-full px-3 py-2 rounded-xl border-2 border-blue-200 text-sm font-bold focus:outline-none focus:border-blue-400"
                      />
                      <input
                        value={newQuestion.translation}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            translation: e.target.value,
                          })
                        }
                        placeholder="Dịch nghĩa"
                        className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 text-sm focus:outline-none"
                      />
                      <input
                        value={newQuestion.sample_answer}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            sample_answer: e.target.value,
                          })
                        }
                        placeholder="Câu trả lời mẫu"
                        className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 text-sm focus:outline-none"
                      />
                      {topic.type === "bongbe" && (
                        <input
                          value={newQuestion.target}
                          onChange={(e) =>
                            setNewQuestion({
                              ...newQuestion,
                              target: e.target.value,
                            })
                          }
                          placeholder="Target (từ vựng cho ảnh)"
                          className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 text-sm focus:outline-none"
                        />
                      )}
                      <div className="flex flex-col gap-1 py-1">
                        <label className="text-slate-600 font-extrabold text-sm pl-1">
                          Ảnh minh hoạ (Tùy chọn):
                        </label>
                        <div className="flex items-center gap-3 pl-1">
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
                              onChange={(e) => handleImageUpload(e, true)}
                              disabled={uploadingImage}
                            />
                          </label>
                          {newQuestion.image_url ? (
                            <div className="relative group">
                              <img
                                src={newQuestion.image_url}
                                alt="Minh hoạ"
                                className="h-10 w-10 object-cover rounded-lg border border-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setNewQuestion({
                                    ...newQuestion,
                                    image_url: "",
                                  })
                                }
                                className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-bold">
                              Chưa có ảnh
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => addQuestion(topic.id)}
                          disabled={saving}
                          className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {saving ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Plus size={14} />
                          )}{" "}
                          Thêm
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingQuestion(null)}
                          className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAddingQuestion(topic.id);
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
                        <Plus size={14} /> Thêm câu hỏi
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
