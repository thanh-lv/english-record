import { supabase } from '../lib/supabase';
import { LogEntry, LogFilter, LogLevel, RemoteLogRecord } from '../types';

const MAX_LOGS = 150;
const MAX_STORED_ERRORS = 30;
const STORAGE_ERROR_KEY = 'english_record_error_logs';
const THROTTLE_MS = 30000; // Debounce identical error for 30s

interface UserContext {
  id?: string | null;
  name?: string | null;
  role?: string | null;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private userContext: UserContext = {};
  private isInitialized = false;
  private lastSentMap: Map<string, number> = new Map();

  constructor() {
    this.loadPersistedErrors();
  }

  public setUserId(userId: string | null): void {
    this.userContext.id = userId;
  }

  public setUserContext(context: UserContext): void {
    this.userContext = { ...this.userContext, ...context };
  }

  private loadPersistedErrors(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const raw = localStorage.getItem(STORAGE_ERROR_KEY);
      if (raw) {
        const parsed: LogEntry[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.logs.push(...parsed);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private persistError(entry: LogEntry): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const errors = this.logs.filter(l => l.level === 'ERROR').slice(-MAX_STORED_ERRORS);
      localStorage.setItem(STORAGE_ERROR_KEY, JSON.stringify(errors));
    } catch {
      // Ignore localStorage errors
    }
  }

  private async sendRemoteLog(entry: LogEntry): Promise<void> {
    try {
      // Throttle identical error spam
      const throttleKey = `${entry.module}:${entry.message}`;
      const now = Date.now();
      const lastSent = this.lastSentMap.get(throttleKey) || 0;
      if (now - lastSent < THROTTLE_MS) {
        return;
      }
      this.lastSentMap.set(throttleKey, now);

      await supabase.from('client_error_logs').insert({
        user_id: entry.userId || null,
        user_name: entry.userName || null,
        role: entry.userRole || null,
        level: entry.level,
        module: entry.module,
        message: entry.message,
        stack: entry.stack || null,
        data: entry.data || null,
        url: entry.url || null,
        user_agent: entry.userAgent || null,
      });
    } catch {
      // Fail silently to prevent infinite error recursion
    }
  }

  private addLog(
    level: LogLevel,
    module: string,
    message: string,
    data?: any,
    stack?: string
  ): LogEntry {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
    const url = typeof window !== 'undefined' ? window.location?.href : undefined;

    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data: data !== undefined ? data : undefined,
      stack,
      url,
      userId: this.userContext.id || undefined,
      userName: this.userContext.name || undefined,
      userRole: this.userContext.role || undefined,
      userAgent,
    };

    this.logs.push(entry);

    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }

    if (level === 'ERROR') {
      this.persistError(entry);
    }

    // Print to developer console
    const prefix = `[${entry.timestamp}] [${level}] [${module}]`;
    switch (level) {
      case 'DEBUG':
        console.debug(prefix, message, data || '');
        break;
      case 'INFO':
        console.info(prefix, message, data || '');
        break;
      case 'WARN':
        console.warn(prefix, message, data || '');
        break;
      case 'ERROR':
        console.error(prefix, message, data || '', stack || '');
        break;
    }

    // Asynchronously send ERROR and WARN logs to Supabase
    if (level === 'ERROR' || level === 'WARN') {
      this.sendRemoteLog(entry).catch(() => {});
    }

    return entry;
  }

  public debug(module: string, message: string, data?: any): LogEntry {
    return this.addLog('DEBUG', module, message, data);
  }

  public info(module: string, message: string, data?: any): LogEntry {
    return this.addLog('INFO', module, message, data);
  }

  public warn(module: string, message: string, data?: any): LogEntry {
    return this.addLog('WARN', module, message, data);
  }

  public error(module: string, message: string, error?: any, data?: any): LogEntry {
    let stack: string | undefined;
    let extraData = data;

    if (error instanceof Error) {
      stack = error.stack;
      if (!extraData) extraData = { errorName: error.name, errorMessage: error.message };
    } else if (error && typeof error === 'object') {
      extraData = { ...extraData, rawError: error };
    }

    return this.addLog('ERROR', module, message, extraData, stack);
  }

  public getLogs(filter?: LogFilter): LogEntry[] {
    let result = [...this.logs];

    if (filter?.level) {
      result = result.filter(l => l.level === filter.level);
    }

    if (filter?.module) {
      const mod = filter.module.toLowerCase();
      result = result.filter(l => l.module.toLowerCase().includes(mod));
    }

    if (filter?.userId) {
      result = result.filter(l => l.userId === filter.userId);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        l =>
          l.message.toLowerCase().includes(q) ||
          l.module.toLowerCase().includes(q) ||
          (l.stack && l.stack.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public clearLogs(): void {
    this.logs = [];
    this.lastSentMap.clear();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_ERROR_KEY);
      }
    } catch {
      // Ignore
    }
  }

  public exportLogsAsJson(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        logs: this.logs,
      },
      null,
      2
    );
  }

  public downloadLogs(filename = `client-logs-${Date.now()}.json`): void {
    if (typeof window === 'undefined' || !window.document) return;
    const json = this.exportLogsAsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public async fetchRemoteLogs(options?: {
    limit?: number;
    level?: LogLevel;
  }): Promise<RemoteLogRecord[]> {
    const { limit = 50, level } = options || {};
    let query = supabase.from('client_error_logs').select('*');

    if (level) {
      query = query.eq('level', level);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);

    if (error) throw error;
    return (data || []) as RemoteLogRecord[];
  }

  public async deleteRemoteLog(id: string): Promise<void> {
    const { error } = await supabase.from('client_error_logs').delete().eq('id', id);
    if (error) throw error;
  }

  public initGlobalHandlers(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    window.addEventListener('error', event => {
      this.error('WindowError', event.message || 'Uncaught window error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', event => {
      const reason = event.reason;
      this.error(
        'UnhandledPromiseRejection',
        reason instanceof Error ? reason.message : String(reason || 'Unhandled rejection'),
        reason instanceof Error ? reason : undefined,
        { reason }
      );
    });
  }
}

export const loggerService = new LoggerService();
