import { useState, useEffect, useCallback, useRef } from 'react';
import { attendanceService } from '../../../services/attendanceService';
import { supabase } from '../../../lib/supabase';
import { formatClassName } from '../../../utils';
import { interpolate } from '../../../i18n/LanguageContext';

interface UseAttendanceAnalyticsOptions {
  month: number;
  year: number;
  paymentsMap?: Record<string, boolean>;
  tAtt?: any;
}

export function useAttendanceAnalytics({
  month,
  year,
  paymentsMap,
  tAtt,
}: UseAttendanceAnalyticsOptions) {
  const [loading, setLoading] = useState(true);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [classRates, setClassRates] = useState<any[]>([]);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const tAttRef = useRef(tAtt);
  useEffect(() => {
    tAttRef.current = tAtt;
  }, [tAtt]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const currentTAtt = tAttRef.current;
      const trendData = await attendanceService.fetchAnalyticsData(year, month, paymentsMap);
      const mappedTrends = trendData.map(item => ({
        ...item,
        fullLabel: interpolate(currentTAtt?.monthYear || 'Tháng {month}/{year}', {
          month: item.m,
          year: item.y,
        }),
      }));
      setMonthlyTrends(mappedTrends);

      // Class attendance rates for current month
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      const [studRes, recRes] = await Promise.all([
        supabase.from('attendance_students').select('id, name, class_name'),
        supabase
          .from('attendance_records')
          .select('student_id')
          .gte('checkin_time', startDate)
          .lte('checkin_time', endDate),
      ]);

      if (studRes.data && recRes.data) {
        const byClass: Record<string, { totalStudents: number; totalSessions: number }> = {};

        studRes.data.forEach(s => {
          const cls = formatClassName(
            s.class_name,
            currentTAtt?.unassignedClass || 'Chưa phân lớp',
            currentTAtt?.className ? currentTAtt.className + ' ' : 'Lớp '
          );
          if (!byClass[cls]) byClass[cls] = { totalStudents: 0, totalSessions: 0 };
          byClass[cls].totalStudents += 1;
        });

        recRes.data.forEach(r => {
          const student = studRes.data!.find(s => s.id === r.student_id);
          if (student) {
            const cls = formatClassName(
              student.class_name,
              currentTAtt?.unassignedClass || 'Chưa phân lớp',
              currentTAtt?.className ? currentTAtt.className + ' ' : 'Lớp '
            );
            if (byClass[cls]) byClass[cls].totalSessions += 1;
          }
        });

        const classStats = Object.entries(byClass)
          .map(([cls, data]) => ({
            cls,
            totalStudents: data.totalStudents,
            totalSessions: data.totalSessions,
            avgSessions:
              data.totalStudents > 0
                ? Number((data.totalSessions / data.totalStudents).toFixed(1))
                : 0,
          }))
          .sort((a, b) => b.totalSessions - a.totalSessions);

        setClassRates(classStats);
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year, paymentsMap]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    loading,
    monthlyTrends,
    classRates,
    hoveredBar,
    setHoveredBar,
    refetch: fetchAnalytics,
  };
}
