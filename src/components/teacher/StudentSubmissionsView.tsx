import { ChevronLeft, ChevronRight, Loader2, Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import {
  fetchRecordingPage,
  fetchStudentRecordings,
} from "./hooks/useRecordings";
import { ArrowLeft } from "lucide-react";
import { RecordingItem } from "./RecordingsPanel";

const PAGE_SIZE = 10;

export function StudentSubmissionsView({
  studentName,
  avatar,
  formatDate,
  onDeleteRequest,
  onBack,
  highlightRecordId,
}: {
  studentName: string;
  avatar?: string;
  formatDate: (ts: string) => string;
  onDeleteRequest: (id: string) => void;
  onBack: () => void;
  highlightRecordId?: string | null;
}) {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const initialJump = useRef(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (!highlightRecordId || initialJump.current) return;
    initialJump.current = true;
    fetchRecordingPage(studentName, highlightRecordId, PAGE_SIZE)
      .then((p) => setPage(p))
      .catch((err) => console.error("Error locating record page:", err));
  }, [highlightRecordId, studentName]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchStudentRecordings(studentName, page, PAGE_SIZE)
      .then(({ records, total }) => {
        if (cancelled) return;
        setRecords(records);
        setTotal(total);
      })
      .catch((err) => console.error("Error fetching student recordings:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentName, page]);

  const goToPage = (p: number) => setPage(Math.min(Math.max(p, 1), totalPages));

  return (
    <div className="bg-white rounded-[2rem] shadow-md border-3 border-[#FFF59D] overflow-hidden">
      <div className="p-4 border-b-2 border-slate-100 flex items-center gap-3 bg-[#FFFDF6]">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.common.back}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <span
          className={`w-10 h-10 rounded-2xl border-2 font-black flex items-center justify-center shrink-0 ${
            avatar
              ? "bg-amber-50 text-2xl shadow-sm border-amber-200"
              : "text-sm bg-[#E3F2FD] text-[#1E88E5] border-[#90CAF9]"
          }`}
        >
          {avatar ||
            studentName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-slate-700 text-md truncate">
            {studentName}
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            {total} {t.recordings.lessons}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold animate-pulse">
          {t.recordings.loading}
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-bold">{t.recordings.empty}</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-100">
            {records.map((rec: any) => (
              <RecordingItem
                key={rec.id}
                rec={rec}
                isHighlighted={rec.id === highlightRecordId}
                formatDate={formatDate}
                onDeleteRequest={onDeleteRequest}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-extrabold text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft size={14} />
                {t.recordings.prev}
              </button>
              <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                {loading && <Loader2 size={12} className="animate-spin" />}
                {page} {t.recordings.of} {totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-extrabold text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                {t.recordings.next}
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
