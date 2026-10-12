import { useState, useEffect, useMemo, useCallback } from 'react';
import { attendanceService } from '../../../services/attendanceService';
import { loggerService } from '../../../services/loggerService';
import { ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, Loader2 } from 'lucide-react';
import { getSessionValue, sumSessions } from '../../../utils';
import { useBodyScrollLock } from '../../../hooks';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';
import { useTeacher } from '../../../contexts/TeacherContext';
import { CheckinDayModal } from './CheckinDayModal';

export function CheckinTab() {
  const { t } = useLanguage();
  const { teacherId } = useTeacher();
  const tAtt = t.attendance;
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthRecords, setMonthRecords] = useState<any[]>([]);
  const [filterClass, setFilterClass] = useState('all');

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // Modal state
  const [modalDate, setModalDate] = useState<Date | null>(null);
  // Lock body scroll while the day modal is open
  useBodyScrollLock(Boolean(modalDate));

  useEffect(() => {
    attendanceService.fetchAttendanceStudents(teacherId).then(data => {
      setStudents(data);
      setLoading(false);
    });
  }, [teacherId]);

  const loadMonthRecords = useCallback(
    async (year: number, month: number) => {
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      try {
        const data = await attendanceService.fetchAttendanceRecords(start, end, teacherId);
        setMonthRecords(data);
      } catch (err) {
        loggerService.error('CheckinTab', 'Error fetching month records', err);
      }
    },
    [teacherId]
  );

  useEffect(() => {
    loadMonthRecords(calYear, calMonth);
  }, [calYear, calMonth, loadMonthRecords]);

  // Calendar math
  const DAYS_OF_WEEK = tAtt.daysOfWeek;
  const MONTH_NAMES = tAtt.monthNames || [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calendarCells: (number | null)[] = useMemo(() => {
    const cells: (number | null)[] = [
      ...Array(firstDayOfMonth).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i: number) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [firstDayOfMonth, daysInMonth]);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(y => y - 1);
    } else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(y => y + 1);
    } else setCalMonth(m => m + 1);
  };

  const studentMap = useMemo(() => {
    const map: Record<string, any> = {};
    students.forEach(s => {
      map[s.id] = s;
    });
    return map;
  }, [students]);

  // Records count and revenue per day number memoized in O(N)
  const { recordsCountByDay, revenueByDay, totalMonthRevenue } = useMemo(() => {
    const countMap: Record<number, number> = {};
    const revMap: Record<number, number> = {};
    let total = 0;

    monthRecords.forEach(r => {
      const d = new Date(r.checkin_time).getDate();
      const value = getSessionValue(r);
      countMap[d] = (countMap[d] || 0) + value;
      const price = Math.round(Number(studentMap[r.student_id]?.unit_price || 0) * value);
      revMap[d] = (revMap[d] || 0) + price;
      total += price;
    });

    return { recordsCountByDay: countMap, revenueByDay: revMap, totalMonthRevenue: total };
  }, [monthRecords, studentMap]);

  const isToday = (day: number) =>
    today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;

  const openModal = (day: number) => setModalDate(new Date(calYear, calMonth, day));

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-emerald-500" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* ── Calendar header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-black text-slate-800 min-w-[160px]">
              {MONTH_NAMES[calMonth]} {calYear}
            </h2>
            {totalMonthRevenue > 0 && (
              <p className="text-xs font-black text-emerald-600 mt-0.5">
                {interpolate(
                  tAtt.monthSummaryExpected || 'Tổng ngày: {sessions} buổi · Dự kiến: {amount}',
                  {
                    sessions: sumSessions(monthRecords),
                    amount: interpolate(tAtt.currencyVnd || '{amount} đ', {
                      amount: totalMonthRevenue.toLocaleString(),
                    }),
                  }
                )}
              </p>
            )}
          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <button
          onClick={() => {
            setCalYear(today.getFullYear());
            setCalMonth(today.getMonth());
            openModal(today.getDate());
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-lg transition-colors shadow"
        >
          <CalendarDays size={15} />
          {tAtt.today}
        </button>
      </div>

      {/* ── Full calendar grid ── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {DAYS_OF_WEEK.map((d: string, i: number) => (
            <div
              key={d}
              className={`text-center text-sm font-black py-3 uppercase tracking-wide ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {calendarCells.map((day, idx) => {
            if (!day)
              return (
                <div
                  key={`blank-${idx}`}
                  className="min-h-[80px] sm:min-h-[100px] bg-slate-50/60"
                />
              );
            const tod = isToday(day);
            const count = recordsCountByDay[day] || 0;
            const revenue = revenueByDay[day] || 0;
            const isSunday = idx % 7 === 0;
            return (
              <button
                key={day}
                onClick={() => openModal(day)}
                className={`min-h-[80px] sm:min-h-[100px] p-1.5 sm:p-2 flex flex-col justify-between items-start text-left transition-all
                  ${tod ? 'bg-emerald-50/80 hover:bg-emerald-100/80 cursor-pointer' : 'hover:bg-slate-50 cursor-pointer'}
                `}
              >
                {/* Day number */}
                <span
                  className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg text-xs sm:text-sm font-black flex-shrink-0
                  ${tod ? 'bg-emerald-500 text-white shadow-sm' : isSunday ? 'text-rose-500' : 'text-slate-700'}
                `}
                >
                  {day}
                </span>

                {/* Attendance & Revenue Badges */}
                {count > 0 && (
                  <div className="flex flex-col gap-1 w-full mt-1">
                    {/* Số buổi */}
                    <span
                      className={`text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 leading-tight w-fit
                      ${tod ? 'bg-emerald-200 text-emerald-900' : 'bg-emerald-100 text-emerald-800'}
                    `}
                    >
                      <CheckCircle2 size={9} />
                      <span className="hidden sm:inline">
                        {interpolate(tAtt.sessionCount || '{count} buổi', {
                          count,
                        })}
                      </span>
                      <span className="sm:hidden">{count}b</span>
                    </span>

                    {/* Doanh thu ngày */}
                    {revenue > 0 && (
                      <span className="text-[9px] sm:text-[11px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200/80 leading-tight w-fit flex items-center gap-0.5">
                        <span className="hidden sm:inline">
                          {interpolate(tAtt.currencyVnd || '{amount} đ', {
                            amount: `+${revenue.toLocaleString()}`,
                          })}
                        </span>
                        <span className="sm:hidden">
                          +
                          {revenue >= 1000000
                            ? `${(revenue / 1000000).toFixed(1)}tr`
                            : `${Math.round(revenue / 1000)}k`}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-lg bg-emerald-500 inline-flex items-center justify-center text-white text-xs">
            •
          </span>{' '}
          {tAtt.today}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black">
            ✓ N
          </span>{' '}
          {tAtt.hasCheckin}
        </span>
        <span className="text-rose-400 flex items-center gap-1">{tAtt.sunSunday}</span>
        <span className="text-slate-300">{tAtt.fadedFutureDate}</span>
      </div>

      {modalDate && (
        <CheckinDayModal
          key={modalDate.getTime()}
          date={modalDate}
          students={students}
          monthRecords={monthRecords}
          filterClass={filterClass}
          setFilterClass={setFilterClass}
          onReload={() => loadMonthRecords(calYear, calMonth)}
          onClose={() => setModalDate(null)}
        />
      )}
    </div>
  );
}
