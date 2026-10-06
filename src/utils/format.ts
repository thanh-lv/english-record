export function formatClassName(
  className?: string | null,
  unassignedText: string = 'Chưa phân lớp',
  classPrefix: string = 'Lớp '
): string {
  if (!className || className.trim() === '') return unassignedText;
  const trimmed = className.trim();
  if (
    trimmed === unassignedText ||
    trimmed.toLowerCase() === 'all' ||
    trimmed.toLowerCase() === 'tất cả lớp' ||
    trimmed.toLowerCase() === 'tất cả các lớp'
  ) {
    return trimmed;
  }
  if (/^(lớp|khối|class|grade)\s+/i.test(trimmed)) {
    return trimmed;
  }
  return `${classPrefix}${trimmed}`;
}

type SessionValued = { session_value?: number | string | null };

/** Session weight of an attendance record: 0.5 for a half session, 1 otherwise. */
export function getSessionValue(record?: SessionValued | null): number {
  const value = Number(record?.session_value);
  return value > 0 ? value : 1;
}

export function sumSessions(records: SessionValued[]): number {
  return records.reduce((sum, r) => sum + getSessionValue(r), 0);
}
