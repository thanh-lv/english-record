import { AlertCircle } from "lucide-react";
import { useLanguage } from "./i18n/LanguageContext";
import { RecordingsPanel } from "./components/teacher/RecordingsPanel";
import { StoriesManager } from "./components/teacher/StoriesManager";
import { StudentsManager } from "./components/teacher/StudentsManager";
import {
  TeacherSidebar,
  TeacherTab,
} from "./components/teacher/TeacherSidebar";
import { TopicsManager } from "./components/teacher/TopicsManager";
import { VocabularyManager } from "./components/teacher/VocabularyManager";
import { DeleteConfirmModal } from "./components/teacher/DeleteConfirmModal";
import { useRecordings } from "./components/teacher/hooks/useRecordings";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!activeTabSignal) return;
    if (activeTabSignal.startsWith("recordings:")) {
      const recordId = activeTabSignal.replace("recordings:", "");
      setActiveTab("recordings");
      setHighlightRecordId(recordId);
      setTimeout(() => setHighlightRecordId(null), 2000);
    } else {
      setActiveTab(activeTabSignal as TeacherTab);
    }
  }, [activeTabSignal]);

  const {
    recordings,
    loading,
    appError,
    deleteTargetId,
    setDeleteTargetId,
    confirmDelete,
  } = useRecordings(user, {
    onNewRecording: addNotification,
  });

  return (
    <div className="animate-in fade-in duration-500 min-h-screen flex flex-col">
      <div className="flex gap-5 flex-1 items-start">
        <TeacherSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 min-w-0 space-y-4 pb-20 md:pb-0">
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
              highlightRecordId={highlightRecordId}
            />
          )}
          {activeTab === "topics" && <TopicsManager />}
          {activeTab === "students" && <StudentsManager />}
          {activeTab === "stories" && <StoriesManager />}
          {activeTab === "vocabulary" && <VocabularyManager />}
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
