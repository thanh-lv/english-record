import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AchievementsTab } from "./components/student/AchievementsTab";
import { AvatarSelectModal } from "./components/student/AvatarSelectModal";
import { CompletionCelebration } from "./components/student/CompletionCelebration";
import { ExercisesTab } from "./components/student/ExercisesTab";
import { FlashcardsTab } from "./components/student/FlashcardsTab";
import { GamesTab } from "./components/student/GamesTab";
import { StoriesTab } from "./components/student/StoriesTab";
import { StoryModal } from "./components/student/StoryModal";
import { ShadowingTab } from "./components/student/ShadowingTab";
import { ShadowingModal } from "./components/student/ShadowingModal";
import { StudentSidebar } from "./components/student/StudentSidebar";
import { OfflineBanner } from "./components/common/OfflineBanner";
import { TopicModal } from "./components/student/TopicModal";
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

  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  const topicAudioRef = useRef<HTMLAudioElement | null>(null);

  const isDataReady = useRef(false);

  useEffect(() => {
    if (topicsLoading || activeTopics.length === 0) return;

    const fullyCompletedCount = activeTopics.filter(
      (topic: any, idx: number) => {
        const topicNum = idx + 1;
        const hasGlobalRecording = myRecordings.some(
          (r: any) =>
            r.topicNumber === topicNum && !r.question_id && !r.questionText,
        );
        if (hasGlobalRecording) return true;
        const questions: any[] = topic.questions || [];
        if (questions.length === 0)
          return myRecordings.some((r: any) => r.topicNumber === topicNum);
        return questions.every((q: any) =>
          myRecordings.some(
            (r: any) =>
              r.topicNumber === topicNum &&
              (r.question_id === q.id || r.questionText === q.text),
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

  const retryRecordingRef = useRef<{ id: string; topicNumber: number } | null>(
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
      setSelectedVideo(null); // Close shadowing modal
    },
  });

  // Separate hook for shadowing recordings
  const shadowingRecording = useRecording({
    user,
    profile,
    selectedNumber: null,
    currentTopic: selectedVideo
      ? { id: selectedVideo.id, title: selectedVideo.title }
      : null,
    activeQuestionIndex: 0,
    shadowingVideoId: selectedVideo?.id ?? null,
    onSaveSuccess: (saved) => {
      setMyRecordings((prev) => [...prev, ...saved]);
      setSelectedVideo(null);
    },
  });

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
    (rec) => rec.topicNumber === selectedNumber,
  );

  const canRetry =
    !isBongBe &&
    !!matchedRecording &&
    matchedRecording.teacher_rating > 0 &&
    matchedRecording.teacher_rating <= 3;

  retryRecordingRef.current =
    canRetry && matchedRecording
      ? { id: matchedRecording.id, topicNumber: matchedRecording.topicNumber }
      : null;

  const matchedQuestionRecording =
    currentTopic && currentQuestionId
      ? myRecordings.find(
          (rec) =>
            rec.topicNumber === selectedNumber &&
            (rec.question_id === currentQuestionId ||
              rec.questionText === currentQuestionText),
        )
      : null;

  const isTopicFullyRecorded = currentTopic
    ? currentTopic.questions.every((q: any) =>
        myRecordings.some(
          (rec) =>
            rec.topicNumber === selectedNumber &&
            (rec.question_id === q.id || rec.questionText === q.text),
        ),
      ) ||
      (!!matchedRecording &&
        !matchedRecording.question_id &&
        !matchedRecording.questionText)
    : false;

  const totalNumbers = Array.from(
    { length: activeTopics.length },
    (_, i) => i + 1,
  );

  // Standard topics: completed = any recording with matching topicNumber.
  // Bông bé multi-question topics: every question must have a recording.
  const completedTopicNumbers = activeTopics
    .filter((topic: any, idx: number) => {
      const topicNum = idx + 1; // selectedNumber is 1-based, matches topicNumber in recordings
      const hasGlobalRecording = myRecordings.some(
        (r: any) =>
          r.topicNumber === topicNum && !r.question_id && !r.questionText,
      );
      if (hasGlobalRecording) return true;
      const questions: any[] = topic.questions || [];
      if (questions.length === 0)
        return myRecordings.some((r: any) => r.topicNumber === topicNum);
      return questions.every((q: any) =>
        myRecordings.some(
          (r: any) =>
            r.topicNumber === topicNum &&
            (r.question_id === q.id || r.questionText === q.text),
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
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 pb-20 md:pb-0 animate-pulse">
        <OfflineBanner />
        {/* Sidebar skeleton */}
        <div className="hidden md:block w-64 shrink-0 space-y-4">
          <div className="h-48 bg-slate-100 rounded-[2rem]" />
          <div className="h-36 bg-slate-100 rounded-[2rem]" />
        </div>
        {/* Mobile profile bar skeleton */}
        <div className="md:hidden h-16 bg-slate-100 rounded-[1.5rem] mb-1" />
        {/* Content skeleton */}
        <div className="flex-1 space-y-4">
          <div className="bg-white/70 p-6 rounded-[2rem] border-3 border-white shadow-sm space-y-4">
            <div className="h-6 w-40 bg-slate-100 rounded-xl" />
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-[2rem]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 animate-in fade-in duration-500 pb-20 md:pb-0">
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
                onVideoClick={(v) => {
                  setSelectedVideo(v);
                  shadowingRecording.resetAudio();
                  shadowingRecording.setAppError("");
                }}
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

      {selectedVideo && (
        <ShadowingModal
          video={selectedVideo}
          onClose={() => {
            setSelectedVideo(null);
            shadowingRecording.stopRecording();
          }}
          isRecording={shadowingRecording.isRecording}
          recordingTime={shadowingRecording.recordingTime}
          bongBeAudios={shadowingRecording.bongBeAudios}
          isSaving={shadowingRecording.isSaving}
          appError={shadowingRecording.appError}
          onStartRecording={shadowingRecording.startRecording}
          onStopRecording={shadowingRecording.stopRecording}
          onSaveRecording={shadowingRecording.saveRecording}
          onDeleteAudio={(e) => {
            e.preventDefault();
            e.stopPropagation();
            shadowingRecording.setBongBeAudios({});
          }}
          onDismissError={(e) => {
            e.preventDefault();
            e.stopPropagation();
            shadowingRecording.setAppError("");
          }}
          formatTime={shadowingRecording.formatTime}
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
