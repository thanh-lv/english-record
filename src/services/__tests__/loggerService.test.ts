import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loggerService } from '../loggerService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('loggerService', () => {
  beforeEach(() => {
    loggerService.clearLogs();
    loggerService.setUserContext({ id: null, name: null, role: null });
    localStorage.clear();
    vi.clearAllMocks();

    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.from as any).mockReturnValue({ insert: insertMock });
  });

  it('records logs with correct levels and metadata', () => {
    const d = loggerService.debug('TestModule', 'Debug message', { key: 'val' });
    const i = loggerService.info('TestModule', 'Info message');
    const w = loggerService.warn('TestModule', 'Warning message');
    const e = loggerService.error('TestModule', 'Error message', new Error('Something failed'));

    expect(d.level).toBe('DEBUG');
    expect(d.message).toBe('Debug message');
    expect(d.data).toEqual({ key: 'val' });

    expect(i.level).toBe('INFO');
    expect(w.level).toBe('WARN');

    expect(e.level).toBe('ERROR');
    expect(e.message).toBe('Error message');
    expect(e.stack).toBeDefined();
    expect(e.data?.errorMessage).toBe('Something failed');
  });

  it('records user context when set', () => {
    loggerService.setUserContext({ id: 'user-456', name: 'Alice', role: 'student' });
    const log = loggerService.info('Auth', 'User logged in');
    expect(log.userId).toBe('user-456');
    expect(log.userName).toBe('Alice');
    expect(log.userRole).toBe('student');
  });

  it('sends ERROR and WARN logs to Supabase client_error_logs table and throttles duplicates', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as any).mockReturnValue({ insert: insertMock });

    loggerService.setUserContext({ id: 'st-1', name: 'Bob', role: 'student' });
    loggerService.error('MicModule', 'Mic access failed', new Error('NotAllowedError'));

    expect(supabase.from).toHaveBeenCalledWith('client_error_logs');
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'st-1',
        user_name: 'Bob',
        role: 'student',
        level: 'ERROR',
        module: 'MicModule',
        message: 'Mic access failed',
      })
    );

    // Immediate duplicate error should be throttled
    loggerService.error('MicModule', 'Mic access failed', new Error('NotAllowedError'));
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it('gracefully handles remote logging errors without throwing', () => {
    const insertMock = vi.fn().mockRejectedValue(new Error('DB offline'));
    (supabase.from as any).mockReturnValue({ insert: insertMock });

    expect(() => {
      loggerService.error('Network', 'Fetch failed');
    }).not.toThrow();
  });

  it('fetches remote logs from Supabase with options', async () => {
    const mockLogs = [{ id: 'log-1', message: 'Test error', level: 'ERROR' }];
    const limitMock = vi.fn().mockResolvedValue({ data: mockLogs, error: null });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    (supabase.from as any).mockReturnValue({ select: selectMock });

    const logs = await loggerService.fetchRemoteLogs({ limit: 10 });
    expect(supabase.from).toHaveBeenCalledWith('client_error_logs');
    expect(logs).toEqual(mockLogs);
  });

  it('deletes remote log by id', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as any).mockReturnValue({ delete: deleteMock });

    await loggerService.deleteRemoteLog('log-123');
    expect(supabase.from).toHaveBeenCalledWith('client_error_logs');
    expect(eqMock).toHaveBeenCalledWith('id', 'log-123');
  });

  it('filters logs by level, module, search text, and userId', () => {
    loggerService.setUserContext({ id: 'u1', name: 'Alice' });
    loggerService.info('AuthModule', 'User signed in');

    loggerService.setUserContext({ id: 'u2', name: 'Bob' });
    loggerService.warn('NetworkModule', 'Slow response received');
    loggerService.error('AudioModule', 'Microphone permission denied', new Error('PermissionDenied'));

    const errorsOnly = loggerService.getLogs({ level: 'ERROR' });
    expect(errorsOnly).toHaveLength(1);
    expect(errorsOnly[0].module).toBe('AudioModule');

    const u1Logs = loggerService.getLogs({ userId: 'u1' });
    expect(u1Logs).toHaveLength(1);

    const searchMicrophone = loggerService.getLogs({ search: 'Microphone' });
    expect(searchMicrophone).toHaveLength(1);
  });

  it('caps in-memory buffer at MAX_LOGS', () => {
    for (let i = 0; i < 160; i++) {
      loggerService.info('Loop', `Message ${i}`);
    }

    const logs = loggerService.getLogs();
    expect(logs.length).toBe(150);
    expect(logs[logs.length - 1].message).toBe('Message 159');
  });

  it('clears logs and removes persisted errors from localStorage', () => {
    loggerService.error('Mod', 'Test error', new Error('Err'));
    expect(loggerService.getLogs()).toHaveLength(1);

    loggerService.clearLogs();
    expect(loggerService.getLogs()).toHaveLength(0);
    expect(localStorage.getItem('english_record_error_logs')).toBeNull();
  });

  it('exports logs as valid JSON string with metadata', () => {
    loggerService.info('Test', 'Export me');
    const jsonStr = loggerService.exportLogsAsJson();
    const parsed = JSON.parse(jsonStr);

    expect(parsed.exportedAt).toBeDefined();
    expect(parsed.logs).toHaveLength(1);
    expect(parsed.logs[0].message).toBe('Export me');
  });

  it('downloads logs as a file without error', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

    expect(() => loggerService.downloadLogs('test-export.json')).not.toThrow();

    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('captures uncaught window error and unhandled rejection when initialized', () => {
    loggerService.initGlobalHandlers();

    // Trigger window error event
    const errorEvent = new ErrorEvent('error', {
      message: 'Global syntax crash',
      filename: 'bundle.js',
      lineno: 42,
      colno: 10,
      error: new Error('Global syntax crash'),
    });
    window.dispatchEvent(errorEvent);

    const windowErrors = loggerService.getLogs({ module: 'WindowError' });
    expect(windowErrors.length).toBeGreaterThanOrEqual(1);
    expect(windowErrors[0].message).toContain('Global syntax crash');

    // Trigger unhandled rejection
    const rejectionEvent = new Event('unhandledrejection') as any;
    rejectionEvent.reason = new Error('Unhandled async failure');
    window.dispatchEvent(rejectionEvent);

    const unhandled = loggerService.getLogs({ module: 'UnhandledPromiseRejection' });
    expect(unhandled.length).toBeGreaterThanOrEqual(1);
    expect(unhandled[0].message).toBe('Unhandled async failure');
  });
});
