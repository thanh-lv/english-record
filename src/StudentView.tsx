import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AchievementsTab } from "./components/student/achievements/AchievementsTab";
import { AvatarSelectModal } from "./components/student/shared/AvatarSelectModal";
import { CompletionCelebration } from "./components/student/achievements/CompletionCelebration";
import { ExercisesTab } from "./components/student/exercises/ExercisesTab";
import { FlashcardsTab } from "./components/student/flashcards/FlashcardsTab";
import { GamesTab } from "./components/student/games/GamesTab";
import { StoriesTab } from "./components/student/stories/StoriesTab";
import { StoryModal } from "./components/student/stories/StoryModal";
import { ShadowingTab } from "./components/student/shadowing/ShadowingTab";
import { ShadowingDetail } from "./components/student/shadowing/ShadowingDetail";
import { StudentSidebar } from "./components/student/shared/StudentSidebar";
import { OfflineBanner } from "./components/common/OfflineBanner";
import { TopicModal } from "./components/student/exercises/TopicModal";
import { useAvatar } from "./components/student/hooks/useAvatar";
import { useRecording } from "./components/student/hooks/useRecording";
import { useStudentData } from "./components/student/hooks/useStudentData";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

export default function StudentView({
  user,
  profile,
}: {
  user: any;
  profile: any;
}) {
  const isBongBe = profile.name.toLowerCase().trim() === "bông bé";
  const studentAge = new Date().getFullYear() - (profile.year_born || 2015);

  const {
    activeTopics,
    topicsLoading,
    myRecordings,
    setMyRecordings,
    completedNumbers,
    setCompletedNumbers,
    dbStories,
    streak,
  } = useStudentData(user, profile, isBongBe, studentAge);

  const { currentAvatar, showAvatarSelect, setShowAvatarSelect, changeAvatar } =
    useAvatar(profile);

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

  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [isPlayingStoryAudio, setIsPlayingStoryAudio] = useState(false);

  const topicAudioRef = useRef<HTMLAudioElement | null>(null);

  const isDataReady = useRef(false);

  useEffect(() => {
    if (topicsLoading || activeTopics.length === 0) return;

    const fullyCompletedCount = activeTopics.filter(
      (topic: any, idx: number) => {
        const topicNum = idx + 1;
        const hasGlobalRecording = myRecordings.some(
          (r: any) =>
            r.topic_number === topicNum && !r.question_id && !r.question_text,
        );
        if (hasGlobalRecording) return true;
        const questions: any[] = topic.questions || [];
        if (questions.length === 0)
          return myRecordings.some((r: any) => r.topic_number === topicNum);
        return questions.every((q: any) =>
          myRecordings.some(
            (r: any) =>
              r.topic_number === topicNum &&
              (r.question_id === q.id || r.question_text === q.text),
          ),
        );
      },
    ).length;

    if (!isDataReady.current) {
      isDataReady.current = true;
      prevCompletedCount.current = fullyCompletedCount;
      return;
    }

    if (fullyCompletedCount > prevCompletedCount.current) {
      setShowCelebration(true);
    }
    prevCompletedCount.current = fullyCompletedCount;
  }, [myRecordings, activeTopics, topicsLoading]);

  const retryRecordingRef = useRef<{ id: string; topic_number: number } | null>(
    null,
  );

  const recording = useRecording({
    user,
    profile,
    selectedNumber,
    currentTopic,
    activeQuestionIndex,
    existingRecordingId: retryRecordingRef.current?.id ?? null,
    onSaveSuccess: (saved, completedNumber) => {
      const oldId = retryRecordingRef.current?.id;
      setMyRecordings((prev) => {
        const withoutOld = oldId ? prev.filter((r) => r.id !== oldId) : prev;
        return [...withoutOld, ...saved];
      });
      setCompletedNumbers((prev) => {
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

    setTopicAudio("browser_tts");
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
    recording.setAppError("");
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
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      utterance.onend = () => setIsPlayingTopicAudio(false);
      utterance.onerror = () => setIsPlayingTopicAudio(false);

      setIsPlayingTopicAudio(true);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const playStoryAudio = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedStory) return;

    if (isPlayingStoryAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingStoryAudio(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(selectedStory.content);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      utterance.onend = () => setIsPlayingStoryAudio(false);
      utterance.onerror = () => setIsPlayingStoryAudio(false);

      setIsPlayingStoryAudio(true);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const closeStoryModal = () => {
    window.speechSynthesis.cancel();
    setIsPlayingStoryAudio(false);
    setSelectedStory(null);
  };

  const currentQuestionId = currentTopic?.questions?.[activeQuestionIndex]?.id;
  const currentQuestionText =
    currentTopic?.questions?.[activeQuestionIndex]?.text;

  const matchedRecording = myRecordings.find(
    (rec) => rec.topic_number === selectedNumber,
  );

  const canRetry =
    !isBongBe &&
    !!matchedRecording &&
    matchedRecording.teacher_rating > 0 &&
    matchedRecording.teacher_rating <= 3;

  retryRecordingRef.current =
    canRetry && matchedRecording
      ? { id: matchedRecording.id, topic_number: matchedRecording.topic_number }
      : null;

  const matchedQuestionRecording =
    currentTopic && currentQuestionId
      ? myRecordings.find(
          (rec) =>
            rec.topic_number === selectedNumber &&
            (rec.question_id === currentQuestionId ||
              rec.question_text === currentQuestionText),
        )
      : null;

  const isTopicFullyRecorded = currentTopic
    ? currentTopic.questions.every((q: any) =>
        myRecordings.some(
          (rec) =>
            rec.topic_number === selectedNumber &&
            (rec.question_id === q.id || rec.question_text === q.text),
        ),
      ) ||
      (!!matchedRecording &&
        !matchedRecording.question_id &&
        !matchedRecording.question_text)
    : false;

  const totalNumbers = Array.from(
    { length: activeTopics.length },
    (_, i) => i + 1,
  );

  // Standard topics: completed = any recording with matching topic_number.
  // Bông bé multi-question topics: every question must have a recording.
  const completedTopicNumbers = activeTopics
    .filter((topic: any, idx: number) => {
      const topicNum = idx + 1; // selectedNumber is 1-based, matches topic_number in recordings
      const hasGlobalRecording = myRecordings.some(
        (r: any) =>
          r.topic_number === topicNum && !r.question_id && !r.question_text,
      );
      if (hasGlobalRecording) return true;
      const questions: any[] = topic.questions || [];
      if (questions.length === 0)
        return myRecordings.some((r: any) => r.topic_number === topicNum);
      return questions.every((q: any) =>
        myRecordings.some(
          (r: any) =>
            r.topic_number === topicNum &&
            (r.question_id === q.id || r.question_text === q.text),
        ),
      );
    })
    .map((_: any, idx: number) => idx + 1);

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
        completedNumbers={completedNumbers}
        streak={streak}
        onAvatarClick={() => setShowAvatarSelect(true)}
      />

      <div className="flex-1 min-w-0 space-y-6">
        <Routes>
          <Route index element={<Navigate to="exercises" replace />} />
          <Route
            path="exercises"
            element={
              <ExercisesTab
                activeTopics={activeTopics}
                isBongBe={isBongBe}
                completedNumbers={completedNumbers}
                myRecordings={myRecordings}
                onTopicClick={handleNumberClick}
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
          <Route
            path="flashcards"
            element={<FlashcardsTab studentAge={studentAge} />}
          />
          <Route path="games" element={<GamesTab studentAge={studentAge} />} />
          <Route
            path="shadowing"
            element={
              <ShadowingTab
                onVideoClick={(v) => navigate(`/student/shadowing/${v.id}`)}
              />
            }
          />
          <Route
            path="shadowing/:videoId"
            element={
              <ShadowingDetail
                user={user}
                profile={profile}
                onSaveSuccess={(saved) =>
                  setMyRecordings((prev) => [...prev, ...saved])
                }
              />
            }
          />
          <Route
            path="*"
            element={<Navigate to="/student/exercises" replace />}
          />
        </Routes>
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
          audioBase64={recording.audioBase64}
          bongBeAudios={recording.bongBeAudios}
          isSaving={recording.isSaving}
          appError={recording.appError}
          matchedRecording={matchedRecording}
          matchedQuestionRecording={matchedQuestionRecording}
          isTopicFullyRecorded={isTopicFullyRecorded}
          hasPendingAudios={recording.hasPendingAudios}
          canRetry={canRetry}
          onClose={handleCloseTopicModal}
          onPlayTopicAudio={playTopicAudio}
          onStartRecording={recording.startRecording}
          onStopRecording={recording.stopRecording}
          onSaveRecording={recording.saveRecording}
          onDeleteAudio={(e) => {
            e.preventDefault();
            e.stopPropagation();
            recording.setAudioBase64(null);
          }}
          onDeleteBongBeAudio={(questionIndex, e) => {
            e.preventDefault();
            e.stopPropagation();
            recording.setBongBeAudios((prev) => {
              const next = { ...prev };
              delete next[questionIndex];
              return next;
            });
          }}
          onQuestionChange={setActiveQuestionIndex}
          onDismissError={(e) => {
            e.preventDefault();
            e.stopPropagation();
            recording.setAppError("");
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
