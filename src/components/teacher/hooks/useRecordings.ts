import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useLanguage } from "../../../i18n/LanguageContext";

interface UseRecordingsOptions {
  onNewRecording?: (record: any) => void;
}

const RECORDING_COLUMNS =
  "id, studentName, topicNumber, topic, questionText, audioUrl, createdAt, teacher_rating, teacher_feedback, student_reaction, userId, shadowing_video_id";

export interface StudentSummary {
  key: string;
  studentName: string;
  count: number;
  latestCreatedAt: string;
  hasUngraded: boolean;
}

export function useRecordings(user: any, options?: UseRecordingsOptions) {
  const { t } = useLanguage();
  const [summaries, setSummaries] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [appError, setAppError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const isInitialLoad = useRef(true);
  const onNewRecordingRef = useRef(options?.onNewRecording);
  onNewRecordingRef.current = options?.onNewRecording;

  const fetchSummaries = async () => {
    try {
      const { data, error } = await supabase
        .from("recordings")
        .select("studentName, createdAt, teacher_rating, teacher_feedback")
        .order("createdAt", { ascending: false });
      if (error) throw error;

      const map = new Map<string, StudentSummary>();
      for (const rec of data || []) {
        const key = (rec.studentName || "").trim().toLowerCase();
        const hasFeedback =
          (rec.teacher_rating || 0) > 0 ||
          (rec.teacher_feedback && rec.teacher_feedback.trim().length > 0);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            key,
            studentName: rec.studentName,
            count: 1,
            latestCreatedAt: rec.createdAt,
            hasUngraded: !hasFeedback,
          });
        } else {
          existing.count += 1;
          if (!hasFeedback) existing.hasUngraded = true;
        }
      }
      setSummaries(
        Array.from(map.values()).sort(
          (a, b) =>
            new Date(b.latestCreatedAt).getTime() -
            new Date(a.latestCreatedAt).getTime(),
        ),
      );
    } catch (error) {
      console.error("Error fetching recordings: ", error);
      setAppError(t.common.loadRecordingsError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchSummaries().then(() => {
      isInitialLoad.current = false;
    });

    const channel = supabase
      .channel("teacher-recordings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recordings" },
        (payload) => {
          fetchSummaries();
          if (
            payload.eventType === "INSERT" &&
            !isInitialLoad.current &&
            onNewRecordingRef.current
          ) {
            onNewRecordingRef.current(payload.new);
          }
        },
      )
      .subscribe((status) => {});

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
      fetchSummaries();
    } catch (err) {
      console.error("Lỗi khi xóa: ", err);
      setAppError(t.common.deleteRecordingError);
    }
  };

  return {
    summaries,
    loading,
    appError,
    deleteTargetId,
    setDeleteTargetId,
    confirmDelete,
  };
}

export async function fetchStudentRecordings(
  studentName: string,
  page: number,
  pageSize: number,
  type: "topic" | "shadowing" = "topic",
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("recordings")
    .select(RECORDING_COLUMNS, { count: "exact" })
    .ilike("studentName", studentName)
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (type === "shadowing") {
    query = query.not("shadowing_video_id", "is", null);
  } else {
    query = query.is("shadowing_video_id", null);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { records: data || [], total: count || 0 };
}

export async function fetchRecordingPage(
  studentName: string,
  recordId: string,
  pageSize: number,
) {
  const { data, error } = await supabase
    .from("recordings")
    .select("id, createdAt")
    .ilike("studentName", studentName)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  const idx = (data || []).findIndex((r) => r.id === recordId);
  if (idx === -1) return 1;
  return Math.floor(idx / pageSize) + 1;
}
