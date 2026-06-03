import { useCallback, useEffect, useState } from "react";

export interface Notification {
  id: string;
  studentName: string;
  topicNumber?: number;
  createdAt: string;
}

const STORAGE_KEY = "teacher-notifications";
const READ_KEY = "teacher-notifications-read";
const MAX_ITEMS = 50;

function loadNotifications(): Notification[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function loadReadIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function useNotifications() {
  const [notifications, setNotifications] =
    useState<Notification[]>(loadNotifications);
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(READ_KEY, JSON.stringify([...readIds]));
  }, [readIds]);

  const addNotification = useCallback((record: any) => {
    const item: Notification = {
      id: record.id ?? Math.random().toString(36).slice(2),
      studentName: record.studentName || record.student_name || "Học sinh",
      topicNumber: record.topicNumber ?? record.topic_number,
      createdAt: record.createdAt || new Date().toISOString(),
    };
    setNotifications((prev) => {
      const next = [item, ...prev].slice(0, MAX_ITEMS);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      return next;
    });
  }, [notifications]);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setReadIds(new Set());
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

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
