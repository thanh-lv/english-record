import { lazy, Suspense, useMemo } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ExercisesTab } from '../components/student/exercises/ExercisesTab';
import { AvatarSelectModal } from '../components/student/shared/AvatarSelectModal';
import { CompletionCelebration } from '../components/student/achievements/CompletionCelebration';
import { StoryModal } from '../components/student/stories/StoryModal';
import { StudentSidebar } from '../components/student/shared/StudentSidebar';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { TopicModal } from '../components/student/exercises/TopicModal';
import {
  useAvatar,
  useRecording,
  useStudentData,
  useStoryPlayer,
  useCelebrationTrigger,
  useTopicModalSession,
} from '../components/student/hooks';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { getCompletedTopicNumbers } from '../utils/topicCompletion';

const AchievementsTab = lazy(() =>
  import('../components/student/achievements/AchievementsTab').then(m => ({
    default: m.AchievementsTab,
  }))
);
const FlashcardsTab = lazy(() =>
  import('../components/student/flashcards/FlashcardsTab').then(m => ({
    default: m.FlashcardsTab,
  }))
);
const GamesTab = lazy(() =>
  import('../components/student/games/GamesTab').then(m => ({
    default: m.GamesTab,
  }))
);
const StoriesTab = lazy(() =>
  import('../components/student/stories/StoriesTab').then(m => ({
    default: m.StoriesTab,
  }))
);
const ShadowingTab = lazy(() =>
  import('../components/student/shadowing/ShadowingTab').then(m => ({
    default: m.ShadowingTab,
  }))
);
const ShadowingDetail = lazy(() =>
  import('../components/student/shadowing/ShadowingDetail').then(m => ({
    default: m.ShadowingDetail,
  }))
);

export default function StudentPage({ user, profile }: { user: any; profile: any }) {
  const navigate = useNavigate();
  const isBongBe = profile.name.toLowerCase().trim() === 'bông bé';
  const studentAge = new Date().getFullYear() - (profile.year_born || 2015);

  const {
    activeTopics,
    topicsLoading,
    myRecordings,
    setMyRecordings,
    setCompletedNumbers,
    dbStories,
    streak,
  } = useStudentData(user, profile, isBongBe, studentAge);

  const { currentAvatar, showAvatarSelect, setShowAvatarSelect, changeAvatar } = useAvatar(profile);

  const { selectedStory, isPlayingStoryAudio, playStoryAudio, closeStoryModal, setSelectedStory } =
    useStoryPlayer();

  const completedTopicNumbers = useMemo(
    () => getCompletedTopicNumbers(activeTopics, myRecordings),
    [activeTopics, myRecordings]
  );

  const { showCelebration, closeCelebration } = useCelebrationTrigger(
    completedTopicNumbers,
    topicsLoading,
    activeTopics.length
  );

  const topicSession = useTopicModalSession({
    activeTopics,
    myRecordings,
    isBongBe,
    onModalReset: () => {
      recording.resetAudio();
      recording.setAppError('');
    },
  });

  const recording = useRecording({
    user,
    profile,
    selectedNumber: topicSession.selectedNumber,
    currentTopic: topicSession.currentTopic,
    activeQuestionIndex: topicSession.activeQuestionIndex,
    existingRecordingId: topicSession.retryRecordingRef.current?.id ?? null,
    onSaveSuccess: (saved, completedNumber) => {
      const oldId = topicSession.retryRecordingRef.current?.id;
      setMyRecordings(prev => {
        const withoutOld = oldId ? prev.filter(r => r.id !== oldId) : prev;
        return [...withoutOld, ...saved];
      });
      setCompletedNumbers(prev => {
        if (completedNumber && !prev.includes(completedNumber)) {
          return [...prev, completedNumber];
        }
        return prev;
      });
      topicSession.setSelectedNumber(null);
      topicSession.setCurrentTopic(null);
    },
  });

  const totalNumbers = useMemo(
    () => Array.from({ length: activeTopics.length }, (_, i) => i + 1),
    [activeTopics.length]
  );

  useKeyboardShortcuts({
    isModalOpen: !!topicSession.selectedNumber,
    isRecording: recording.isRecording,
    onPlayPause: () => topicSession.playTopicAudio(),
    onStartRecord: () => {
      recording.startRecording({
        preventDefault: () => {},
        stopPropagation: () => {},
      } as React.MouseEvent);
    },
    onStopRecord: () => recording.stopRecording(),
    onClose: topicSession.closeTopicModal,
  });

  if (topicsLoading) {
    return (
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 animate-pulse">
        <OfflineBanner />
        <div className="hidden md:block w-64 shrink-0 space-y-4">
          <div className="h-48 bg-slate-100 rounded-lg" />
          <div className="h-36 bg-slate-100 rounded-lg" />
        </div>
        <div className="md:hidden h-16 bg-slate-100 rounded-lg mb-1" />
        <div className="flex-1 space-y-4">
          <div className="bg-white/70 p-6 rounded-lg border-3 border-white shadow-md space-y-4">
            <div className="h-6 w-40 bg-slate-100 rounded-lg" />
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 animate-in fade-in duration-500">
      <OfflineBanner />
      <StudentSidebar
        profile={profile}
        currentAvatar={currentAvatar}
        completedNumbers={completedTopicNumbers}
        streak={streak}
        onAvatarClick={() => setShowAvatarSelect(true)}
      />

      <div className="flex-1 min-w-0 space-y-6">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="w-7 h-7 text-[#1E88E5] animate-spin" />
              <p className="text-xs font-bold text-slate-400">Đang tải...</p>
            </div>
          }
        >
          <Routes>
            <Route index element={<Navigate to="exercises" replace />} />
            <Route
              path="exercises"
              element={
                <ExercisesTab
                  activeTopics={activeTopics}
                  isBongBe={isBongBe}
                  completedNumbers={completedTopicNumbers}
                  myRecordings={myRecordings}
                  onTopicClick={topicSession.openTopicModal}
                  studentGrade={profile?.grade}
                />
              }
            />
            <Route
              path="achievements"
              element={
                <AchievementsTab
                  totalNumbers={totalNumbers}
                  completedNumbers={completedTopicNumbers}
                />
              }
            />
            <Route
              path="stories"
              element={
                <StoriesTab
                  dbStories={dbStories}
                  profile={profile}
                  studentAge={studentAge}
                  onStoryClick={setSelectedStory}
                />
              }
            />
            <Route path="flashcards" element={<FlashcardsTab studentGrade={profile?.grade} />} />
            <Route path="games" element={<GamesTab studentGrade={profile?.grade} />} />
            <Route
              path="shadowing"
              element={
                <ShadowingTab
                  studentGrade={profile?.grade}
                  myRecordings={myRecordings}
                  onVideoClick={v => navigate(`/student/shadowing/${v.id}`)}
                />
              }
            />
            <Route
              path="shadowing/:videoId"
              element={
                <ShadowingDetail
                  user={user}
                  profile={profile}
                  myRecordings={myRecordings}
                  onSaveSuccess={saved => setMyRecordings(prev => [...prev, ...saved])}
                />
              }
            />
            <Route path="*" element={<Navigate to="/student/exercises" replace />} />
          </Routes>
        </Suspense>
      </div>

      {topicSession.selectedNumber && topicSession.currentTopic && (
        <TopicModal
          selectedNumber={topicSession.selectedNumber}
          currentTopic={topicSession.currentTopic}
          isBongBe={isBongBe}
          activeQuestionIndex={topicSession.activeQuestionIndex}
          topicImage={topicSession.topicImage}
          imageLoading={false}
          topicAudio={topicSession.topicAudio}
          ttsLoading={false}
          isPlayingTopicAudio={topicSession.isPlayingTopicAudio}
          isRecording={recording.isRecording}
          recordingTime={recording.recordingTime}
          bongBeAudios={recording.bongBeAudios}
          isSaving={recording.isSaving}
          appError={recording.appError}
          matchedQuestionRecording={topicSession.matchedQuestionRecording}
          isTopicFullyRecorded={topicSession.isTopicFullyRecorded}
          hasPendingAudios={recording.hasPendingAudios}
          canRetry={topicSession.canRetry}
          onClose={topicSession.closeTopicModal}
          onPlayTopicAudio={topicSession.playTopicAudio}
          onStartRecording={recording.startRecording}
          onStopRecording={recording.stopRecording}
          onSaveRecording={recording.saveRecording}
          onDeleteBongBeAudio={(questionIndex, e) => {
            e.preventDefault();
            e.stopPropagation();
            recording.setBongBeAudios(prev => {
              const next = { ...prev };
              delete next[questionIndex];
              return next;
            });
          }}
          onQuestionChange={topicSession.setActiveQuestionIndex}
          onDismissError={e => {
            e.preventDefault();
            e.stopPropagation();
            recording.setAppError('');
          }}
          formatTime={recording.formatTime}
        />
      )}

      {showAvatarSelect && (
        <AvatarSelectModal
          currentAvatar={currentAvatar}
          onSelect={changeAvatar}
          onClose={() => setShowAvatarSelect(false)}
        />
      )}

      {selectedStory && (
        <StoryModal
          story={selectedStory}
          isPlayingAudio={isPlayingStoryAudio}
          onClose={closeStoryModal}
          onPlayAudio={playStoryAudio}
        />
      )}

      <CompletionCelebration
        show={showCelebration}
        completedCount={completedTopicNumbers.length}
        totalTopics={activeTopics.length}
        onClose={closeCelebration}
      />
    </div>
  );
}

export const StudentView = StudentPage;
