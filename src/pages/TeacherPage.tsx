import { AlertCircle } from 'lucide-react';
import { Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { RecordingsManager } from '../components/teacher/recordings/RecordingsManager';
import { StudentSubmissionsView } from '../components/teacher/students/StudentSubmissionsView';
import { TeacherSidebar } from '../components/teacher/shared/TeacherSidebar';
import { DeleteConfirmModal } from '../components/teacher/shared/DeleteConfirmModal';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { useRecordings } from '../components/teacher/hooks/useRecordings';
import { supabase } from '../lib/supabase';
import { lazy, Suspense, useEffect } from 'react';

const StoriesManager = lazy(() =>
  import('../components/teacher/stories/StoriesManager').then(m => ({
    default: m.StoriesManager,
  }))
);
const StudentsManager = lazy(() =>
  import('../components/teacher/students/StudentsManager').then(m => ({
    default: m.StudentsManager,
  }))
);
const TopicsManager = lazy(() =>
  import('../components/teacher/topics/TopicsManager').then(m => ({
    default: m.TopicsManager,
  }))
);
const VocabularyManager = lazy(() =>
  import('../components/teacher/vocabulary/VocabularyManager').then(m => ({
    default: m.VocabularyManager,
  }))
);
const ShadowingManager = lazy(() =>
  import('../components/teacher/shadowing/ShadowingManager').then(m => ({
    default: m.ShadowingManager,
  }))
);
const VocabAudioBuilder = lazy(() =>
  import('../components/teacher/vocabulary/VocabAudioBuilder').then(m => ({
    default: m.VocabAudioBuilder,
  }))
);
const AttendanceManager = lazy(() =>
  import('../components/teacher/attendance/AttendanceManager').then(m => ({
    default: m.AttendanceManager,
  }))
);
const LogsManager = lazy(() =>
  import('../components/teacher/logs/LogsManager').then(m => ({
    default: m.LogsManager,
  }))
);

const formatDate = (timestamp: string) => {
  const d = new Date(timestamp);
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

function RecordingsListRoute({
  summaries,
  loading,
  appError,
  onDeleteRequest,
}: {
  summaries: any[];
  loading: boolean;
  appError: string;
  onDeleteRequest: (id: string) => void;
}) {
  const navigate = useNavigate();
  return (
    <>
      {appError && (
        <div className="bg-[#FFEBEE] border-2 border-[#FFCDD2] text-rose-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span className="font-bold">{appError}</span>
        </div>
      )}
      <RecordingsManager
        summaries={summaries}
        loading={loading}
        formatDate={formatDate}
        onDeleteRequest={onDeleteRequest}
        onSelectStudent={name => navigate(`/teacher/recordings/${encodeURIComponent(name)}`)}
      />
    </>
  );
}

function StudentDetailRoute({
  highlightRecordId,
  onClearHighlight,
  onDeleteRequest,
}: {
  highlightRecordId: string | null;
  onClearHighlight: () => void;
  onDeleteRequest: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { studentName } = useParams<{ studentName: string }>();

  useEffect(() => {
    if (!highlightRecordId) return;
    const timer = setTimeout(onClearHighlight, 4000);
    return () => clearTimeout(timer);
  }, [highlightRecordId, onClearHighlight]);

  if (!studentName) return <Navigate to="/teacher/recordings" replace />;

  return (
    <StudentSubmissionsView
      studentName={decodeURIComponent(studentName)}
      formatDate={formatDate}
      onDeleteRequest={onDeleteRequest}
      onBack={() => navigate('/teacher/recordings')}
      highlightRecordId={highlightRecordId}
    />
  );
}

export default function TeacherPage({
  user,
  addNotification,
}: {
  user: any;
  addNotification: (record: any) => void;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightRecordId = searchParams.get('highlight');

  const { summaries, loading, appError, deleteTargetId, setDeleteTargetId, confirmDelete } =
    useRecordings(user, {
      onNewRecording: addNotification,
    });

  const clearHighlight = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('highlight');
    setSearchParams(next, { replace: true });
  };

  // When a notification points to a record, resolve its student and open the detail view
  useEffect(() => {
    if (!highlightRecordId) return;
    let cancelled = false;
    supabase
      .from('recordings')
      .select('student_name')
      .eq('id', highlightRecordId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.student_name) return;
        navigate(
          `/teacher/recordings/${encodeURIComponent(data.student_name)}?highlight=${highlightRecordId}`,
          { replace: true }
        );
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightRecordId]);

  return (
    <div className="animate-in fade-in duration-500 min-h-[100dvh] flex flex-col">
      <OfflineBanner />
      <div className="flex gap-6 flex-1 items-start w-full">
        <TeacherSidebar />

        <div className="flex-1 min-w-0 space-y-4">
          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-lg animate-spin" />
              </div>
            }
          >
            <Routes>
              <Route index element={<Navigate to="recordings" replace />} />
              <Route
                path="recordings"
                element={
                  <RecordingsListRoute
                    summaries={summaries}
                    loading={loading}
                    appError={appError}
                    onDeleteRequest={id => setDeleteTargetId(id)}
                  />
                }
              />
              <Route
                path="recordings/:studentName"
                element={
                  <StudentDetailRoute
                    highlightRecordId={highlightRecordId}
                    onClearHighlight={clearHighlight}
                    onDeleteRequest={id => setDeleteTargetId(id)}
                  />
                }
              />
              <Route path="topics" element={<TopicsManager />} />
              <Route
                path="students"
                element={
                  <StudentsManager
                    onSelectStudent={(name, avatar) =>
                      navigate(
                        `/teacher/submissions/${encodeURIComponent(name)}${avatar ? `?avatar=${encodeURIComponent(avatar)}` : ''}`
                      )
                    }
                  />
                }
              />
              <Route path="attendance" element={<AttendanceManager />} />
              <Route path="stories" element={<StoriesManager />} />
              <Route path="vocabulary" element={<VocabularyManager />} />
              <Route path="shadowing" element={<ShadowingManager />} />
              <Route path="audio-builder" element={<VocabAudioBuilder />} />
              <Route path="logs" element={<LogsManager />} />
              <Route path="*" element={<Navigate to="/teacher/recordings" replace />} />
            </Routes>
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

export const TeacherView = TeacherPage;
