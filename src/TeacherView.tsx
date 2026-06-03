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
  Library,
  Wand2,
  Plus,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  ImagePlus,
  Users,
  BarChart2,
  Search,
  CheckCircle,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  UserPlus,
  Star,
  MessageSquare,
  Save,
  Filter,
  Award,
  Flame,
  Heart,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { s3Client, S3_BUCKET } from "./lib/s3";
import { calculateStreak } from "./utils";
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

const supabaseForStudents = createClient(
  import.meta.env.VITE_SUPABASE_URL || "",
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "",
  {
    auth: {
      storageKey: "english-app-auth-v3",
      lock: (_name: string, _timeout: number, fn: () => Promise<any>) => fn(),
    },
  },
);

function StudentsManager() {
  const [students, setStudents] = useState<any[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Create student form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createYearBorn, setCreateYearBorn] = useState("2015");
  const [createPassword, setCreatePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSaving, setCreateSaving] = useState(false);

  // Delete student state
  const [deleteStudentTarget, setDeleteStudentTarget] = useState<{
    student: any;
    recCount: number;
  } | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Reset password state
  const [resetPasswordTarget, setResetPasswordTarget] = useState<any | null>(
    null,
  );
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Edit student state
  const [editStudentTarget, setEditStudentTarget] = useState<any | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentYearBorn, setEditStudentYearBorn] = useState("");
  const [editStudentSaving, setEditStudentSaving] = useState(false);
  const [editStudentError, setEditStudentError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studRes, recRes, topRes] = await Promise.all([
          supabaseForStudents
            .from("profiles")
            .select("*")
            .eq("role", "student")
            .order("name"),
          supabaseForStudents
            .from("recordings")
            .select("id,studentName,topicNumber,topic,createdAt")
            .order("createdAt", { ascending: false }),
          supabaseForStudents
            .from("topics")
            .select("id,title,order_index,type")
            .eq("type", "standard")
            .order("order_index"),
        ]);
        if (studRes.data) setStudents(studRes.data);
        if (recRes.data) setRecordings(recRes.data);
        if (topRes.data) setTopics(topRes.data);
      } catch (err) {
        console.error("StudentsManager load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const createStudent = async () => {
    const trimName = createName.trim();
    const trimPass = createPassword.trim();
    if (trimName.length < 2) {
      setCreateError("Tên phải có ít nhất 2 ký tự.");
      return;
    }
    if (trimPass.length < 3) {
      setCreateError("Mật khẩu phải có ít nhất 3 ký tự.");
      return;
    }
    setCreateSaving(true);
    setCreateError("");
    try {
      const { data: existing } = await supabaseForStudents
        .from("profiles")
        .select("id")
        .ilike("name", trimName)
        .maybeSingle();
      if (existing) {
        setCreateError("Tên này đã tồn tại. Vui lòng chọn tên khác.");
        return;
      }
      const { data: inserted, error } = await supabaseForStudents
        .from("profiles")
        .insert({
          name: trimName,
          role: "student",
          password: trimPass,
          year_born: parseInt(createYearBorn) || 2015,
        })
        .select()
        .single();
      if (error) throw error;
      setStudents((prev) =>
        [...prev, inserted].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setCreateName("");
      setCreateYearBorn("2015");
      setCreatePassword("");
      setShowCreateForm(false);
    } catch (err: any) {
      setCreateError(
        err.message || "Không thể tạo học sinh. Vui lòng thử lại.",
      );
    } finally {
      setCreateSaving(false);
    }
  };

  const deleteStudent = async () => {
    if (!deleteStudentTarget) return;
    setDeleteSaving(true);
    setDeleteError("");
    try {
      const { error } = await supabaseForStudents
        .from("profiles")
        .delete()
        .eq("id", deleteStudentTarget.student.id);
      if (error) throw error;
      setStudents((prev) =>
        prev.filter((s) => s.id !== deleteStudentTarget.student.id),
      );
      setDeleteStudentTarget(null);
    } catch (err: any) {
      setDeleteError(
        err.message || "Không thể xóa học sinh. Vui lòng thử lại.",
      );
    } finally {
      setDeleteSaving(false);
    }
  };

  const resetStudentPassword = async () => {
    if (!resetPasswordTarget) return;
    const trimPass = resetPasswordValue.trim();
    if (trimPass.length < 3) {
      setResetError("Mật khẩu phải có ít nhất 3 ký tự.");
      return;
    }
    setResetSaving(true);
    setResetError("");
    setResetSuccess(false);
    try {
      const { error } = await supabaseForStudents
        .from("profiles")
        .update({ password: trimPass })
        .eq("id", resetPasswordTarget.id);
      if (error) throw error;
      setResetSuccess(true);
      setTimeout(() => {
        setResetPasswordTarget(null);
        setResetSuccess(false);
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || "Không thể đổi mật khẩu. Vui lòng thử lại.");
    } finally {
      setResetSaving(false);
    }
  };

  const saveEditedStudent = async () => {
    if (!editStudentTarget) return;

    setEditStudentSaving(true);
    setEditStudentError("");
    try {
      const { data, error } = await supabaseForStudents
        .from("profiles")
        .update({
          year_born: parseInt(editStudentYearBorn) || 2015,
        })
        .eq("id", editStudentTarget.id)
        .select()
        .single();
      if (error) throw error;
      setStudents((prev) =>
        prev
          .map((s) => (s.id === data.id ? data : s))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditStudentTarget(null);
    } catch (err: any) {
      setEditStudentError(
        err.message || "Không thể cập nhật. Vui lòng thử lại.",
      );
    } finally {
      setEditStudentSaving(false);
    }
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const avatarColors = [
    "bg-[#E3F2FD] text-[#1E88E5] border-[#90CAF9]",
    "bg-[#F3E5F5] text-[#8E24AA] border-[#CE93D8]",
    "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]",
    "bg-[#FFF3E0] text-[#E65100] border-[#FFCC80]",
    "bg-[#FCE4EC] text-[#C62828] border-[#F48FB1]",
    "bg-[#E0F7FA] text-[#00838F] border-[#80DEEA]",
  ];

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E88E5]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#E3F2FD] text-[#1E88E5] flex items-center justify-center">
            <Users size={20} />
          </span>
          <div>
            <p className="text-2xl font-black text-slate-800">
              {students.length}
            </p>
            <p className="text-xs font-bold text-slate-400">Học sinh</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
            <BarChart2 size={20} />
          </span>
          <div>
            <p className="text-2xl font-black text-slate-800">
              {recordings.length}
            </p>
            <p className="text-xs font-bold text-slate-400">Tổng bài nộp</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#FFF3E0] text-[#E65100] flex items-center justify-center">
            <BookOpen size={20} />
          </span>
          <div>
            <p className="text-2xl font-black text-slate-800">
              {topics.length}
            </p>
            <p className="text-xs font-bold text-slate-400">Topics</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm học sinh..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] shadow-sm"
        />
      </div>

      {/* Student list */}
      <div className="bg-white rounded-[2rem] shadow-md border border-slate-100 overflow-hidden">
        <div className="p-4 border-b-2 border-slate-100 flex items-center gap-2 bg-slate-50">
          <Users size={16} className="text-slate-500" />
          <h3 className="font-extrabold text-slate-700 text-sm">
            Danh sách học sinh
          </h3>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(true);
              setCreateName("");
              setCreatePassword("");
              setCreateError("");
            }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-extrabold transition-all"
          >
            <UserPlus size={14} /> Thêm học sinh
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 font-bold">
            Không tìm thấy học sinh.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((student, idx) => {
              const studentRecs = recordings.filter(
                (r) => r.studentName === student.name,
              );
              const doneTopicNums = new Set(
                studentRecs.map((r: any) => r.topicNumber),
              );
              const doneCount = doneTopicNums.size;
              const totalTopics = topics.length;
              const pct =
                totalTopics > 0
                  ? Math.round((doneCount / totalTopics) * 100)
                  : 0;
              const isExpanded = expandedStudent === student.id;
              const colorClass = avatarColors[idx % avatarColors.length];
              const initials = student.name
                .split(" ")
                .map((w: string) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              const lastRec = studentRecs[0];

              return (
                <div key={student.id} className="group">
                  {/* Student row — flex row with separate action buttons */}
                  <div className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                    {/* Clickable area: avatar + info + progress */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedStudent(isExpanded ? null : student.id)
                      }
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      {/* Avatar */}
                      <span
                        className={`w-10 h-10 rounded-2xl border-2 font-black flex items-center justify-center shrink-0 ${
                          student.avatar
                            ? "bg-amber-50 text-2xl shadow-sm border-amber-200"
                            : `text-sm ${colorClass}`
                        }`}
                      >
                        {student.avatar || initials}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-slate-800 text-sm truncate flex items-center gap-2">
                          {student.name}
                          {student.year_born && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                              {student.year_born}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                          {lastRec
                            ? `Nộp gần nhất: ${formatDate(lastRec.createdAt)}`
                            : "Chưa nộp bài nào"}
                        </p>
                      </div>

                      {/* Progress bar + count */}
                      <div className="shrink-0 flex flex-col items-end gap-1 min-w-[72px]">
                        <span className="text-xs font-black text-slate-600">
                          {doneCount}/{totalTopics}
                        </span>
                        <div className="flex items-center gap-1">
                          {doneCount > 0 && (
                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-amber-200">
                              <Award size={10} /> {doneCount}
                            </span>
                          )}
                          {calculateStreak(studentRecs) > 0 && (
                            <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-orange-200">
                              <Flame size={10} className="fill-orange-500" />{" "}
                              {calculateStreak(studentRecs)}
                            </span>
                          )}
                        </div>
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background:
                                pct === 100
                                  ? "#4CAF50"
                                  : pct >= 50
                                    ? "#1E88E5"
                                    : "#FFB74D",
                            }}
                          />
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 group-hover:opacity-100 transition-opacity pr-2 md:pr-4">
                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditStudentTarget(student);
                          setEditStudentName(student.name);
                          setEditStudentYearBorn(
                            student.year_born?.toString() || "2015",
                          );
                          setEditStudentError("");
                        }}
                        className="shrink-0 p-2 text-slate-300 hover:text-[#4CAF50] hover:bg-[#E8F5E9] rounded-xl transition-all"
                        title="Sửa thông tin"
                      >
                        <Pencil size={15} />
                      </button>

                      {/* Reset Password button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setResetPasswordTarget(student);
                          setResetPasswordValue("");
                          setResetError("");
                          setResetSuccess(false);
                          setShowPassword(false);
                        }}
                        className="shrink-0 p-2 text-slate-300 hover:text-[#1E88E5] hover:bg-[#E3F2FD] rounded-xl transition-all"
                        title="Đổi mật khẩu"
                      >
                        <Key size={15} />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const recCount = recordings.filter(
                            (r) =>
                              r.studentName.trim().toLowerCase() ===
                              student.name.trim().toLowerCase(),
                          ).length;
                          setDeleteStudentTarget({ student, recCount });
                          setDeleteError("");
                        }}
                        className="shrink-0 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        title="Xóa học sinh"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Chevron */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedStudent(isExpanded ? null : student.id)
                      }
                      className="shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-all"
                    >
                      <span
                        className="block transition-transform duration-200"
                        style={{
                          transform: isExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        <ChevronDown size={16} />
                      </span>
                    </button>
                  </div>

                  {/* Expanded: topic progress grid */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 bg-slate-50/60 border-t border-slate-100">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                        Tiến độ từng topic
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {topics.map((topic) => {
                          const topicRecs = studentRecs.filter(
                            (r: any) => r.topicNumber === topic.order_index,
                          );
                          const done = topicRecs.length > 0;
                          const recDate = done
                            ? formatDate(topicRecs[0].createdAt)
                            : null;
                          return (
                            <div
                              key={topic.id}
                              className={`rounded-xl p-2.5 border-2 flex flex-col gap-1 ${
                                done
                                  ? "bg-[#E8F5E9] border-[#A5D6A7]"
                                  : "bg-white border-slate-100"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                {done ? (
                                  <CheckCircle2
                                    size={14}
                                    className="text-[#2E7D32] shrink-0"
                                  />
                                ) : (
                                  <Circle
                                    size={14}
                                    className="text-slate-300 shrink-0"
                                  />
                                )}
                                <span
                                  className={`text-xs font-black truncate ${
                                    done ? "text-[#2E7D32]" : "text-slate-400"
                                  }`}
                                >
                                  {topic.order_index}. {topic.title}
                                </span>
                              </div>
                              {recDate && (
                                <p className="text-[10px] text-slate-400 font-bold pl-5">
                                  {recDate}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {topics.length === 0 && (
                        <p className="text-xs text-slate-400 font-bold">
                          Không có topic nào.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Delete Student Modal ── */}
      {deleteStudentTarget !== null && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-rose-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg leading-tight">
                  Xóa học sinh
                </h4>
                <p className="text-sm text-slate-600 font-bold mt-0.5">
                  {deleteStudentTarget.student.name}
                </p>
              </div>
            </div>

            {/* Warning if has recordings */}
            {deleteStudentTarget.recCount > 0 ? (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 font-extrabold text-sm">
                  <AlertCircle size={16} className="shrink-0" />
                  Cảnh báo: học sinh này có dữ liệu bài nộp!
                </div>
                <p className="text-xs text-amber-600 font-bold">
                  Học sinh này đã nộp{" "}
                  <span className="font-black text-amber-800">
                    {deleteStudentTarget.recCount} bài ghi âm
                  </span>
                  . Nếu xóa tài khoản, các bài nộp vẫn được giữ lại trong hệ
                  thống nhưng học sinh sẽ không thể đăng nhập nữa.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 font-medium">
                Học sinh này chưa có bài nộp nào. Bạn có chắc chắn muốn xóa?
              </p>
            )}

            {/* Error */}
            {deleteError && (
              <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                <AlertCircle size={14} className="shrink-0" />
                {deleteError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeleteStudentTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={deleteStudent}
                disabled={deleteSaving}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-full text-sm transition-colors shadow-md border-b-4 border-rose-900 flex items-center justify-center gap-2"
              >
                {deleteSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                {deleteStudentTarget.recCount > 0
                  ? "Đồng ý xóa"
                  : "Xóa học sinh"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetPasswordTarget !== null && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-blue-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border-2 border-blue-200 text-blue-600 flex items-center justify-center">
                <Key size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg leading-tight">
                  Đổi mật khẩu
                </h4>
                <p className="text-sm font-bold text-slate-500">
                  {resetPasswordTarget.name}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={resetPasswordValue}
                    onChange={(e) => {
                      setResetPasswordValue(e.target.value);
                      setResetError("");
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && resetStudentPassword()
                    }
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full px-4 py-3 pr-11 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {resetError && (
                <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  <AlertCircle size={14} className="shrink-0" />
                  {resetError}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setResetPasswordTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={resetStudentPassword}
                disabled={resetSaving}
                className={`flex-1 py-2.5 disabled:opacity-50 text-white font-extrabold rounded-full text-sm transition-colors shadow-md flex items-center justify-center gap-2 border-b-4 ${
                  resetSuccess
                    ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-700"
                    : "bg-[#1E88E5] hover:bg-blue-600 border-blue-800"
                }`}
              >
                {resetSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : resetSuccess ? (
                  <Check size={15} />
                ) : (
                  <Key size={15} />
                )}
                {resetSuccess ? "Thành công" : "Đổi mật khẩu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editStudentTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-emerald-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 flex items-center justify-center">
                <Pencil size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg leading-tight">
                  Sửa thông tin
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  Cập nhật thông tin học sinh
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditStudentTarget(null)}
                className="ml-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
                  Năm sinh
                </label>
                <input
                  type="number"
                  value={editStudentYearBorn}
                  onChange={(e) => {
                    setEditStudentYearBorn(e.target.value);
                    setEditStudentError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && saveEditedStudent()}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
                />
              </div>

              {editStudentError && (
                <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  <AlertCircle size={14} className="shrink-0" />
                  {editStudentError}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditStudentTarget(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={editStudentSaving}
                onClick={saveEditedStudent}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white font-black text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {editStudentSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {editStudentSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Student Modal ── */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-emerald-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 flex items-center justify-center">
                <UserPlus size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg leading-tight">
                  Thêm học sinh mới
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  Tạo tài khoản cho học sinh
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="ml-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
                  Tên học sinh
                </label>
                <input
                  autoFocus
                  value={createName}
                  onChange={(e) => {
                    setCreateName(e.target.value);
                    setCreateError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && createStudent()}
                  placeholder="Ví dụ: Tuệ Minh, Bông bé..."
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
                />
              </div>

              {/* Year Born */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
                  Năm sinh
                </label>
                <input
                  type="number"
                  value={createYearBorn}
                  onChange={(e) => {
                    setCreateYearBorn(e.target.value);
                    setCreateError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && createStudent()}
                  placeholder="Ví dụ: 2015"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={createPassword}
                    onChange={(e) => {
                      setCreatePassword(e.target.value);
                      setCreateError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && createStudent()}
                    placeholder="Nhập mật khẩu..."
                    className="w-full px-4 py-3 pr-11 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {createError && (
                <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  <AlertCircle size={14} className="shrink-0" />
                  {createError}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={createStudent}
                disabled={createSaving}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-full text-sm transition-colors shadow-md border-b-4 border-emerald-900 flex items-center justify-center gap-2"
              >
                {createSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                Tạo học sinh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecordingItem({
  rec,
  formatDate,
  onDeleteRequest,
}: {
  rec: any;
  formatDate: (ts: string) => string;
  onDeleteRequest: (id: string) => void;
}) {
  const [rating, setRating] = useState<number>(rec.teacher_rating || 0);
  const [feedback, setFeedback] = useState<string>(rec.teacher_feedback || "");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const { error } = await supabase
        .from("recordings")
        .update({ teacher_rating: rating, teacher_feedback: feedback })
        .eq("id", rec.id);
      if (error) throw error;
      rec.teacher_rating = rating;
      rec.teacher_feedback = feedback;
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditing(false);
      }, 1500);
    } catch (err) {
      console.error("Lỗi lưu nhận xét:", err);
      alert("Không thể lưu nhận xét. Vui lòng thử lại!");
    } finally {
      setSaving(false);
    }
  };

  const hasFeedback =
    rec.teacher_rating > 0 ||
    (rec.teacher_feedback && rec.teacher_feedback.length > 0);

  return (
    <div className="px-5 py-4 flex flex-col gap-3 hover:bg-white transition-colors">
      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex-1 space-y-1 pl-13">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#E3F2FD] border border-[#90CAF9] text-[#1E88E5] font-black text-xs shadow-sm shrink-0">
              {rec.topicNumber}
            </span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded font-bold">
              {formatDate(rec.createdAt)}
            </span>
            {hasFeedback && !isEditing && (
              <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <Check size={12} /> Đã nhận xét
              </span>
            )}
            {rec.student_reaction === "heart" && (
              <span className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <Heart size={12} className="fill-rose-500 text-rose-500" /> Bé
                đã thả tim
              </span>
            )}
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
            onClick={() => setIsEditing(!isEditing)}
            className={`p-3 rounded-2xl transition-all border-2 border-transparent ${
              isEditing || hasFeedback
                ? "text-emerald-500 bg-emerald-50 hover:border-emerald-100"
                : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 hover:border-emerald-100"
            }`}
            title="Nhận xét"
          >
            <MessageSquare size={20} />
          </button>

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

      {/* Grading / Feedback Form */}
      {isEditing && (
        <div className="pl-13 mt-2 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-[#F8FBFF] border-2 border-[#E3F2FD] rounded-2xl p-4 space-y-3 relative">
            <h4 className="text-sm font-black text-slate-700 flex items-center gap-2">
              <Star size={16} className="text-amber-400 fill-amber-400" /> Nhận
              xét & Chấm điểm
            </h4>

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    size={28}
                    className={`${
                      star <= rating
                        ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                        : "text-slate-200 fill-slate-200"
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Nhập lời khen hoặc nhận xét cho con..."
              className="w-full px-4 py-3 bg-white border-2 border-[#90CAF9] rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all resize-none"
              rows={2}
            />

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`px-5 py-2.5 rounded-full font-extrabold text-sm transition-all shadow-md flex items-center gap-2 ${
                  saveSuccess
                    ? "bg-emerald-500 text-white border-b-4 border-emerald-700"
                    : "bg-[#1E88E5] hover:bg-[#1565C0] text-white border-b-4 border-blue-800 disabled:opacity-50"
                }`}
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : saveSuccess ? (
                  <Check size={16} />
                ) : (
                  <Save size={16} />
                )}
                {saveSuccess ? "Đã lưu thành công!" : "Lưu nhận xét"}
              </button>
            </div>
          </div>
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

  const [filterName, setFilterName] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // 'all', 'graded', 'ungraded'
  const [showFilters, setShowFilters] = useState(false);
  const [studentAvatars, setStudentAvatars] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("name, avatar")
          .eq("role", "student");
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((p: any) => {
            if (p.name && p.avatar) {
              map[p.name.trim().toLowerCase()] = p.avatar;
            }
          });
          setStudentAvatars(map);
        }
      } catch (err) {
        console.error("Error fetching avatars", err);
      }
    };
    fetchAvatars();
  }, []);

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
      { key: string; studentName: string; records: any[] }
    >();

    const filteredRecordings = recordings.filter((rec) => {
      if (
        filterName &&
        !rec.studentName.toLowerCase().includes(filterName.toLowerCase())
      ) {
        return false;
      }
      if (filterTopic && String(rec.topicNumber) !== filterTopic.trim()) {
        return false;
      }
      if (filterStatus !== "all") {
        const hasFeedback =
          rec.teacher_rating > 0 ||
          (rec.teacher_feedback && rec.teacher_feedback.trim().length > 0);
        if (filterStatus === "graded" && !hasFeedback) return false;
        if (filterStatus === "ungraded" && hasFeedback) return false;
      }
      return true;
    });

    for (const rec of filteredRecordings) {
      // Always group by studentName (normalized) — userId changes per browser session
      const key = (rec.studentName || "").trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          key,
          studentName: rec.studentName,
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
  }, [recordings, filterName, filterTopic, filterStatus]);

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
      <div className="p-4 border-b-2 border-slate-100 flex items-center justify-between bg-[#FFFDF6]">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-slate-500" />
          <h3 className="font-extrabold text-slate-700 text-md">
            Lịch sử bài nộp mới nhất
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-extrabold transition-colors border-2 ${
            showFilters || filterName || filterTopic || filterStatus !== "all"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Filter size={16} /> Bộ lọc
        </button>
      </div>

      {showFilters && (
        <div className="p-4 bg-slate-50 border-b-2 border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase">
              Tên học sinh
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Tìm tên..."
                className="w-full pl-8 pr-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase">
              Bài học (Topic)
            </label>
            <input
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              placeholder="VD: 1, 2..."
              type="number"
              className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-amber-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase">
              Trạng thái chấm
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-amber-400 appearance-none"
            >
              <option value="all">Tất cả</option>
              <option value="ungraded">Chưa chấm điểm</option>
              <option value="graded">Đã chấm điểm</option>
            </select>
          </div>
        </div>
      )}

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
            const avatar = studentAvatars[group.key];
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
                    className={`w-10 h-10 rounded-2xl border-2 font-black flex items-center justify-center shrink-0 ${
                      avatar
                        ? "bg-amber-50 text-2xl shadow-sm border-amber-200"
                        : `text-sm ${colorClass}`
                    }`}
                  >
                    {avatar || initials}
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
                      <RecordingItem
                        key={rec.id}
                        rec={rec}
                        formatDate={formatDate}
                        onDeleteRequest={onDeleteRequest}
                      />
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

function StoriesManager() {
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
  const [activeTab, setActiveTab] = useState<
    "recordings" | "topics" | "students" | "stories"
  >("recordings");

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
    {
      id: "students" as const,
      label: "Học sinh",
      icon: <Users size={18} />,
    },
    {
      id: "stories" as const,
      label: "Truyện kể",
      icon: <Library size={18} />,
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

          {activeTab === "students" && <StudentsManager />}

          {activeTab === "stories" && <StoriesManager />}
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
