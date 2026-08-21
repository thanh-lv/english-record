export type NotificationType = 'new_recording' | 'feedback_reply' | 'general';

export interface Notification {
  id: string;
  student_name: string;
  recording_id?: string;
  topic_number?: number;
  topic_title?: string;
  created_at: string;
  is_read?: boolean;
  avatar?: string;
  type?: NotificationType;
  teacher_id?: string | null;
}
