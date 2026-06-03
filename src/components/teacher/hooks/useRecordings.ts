import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export function useRecordings(user: any) {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [appError, setAppError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user) return;

    fetchRecordings();

    const channel = supabase
      .channel("teacher-recordings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recordings" },
        () => fetchRecordings(),
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

  return {
    recordings,
    loading,
    appError,
    deleteTargetId,
    setDeleteTargetId,
    confirmDelete,
  };
}
