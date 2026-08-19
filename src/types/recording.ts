export type RecordingFilterType = 'all' | 'topic' | 'shadowing';
export type RecordingStatus = 'pending' | 'approved' | 'rejected';

export interface Recording {
  id: string;
  student_name: string;
  topic_id?: string | null;
  topic_number?: string | number | null;
  topic?: string | null;
  question_id?: string | null;
  question_text?: string | null;
  audio_url: string;
  created_at: string;
  shadowing_video_id?: string | null;
  duration?: number | null;
  status?: RecordingStatus | string;
  teacher_rating?: number | null;
  teacher_feedback?: string | null;
  student_reaction?: string | null;
  user_id?: string | null;
  shadowing_videos?: {
    youtube_url?: string;
  } | null;
}

export interface StudentSummary {
  key: string;
  studentName: string;
  count: number;
  latestCreatedAt: string;
  hasUngraded: boolean;
  avatar?: string;
}
