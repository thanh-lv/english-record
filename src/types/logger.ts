export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  stack?: string;
  url?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  userAgent?: string;
}

export interface LogFilter {
  level?: LogLevel;
  module?: string;
  search?: string;
  userId?: string;
}

export interface RemoteLogRecord {
  id: string;
  created_at: string;
  user_id?: string | null;
  user_name?: string | null;
  role?: string | null;
  level: LogLevel;
  module: string;
  message: string;
  stack?: string | null;
  data?: any;
  url?: string | null;
  user_agent?: string | null;
}
