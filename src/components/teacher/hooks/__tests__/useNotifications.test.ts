import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotifications } from '../useNotifications';

describe('useNotifications hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes with empty notifications and zero unread count', () => {
    const { result } = renderHook(() => useNotifications('teacher-1'));
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('adds notification for matching teacher_id', () => {
    const { result } = renderHook(() => useNotifications('teacher-1'));

    act(() => {
      result.current.addNotification({
        id: 'rec-1',
        student_name: 'Alex',
        topic_number: 1,
        created_at: '2026-08-21T00:00:00.000Z',
        teacher_id: 'teacher-1',
      });
    });

    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].student_name).toBe('Alex');
    expect(result.current.unreadCount).toBe(1);
  });

  it('ignores notification belonging to a different teacher', () => {
    const { result } = renderHook(() => useNotifications('teacher-1'));

    act(() => {
      result.current.addNotification({
        id: 'rec-2',
        student_name: 'Bob',
        topic_number: 2,
        created_at: '2026-08-21T00:00:00.000Z',
        teacher_id: 'teacher-2', // Different teacher
      });
    });

    expect(result.current.notifications.length).toBe(0);
    expect(result.current.unreadCount).toBe(0);
  });

  it('marks single notification as read', () => {
    const { result } = renderHook(() => useNotifications('teacher-1'));

    act(() => {
      result.current.addNotification({
        id: 'rec-1',
        student_name: 'Alex',
        topic_number: 1,
        teacher_id: 'teacher-1',
      });
    });

    expect(result.current.unreadCount).toBe(1);

    act(() => {
      result.current.markRead('rec-1');
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.readIds.has('rec-1')).toBe(true);
  });

  it('marks all notifications as read', () => {
    const { result } = renderHook(() => useNotifications('teacher-1'));

    act(() => {
      result.current.addNotification({
        id: 'rec-1',
        student_name: 'Alex',
        teacher_id: 'teacher-1',
      });
      result.current.addNotification({ id: 'rec-2', student_name: 'Bob', teacher_id: 'teacher-1' });
    });

    expect(result.current.unreadCount).toBe(2);

    act(() => {
      result.current.markAllRead();
    });

    expect(result.current.unreadCount).toBe(0);
  });

  it('clears all notifications', () => {
    const { result } = renderHook(() => useNotifications('teacher-1'));

    act(() => {
      result.current.addNotification({
        id: 'rec-1',
        student_name: 'Alex',
        teacher_id: 'teacher-1',
      });
    });

    expect(result.current.notifications.length).toBe(1);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications.length).toBe(0);
    expect(result.current.unreadCount).toBe(0);
  });

  it('isolates storage between different teachers', () => {
    // Teacher 1 adds notification
    const { result: teacher1 } = renderHook(() => useNotifications('teacher-1'));
    act(() => {
      teacher1.current.addNotification({
        id: 'rec-1',
        student_name: 'Student 1',
        teacher_id: 'teacher-1',
      });
    });
    expect(teacher1.current.notifications.length).toBe(1);

    // Teacher 2 should not see Teacher 1's notifications
    const { result: teacher2 } = renderHook(() => useNotifications('teacher-2'));
    expect(teacher2.current.notifications.length).toBe(0);
  });
});
