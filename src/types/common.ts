export type Language = 'vi' | 'en';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export type TeacherTab =
  | 'attendance'
  | 'recordings'
  | 'topics'
  | 'students'
  | 'stories'
  | 'vocabulary'
  | 'shadowing'
  | 'audio-builder';

export type ActiveTab =
  | 'exercises'
  | 'shadowing'
  | 'stories'
  | 'achievements'
  | 'flashcards'
  | 'games';

export type StudentTab = ActiveTab;

export interface ShortcutHandlers {
  onPlayPause?: () => void;
  onStartRecord?: () => void;
  onStopRecord?: () => void;
  onClose?: () => void;
  isRecording?: boolean;
  isModalOpen?: boolean;
}
