import { UserProfile } from './auth';
import { Recording } from './recording';

export interface CreateStudentPayload {
  name: string;
  password?: string;
  year_born?: number | null;
  grade?: number | null;
  role?: 'student';
}

export interface UpdateStudentPayload {
  name?: string;
  year_born?: number | null;
  grade?: number | null;
  avatar?: string | null;
  language?: string;
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
