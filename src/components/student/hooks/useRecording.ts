import { useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useLanguage } from "../../../i18n/LanguageContext";

interface UseRecordingOptions {
  user: any;
  profile: any;
  isBongBe: boolean;
  selectedNumber: number | null;
  currentTopic: any;
  activeQuestionIndex: number;
  existingRecordingId?: string | null;
  onSaveSuccess: (recordings: any[], completedNumber: number | null) => void;
}

export function useRecording({
  user,
  profile,
  isBongBe,
  selectedNumber,
  currentTopic,
  activeQuestionIndex,
  existingRecordingId,
  onSaveSuccess,
}: UseRecordingOptions) {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBase64, setAudioBase64] = useState<Blob | null>(null);
  const [bongBeAudios, setBongBeAudios] = useState<Record<number, Blob>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [appError, setAppError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
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

  const startRecording = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAppError("");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAppError(t.common.micNotSupported);
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
      setAppError(t.common.micError);
    }
  };

  const saveRecording = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

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
    const savedRecordings: any[] = [];

    try {
      const [{ PutObjectCommand }, { s3Client, S3_BUCKET }] = await Promise.all(
        [import("@aws-sdk/client-s3"), import("../../../lib/s3")],
      );

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

        if (existingRecordingId) {
          await supabase
            .from("recordings")
            .delete()
            .eq("id", existingRecordingId);
        }

        const { data, error } = await supabase
          .from("recordings")
          .insert([newRecording])
          .select();
        if (error) throw error;

        if (data && data.length > 0) {
          savedRecordings.push(...data);
        }
      }

      onSaveSuccess(savedRecordings, selectedNumber);
      setBongBeAudios({});
      setAudioBase64(null);
    } catch (error) {
      console.error("Lỗi khi gửi bài:", error);
      setAppError(t.common.submitError);
    } finally {
      setIsSaving(false);
    }
  };

  const resetAudio = () => {
    setAudioBase64(null);
    setBongBeAudios({});
  };

  const hasPendingAudios = isBongBe
    ? Object.keys(bongBeAudios).length > 0
    : !!audioBase64;

  return {
    isRecording,
    recordingTime,
    audioBase64,
    setAudioBase64,
    bongBeAudios,
    setBongBeAudios,
    isSaving,
    appError,
    setAppError,
    hasPendingAudios,
    startRecording,
    stopRecording,
    saveRecording,
    resetAudio,
    formatTime,
  };
}
