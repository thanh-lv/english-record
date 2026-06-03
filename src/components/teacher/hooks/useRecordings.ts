import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";

interface UseRecordingsOptions {
  onNewRecording?: (record: any) => void;
}

export function useRecordings(user: any, options?: UseRecordingsOptions) {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [appError, setAppError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const isInitialLoad = useRef(true);
  const onNewRecordingRef = useRef(options?.onNewRecording);
  onNewRecordingRef.current = options?.onNewRecording;

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from("recordings")
        .select(
          "id, studentName, topicNumber, topic, questionText, audioUrl, createdAt, teacher_rating, teacher_feedback, student_reaction, userId",
        )
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

  useEffect(() => {
    if (!user) return;

    fetchRecordings().then(() => {
      isInitialLoad.current = false;
    });

    const channel = supabase
      .channel("teacher-recordings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recordings" },
        (payload) => {
          fetchRecordings();
          if (
            payload.eventType === "INSERT" &&
            !isInitialLoad.current &&
            onNewRecordingRef.current
          ) {
            onNewRecordingRef.current(payload.new);
          }
        },
      )
      .subscribe((status) => {
        console.log("[useRecordings] realtime status:", status);
      });

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

  return {
    recordings,
    loading,
    appError,
    deleteTargetId,
    setDeleteTargetId,
    confirmDelete,
  };
}
