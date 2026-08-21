import { useCallback, useEffect, useState } from 'react';

import { Notification, NotificationType } from '../../../types';

export type { Notification, NotificationType };

const STORAGE_KEY = 'teacher-notifications';
const READ_KEY = 'teacher-notifications-read';
const MAX_ITEMS = 50;

function loadNotifications(): Notification[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function loadReadIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function useNotifications(teacherId?: string | null) {
  const storageKey = teacherId ? `teacher-notifications:${teacherId}` : 'teacher-notifications';
  const readKey = teacherId
    ? `teacher-notifications-read:${teacherId}`
    : 'teacher-notifications-read';

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  });

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(readKey) || '[]'));
    } catch {
      return new Set();
    }
  });

  // Reload notifications when teacherId changes
  useEffect(() => {
    try {
      setNotifications(JSON.parse(localStorage.getItem(storageKey) || '[]'));
    } catch {
      setNotifications([]);
    }
    try {
      setReadIds(new Set(JSON.parse(localStorage.getItem(readKey) || '[]')));
    } catch {
      setReadIds(new Set());
    }
  }, [storageKey, readKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(notifications));
  }, [notifications, storageKey]);

  useEffect(() => {
    localStorage.setItem(readKey, JSON.stringify([...readIds]));
  }, [readIds, readKey]);

  const addNotification = useCallback(
    (record: any) => {
      if (!record) return;
      // Filter out notifications that belong to a different teacher
      if (teacherId && record.teacher_id && record.teacher_id !== teacherId) {
        return;
      }

      const item: Notification = {
        id: record.id ?? Math.random().toString(36).slice(2),
        student_name: record.student_name || 'Học sinh',
        topic_number: record.topic_number,
        created_at: record.created_at || new Date().toISOString(),
        teacher_id: record.teacher_id || teacherId || null,
      };
      setNotifications(prev => {
        if (prev.some(n => n.id === item.id)) return prev;
        const next = [item, ...prev].slice(0, MAX_ITEMS);
        return next;
      });
    },
    [teacherId]
  );

  const markAllRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      return next;
    });
  }, [notifications]);

  const markRead = useCallback((id: string) => {
    setReadIds(prev => new Set([...prev, id]));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setReadIds(new Set());
  }, []);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  return {
    notifications,
    unreadCount,
    readIds,
    addNotification,
    markRead,
    markAllRead,
    clearAll,
  };
}
