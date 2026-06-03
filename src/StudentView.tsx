import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Square,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  HelpCircle,
  Volume2,
  Eye,
  Award,
  Clock,
  ImageOff,
  Star,
  MessageSquare,
  Pencil,
  Flame,
  Heart,
  BookOpen,
  Library,
} from "lucide-react";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { supabase } from "./lib/supabase";
import { s3Client, S3_BUCKET } from "./lib/s3";
import { calculateStreak } from "./utils";

function TeacherFeedback({ recording }: { recording: any }) {
  const [reacting, setReacting] = useState(false);
  const [reacted, setReacted] = useState(!!recording?.student_reaction);
  const [showEffect, setShowEffect] = useState(false);

  if (!recording) return null;
  const hasRating = recording.teacher_rating > 0;
  const hasText =
    recording.teacher_feedback && recording.teacher_feedback.trim().length > 0;

  if (!hasRating && !hasText) return null;

  const handleReact = async () => {
    if (reacted) return;
    setReacting(true);
    try {
      const { error } = await supabase
        .from("recordings")
        .update({ student_reaction: "heart" })
        .eq("id", recording.id);
      if (error) throw error;
      setReacted(true);
      setShowEffect(true);
      setTimeout(() => setShowEffect(false), 2000);
    } catch (err) {
      console.error("Error reacting to feedback", err);
    } finally {
      setReacting(false);
    }
  };

  return (
    <div className="w-full mt-3 bg-gradient-to-br from-[#FFF8E1] to-[#FFF9C4] border-2 border-[#FFD54F] rounded-2xl p-4 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 rounded-bl-full -mr-2 -mt-2 blur-md"></div>

      <h4 className="text-sm font-black text-amber-800 flex items-center gap-2 mb-3 relative z-10">
        <MessageSquare size={16} className="text-amber-600" /> Nhận xét của Cô
        giáo:
      </h4>

      <div className="space-y-3 relative z-10">
        {hasRating && (
          <div className="flex items-center gap-1.5 bg-white/50 w-fit px-3 py-1.5 rounded-xl border border-amber-200">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={20}
                className={
                  star <= recording.teacher_rating
                    ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                    : "text-amber-100 fill-amber-100"
                }
              />
            ))}
          </div>
        )}

        {hasText && (
          <p className="text-slate-700 font-bold bg-white p-3 rounded-xl border border-amber-200 text-sm italic">
            "{recording.teacher_feedback}"
          </p>
        )}

        <div className="pt-2 flex justify-end relative">
          {showEffect && (
            <div className="absolute bottom-full right-10 pointer-events-none z-50 flex items-center justify-center">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-rose-500 text-3xl opacity-0"
                  style={
                    {
                      animation: `floatUpHeart 1.5s ease-out forwards`,
                      animationDelay: `${i * 150}ms`,
                      "--tx": `${(Math.random() - 0.5) * 120}px`,
                      "--ty": `-${Math.random() * 50 + 80}px`,
                      "--rot": `${(Math.random() - 0.5) * 60}deg`,
                    } as React.CSSProperties
                  }
                >
                  ❤️
                </div>
              ))}
              <style>{`
                @keyframes floatUpHeart {
                  0% { opacity: 1; transform: translate(0, 0) scale(0.5) rotate(0deg); }
                  50% { opacity: 1; }
                  100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(1.5) rotate(var(--rot)); }
                }
              `}</style>
            </div>
          )}
          <button
            type="button"
            disabled={reacted || reacting}
            onClick={handleReact}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all ${
              reacted
                ? "bg-rose-100 text-rose-600 border border-rose-200 shadow-sm"
                : "bg-white text-slate-500 border border-slate-200 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50"
            }`}
          >
            <Heart
              size={14}
              className={reacted ? "fill-rose-500 text-rose-500" : ""}
            />
            {reacting
              ? "Đang gửi..."
              : reacted
                ? "Đã thả tim"
                : "Thả tim cho Cô"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentView({
  user,
  profile,
}: {
  user: any;
  profile: any;
}) {
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [currentTopic, setCurrentTopic] = useState<any>(null);
  const [completedNumbers, setCompletedNumbers] = useState<number[]>([]);
  const [myRecordings, setMyRecordings] = useState<any[]>([]);
  const [appError, setAppError] = useState("");
  const [activeTopics, setActiveTopics] = useState<any[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const [showAvatarSelect, setShowAvatarSelect] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(() => {
    return (
      profile.avatar || localStorage.getItem(`avatar_${profile.id}`) || "🐰"
    );
  });
  const AVATARS = [
    "🐰",
    "🐯",
    "🐶",
    "🦊",
    "🐻",
    "🐼",
    "🐨",
    "🐸",
    "🐧",
    "🦄",
    "🦖",
    "🐳",
  ];

  const changeAvatar = async (emoji: string) => {
    setCurrentAvatar(emoji);
    setShowAvatarSelect(false);
    localStorage.setItem(`avatar_${profile.id}`, emoji);
    try {
      await supabase
        .from("profiles")
        .update({ avatar: emoji })
        .eq("id", profile.id);
    } catch (e) {
      console.warn("Could not save avatar to db", e);
    }
  };

  const [imageLoading, setImageLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "exercises" | "stories" | "achievements"
  >("exercises");

  const PRIZES = [
    "🎈",
    "🎁",
    "🌟",
    "🏅",
    "👑",
    "💎",
    "🎀",
    "🎯",
    "🎨",
    "🎭",
    "🎪",
    "🎡",
    "🎢",
    "🎠",
  ];
  const getPrizeForTopic = (topicNum: number) => {
    return PRIZES[(topicNum - 1) % PRIZES.length];
  };
  const [topicImage, setTopicImage] = useState<string | null>(null);
  const [topicAudio, setTopicAudio] = useState<string | null>(null);
  const [isPlayingTopicAudio, setIsPlayingTopicAudio] = useState(false);

  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const [audioCache, setAudioCache] = useState<Record<string, string>>({});

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBase64, setAudioBase64] = useState<Blob | null>(null);
  const [bongBeAudios, setBongBeAudios] = useState<Record<number, Blob>>({});
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const topicAudioRef = useRef<HTMLAudioElement | null>(null);

  const isBongBe = profile.name.toLowerCase().trim() === "bông bé";

  const streak = calculateStreak(myRecordings);
  const studentAge = new Date().getFullYear() - (profile.year_born || 2015);

  const [dbStories, setDbStories] = useState<any[]>([]);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [isPlayingStoryAudio, setIsPlayingStoryAudio] = useState(false);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const targetAgeGroup = studentAge <= 5 ? "kindergarten" : "primary";
        const { data, error } = await supabase
          .from("stories")
          .select("*")
          .eq("age_group", targetAgeGroup)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setDbStories(data || []);
      } catch (err) {
        console.error("Error fetching stories:", err);
      }
    };
    fetchStories();
  }, [studentAge]);

  const totalNumbers = Array.from(
    { length: activeTopics.length },
    (_, i) => i + 1,
  );

  // Load topics + questions từ DB
  useEffect(() => {
    const fetchTopics = async () => {
      setTopicsLoading(true);
      try {
        const topicType = isBongBe ? "bongbe" : "standard";
        const { data: topicsData, error: topicsError } = await supabase
          .from("topics")
          .select("*, questions(*)")
          .eq("type", topicType)
          .order("order_index");
        if (topicsError) throw topicsError;

        const normalized = (topicsData || []).map((t: any) => ({
          ...t,
          questions: (t.questions || []).sort(
            (a: any, b: any) => a.order_index - b.order_index,
          ),
        }));
        setActiveTopics(normalized);
      } catch (err) {
        console.error("Error fetching topics:", err);
      } finally {
        setTopicsLoading(false);
      }
    };
    fetchTopics();
  }, [isBongBe]);

  useEffect(() => {
    if (!user) return;

    const fetchRecordings = async () => {
      try {
        const { data, error } = await supabase
          .from("recordings")
          .select("*")
          .eq("studentName", profile.name.trim());

        if (error) throw error;

        if (data) {
          setMyRecordings(data);
          setCompletedNumbers(data.map((rec: any) => rec.topicNumber));
        }
      } catch (error) {
        console.error("Error downloading student progress:", error);
      }
    };

    fetchRecordings();

    const channel = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "recordings",
          filter: `studentName=eq.${profile.name.trim()}`,
        },
        (payload) => {
          setMyRecordings((prev) => [...prev, payload.new]);
          setCompletedNumbers((prev) => [...prev, payload.new.topicNumber]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile.name]);

  useEffect(() => {
    if (!selectedNumber) return;

    const loadTopicAssets = async () => {
      const topic = activeTopics[selectedNumber - 1];
      if (!topic) return;

      setTopicImage(null);
      setIsPlayingTopicAudio(false);

      const activeQuestion = topic.questions[activeQuestionIndex] || null;
      const cacheKey = isBongBe
        ? `${selectedNumber}_q_${activeQuestionIndex}`
        : `${selectedNumber}`;

      if (activeQuestion?.image_url) {
        setTopicImage(activeQuestion.image_url);
      } else if (imageCache[cacheKey]) {
        setTopicImage(imageCache[cacheKey]);
      } else {
        // setImageLoading(true);
        // try {
        //   const keyword = isBongBe
        //     ? activeQuestion?.target
        //     : topic.title;
        //   const prompt = `A single ${keyword}, cute flat-design illustration for children aged 5-8. Soft pastel colors, clean white background, simple shapes, friendly and cheerful style. No text, no letters, no numbers, no labels anywhere in the image.`;
        //   const imgRes = await fetch(
        //     "https://free-image-generation-api.levanthanh29111999.workers.dev/",
        //     {
        //       method: "POST",
        //       headers: {
        //         Authorization: "Bearer your-secret-api-key",
        //         "Content-Type": "application/json",
        //       },
        //       body: JSON.stringify({ prompt }),
        //     },
        //   );
        //   if (!imgRes.ok) throw new Error(`Image API error: ${imgRes.status}`);
        //   const imgBlob = await imgRes.blob();
        //   const imgUrl = URL.createObjectURL(imgBlob);
        //   setTopicImage(imgUrl);
        //   setImageCache((prev) => ({ ...prev, [cacheKey]: imgUrl }));
        // } catch (err) {
        //   console.warn("Lỗi không thể tải ảnh minh họa AI:", err);
        //   const fallbackLabel = isBongBe
        //     ? activeQuestion?.target || topic.title
        //     : topic.title;
        //   setTopicImage(
        //     `https://placehold.co/400x400/eff6ff/1e40af?text=${encodeURIComponent(fallbackLabel)}`,
        //   );
        // } finally {
        //   setImageLoading(false);
        // }
      }

      setTopicAudio("browser_tts");
      setTtsLoading(false);
    };

    loadTopicAssets();
  }, [selectedNumber, activeQuestionIndex]);

  const playTopicAudio = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!topicAudio || !currentTopic) return;

    if (isPlayingTopicAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingTopicAudio(false);
    } else {
      const activeQuestion = currentTopic.questions?.[activeQuestionIndex];
      const questionsText = isBongBe
        ? activeQuestion?.text || currentTopic.title
        : currentTopic.questions.map((q: any) => q.text).join("... ");

      const utterance = new SpeechSynthesisUtterance(questionsText);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      utterance.onend = () => setIsPlayingTopicAudio(false);
      utterance.onerror = () => setIsPlayingTopicAudio(false);

      setIsPlayingTopicAudio(true);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const playStoryAudio = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedStory) return;

    if (isPlayingStoryAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingStoryAudio(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(selectedStory.content);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      utterance.onend = () => setIsPlayingStoryAudio(false);
      utterance.onerror = () => setIsPlayingStoryAudio(false);

      setIsPlayingStoryAudio(true);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const closeStoryModal = () => {
    window.speechSynthesis.cancel();
    setIsPlayingStoryAudio(false);
    setSelectedStory(null);
  };

  const handleNumberClick = (num: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const topicData = activeTopics[num - 1];
    if (!topicData) return;
    setSelectedNumber(num);
    setCurrentTopic(topicData);
    setActiveQuestionIndex(0);
    setAudioBase64(null);
    setBongBeAudios({});
    setAppError("");
  };

  const startRecording = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAppError("");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAppError(
        "Thiết bị hoặc trình duyệt của em không hỗ trợ ghi âm trực tiếp. Hãy đảm bảo đã dùng trình duyệt Chrome/Safari và cấp quyền camera/microphone.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      const capturedQuestionIndex = activeQuestionIndex;
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        if (isBongBe) {
          setBongBeAudios((prev) => ({
            ...prev,
            [capturedQuestionIndex]: audioBlob,
          }));
        } else {
          setAudioBase64(audioBlob);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 119) {
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      setAppError(
        "Không thể bật Micro. Em hãy chọn 'Cho phép' (Allow) khi trình duyệt hỏi quyền sử dụng Microphone.",
      );
    }
  };

  const stopRecording = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const saveRecording = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    // Gom tất cả bài ghi âm cần lưu
    const audiosToSave: { questionIndex: number; blob: Blob }[] = isBongBe
      ? Object.entries(bongBeAudios).map(([idx, blob]) => ({
          questionIndex: parseInt(idx),
          blob,
        }))
      : audioBase64
        ? [{ questionIndex: 0, blob: audioBase64 }]
        : [];

    if (audiosToSave.length === 0) return;

    setIsSaving(true);
    setAppError("");
    try {
      for (const { questionIndex, blob } of audiosToSave) {
        const fileExt = blob.type.includes("mp4") ? "mp4" : "webm";
        const fileName = `${user.id}/${Date.now()}_topic_${selectedNumber}_q${questionIndex}.${fileExt}`;

        const s3Command = new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: fileName,
          Body: new Uint8Array(await blob.arrayBuffer()),
          ContentType: blob.type,
        });
        await s3Client.send(s3Command);

        const publicBaseUrl = import.meta.env.VITE_R2_PUBLIC_URL;
        let audioUrl = "";
        if (publicBaseUrl) {
          audioUrl = `${publicBaseUrl.replace(/\/$/, "")}/${fileName}`;
        } else {
          const endpoint = import.meta.env.VITE_S3_ENDPOINT || "";
          audioUrl = endpoint.includes(S3_BUCKET)
            ? `${endpoint}/${fileName}`
            : `${endpoint}/${S3_BUCKET}/${fileName}`;
        }

        const questionText = currentTopic?.questions?.[questionIndex]?.text;
        const questionId = currentTopic?.questions?.[questionIndex]?.id;
        const topicId = currentTopic?.id;

        const newRecording = {
          studentName: profile.name,
          topic: currentTopic.title,
          topicNumber: selectedNumber,
          audioUrl,
          createdAt: new Date().toISOString(),
          userId: user.id,
          questionText,
          topic_id: topicId,
          question_id: questionId,
        };

        const { data, error } = await supabase
          .from("recordings")
          .insert([newRecording])
          .select();
        if (error) throw error;

        if (data && data.length > 0) {
          setMyRecordings((prev) => [...prev, ...data]);
          setCompletedNumbers((prev) => {
            if (selectedNumber && !prev.includes(selectedNumber)) {
              return [...prev, selectedNumber];
            }
            return prev;
          });
        }
      }

      setBongBeAudios({});
      setSelectedNumber(null);
      setCurrentTopic(null);
    } catch (error) {
      console.error("Lỗi khi gửi bài:", error);
      setAppError("Không thể nộp bài nói này. Hãy kiểm tra kết nối mạng.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const matchedRecording = myRecordings.find(
    (rec) => rec.topicNumber === selectedNumber,
  );
  // Cho Bông bé: tìm recording khớp đúng câu hỏi hiện tại (theo id)
  const currentQuestionId = currentTopic?.questions?.[activeQuestionIndex]?.id;
  const currentQuestionText =
    currentTopic?.questions?.[activeQuestionIndex]?.text;
  const matchedQuestionRecording =
    isBongBe && currentTopic && currentQuestionId
      ? myRecordings.find(
          (rec) =>
            rec.topicNumber === selectedNumber &&
            (rec.question_id === currentQuestionId ||
              rec.questionText === currentQuestionText),
        )
      : null;

  const hasPendingAudios = isBongBe
    ? Object.keys(bongBeAudios).length > 0
    : !!audioBase64;
  const isTopicFullyRecorded =
    isBongBe && currentTopic
      ? currentTopic.questions.every((q) =>
          myRecordings.some(
            (rec) =>
              rec.topicNumber === selectedNumber &&
              (rec.question_id === q.id || rec.questionText === q.text),
          ),
        )
      : !!matchedRecording;

  if (topicsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-10 h-10 text-[#FF8A80] animate-spin" />
        <p className="text-slate-400 font-bold text-sm">
          Đang tải danh sách bài học...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0 space-y-4">
        {/* Profile Card */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] border-3 border-[#E3F2FD] shadow-md text-center relative group">
          <button
            type="button"
            onClick={() => setShowAvatarSelect(true)}
            className="w-20 h-20 mx-auto bg-white border-4 border-amber-200 hover:border-amber-400 hover:scale-110 active:scale-95 transition-all rounded-full flex items-center justify-center text-4xl shadow-sm relative mb-4"
            title="Đổi Avatar"
          >
            {currentAvatar}
            <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform">
              <Pencil size={12} />
            </span>
          </button>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            Hello, <span className="text-[#FF8A80]">{profile.name}</span>! 👋
          </h2>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-sm font-bold shadow-sm">
              <Award size={16} /> {completedNumbers.length} Quà
            </div>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold shadow-sm border ${streak > 0 ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-slate-50 border-slate-200 text-slate-400"}`}
            >
              <Flame
                size={16}
                className={
                  streak > 0
                    ? "fill-orange-500 text-orange-600"
                    : "text-slate-400"
                }
              />
              {streak > 0 ? `${streak} Ngày` : "Bắt đầu học!"}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-sm p-3 rounded-[2rem] border-3 border-slate-100 shadow-sm flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("exercises")}
            className={`flex items-center gap-3 px-5 py-4 rounded-xl font-extrabold text-sm transition-all ${
              activeTab === "exercises"
                ? "bg-[#E3F2FD] text-[#1E88E5] shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            <BookOpen
              size={20}
              className={
                activeTab === "exercises" ? "text-[#1E88E5]" : "text-slate-400"
              }
            />
            Bài tập của con
            {activeTab === "exercises" && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1E88E5]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stories")}
            className={`flex items-center gap-3 px-5 py-4 rounded-xl font-extrabold text-sm transition-all ${
              activeTab === "stories"
                ? "bg-purple-50 text-purple-600 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            <Library
              size={20}
              className={
                activeTab === "stories" ? "text-purple-500" : "text-slate-400"
              }
            />
            Truyện kể 📚
            {activeTab === "stories" && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("achievements")}
            className={`flex items-center gap-3 px-5 py-4 rounded-xl font-extrabold text-sm transition-all ${
              activeTab === "achievements"
                ? "bg-amber-50 text-amber-600 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            <Award
              size={20}
              className={
                activeTab === "achievements"
                  ? "text-amber-500"
                  : "text-slate-400"
              }
            />
            Thành tích 🏆
            {activeTab === "achievements" && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FFB300]" />
            )}
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {activeTab === "exercises" && (
          <div className="bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-[2rem] border-3 border-white shadow-md">
            <div className="mb-6 space-y-1">
              <h3 className="text-2xl font-black text-slate-800">
                Chọn bài học 📚
              </h3>
              <p className="text-slate-500 font-bold text-sm">
                {isBongBe
                  ? "Con hãy nhấn vào các Test ở dưới để làm bài kiểm tra đặc biệt nhé!"
                  : "Con hãy nhấn vào số muốn chọn để xem chủ đề luyện nói nhé!"}
              </p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 sm:gap-5">
              {totalNumbers.map((num) => {
                const topic = activeTopics[num - 1];
                let isCompleted = completedNumbers.includes(num);
                let isPartiallyCompleted = false;
                let progressText = "Đã làm";

                if (isBongBe && topic && topic.questions) {
                  const totalQs = topic.questions.length;
                  const answeredQs = topic.questions.filter((q) =>
                    myRecordings.some(
                      (rec) =>
                        rec.topicNumber === num &&
                        (rec.question_id === q.id ||
                          rec.questionText === q.text),
                    ),
                  ).length;

                  isCompleted = answeredQs === totalQs && totalQs > 0;
                  isPartiallyCompleted = answeredQs > 0 && answeredQs < totalQs;
                  if (answeredQs > 0) {
                    progressText = `${answeredQs}/${totalQs}`;
                  }
                }

                return (
                  <button
                    key={num}
                    type="button"
                    onClick={(e) => handleNumberClick(num, e)}
                    className={`aspect-square cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 rounded-[2rem] flex flex-col items-center justify-center gap-1.5 group border-3 relative ${
                      isCompleted
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                        : isPartiallyCompleted
                          ? "bg-orange-50/80 text-orange-600 border-orange-300 hover:bg-orange-100"
                          : "bg-[#FFF0F0] hover:bg-[#FFCDD2] text-[#E53935] border-[#EF9A9A]"
                    }`}
                  >
                    {isCompleted && (
                      <span className="absolute -top-3 -right-3 text-2xl drop-shadow-md animate-in zoom-in spin-in-12 duration-500">
                        {getPrizeForTopic(num)}
                      </span>
                    )}
                    <span className="text-4xl font-black tracking-tight group-hover:scale-125 transition-transform duration-300">
                      {isBongBe ? `Test ${num}` : num}
                    </span>
                    {(isCompleted || isPartiallyCompleted) && (
                      <span
                        className={`text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1 ${isCompleted ? "text-emerald-600" : "text-orange-600"}`}
                      >
                        {isCompleted && <CheckCircle size={10} />}{" "}
                        {progressText}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "achievements" && (
          <div className="bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-[2rem] border-3 border-white shadow-md">
            <div className="mb-8 space-y-2 text-center">
              <h3 className="text-3xl font-black text-amber-500 flex items-center justify-center gap-3">
                <Award size={32} /> Tủ đồ Thành tích <Award size={32} />
              </h3>
              <p className="text-slate-500 font-bold text-sm">
                Mỗi bài học hoàn thành con sẽ nhận được một món quà. Hãy sưu tập
                thật nhiều nhé!
              </p>
            </div>

            {completedNumbers.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="text-5xl mb-4 opacity-50">🏆</div>
                <p className="text-slate-400 font-bold">
                  Con chưa nhận được món quà nào.
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  Hãy bắt đầu làm bài tập ngay thôi!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
                {totalNumbers.map((num) => {
                  const isCompleted = completedNumbers.includes(num);
                  const prize = getPrizeForTopic(num);
                  return (
                    <div
                      key={num}
                      className={`aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 border-4 transition-all duration-500 ${
                        isCompleted
                          ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-lg hover:scale-105 hover:shadow-xl"
                          : "bg-slate-50 border-slate-100 opacity-50 grayscale"
                      }`}
                    >
                      <span className="text-4xl drop-shadow-md">
                        {isCompleted ? prize : "🔒"}
                      </span>
                      <span
                        className={`text-xs font-black uppercase tracking-wider ${isCompleted ? "text-amber-700" : "text-slate-400"}`}
                      >
                        Topic {num}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "stories" && (
          <div className="bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-[2rem] border-3 border-white shadow-md">
            <div className="mb-8 space-y-2 text-center">
              <h3 className="text-3xl font-black text-purple-500 flex items-center justify-center gap-3">
                <Library size={32} /> Góc Truyện Kể <Library size={32} />
              </h3>
              <p className="text-slate-500 font-bold text-sm">
                Chào {profile.name}! Con {studentAge} tuổi nên cô tặng con những
                truyện này nhé:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {dbStories.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 font-bold bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  Chưa có truyện nào phù hợp với tuổi của con.
                </div>
              )}
              {dbStories.map((story) => (
                <div
                  key={story.id}
                  className="bg-white rounded-[2rem] border-4 border-purple-100 shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer flex flex-col items-center text-center overflow-hidden"
                  onClick={() => setSelectedStory(story)}
                >
                  <div className="w-full aspect-video bg-slate-100 relative">
                    {story.image_url ? (
                      <img
                        src={story.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        {story.emoji}
                      </div>
                    )}
                  </div>
                  <div className="p-4 w-full">
                    <h4 className="font-extrabold text-slate-800 text-lg leading-tight mb-1">
                      {story.title}
                    </h4>
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                      {story.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedNumber && currentTopic && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center p-4 z-50 overflow-y-auto items-start py-8">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border-4 border-[#FFF59D] my-auto relative">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-center border-b-4 border-dashed border-[#FFF0F0] pb-4 pr-10">
                <div className="flex items-center gap-4">
                  <div
                    className={`inline-flex items-center justify-center w-16 h-16 text-white rounded-[1.5rem] font-black text-2xl shadow-lg border-b-4 ${matchedRecording ? "bg-gradient-to-br from-[#81C784] to-[#4CAF50] border-[#388E3C]" : "bg-gradient-to-br from-[#64B5F6] to-[#1E88E5] border-blue-800"}`}
                  >
                    {isBongBe ? `T${selectedNumber}` : selectedNumber}
                  </div>
                  <div>
                    <span
                      className={`text-xs font-black uppercase tracking-widest ${matchedRecording ? "text-emerald-500" : "text-blue-500"}`}
                    >
                      {matchedRecording
                        ? "🎁 Bé đã làm thử thách này rồi"
                        : "Topic"}
                    </span>
                    <h3 className="text-3xl font-black text-slate-800 leading-tight tracking-tight">
                      {currentTopic.title}
                    </h3>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (topicAudioRef.current) topicAudioRef.current.pause();
                  setSelectedNumber(null);
                  setCurrentTopic(null);
                }}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-rose-500 hover:bg-[#FFF0F0] rounded-full transition-all border-2 border-transparent hover:border-[#FFCDD2] z-10"
              >
                <X size={24} />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-5 space-y-5 flex flex-col items-center bg-[#F4F9FF] p-5 rounded-[2rem] border-2 border-[#E3F2FD] shadow-inner">
                  <div className="w-full aspect-square bg-white rounded-3xl border-3 border-[#FFFDE7] flex flex-col items-center justify-center overflow-hidden relative group shadow-md">
                    {imageLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-10 h-10 text-[#FF8A80] animate-spin" />
                        <span className="text-xs text-slate-400 font-extrabold animate-pulse">
                          Đang tải ảnh minh hoạ...
                        </span>
                      </div>
                    ) : topicImage ? (
                      <img
                        src={topicImage}
                        alt={currentTopic.title}
                        className="w-full h-full object-contain p-4 animate-in fade-in duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <ImageOff
                          size={48}
                          className="text-slate-200"
                          strokeWidth={1.5}
                        />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                          Không có ảnh
                        </span>
                      </div>
                    )}
                  </div>

                  {ttsLoading ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-4 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center gap-2 border-2 border-slate-200 font-bold"
                    >
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang tải audio câu hỏi...
                    </button>
                  ) : topicAudio ? (
                    <button
                      type="button"
                      onClick={playTopicAudio}
                      className={`w-full py-4 rounded-full font-black text-md flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 border-b-4 ${isPlayingTopicAudio ? "bg-[#FFB74D] border-orange-800 text-white hover:bg-[#FFA726]" : "bg-[#E3F2FD] hover:bg-[#BBDEFB] border-[#90CAF9] text-[#1E88E5]"}`}
                    >
                      <Volume2
                        className={isPlayingTopicAudio ? "animate-bounce" : ""}
                        size={20}
                      />
                      {isPlayingTopicAudio
                        ? "Đang phát audio câu hỏi"
                        : "Bật audio câu hỏi"}
                    </button>
                  ) : (
                    <div className="text-xs text-slate-400 py-3 font-extrabold flex items-center gap-2 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-[#1E88E5]" />
                      Đang tải audio câu hỏi
                    </div>
                  )}

                  {!isBongBe &&
                    (matchedRecording ? (
                      <div className="w-full pt-2 border-t-2 border-dashed border-slate-200 space-y-3">
                        <div className="bg-[#E8F5E9] border-2 border-[#A5D6A7] rounded-2xl p-4 flex flex-col items-center gap-3 shadow-inner">
                          <span className="text-xs font-black text-[#2E7D32] flex items-center gap-1">
                            <Eye size={16} /> Bài nói của con đã lưu rồi nè!
                          </span>
                          <audio
                            controls
                            src={matchedRecording.audioUrl}
                            className="w-full h-11"
                          />
                        </div>
                        <TeacherFeedback recording={matchedRecording} />
                      </div>
                    ) : (
                      <div className="w-full pt-2 border-t-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                        {!isRecording && !audioBase64 && (
                          <div className="flex flex-col items-center gap-2.5 py-2">
                            <button
                              type="button"
                              onClick={startRecording}
                              className="w-20 h-20 bg-[#FF8A80] hover:bg-[#FF5252] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all border-b-4 border-rose-800"
                            >
                              <Mic size={36} />
                            </button>
                            <span className="text-xs font-black text-slate-500">
                              Bấm nút đỏ để bắt đầu trả lời! 🎙️
                            </span>
                          </div>
                        )}

                        {isRecording && (
                          <div className="flex flex-col items-center space-y-4 py-2">
                            <div className="relative flex items-center justify-center">
                              <div className="absolute w-24 h-24 bg-rose-400/30 rounded-full animate-ping"></div>
                              <button
                                type="button"
                                onClick={stopRecording}
                                className="w-20 h-20 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg z-10 hover:scale-105 active:scale-95 transition-all border-b-4 border-rose-900"
                              >
                                <Square size={28} />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-[#E53935] font-mono text-xl font-black bg-[#FFEBEE] px-4 py-1.5 rounded-full border border-rose-200">
                              <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse"></span>
                              {formatTime(recordingTime)} / 2:00
                            </div>
                          </div>
                        )}

                        {audioBase64 && !isRecording && (
                          <div className="w-full space-y-4 bg-white p-4 rounded-2xl border-2 border-amber-200 shadow-md">
                            <audio
                              controls
                              src={
                                audioBase64
                                  ? URL.createObjectURL(audioBase64)
                                  : ""
                              }
                              className="w-full h-12"
                            />
                            <div className="flex justify-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setAudioBase64(null);
                                }}
                                className="px-5 py-2.5 text-sm font-black text-slate-600 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 rounded-full flex items-center gap-2 transition-colors shadow-sm"
                              >
                                <Trash2 size={16} /> Ghi âm lại
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                  {!isBongBe && (
                    <div className="w-full bg-[#FFFDE7] border-3 border-[#FFF59D] rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                      <AlertCircle
                        className="text-amber-500 shrink-0 mt-0.5"
                        size={24}
                      />
                      <p className="text-sm font-black text-amber-900 leading-relaxed text-left">
                        Lưu ý: Con trả lời bằng ý của mình, không trả lời giống
                        câu mẫu nha! 🥰
                      </p>
                    </div>
                  )}
                </div>

                <div className="md:col-span-7 space-y-6">
                  {isBongBe ? (
                    <div className="bg-white rounded-[2rem] p-6 border-3 border-dashed border-[#FF8A80] space-y-6 shadow-sm text-center">
                      <div className="bg-pink-50 border-2 border-pink-200 rounded-full py-2 px-5 inline-block">
                        <span className="text-sm font-black text-pink-600 uppercase tracking-widest">
                          Câu hỏi {activeQuestionIndex + 1} /{" "}
                          {currentTopic.questions.length}
                        </span>
                      </div>

                      <div className="py-6 space-y-5 bg-[#FAFAFA] rounded-3xl p-5 border-2 border-slate-100">
                        {matchedQuestionRecording ? (
                          <div className="space-y-3">
                            <div className="bg-[#E8F5E9] border-2 border-[#A5D6A7] rounded-2xl p-4 flex flex-col items-center gap-3 shadow-inner">
                              <span className="text-sm font-black text-[#2E7D32] flex items-center gap-1">
                                <Eye size={16} /> Bài nói của con đã lưu rồi nè!
                              </span>
                              <audio
                                controls
                                src={matchedQuestionRecording.audioUrl}
                                className="w-full h-11"
                              />
                            </div>
                            <TeacherFeedback
                              recording={matchedQuestionRecording}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center space-y-4">
                            {!isRecording &&
                              !bongBeAudios[activeQuestionIndex] && (
                                <div className="flex flex-col items-center gap-2.5">
                                  <button
                                    type="button"
                                    onClick={startRecording}
                                    className="w-20 h-20 bg-[#FF8A80] hover:bg-[#FF5252] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all border-b-4 border-rose-800"
                                  >
                                    <Mic size={36} />
                                  </button>
                                  <span className="text-sm font-black text-slate-500">
                                    Bấm nút đỏ để bắt đầu trả lời! 🎙️
                                  </span>
                                </div>
                              )}

                            {isRecording && (
                              <div className="flex flex-col items-center space-y-3">
                                <div className="relative flex items-center justify-center">
                                  <div className="absolute w-20 h-20 bg-rose-400/30 rounded-full animate-ping"></div>
                                  <button
                                    type="button"
                                    onClick={stopRecording}
                                    className="w-16 h-16 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg z-10 hover:scale-105 active:scale-95 transition-all border-b-4 border-rose-900"
                                  >
                                    <Square size={24} />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 text-[#E53935] font-mono text-lg font-black bg-[#FFEBEE] px-4 py-1 rounded-full border border-rose-200">
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                                  {formatTime(recordingTime)} / 2:00
                                </div>
                              </div>
                            )}

                            {bongBeAudios[activeQuestionIndex] &&
                              !isRecording && (
                                <div className="w-full max-w-md space-y-4 bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-md">
                                  <audio
                                    controls
                                    src={URL.createObjectURL(
                                      bongBeAudios[activeQuestionIndex],
                                    )}
                                    className="w-full h-12"
                                  />
                                  <div className="flex justify-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setBongBeAudios((prev) => {
                                          const next = { ...prev };
                                          delete next[activeQuestionIndex];
                                          return next;
                                        });
                                      }}
                                      className="px-5 py-2.5 text-sm font-black text-slate-600 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 rounded-full flex items-center gap-2 transition-colors shadow-sm"
                                    >
                                      <Trash2 size={16} /> Ghi âm lại
                                    </button>
                                  </div>
                                </div>
                              )}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t-2 border-dashed border-slate-100">
                        <button
                          type="button"
                          disabled={activeQuestionIndex === 0}
                          onClick={() =>
                            setActiveQuestionIndex((prev) =>
                              Math.max(0, prev - 1),
                            )
                          }
                          className={`px-5 py-2.5 font-bold rounded-full border-2 text-sm transition-all ${activeQuestionIndex === 0 ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
                        >
                          ⬅️ Câu trước
                        </button>

                        <button
                          type="button"
                          disabled={
                            activeQuestionIndex ===
                            currentTopic.questions.length - 1
                          }
                          onClick={() =>
                            setActiveQuestionIndex((prev) =>
                              Math.min(
                                currentTopic.questions.length - 1,
                                prev + 1,
                              ),
                            )
                          }
                          className={`px-6 py-2.5 font-black rounded-full text-white text-sm transition-all border-b-4 ${activeQuestionIndex === currentTopic.questions.length - 1 ? "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed" : "bg-[#1E88E5] hover:bg-blue-600 border-blue-800 shadow-md"}`}
                        >
                          Câu tiếp theo ➡️
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-[2rem] p-6 border-3 border-[#FFF0F0] space-y-5 shadow-sm">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b-2 border-dashed border-slate-100 pb-3">
                        <HelpCircle size={16} className="text-[#FF8A80]" />{" "}
                        Questions (Câu hỏi)
                      </h4>

                      <div className="space-y-6">
                        {currentTopic.questions.map((q: any, i: number) => (
                          <div
                            key={q.id || i}
                            className="space-y-3 pl-4 border-l-4 border-[#FF8A80]"
                          >
                            <div className="space-y-1">
                              <p className="text-lg font-black text-slate-700 leading-snug">
                                {q.text}
                              </p>
                              <p className="text-sm text-slate-400 italic font-bold">
                                {q.translation || ""}
                              </p>
                            </div>
                            {q.sample_answer && (
                              <div className="bg-[#FFFDF6] rounded-2xl p-4 border-2 border-[#FFF59D]">
                                <p className="text-sm font-extrabold text-slate-600 leading-relaxed bg-white px-4 py-2.5 rounded-xl border border-amber-100">
                                  <span className="text-[#FFB74D] inline-flex items-center gap-1 mr-1.5 align-middle">
                                    <Award size={14} /> Example:
                                  </span>
                                  {q.sample_answer}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {appError && (
                <div className="bg-[#FFEBEE] border-2 border-[#FFCDD2] text-rose-700 text-sm px-5 py-4 rounded-2xl flex items-start gap-2 text-left relative mt-4">
                  <AlertCircle size={20} className="shrink-0" />
                  <span className="pr-4 font-bold">{appError}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAppError("");
                    }}
                    className="absolute top-3.5 right-3.5 text-rose-400 hover:text-rose-600"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            <div className="bg-[#FFFDF6] px-6 py-5 flex justify-center items-center border-t-4 border-[#FFF0F0]">
              {isTopicFullyRecorded && !hasPendingAudios ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (topicAudioRef.current) topicAudioRef.current.pause();
                    setSelectedNumber(null);
                    setCurrentTopic(null);
                  }}
                  className="w-full max-w-sm py-4 bg-gradient-to-r from-[#4CAF50] to-[#81C784] hover:from-[#388E3C] hover:to-[#4CAF50] text-white font-black text-lg rounded-full transition-all shadow-md hover:shadow-lg border-b-4 border-emerald-800 text-center"
                >
                  Đóng lại
                </button>
              ) : (
                <button
                  type="button"
                  disabled={
                    (isBongBe
                      ? Object.keys(bongBeAudios).length === 0
                      : !audioBase64) || isSaving
                  }
                  onClick={saveRecording}
                  className={`w-full max-w-sm py-4 rounded-full font-black text-xl flex items-center justify-center gap-2 transition-all shadow-md border-b-4 ${(isBongBe ? Object.keys(bongBeAudios).length === 0 : !audioBase64) || isSaving ? "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed" : "bg-gradient-to-r from-[#1E88E5] to-[#42A5F5] hover:from-[#1565C0] hover:to-[#1976D2] text-white border-blue-900 hover:shadow-lg"}`}
                >
                  {isSaving ? "Đang gửi..." : "Nộp bài 🚀"}
                  {!isSaving && <CheckCircle size={24} />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Avatar Selection Modal */}
      {showAvatarSelect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 border-4 border-amber-200 shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button
              type="button"
              onClick={() => setShowAvatarSelect(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-800 text-center mb-6">
              Chọn Avatar của con
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => changeAvatar(emoji)}
                  className={`aspect-square rounded-2xl text-4xl flex items-center justify-center transition-all ${
                    currentAvatar === emoji
                      ? "bg-amber-100 border-4 border-amber-400 scale-110 shadow-md"
                      : "bg-slate-50 border-2 border-slate-100 hover:bg-amber-50 hover:border-amber-200 hover:scale-105"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {selectedStory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center p-4 z-[60] overflow-y-auto items-start py-8">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 relative my-auto">
            {selectedStory.image_url ? (
              <div className="w-full h-64 md:h-80 relative">
                <img
                  src={selectedStory.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                  onClick={closeStoryModal}
                  className="absolute top-4 right-4 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-full p-2 transition-colors"
                >
                  <X size={24} />
                </button>
                <div className="absolute bottom-4 left-6 right-6">
                  <span className="text-xs font-black bg-purple-500 text-white px-3 py-1 rounded-full mb-2 inline-block">
                    {selectedStory.type}
                  </span>
                  <h3 className="text-3xl md:text-4xl font-black text-white leading-tight drop-shadow-md">
                    {selectedStory.title}
                  </h3>
                </div>
              </div>
            ) : (
              <div className="p-6 pb-0 flex justify-between items-start">
                <div>
                  <span className="text-xs font-black bg-purple-100 text-purple-700 px-3 py-1 rounded-full mb-2 inline-block">
                    {selectedStory.type}
                  </span>
                  <h3 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight">
                    {selectedStory.emoji} {selectedStory.title}
                  </h3>
                </div>
                <button
                  onClick={closeStoryModal}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full p-2 transition-colors shrink-0"
                >
                  <X size={24} />
                </button>
              </div>
            )}

            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-slate-800 text-xl flex items-center gap-2">
                  <BookOpen className="text-purple-500" />
                  Nội dung truyện
                </h4>
                <button
                  onClick={playStoryAudio}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all shadow-sm ${
                    isPlayingStoryAudio
                      ? "bg-rose-100 text-rose-600 hover:bg-rose-200"
                      : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                  }`}
                >
                  {isPlayingStoryAudio ? (
                    <>
                      <Square size={18} fill="currentColor" /> Dừng nghe
                    </>
                  ) : (
                    <>
                      <Volume2 size={18} /> Đọc truyện
                    </>
                  )}
                </button>
              </div>
              <div className="bg-purple-50/50 p-6 md:p-8 rounded-[2rem] border-2 border-purple-100">
                <p className="text-lg md:text-xl font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedStory.content}
                </p>
              </div>
            </div>

            <div className="p-4 md:p-6 bg-slate-50 border-t-2 border-slate-100 flex justify-center">
              <button
                onClick={closeStoryModal}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
