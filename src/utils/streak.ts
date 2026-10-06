export function calculateStreak(records: any[]): number {
  if (!records || records.length === 0) return 0;

  // Extract unique dates in YYYY-MM-DD format based on local time
  const datesSet = new Set<string>();
  records.forEach(rec => {
    if (rec.created_at) {
      const d = new Date(rec.created_at);
      const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      datesSet.add(dateStr);
    }
  });

  const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a)); // descending

  if (sortedDates.length === 0) return 0;

  const todayStr = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');

  // Streak is 0 if the latest record is older than yesterday
  if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  // Start counting from the most recent date. Build it from its parts: `new Date('YYYY-MM-DD')`
  // parses as UTC midnight, which is the previous local day in timezones behind UTC.
  const [year, month, day] = sortedDates[0].split('-').map(Number);
  const currentDate = new Date(year, month - 1, day);

  // We walk through the sorted dates. If they are exactly 1 day apart, we increment streak.
  for (let i = 0; i < sortedDates.length; i++) {
    const dStr = sortedDates[i];
    const expectedStr = currentDate.toLocaleDateString('en-CA');

    if (dStr === expectedStr) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
