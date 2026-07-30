import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { TrendingUp, BarChart3, Loader2, PieChart } from "lucide-react";

interface AnalyticsProps {
  tAtt: any;
  month: number;
  year: number;
  paymentsMap?: Record<string, boolean>;
}

export function AttendanceAnalytics({
  tAtt,
  month,
  year,
  paymentsMap,
}: AnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [classRates, setClassRates] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // 1. Calculate 6-month revenue trend
        const monthsList = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(year, month - 1 - i, 1);
          monthsList.push({
            m: d.getMonth() + 1,
            y: d.getFullYear(),
            label: `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`,
          });
        }

        const trendData = await Promise.all(
          monthsList.map(async ({ m, y, label }) => {
            const startDate = new Date(y, m - 1, 1).toISOString();
            const endDate = new Date(y, m, 0, 23, 59, 59).toISOString();

            const [studRes, recRes, payRes] = await Promise.all([
              supabase.from("attendance_students").select("id, unit_price"),
              supabase
                .from("attendance_records")
                .select("student_id")
                .gte("checkin_time", startDate)
                .lte("checkin_time", endDate),
              supabase
                .from("attendance_payments")
                .select("student_id, is_paid")
                .eq("year", y)
                .eq("month", m)
                .eq("is_paid", true),
            ]);

            const priceMap: Record<string, number> = {};
            (studRes.data || []).forEach((s) => {
              priceMap[s.id] = Number(s.unit_price) || 0;
            });

            const studentSessions: Record<string, number> = {};
            (recRes.data || []).forEach((r) => {
              studentSessions[r.student_id] =
                (studentSessions[r.student_id] || 0) + 1;
            });

            let projected = 0;
            let collected = 0;

            const paidStudents = new Set(
              (payRes.data || []).map((p) => p.student_id),
            );

            Object.entries(studentSessions).forEach(([studId, count]) => {
              const fee = count * (priceMap[studId] || 0);
              projected += fee;
              // For the selected current month, use real-time paymentsMap if provided
              const isPaid =
                m === month && y === year && paymentsMap
                  ? !!paymentsMap[studId]
                  : paidStudents.has(studId);

              if (isPaid) {
                collected += fee;
              }
            });

            return {
              label,
              projected,
              collected,
            };
          }),
        );
        setMonthlyTrends(trendData);

        // 2. Calculate current month class attendance rate
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

        const [studRes, recRes] = await Promise.all([
          supabase.from("attendance_students").select("id, name, class_name"),
          supabase
            .from("attendance_records")
            .select("student_id")
            .gte("checkin_time", startDate)
            .lte("checkin_time", endDate),
        ]);

        if (studRes.data && recRes.data) {
          const byClass: Record<
            string,
            { totalStudents: number; totalSessions: number }
          > = {};

          studRes.data.forEach((s) => {
            const cls = s.class_name || tAtt.unassignedClass || "Chưa phân lớp";
            if (!byClass[cls])
              byClass[cls] = { totalStudents: 0, totalSessions: 0 };
            byClass[cls].totalStudents += 1;
          });

          recRes.data.forEach((r) => {
            const student = studRes.data.find((s) => s.id === r.student_id);
            if (student) {
              const cls =
                student.class_name || tAtt.unassignedClass || "Chưa phân lớp";
              if (byClass[cls]) byClass[cls].totalSessions += 1;
            }
          });

          const classStats = Object.entries(byClass)
            .map(([cls, data]) => {
              const avgSessionsPerStudent =
                data.totalStudents > 0
                  ? (data.totalSessions / data.totalStudents).toFixed(1)
                  : "0";
              return {
                cls,
                totalStudents: data.totalStudents,
                totalSessions: data.totalSessions,
                avgSessions: Number(avgSessionsPerStudent),
              };
            })
            .sort((a, b) => b.totalSessions - a.totalSessions);

          setClassRates(classStats);
        }
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [month, year, paymentsMap, tAtt]);

  const maxProjected = Math.max(...monthlyTrends.map((t) => t.projected), 1);
  const maxClassSessions = Math.max(
    ...classRates.map((c) => c.totalSessions),
    1,
  );

  return (
    <div className="space-y-6 print:hidden">
      {/* Container Header */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
          <BarChart3 size={20} />
        </div>
        <div>
          <h3 className="font-black text-slate-800 text-base sm:text-lg">
            {tAtt.analyticsTitle || "Biểu Đồ Thống Kê & Doanh Thu"}
          </h3>
          <p className="text-xs text-slate-400 font-bold">
            Phân tích xu hướng học phí và tỷ lệ tham gia học tập
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 bg-white rounded-2xl border border-slate-100">
          <Loader2 className="animate-spin text-purple-600" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: 6-Month Revenue Bar Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-purple-600" />
                <h4 className="font-black text-slate-800 text-sm sm:text-base">
                  {tAtt.revenueTrendTitle || "Doanh thu 6 tháng gần đây"}
                </h4>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-purple-500 inline-block" />
                  {tAtt.projectedLabel || "Cần thu"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                  {tAtt.collectedLabel || "Đã thu"}
                </span>
              </div>
            </div>

            {/* Custom Bar Chart with Y-Axis */}
            <div className="flex items-stretch gap-2 pt-4">
              {/* Y-Axis Column (Units in Millions / Triệu) */}
              <div className="flex flex-col justify-between text-[10px] font-bold text-slate-400 h-48 py-1 pr-1 text-right border-r border-slate-200 border-dashed shrink-0 select-none w-14">
                <span>
                  {(maxProjected / 1000000).toLocaleString("vi-VN", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  tr
                </span>
                <span>
                  {(maxProjected / 2 / 1000000).toLocaleString("vi-VN", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  tr
                </span>
                <span>0 tr</span>
              </div>

              {/* Chart Bars Area */}
              <div className="flex-1 h-48 flex items-end justify-between gap-2 pb-2 px-1 relative border-b border-slate-200">
                {/* Horizontal Guide Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30 z-0">
                  <div className="border-b border-slate-200 border-dashed w-full" />
                  <div className="border-b border-slate-200 border-dashed w-full" />
                  <div className="border-b border-slate-200 w-full" />
                </div>

                {monthlyTrends.map((t, i) => {
                  const projectedHeight =
                    t.projected > 0
                      ? Math.max(
                          6,
                          Math.round((t.projected / maxProjected) * 100),
                        )
                      : 0;
                  const collectedHeight =
                    t.collected > 0
                      ? Math.max(
                          6,
                          Math.round((t.collected / maxProjected) * 100),
                        )
                      : 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center h-full justify-end group z-10"
                    >
                      <div className="w-full max-w-[36px] flex items-end justify-center gap-1 h-full">
                        {/* Projected Bar */}
                        <div
                          className="w-1/2 bg-purple-200 group-hover:bg-purple-300 rounded-t transition-all relative"
                          style={{ height: `${projectedHeight}%` }}
                          title={`Cần thu: ${(t.projected / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} tr (${t.projected.toLocaleString()} đ)`}
                        />
                        {/* Collected Bar */}
                        <div
                          className="w-1/2 bg-emerald-500 group-hover:bg-emerald-600 rounded-t transition-all relative"
                          style={{ height: `${collectedHeight}%` }}
                          title={`Đã thu: ${(t.collected / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} tr (${t.collected.toLocaleString()} đ)`}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 mt-2">
                        {t.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium text-center">
              💡 Đơn vị trục Y: Triệu VNĐ (tr) · Cột tím = Cần thu · Cột xanh = Thực tế đã nộp
            </p>
          </div>

          {/* Chart 2: Attendance per class */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <PieChart size={18} className="text-emerald-600" />
              <h4 className="font-black text-slate-800 text-sm sm:text-base">
                {tAtt.attendanceRateTitle || "Chuyên cần theo Lớp"} (Tháng{" "}
                {month})
              </h4>
            </div>

            {classRates.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-10 font-bold">
                Chưa có dữ liệu học tập tháng này
              </p>
            ) : (
              <div className="space-y-3.5 pt-2">
                {classRates.map((c, i) => {
                  const pct = Math.round(
                    (c.totalSessions / maxClassSessions) * 100,
                  );
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-700">
                          {c.cls} ({c.totalStudents} HS)
                        </span>
                        <span className="text-emerald-700 font-black">
                          {c.totalSessions} buổi · TRB {c.avgSessions} buổi/HS
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
