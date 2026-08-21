import { UserProfile } from './auth';
import { Recording } from './recording';

export interface CreateStudentPayload {
  name: string;
  password?: string;
  year_born?: number | null;
  grade?: number | null;
  role?: 'student';
  teacher_id?: string;
  username?: string;
}

export interface UpdateStudentPayload {
  name?: string;
  year_born?: number | null;
  grade?: number | null;
  avatar?: string | null;
  language?: string;
  username?: string | null;
}

export interface StudentStats {
  streak: number;
  completedTopics: number;
  totalRecordings: number;
  totalTopics?: number;
}

export interface StudentRecordingsResponse {
  records: Recording[];
  total: number;
}

export type { UserProfile as StudentProfile };
