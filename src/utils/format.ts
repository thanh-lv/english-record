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
