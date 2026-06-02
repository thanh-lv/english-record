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
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

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
  });
  const [addingQuestion, setAddingQuestion] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    translation: "",
    sample_answer: "",
    target: "",
  });
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
        order_index: maxOrder,
      });
      if (error) throw error;
      setAddingQuestion(null);
      setNewQuestion({
        text: "",
        translation: "",
        sample_answer: "",
        target: "",
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
                          <div className="flex gap-2">
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
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingQuestion(q);
                                setEditValues({
                                  text: q.text,
                                  translation: q.translation || "",
                                  sample_answer: q.sample_answer || "",
                                  target: q.target || "",
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
                      <div className="flex gap-2">
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-[#2E7D32] to-[#4CAF50] text-white p-6 rounded-[2rem] shadow-md border-b-4 border-emerald-900 flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-black mb-1">
            Bảng điều khiển của {profile.name} 📚
          </h2>
          <p className="text-emerald-100 font-bold opacity-90">
            Tổng số bài học sinh đã nộp: {recordings.length}
          </p>
        </div>
        <div className="hidden sm:flex w-16 h-16 bg-white/20 rounded-full items-center justify-center border-2 border-white/20">
          <Key size={32} />
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("recordings")}
          className={`px-5 py-2.5 rounded-full font-extrabold text-sm border-2 transition-all flex items-center gap-2 ${activeTab === "recordings" ? "bg-[#1E88E5] text-white border-blue-800 shadow" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
        >
          <Mic size={15} /> Bài nộp
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("topics")}
          className={`px-5 py-2.5 rounded-full font-extrabold text-sm border-2 transition-all flex items-center gap-2 ${activeTab === "topics" ? "bg-[#1E88E5] text-white border-blue-800 shadow" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
        >
          <BookOpen size={15} /> Quản lý Topics
        </button>
      </div>

      {activeTab === "topics" && <TopicsManager />}

      {activeTab === "recordings" && appError && (
        <div className="bg-[#FFEBEE] border-2 border-[#FFCDD2] text-rose-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span className="font-bold">{appError}</span>
        </div>
      )}

      {activeTab === "recordings" && (
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
              {recordings.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 sm:p-6 hover:bg-slate-50 transition-all flex flex-col md:flex-row gap-4 md:items-center"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-[#E3F2FD] border border-[#90CAF9] text-[#1E88E5] font-black text-sm shadow-sm">
                        {rec.topicNumber}
                      </span>
                      <h4 className="font-extrabold text-xl text-slate-800">
                        {rec.studentName}
                      </h4>
                      <span className="text-xs text-slate-400 ml-auto md:ml-0 bg-slate-100 px-2.5 py-1 rounded font-bold">
                        {formatDate(rec.createdAt)}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm ml-12 line-clamp-2 font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      Topic: {rec.topic}
                    </p>
                    <p className="text-slate-600 text-sm ml-12 line-clamp-2 font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      Question: {rec.questionText}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto mt-2 md:mt-0 pl-12 md:pl-0">
                    <AudioPlayer src={rec.audioUrl} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTargetId(rec.id);
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
      )}

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
