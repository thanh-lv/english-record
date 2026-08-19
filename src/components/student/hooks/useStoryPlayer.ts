import { useState } from 'react';

export function useStoryPlayer() {
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [isPlayingStoryAudio, setIsPlayingStoryAudio] = useState(false);

  const playStoryAudio = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedStory) return;

    if (isPlayingStoryAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingStoryAudio(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(selectedStory.content);
      utterance.lang = 'en-US';
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

  return {
    selectedStory,
    setSelectedStory,
    isPlayingStoryAudio,
    playStoryAudio,
    closeStoryModal,
  };
}
