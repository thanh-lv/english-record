export interface AudioBuilderConfig {
  repetitionsPerWord: number;
  wordDurationSlot: number;
  gapBetweenWords: number;
  voiceLang?: string;
}

export interface WordTimestamp {
  word: string;
  index: number;
  startTime: number;
  endTime: number;
  repTimes: number[];
}

export interface RenderedAudioResult {
  blob: Blob;
  audioUrl: string;
  totalDuration: number;
  wordTimestamps: WordTimestamp[];
}
