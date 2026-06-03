import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Trash2,
  Key,
  AlertCircle,
  Clock,
  Mic,
  BookOpen,
  Plus,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  ImagePlus,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { s3Client, S3_BUCKET } from "./lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "english-app-auth-v3",
    lock: (_name: string, _timeout: number, fn: () => Promise<any>) => fn(),
  },
});

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [src]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      document.querySelectorAll("audio").forEach((el) => {
        if (el !== audioRef.current) el.pause();
      });
      audioRef.current
        .play()
        .catch((err) => console.error("Lỗi phát âm thanh:", err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const changeSpeed = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rates = [1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex flex-row items-center gap-3 bg-slate-50 border-2 border-slate-200 rounded-2xl p-2.5 w-full max-w-sm sm:max-w-md shadow-inner">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
      />
      <button
        type="button"
        onClick={togglePlay}
        className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-white transition-all shadow-md active:scale-95 border-b-4 ${
          isPlaying
            ? "bg-[#FFB74D] border-orange-800 hover:bg-[#FFA726]"
            : "bg-[#1E88E5] border-blue-800 hover:bg-blue-700"
        }`}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1E88E5]"
        />
        <div className="flex justify-between text-[11px] font-bold font-mono text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={changeSpeed}
        className="px-2.5 py-1.5 shrink-0 text-xs font-black text-slate-600 hover:text-[#1E88E5] bg-white border-2 border-slate-200 hover:border-[#90CAF9] rounded-xl shadow-sm hover:shadow transition-all min-w-[48px] text-center"
        title="Tốc độ nói"
      >
        {playbackRate}x
      </button>
    </div>
  );
}

function TopicsManager() {
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
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
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

function RecordingsPanel({
  recordings,
  loading,
  formatDate,
  onDeleteRequest,
}: {
  recordings: any[];
  loading: boolean;
  formatDate: (ts: string) => string;
  onDeleteRequest: (id: string) => void;
}) {
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(
    new Set(),
  );

  const toggleStudent = (key: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const studentGroups = React.useMemo(() => {
    const map = new Map<
      string,
      { key: string; studentName: string; userId: string; records: any[] }
    >();
    for (const rec of recordings) {
      const key = rec.userId || rec.studentName;
      if (!map.has(key)) {
        map.set(key, {
          key,
          studentName: rec.studentName,
          userId: rec.userId || "",
          records: [],
        });
      }
      map.get(key)!.records.push(rec);
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.records[0].createdAt).getTime() -
        new Date(a.records[0].createdAt).getTime(),
    );
  }, [recordings]);

  const avatarColors = [
    "bg-[#E3F2FD] text-[#1E88E5] border-[#90CAF9]",
    "bg-[#F3E5F5] text-[#8E24AA] border-[#CE93D8]",
    "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]",
    "bg-[#FFF3E0] text-[#E65100] border-[#FFCC80]",
    "bg-[#FCE4EC] text-[#C62828] border-[#F48FB1]",
    "bg-[#E0F7FA] text-[#00838F] border-[#80DEEA]",
  ];

  return (
    <div className="bg-white rounded-[2rem] shadow-md border-3 border-[#FFF59D] overflow-hidden">
      <div className="p-4 border-b-2 border-slate-100 flex items-center gap-2 bg-[#FFFDF6]">
        <Clock size={18} className="text-slate-500" />
        <h3 className="font-extrabold text-slate-700 text-md">
          Lịch sử bài nộp mới nhất
        </h3>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold animate-pulse">
          Đang tải dữ liệu...
        </div>
      ) : recordings.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-bold">
            Chưa có bài nộp nào từ học sinh.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {studentGroups.map((group, groupIdx) => {
            const isExpanded = expandedStudents.has(group.key);
            const colorClass = avatarColors[groupIdx % avatarColors.length];
            const initials = group.studentName
              .split(" ")
              .map((w: string) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const latestDate = formatDate(group.records[0].createdAt);

            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => toggleStudent(group.key)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <span
                    className={`w-10 h-10 rounded-2xl border-2 font-black text-sm flex items-center justify-center shrink-0 ${colorClass}`}
                  >
                    {initials}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-slate-800 text-base truncate">
                      {group.studentName}
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                      {/* {group.userId ? `ID: ${group.userId} · ` : ""} */}
                      Mới nhất: {latestDate}
                    </p>
                  </div>

                  <span className="shrink-0 px-3 py-1 bg-[#E3F2FD] text-[#1E88E5] text-xs font-black rounded-full border border-[#90CAF9]">
                    {group.records.length} bài
                  </span>

                  <span
                    className="shrink-0 text-slate-400 transition-transform duration-200"
                    style={{
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    <ChevronDown size={18} />
                  </span>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-slate-50 bg-slate-50/50 border-t border-slate-100">
                    {group.records.map((rec: any) => (
                      <div
                        key={rec.id}
                        className="px-5 py-4 flex flex-col md:flex-row gap-4 md:items-center hover:bg-white transition-colors"
                      >
                        <div className="flex-1 space-y-1 pl-13">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#E3F2FD] border border-[#90CAF9] text-[#1E88E5] font-black text-xs shadow-sm shrink-0">
                              {rec.topicNumber}
                            </span>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded font-bold">
                              {formatDate(rec.createdAt)}
                            </span>
                          </div>
                          <p className="text-slate-600 text-sm font-bold bg-white p-2.5 rounded-xl border border-slate-100 mt-1">
                            Topic: {rec.topic}
                          </p>
                          <p className="text-slate-600 text-sm font-bold bg-white p-2.5 rounded-xl border border-slate-100">
                            Question: {rec.questionText}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto mt-1 md:mt-0 pl-10 md:pl-0">
                          <AudioPlayer src={rec.audioUrl} />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDeleteRequest(rec.id);
                            }}
                            className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border-2 border-transparent hover:border-rose-100"
                            title="Xóa bài nộp"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TeacherView({
  user,
  profile,
}: {
  user: any;
  profile: any;
}) {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [appError, setAppError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"recordings" | "topics">(
    "recordings",
  );

  useEffect(() => {
    if (!user) return;

    const fetchRecordings = async () => {
      try {
        const { data, error } = await supabase
          .from("recordings")
          .select("*")
          .order("createdAt", { ascending: false });

        if (error) throw error;
        if (data) setRecordings(data);
      } catch (error) {
        console.error("Error fetching recordings: ", error);
        setAppError("Không thể kết nối lấy dữ liệu bài nộp từ hệ thống.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecordings();

    const channel = supabase
      .channel("teacher-recordings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recordings" },
        () => {
          fetchRecordings();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const confirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!deleteTargetId) return;
    try {
      const { error } = await supabase
        .from("recordings")
        .delete()
        .eq("id", deleteTargetId);
      if (error) throw error;

      setRecordings((prev) => prev.filter((r) => r.id !== deleteTargetId));
      setDeleteTargetId(null);
    } catch (err) {
      console.error("Lỗi khi xóa: ", err);
      setAppError("Không thể xóa bài nộp này.");
    }
  };

  const formatDate = (timestamp: string) => {
    const d = new Date(timestamp);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const navItems = [
    { id: "recordings" as const, label: "Bài nộp", icon: <Mic size={18} /> },
    {
      id: "topics" as const,
      label: "Quản lý Topics",
      icon: <BookOpen size={18} />,
    },
  ];

  return (
    <div className="animate-in fade-in duration-500 min-h-screen flex flex-col">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-[#2E7D32] to-[#4CAF50] text-white px-6 py-5 rounded-[2rem] shadow-md border-b-4 border-emerald-900 flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl md:text-3xl font-black mb-0.5">
            Bảng điều khiển của {profile.name} 📚
          </h2>
          <p className="text-emerald-100 font-bold opacity-90 text-sm">
            Tổng số bài học sinh đã nộp: {recordings.length}
          </p>
        </div>
        <div className="hidden sm:flex w-14 h-14 bg-white/20 rounded-full items-center justify-center border-2 border-white/20">
          <Key size={28} />
        </div>
      </div>

      {/* Sidebar + content */}
      <div className="flex gap-5 flex-1 items-start">
        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden sticky top-4">
          {/* brand strip */}
          <div className="px-5 pt-5 pb-3 border-b border-slate-100">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Menu
            </p>
          </div>
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-extrabold text-sm transition-all ${
                    active
                      ? "bg-[#E3F2FD] text-[#1E88E5] shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  <span
                    className={active ? "text-[#1E88E5]" : "text-slate-400"}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1E88E5]" />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-4 pb-24 md:pb-0">
          {activeTab === "recordings" && appError && (
            <div className="bg-[#FFEBEE] border-2 border-[#FFCDD2] text-rose-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span className="font-bold">{appError}</span>
            </div>
          )}

          {activeTab === "recordings" && (
            <RecordingsPanel
              recordings={recordings}
              loading={loading}
              formatDate={formatDate}
              onDeleteRequest={(id) => setDeleteTargetId(id)}
            />
          )}

          {activeTab === "topics" && <TopicsManager />}
        </div>
      </div>

      {/* ── Bottom nav (mobile) ── */}
      <div className="fixed bottom-0 inset-x-0 md:hidden z-40">
        <div className="mx-3 mb-3 bg-white/90 backdrop-blur-md border border-slate-200 rounded-[1.5rem] shadow-xl flex overflow-hidden">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-extrabold transition-all ${
                  active ? "text-[#1E88E5]" : "text-slate-400"
                }`}
              >
                <span
                  className={`p-1.5 rounded-xl transition-all ${active ? "bg-[#E3F2FD]" : ""}`}
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 p-6 border-4 border-rose-100 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 shadow-sm">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-lg">
                  Xác nhận xóa
                </h4>
                <p className="text-sm text-slate-500 font-medium">
                  Thầy cô có chắc chắn muốn xóa bài ghi âm của học sinh này khỏi
                  hệ thống không?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteTargetId(null);
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200 shadow-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-full text-sm transition-colors shadow-md border-b-4 border-rose-900"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
