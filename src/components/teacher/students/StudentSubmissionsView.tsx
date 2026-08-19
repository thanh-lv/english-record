import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Mic,
  Video,
  ArrowLeft,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../../i18n/LanguageContext";
import {
  fetchRecordingPage,
  fetchStudentRecordings,
} from "../hooks/useRecordings";
import { RecordingItem } from "../recordings/RecordingsManager";

const PAGE_SIZE = 10;

type TabType = "topic" | "shadowing";

function getPaginationItems(
  currentPage: number,
  totalPages: number,
): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

function RecordingsList({
  studentName,
  type,
  highlightRecordId,
  onDeleteRequest,
  formatDate,
}: {
  studentName: string;
  type: TabType;
  highlightRecordId?: string | null;
  onDeleteRequest: (id: string) => void;
  formatDate: (ts: string) => string;
}) {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const initialJump = useRef(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (!highlightRecordId || initialJump.current || type !== "topic") return;
    initialJump.current = true;
    fetchRecordingPage(studentName, highlightRecordId, PAGE_SIZE)
      .then((p) => setPage(p))
      .catch((err) => console.error("Error locating record page:", err));
  }, [highlightRecordId, studentName, type]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetchStudentRecordings(studentName, page, PAGE_SIZE, type)
      .then(({ records, total }) => {
        if (cancelled) return;
        setRecords(records);
        setTotal(total);
      })
      .catch((err) => {
        console.error("Error fetching student recordings:", err);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentName, page, reloadKey, type]);

  const goToPage = (p: number) => setPage(Math.min(Math.max(p, 1), totalPages));

  const emptyMsg =
    type === "shadowing" ? t.recordings.emptyShadowing : t.recordings.empty;

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold animate-pulse">
        {t.recordings.loading}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-3">
        <div className="w-16 h-16 bg-rose-50 rounded-lg flex items-center justify-center">
          <AlertCircle size={24} className="text-rose-400" />
        </div>
        <p className="text-slate-500 font-bold">{t.common.loadDataError}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-600 font-black text-sm rounded-lg transition-colors"
        >
          {t.common.retry}
        </button>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
          {type === "shadowing" ? (
            <Video size={24} className="text-slate-400" />
          ) : (
            <Mic size={24} className="text-slate-400" />
          )}
        </div>
        <p className="text-slate-500 font-bold">{emptyMsg}</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 space-y-4 bg-slate-50/50">
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
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-white rounded-b-2xl">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs"
          >
            <ChevronLeft size={15} />
            <span>{t.recordings.prev}</span>
          </button>

          <div className="flex items-center gap-1 flex-wrap justify-center">
            {getPaginationItems(page, totalPages).map((item, idx) => {
              if (item === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs font-black select-none"
                  >
                    ...
                  </span>
                );
              }
              const isCurrent = item === page;
              return (
                <button
                  key={`page-${item}`}
                  type="button"
                  onClick={() => goToPage(item as number)}
                  className={`w-8 h-8 rounded-xl font-black text-xs transition-all flex items-center justify-center ${
                    isCurrent
                      ? "bg-[#1E88E5] text-white shadow-xs scale-105"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs"
          >
            <span>{t.recordings.next}</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </>
  );
}

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
  const [activeTab, setActiveTab] = useState<TabType>("topic");

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: "topic",
      label: t.recordings.tabTopicAnswers,
      icon: <Mic size={14} />,
    },
    {
      id: "shadowing",
      label: t.recordings.tabShadowing,
      icon: <Video size={14} />,
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-slate-50/80 to-white">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.common.back}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0 border border-slate-200/60 shadow-xs"
        >
          <ArrowLeft size={18} />
        </button>
        <span
          className={`w-11 h-11 rounded-xl border-2 font-black flex items-center justify-center shrink-0 shadow-xs ${
            avatar
              ? "bg-amber-50 text-2xl shadow-xs border-amber-200"
              : "text-sm bg-blue-50 text-blue-600 border-blue-200"
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
          <h3 className="font-black text-slate-800 text-base sm:text-lg truncate">
            {studentName}
          </h3>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            {t.recordings.title}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200/80 bg-slate-50/60 p-1.5 gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === tab.id
                ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <RecordingsList
        studentName={studentName}
        type={activeTab}
        highlightRecordId={highlightRecordId}
        onDeleteRequest={onDeleteRequest}
        formatDate={formatDate}
      />
    </div>
  );
}
