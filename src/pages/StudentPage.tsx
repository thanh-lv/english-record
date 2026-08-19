import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ExercisesTab } from '../components/student/exercises/ExercisesTab';
import { AvatarSelectModal } from '../components/student/shared/AvatarSelectModal';
import { CompletionCelebration } from '../components/student/achievements/CompletionCelebration';
import { StoryModal } from '../components/student/stories/StoryModal';
import { StudentSidebar } from '../components/student/shared/StudentSidebar';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { TopicModal } from '../components/student/exercises/TopicModal';
import { useAvatar } from '../components/student/hooks/useAvatar';
import { useRecording } from '../components/student/hooks/useRecording';
import { useStudentData } from '../components/student/hooks/useStudentData';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useStoryPlayer } from '../components/student/hooks/useStoryPlayer';
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

  const { selectedStory, setSelectedStory, isPlayingStoryAudio, playStoryAudio, closeStoryModal } =
    useStoryPlayer();

  const completedTopicNumbers = useMemo(
    () => getCompletedTopicNumbers(activeTopics, myRecordings),
    [activeTopics, myRecordings]
  );

  const [showCelebration, setShowCelebration] = useState(false);
  const prevCompletedCount = useRef(0);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [currentTopic, setCurrentTopic] = useState<any>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const [topicImage, setTopicImage] = useState<string | null>(null);
  const [imageLoading] = useState(false);
  const [topicAudio, setTopicAudio] = useState<string | null>(null);
  const [ttsLoading] = useState(false);
  const [isPlayingTopicAudio, setIsPlayingTopicAudio] = useState(false);

  const topicAudioRef = useRef<HTMLAudioElement | null>(null);

  const isDataReady = useRef(false);

  useEffect(() => {
    if (topicsLoading || activeTopics.length === 0) return;

    const fullyCompletedCount = completedTopicNumbers.length;

    if (!isDataReady.current) {
      isDataReady.current = true;
      prevCompletedCount.current = fullyCompletedCount;
      return;
    }

    if (fullyCompletedCount > prevCompletedCount.current) {
      setShowCelebration(true);
    }
    prevCompletedCount.current = fullyCompletedCount;
  }, [completedTopicNumbers, topicsLoading, activeTopics.length]);

  const retryRecordingRef = useRef<{ id: string; topic_number: number } | null>(null);

  const recording = useRecording({
    user,
    profile,
    selectedNumber,
    currentTopic,
    activeQuestionIndex,
    existingRecordingId: retryRecordingRef.current?.id ?? null,
    onSaveSuccess: (saved, completedNumber) => {
      const oldId = retryRecordingRef.current?.id;
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
      setSelectedNumber(null);
      setCurrentTopic(null);
    },
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedNumber) return;

    const topic = activeTopics[selectedNumber - 1];
    if (!topic) return;

    setTopicImage(null);
    setIsPlayingTopicAudio(false);

    const activeQuestion = topic.questions[activeQuestionIndex] || null;
    if (activeQuestion?.image_url) {
      setTopicImage(activeQuestion.image_url);
    }

    setTopicAudio('browser_tts');
  }, [selectedNumber, activeQuestionIndex]);

  const handleNumberClick = (num: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const topicData = activeTopics[num - 1];
    if (!topicData) return;
    setSelectedNumber(num);
    setCurrentTopic(topicData);
    setActiveQuestionIndex(0);
    recording.resetAudio();
    recording.setAppError('');
  };

  const handleCloseTopicModal = () => {
    if (topicAudioRef.current) topicAudioRef.current.pause();
    window.speechSynthesis.cancel();
    setIsPlayingTopicAudio(false);
    setSelectedNumber(null);
    setCurrentTopic(null);
  };

  const playTopicAudio = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!topicAudio || !currentTopic) return;

    if (isPlayingTopicAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingTopicAudio(false);
    } else {
      const activeQuestion = currentTopic.questions?.[activeQuestionIndex];
      const questionsText = activeQuestion?.text || currentTopic.title;

      const utterance = new SpeechSynthesisUtterance(questionsText);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      utterance.onend = () => setIsPlayingTopicAudio(false);
      utterance.onerror = () => setIsPlayingTopicAudio(false);

      setIsPlayingTopicAudio(true);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const currentQuestionId = currentTopic?.questions?.[activeQuestionIndex]?.id;
  const currentQuestionText = currentTopic?.questions?.[activeQuestionIndex]?.text;

  const matchedRecording = myRecordings.find(rec => rec.topic_number === selectedNumber);

  const canRetry =
    !isBongBe &&
    !!matchedRecording &&
    matchedRecording.teacher_rating != null &&
    matchedRecording.teacher_rating > 0 &&
    matchedRecording.teacher_rating <= 3;

  retryRecordingRef.current =
    canRetry && matchedRecording && matchedRecording.topic_number != null
      ? { id: matchedRecording.id, topic_number: Number(matchedRecording.topic_number) }
      : null;

  const matchedQuestionRecording =
    currentTopic && currentQuestionId
      ? myRecordings.find(
          rec =>
            rec.topic_number === selectedNumber &&
            (rec.question_id === currentQuestionId || rec.question_text === currentQuestionText)
        )
      : null;

  const isTopicFullyRecorded = currentTopic
    ? currentTopic.questions.every((q: any) =>
        myRecordings.some(
          rec =>
            rec.topic_number === selectedNumber &&
            (rec.question_id === q.id || rec.question_text === q.text)
        )
      ) ||
      (!!matchedRecording && !matchedRecording.question_id && !matchedRecording.question_text)
    : false;

  const totalNumbers = Array.from({ length: activeTopics.length }, (_, i) => i + 1);

  useKeyboardShortcuts({
    isModalOpen: !!selectedNumber,
    isRecording: recording.isRecording,
    onPlayPause: () => {
      if (!topicAudio || !currentTopic) return;
      playTopicAudio({
        preventDefault: () => {},
        stopPropagation: () => {},
      } as React.MouseEvent);
    },
    onStartRecord: () => {
      recording.startRecording({
        preventDefault: () => {},
        stopPropagation: () => {},
      } as React.MouseEvent);
    },
    onStopRecord: () => {
      recording.stopRecording();
    },
    onClose: handleCloseTopicModal,
  });

  if (topicsLoading) {
    return (
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 animate-pulse">
        <OfflineBanner />
        {/* Sidebar skeleton */}
        <div className="hidden md:block w-64 shrink-0 space-y-4">
          <div className="h-48 bg-slate-100 rounded-lg" />
          <div className="h-36 bg-slate-100 rounded-lg" />
        </div>
        {/* Mobile profile bar skeleton */}
        <div className="md:hidden h-16 bg-slate-100 rounded-lg mb-1" />
        {/* Content skeleton */}
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
                  onTopicClick={handleNumberClick}
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

      {selectedNumber && currentTopic && (
        <TopicModal
          selectedNumber={selectedNumber}
          currentTopic={currentTopic}
          isBongBe={isBongBe}
          activeQuestionIndex={activeQuestionIndex}
          topicImage={topicImage}
          imageLoading={imageLoading}
          topicAudio={topicAudio}
          ttsLoading={ttsLoading}
          isPlayingTopicAudio={isPlayingTopicAudio}
          isRecording={recording.isRecording}
          recordingTime={recording.recordingTime}
          bongBeAudios={recording.bongBeAudios}
          isSaving={recording.isSaving}
          appError={recording.appError}
          matchedQuestionRecording={matchedQuestionRecording}
          isTopicFullyRecorded={isTopicFullyRecorded}
          hasPendingAudios={recording.hasPendingAudios}
          canRetry={canRetry}
          onClose={handleCloseTopicModal}
          onPlayTopicAudio={playTopicAudio}
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
          onQuestionChange={setActiveQuestionIndex}
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
        onClose={() => setShowCelebration(false)}
      />
    </div>
  );
}

export const StudentView = StudentPage;
