import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AchievementsTab } from "./components/student/AchievementsTab";
import { AvatarSelectModal } from "./components/student/AvatarSelectModal";
import { ExercisesTab } from "./components/student/ExercisesTab";
import { StoriesTab } from "./components/student/StoriesTab";
import { StoryModal } from "./components/student/StoryModal";
import { StudentSidebar } from "./components/student/StudentSidebar";
import { TopicModal } from "./components/student/TopicModal";
import { useAvatar } from "./components/student/hooks/useAvatar";
import { useRecording } from "./components/student/hooks/useRecording";
import { useStudentData } from "./components/student/hooks/useStudentData";

type ActiveTab = "exercises" | "stories" | "achievements";

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

  const [activeTab, setActiveTab] = useState<ActiveTab>("exercises");
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

  const recording = useRecording({
    user,
    profile,
    isBongBe,
    selectedNumber,
    currentTopic,
    activeQuestionIndex,
    onSaveSuccess: (saved, completedNumber) => {
      setMyRecordings((prev) => [...prev, ...saved]);
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
      const questionsText = isBongBe
        ? activeQuestion?.text || currentTopic.title
        : currentTopic.questions.map((q: any) => q.text).join("... ");

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
  const currentQuestionText = currentTopic?.questions?.[activeQuestionIndex]?.text;

  const matchedRecording = myRecordings.find(
    (rec) => rec.topicNumber === selectedNumber,
  );

  const matchedQuestionRecording =
    isBongBe && currentTopic && currentQuestionId
      ? myRecordings.find(
          (rec) =>
            rec.topicNumber === selectedNumber &&
            (rec.question_id === currentQuestionId ||
              rec.questionText === currentQuestionText),
        )
      : null;

  const isTopicFullyRecorded =
    isBongBe && currentTopic
      ? currentTopic.questions.every((q: any) =>
          myRecordings.some(
            (rec) =>
              rec.topicNumber === selectedNumber &&
              (rec.question_id === q.id || rec.questionText === q.text),
          ),
        )
      : !!matchedRecording;

  const totalNumbers = Array.from({ length: activeTopics.length }, (_, i) => i + 1);

  if (topicsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-10 h-10 text-[#FF8A80] animate-spin" />
        <p className="text-slate-400 font-bold text-sm">Đang tải danh sách bài học...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
      <StudentSidebar
        profile={profile}
        currentAvatar={currentAvatar}
        completedNumbers={completedNumbers}
        streak={streak}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAvatarClick={() => setShowAvatarSelect(true)}
      />

      <div className="flex-1 min-w-0 space-y-6">
        {activeTab === "exercises" && (
          <ExercisesTab
            activeTopics={activeTopics}
            isBongBe={isBongBe}
            completedNumbers={completedNumbers}
            myRecordings={myRecordings}
            onTopicClick={handleNumberClick}
          />
        )}
        {activeTab === "achievements" && (
          <AchievementsTab
            totalNumbers={totalNumbers}
            completedNumbers={completedNumbers}
          />
        )}
        {activeTab === "stories" && (
          <StoriesTab
            dbStories={dbStories}
            profile={profile}
            studentAge={studentAge}
            onStoryClick={setSelectedStory}
          />
        )}
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
    </div>
  );
}
