import { AlertCircle } from "lucide-react";
import { useLanguage } from "./i18n/LanguageContext";
import { RecordingsPanel } from "./components/teacher/RecordingsPanel";
import { StudentSubmissionsView } from "./components/teacher/StudentSubmissionsView";
import {
  TeacherSidebar,
  TeacherTab,
} from "./components/teacher/TeacherSidebar";
import { DeleteConfirmModal } from "./components/teacher/DeleteConfirmModal";
import { OfflineBanner } from "./components/common/OfflineBanner";
import { useRecordings } from "./components/teacher/hooks/useRecordings";
import { supabase } from "./lib/supabase";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

const STUDENT_PARAM = "student";

const readStudentFromUrl = (): string | null => {
  try {
    return new URLSearchParams(window.location.search).get(STUDENT_PARAM);
  } catch {
    return null;
  }
};

const StoriesManager = lazy(() =>
  import("./components/teacher/StoriesManager").then((m) => ({
    default: m.StoriesManager,
  })),
);
const StudentsManager = lazy(() =>
  import("./components/teacher/StudentsManager").then((m) => ({
    default: m.StudentsManager,
  })),
);
const TopicsManager = lazy(() =>
  import("./components/teacher/TopicsManager").then((m) => ({
    default: m.TopicsManager,
  })),
);
const VocabularyManager = lazy(() =>
  import("./components/teacher/VocabularyManager").then((m) => ({
    default: m.VocabularyManager,
  })),
);

const formatDate = (timestamp: string) => {
  const d = new Date(timestamp);
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export default function TeacherView({
  user,
  addNotification,
  activeTabSignal,
}: {
  user: any;
  addNotification: (record: any) => void;
  activeTabSignal?: string;
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TeacherTab>("recordings");
  const [highlightRecordId, setHighlightRecordId] = useState<string | null>(
    null,
  );
  const [selectedStudent, setSelectedStudent] = useState<{
    name: string;
    avatar?: string;
  } | null>(() => {
    const name = readStudentFromUrl();
    return name ? { name } : null;
  });
  const skipNextUrlPush = useRef(true);

  // Keep the URL's `student` param in sync with the selected student so the
  // browser back/forward buttons can navigate between the list and detail views
  useEffect(() => {
    if (skipNextUrlPush.current) {
      skipNextUrlPush.current = false;
      return;
    }
    const url = new URL(window.location.href);
    if (selectedStudent) {
      url.searchParams.set(STUDENT_PARAM, selectedStudent.name);
    } else {
      url.searchParams.delete(STUDENT_PARAM);
    }
    if (url.toString() !== window.location.href) {
      window.history.pushState(
        { studentName: selectedStudent?.name ?? null },
        "",
        url,
      );
    }
  }, [selectedStudent]);

  // React to browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const name = readStudentFromUrl();
      skipNextUrlPush.current = true;
      setSelectedStudent((prev) => {
        if (!name) return null;
        if (prev?.name === name) return prev;
        return { name };
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!activeTabSignal) return;
    if (activeTabSignal.startsWith("recordings:")) {
      const recordId = activeTabSignal.replace("recordings:", "");
      setActiveTab("recordings");
      setHighlightRecordId(recordId);
    } else {
      setActiveTab(activeTabSignal as TeacherTab);
      setSelectedStudent(null);
      setHighlightRecordId(null);
    }
  }, [activeTabSignal]);

  const {
    summaries,
    loading,
    appError,
    deleteTargetId,
    setDeleteTargetId,
    confirmDelete,
  } = useRecordings(user, {
    onNewRecording: addNotification,
  });

  // When a notification points to a record, resolve its student and open the detail view
  useEffect(() => {
    if (!highlightRecordId || selectedStudent) return;
    let cancelled = false;
    supabase
      .from("recordings")
      .select("studentName")
      .eq("id", highlightRecordId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.studentName) return;
        setSelectedStudent({ name: data.studentName });
      });
    return () => {
      cancelled = true;
    };
  }, [highlightRecordId, selectedStudent]);

  // Fade out the highlight a few seconds after the student view has had time to scroll to it
  useEffect(() => {
    if (!highlightRecordId || !selectedStudent) return;
    const timer = setTimeout(() => setHighlightRecordId(null), 4000);
    return () => clearTimeout(timer);
  }, [highlightRecordId, selectedStudent]);

  return (
    <div className="animate-in fade-in duration-500 min-h-screen flex flex-col">
      <OfflineBanner />
      <div className="flex gap-5 flex-1 items-start">
        <TeacherSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 min-w-0 space-y-4 pb-20 md:pb-0">
          {activeTab === "recordings" && appError && (
            <div className="bg-[#FFEBEE] border-2 border-[#FFCDD2] text-rose-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span className="font-bold">{appError}</span>
            </div>
          )}

          {activeTab === "recordings" &&
            (selectedStudent ? (
              <StudentSubmissionsView
                studentName={selectedStudent.name}
                avatar={selectedStudent.avatar}
                formatDate={formatDate}
                onDeleteRequest={(id) => setDeleteTargetId(id)}
                onBack={() => {
                  setSelectedStudent(null);
                  setHighlightRecordId(null);
                }}
                highlightRecordId={highlightRecordId}
              />
            ) : (
              <RecordingsPanel
                summaries={summaries}
                loading={loading}
                formatDate={formatDate}
                onDeleteRequest={(id) => setDeleteTargetId(id)}
                onSelectStudent={(name, avatar) =>
                  setSelectedStudent({ name, avatar })
                }
              />
            ))}
          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              </div>
            }
          >
            {activeTab === "topics" && <TopicsManager />}
            {activeTab === "students" && <StudentsManager />}
            {activeTab === "stories" && <StoriesManager />}
            {activeTab === "vocabulary" && <VocabularyManager />}
          </Suspense>
        </div>
      </div>

      {deleteTargetId !== null && (
        <DeleteConfirmModal
          title={t.common.deleteRecordingTitle}
          description={t.common.deleteRecordingDesc}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
    </div>
  );
}
