import { useEffect } from "react";

export function calculateStreak(records: any[]): number {
  if (!records || records.length === 0) return 0;

  // Extract unique dates in YYYY-MM-DD format based on local time
  const datesSet = new Set<string>();
  records.forEach((rec) => {
    if (rec.createdAt) {
      const d = new Date(rec.createdAt);
      // We can use local date strings or UTC. Let's use local string to be intuitive.
      const dateStr = d.toLocaleDateString("en-CA"); // YYYY-MM-DD format
      datesSet.add(dateStr);
    }
  });

  const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a)); // descending

  if (sortedDates.length === 0) return 0;

  const todayStr = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA");

  // Streak is 0 if the latest record is older than yesterday
  if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let currentDate = new Date(sortedDates[0]); // Start counting from the most recent date

  // We walk through the sorted dates. If they are exactly 1 day apart, we increment streak.
  for (let i = 0; i < sortedDates.length; i++) {
    const dStr = sortedDates[i];
    const expectedStr = currentDate.toLocaleDateString("en-CA");

    if (dStr === expectedStr) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function formatClassName(
  className?: string | null,
  unassignedText: string = "Chưa phân lớp",
): string {
  if (!className || className.trim() === "") return unassignedText;
  const trimmed = className.trim();
  if (
    trimmed === unassignedText ||
    trimmed.toLowerCase() === "all" ||
    trimmed.toLowerCase() === "tất cả lớp" ||
    trimmed.toLowerCase() === "tất cả các lớp"
  ) {
    return trimmed;
  }
  if (/^(lớp|khối)\s+/i.test(trimmed)) {
    return trimmed;
  }
  return `Lớp ${trimmed}`;
}

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isLocked]);
}
