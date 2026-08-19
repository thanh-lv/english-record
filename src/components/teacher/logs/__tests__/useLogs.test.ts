import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLogs } from '../hooks/useLogs';
import { loggerService } from '../../../../services/loggerService';

vi.mock('../../../../services/loggerService', () => ({
  loggerService: {
    fetchRemoteLogs: vi.fn(),
    getLogs: vi.fn(),
    deleteRemoteLog: vi.fn(),
    clearLogs: vi.fn(),
    downloadLogs: vi.fn(),
  },
}));

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
}));

describe('useLogs hook', () => {
  const mockRemoteLogs = [
    {
      id: 'log-1',
      level: 'ERROR',
      module: 'ReactErrorBoundary',
      message: 'Component crashed',
      stack: 'Error at Component.tsx:10',
      user_name: 'David',
      role: 'student',
      created_at: '2026-08-19T10:00:00Z',
    },
    {
      id: 'log-2',
      level: 'WARN',
      module: 'AudioRecording',
      message: 'Microphone permission delayed',
      user_name: 'Anna',
      role: 'student',
      created_at: '2026-08-19T10:05:00Z',
    },
    {
      id: 'log-3',
      level: 'INFO',
      module: 'Auth',
      message: 'User logged in',
      user_name: 'Teacher',
      role: 'teacher',
      created_at: '2026-08-19T10:10:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (loggerService.fetchRemoteLogs as any).mockResolvedValue(mockRemoteLogs);
    (loggerService.getLogs as any).mockReturnValue([]);
  });

  it('fetches remote logs by default on mount', async () => {
    const { result } = renderHook(() => useLogs());

    expect(result.current.loading).toBe(true);
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.filteredLogs).toHaveLength(3);
    expect(result.current.stats.total).toBe(3);
    expect(result.current.stats.errors).toBe(1);
    expect(result.current.stats.warnings).toBe(1);
    expect(result.current.stats.crashes).toBe(1);
  });

  it('filters logs by level correctly', async () => {
    const { result } = renderHook(() => useLogs());
    await act(async () => {});

    act(() => {
      result.current.setFilterLevel('ERROR');
    });

    expect(result.current.filteredLogs).toHaveLength(1);
    expect(result.current.filteredLogs[0].id).toBe('log-1');
  });

  it('filters logs by module correctly', async () => {
    const { result } = renderHook(() => useLogs());
    await act(async () => {});

    act(() => {
      result.current.setFilterModule('AudioRecording');
    });

    expect(result.current.filteredLogs).toHaveLength(1);
    expect(result.current.filteredLogs[0].id).toBe('log-2');
  });

  it('filters logs by search query (message, userName, module)', async () => {
    const { result } = renderHook(() => useLogs());
    await act(async () => {});

    act(() => {
      result.current.setSearchQuery('David');
    });

    expect(result.current.filteredLogs).toHaveLength(1);
    expect(result.current.filteredLogs[0].id).toBe('log-1');
  });

  it('switches source to local device logs', async () => {
    const localEntries = [
      {
        id: 'local-1',
        level: 'DEBUG',
        module: 'LocalTest',
        message: 'Local test log',
        timestamp: '2026-08-19T10:15:00Z',
      },
    ];
    (loggerService.getLogs as any).mockReturnValue(localEntries);

    const { result } = renderHook(() => useLogs());
    await act(async () => {});

    await act(async () => {
      result.current.setSource('local');
    });

    expect(loggerService.getLogs).toHaveBeenCalled();
    expect(result.current.filteredLogs).toHaveLength(1);
    expect(result.current.filteredLogs[0].id).toBe('local-1');
  });

  it('deletes remote log record', async () => {
    (loggerService.deleteRemoteLog as any).mockResolvedValue(true);
    const { result } = renderHook(() => useLogs());
    await act(async () => {});

    await act(async () => {
      await result.current.handleDeleteRemote('log-1');
    });

    expect(loggerService.deleteRemoteLog).toHaveBeenCalledWith('log-1');
    expect(result.current.filteredLogs).toHaveLength(2);
  });
});
