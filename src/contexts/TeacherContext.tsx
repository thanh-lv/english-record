import { createContext, useContext, ReactNode } from 'react';

interface TeacherContextValue {
  teacherId: string;
}

const TeacherContext = createContext<TeacherContextValue | null>(null);

export function TeacherProvider({
  teacherId,
  children,
}: {
  teacherId: string;
  children: ReactNode;
}) {
  return <TeacherContext.Provider value={{ teacherId }}>{children}</TeacherContext.Provider>;
}

/**
 * Hook to get the current teacher's ID.
 * Falls back to empty string when used outside a TeacherProvider (e.g. in standalone tests).
 */
export function useTeacher(): TeacherContextValue {
  const ctx = useContext(TeacherContext);
  return ctx || { teacherId: '' };
}
