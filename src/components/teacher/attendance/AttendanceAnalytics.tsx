import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Loader2,
  PieChart,
  Wallet,
  AlertCircle,
  Star,
} from "lucide-react";
import { formatClassName } from "../../../utils";

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
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // 6-month list
        const monthsList = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(year, month - 1 - i, 1);
          monthsList.push({
            m: d.getMonth() + 1,
            y: d.getFullYear(),
            label: `T${d.getMonth() + 1}`,
            fullLabel: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`,
          });
        }

        const trendData = await Promise.all(
          monthsList.map(async ({ m, y, label, fullLabel }) => {
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
              const isPaid =
                m === month && y === year && paymentsMap
                  ? !!paymentsMap[studId]
                  : paidStudents.has(studId);
              if (isPaid) collected += fee;
            });

            return { label, fullLabel, projected, collected, m, y };
          }),
        );
        setMonthlyTrends(trendData);

        // Class attendance rates for current month
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
            const student = studRes.data!.find((s) => s.id === r.student_id);
            if (student) {
              const cls =
                student.class_name || tAtt.unassignedClass || "Chưa phân lớp";
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
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [month, year, paymentsMap, tAtt]);

  // ---- Derived stats ----
  const maxProjected = Math.max(...monthlyTrends.map((t) => t.projected), 1);
  const totalProjected6m = monthlyTrends.reduce((s, t) => s + t.projected, 0);
  const totalCollected6m = monthlyTrends.reduce((s, t) => s + t.collected, 0);
  const totalOutstanding6m = totalProjected6m - totalCollected6m;
  const collectionRate6m =
    totalProjected6m > 0
      ? Math.round((totalCollected6m / totalProjected6m) * 100)
      : 0;

  const bestMonth = [...monthlyTrends].sort(
    (a, b) => b.projected - a.projected,
  )[0];

  // Trend: compare last 2 months
  const lastTwo = monthlyTrends.slice(-2);
  const trendDelta =
    lastTwo.length === 2 ? lastTwo[1].projected - lastTwo[0].projected : 0;

  const maxClassSessions = Math.max(
    ...classRates.map((c) => c.totalSessions),
    1,
  );

  const classColors = [
    "from-purple-500 to-violet-500",
    "from-blue-500 to-cyan-400",
    "from-emerald-500 to-teal-400",
    "from-amber-500 to-orange-400",
    "from-rose-500 to-pink-400",
  ];

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`
      : `${(n / 1_000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })}k`;

  return (
    <div className="space-y-5 print:hidden">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
          <BarChart3 size={20} />
        </div>
        <div>
          <h3 className="font-black text-slate-800 text-base">
            {tAtt.analyticsTitle || "Biểu Đồ Doanh Thu & Thống Kê"}
          </h3>
          <p className="text-xs text-slate-400 font-bold">
            Phân tích xu hướng học phí 6 tháng gần đây
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 bg-white rounded-2xl border border-slate-100">
          <Loader2 className="animate-spin text-purple-600" size={32} />
        </div>
      ) : (
        <div className="space-y-5">
          {/* ---- Summary cards 4 cols ---- */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Tổng cần thu 6 tháng */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Cần thu (6T)
              </p>
              <p className="text-lg font-black text-slate-800 leading-tight">
                {fmt(totalProjected6m)}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {totalProjected6m.toLocaleString()} đ
              </p>
            </div>
            {/* Đã thu */}
            <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-sm space-y-1">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                <Wallet size={10} /> Đã thu (6T)
              </p>
              <p className="text-lg font-black text-emerald-700 leading-tight">
                {fmt(totalCollected6m)}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {collectionRate6m}% tỷ lệ thu
              </p>
            </div>
            {/* Tồn đọng */}
            <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-sm space-y-1">
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle size={10} /> Tồn đọng
              </p>
              <p className="text-lg font-black text-rose-600 leading-tight">
                {fmt(totalOutstanding6m)}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {100 - collectionRate6m}% chưa thu
              </p>
            </div>
            {/* Tháng tốt nhất */}
            <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm space-y-1">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1">
                <Star size={10} /> Tháng tốt nhất
              </p>
              <p className="text-lg font-black text-amber-700 leading-tight">
                {bestMonth ? bestMonth.fullLabel : "—"}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {bestMonth ? fmt(bestMonth.projected) : ""}
              </p>
            </div>
          </div>

          {/* ---- Main charts row ---- */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Revenue stacked bar chart (3/5) */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-purple-600" />
                    <h4 className="font-black text-slate-800 text-sm">
                      {tAtt.revenueTrendTitle || "Doanh thu 6 tháng gần đây"}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[11px] font-bold">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                      Đã thu
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-purple-200 inline-block" />
                      Chưa thu
                    </span>
                  </div>
                </div>
                {/* Trend indicator */}
                {trendDelta !== 0 && (
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                      trendDelta > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {trendDelta > 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {trendDelta > 0 ? "+" : ""}
                    {fmt(Math.abs(trendDelta))}
                  </div>
                )}
              </div>

              {/* Chart area */}
              <div className="flex items-stretch gap-2">
                {/* Y-axis */}
                <div className="flex flex-col justify-between text-[10px] font-bold text-slate-400 h-44 py-1 pr-2 text-right border-r border-slate-100 shrink-0 w-12 select-none">
                  <span>{fmt(maxProjected)}</span>
                  <span>{fmt(maxProjected * 0.75)}</span>
                  <span>{fmt(maxProjected * 0.5)}</span>
                  <span>{fmt(maxProjected * 0.25)}</span>
                  <span>0</span>
                </div>

                {/* Bars */}
                <div className="flex-1 h-44 flex items-end gap-2 relative border-b border-slate-100">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="border-b border-dashed border-slate-100 w-full"
                      />
                    ))}
                  </div>

                  {monthlyTrends.map((t, i) => {
                    const isCurrentMonth = t.m === month && t.y === year;
                    const totalPct =
                      t.projected > 0
                        ? Math.max(
                            8,
                            Math.round((t.projected / maxProjected) * 100),
                          )
                        : 0;
                    const collectedPct =
                      t.projected > 0 && t.collected > 0
                        ? Math.round((t.collected / t.projected) * totalPct)
                        : 0;
                    const outstandingPct = totalPct - collectedPct;
                    const isHovered = hoveredBar === i;

                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center h-full justify-end z-10 cursor-pointer"
                        onMouseEnter={() => setHoveredBar(i)}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {/* Tooltip */}
                        {isHovered && t.projected > 0 && (
                          <div
                            className="absolute bottom-full mb-2 bg-slate-800 text-white rounded-xl px-3 py-2 text-[11px] font-bold shadow-xl z-20 whitespace-nowrap pointer-events-none"
                            style={{
                              left: "50%",
                              transform: "translateX(-50%)",
                            }}
                          >
                            <p className="text-slate-300 mb-1">{t.fullLabel}</p>
                            <p className="text-emerald-400">
                              ✓ Đã thu: {t.collected.toLocaleString()}đ
                            </p>
                            <p className="text-rose-400">
                              ✗ Chưa thu:{" "}
                              {(t.projected - t.collected).toLocaleString()}đ
                            </p>
                            <p className="text-white mt-1 border-t border-slate-600 pt-1">
                              Tổng: {t.projected.toLocaleString()}đ
                            </p>
                          </div>
                        )}

                        {/* Stacked bar */}
                        <div
                          className={`w-full max-w-[40px] flex flex-col justify-end rounded-t-lg overflow-hidden transition-all duration-200 ${
                            isHovered ? "scale-105 shadow-lg" : ""
                          } ${isCurrentMonth ? "ring-2 ring-purple-400 ring-offset-1" : ""}`}
                          style={{ height: `${totalPct}%` }}
                        >
                          {/* Outstanding (top = purple) */}
                          {outstandingPct > 0 && (
                            <div
                              className="w-full bg-purple-200"
                              style={{
                                height: `${(outstandingPct / totalPct) * 100}%`,
                              }}
                            />
                          )}
                          {/* Collected (bottom = green) */}
                          {collectedPct > 0 && (
                            <div
                              className="w-full bg-emerald-500"
                              style={{
                                height: `${(collectedPct / totalPct) * 100}%`,
                              }}
                            />
                          )}
                          {/* No data */}
                          {t.projected === 0 && (
                            <div className="w-full h-2 bg-slate-100 rounded-t-lg" />
                          )}
                        </div>

                        {/* Label */}
                        <span
                          className={`text-[11px] font-black mt-1.5 ${
                            isCurrentMonth
                              ? "text-purple-700"
                              : "text-slate-400"
                          }`}
                        >
                          {t.label}
                        </span>
                        {isCurrentMonth && (
                          <span className="text-[9px] font-black text-purple-500">
                            ▲
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-medium text-center mt-3">
                Cột xếp chồng: 🟢 Đã thu + 🟣 Chưa thu = Tổng cần thu · Viền tím
                = tháng đang xem
              </p>
            </div>

            {/* Right column: Collection rate ring + Class attendance (2/5) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Collection rate donut */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col items-center">
                <h4 className="font-black text-slate-800 text-sm mb-3 self-start flex items-center gap-1.5">
                  <Wallet size={14} className="text-emerald-600" />
                  Tỷ lệ thu học phí
                </h4>
                {/* SVG donut */}
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    {/* Background track */}
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="4"
                    />
                    {/* Outstanding arc */}
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#e9d5ff"
                      strokeWidth="4"
                      strokeDasharray="87.96 0"
                      strokeLinecap="round"
                    />
                    {/* Collected arc */}
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="4"
                      strokeDasharray={`${(collectionRate6m / 100) * 87.96} 87.96`}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-800">
                      {collectionRate6m}%
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 leading-tight text-center">
                      đã thu
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-xs font-bold">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    {fmt(totalCollected6m)}
                  </span>
                  <span className="flex items-center gap-1 text-purple-500">
                    <span className="w-2 h-2 rounded-full bg-purple-200 inline-block" />
                    {fmt(totalOutstanding6m)}
                  </span>
                </div>
              </div>

              {/* Class attendance bars */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h4 className="font-black text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                  <PieChart size={14} className="text-blue-600" />
                  Chuyên cần theo Lớp (T{month})
                </h4>
                {classRates.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs py-6 font-bold">
                    Chưa có dữ liệu tháng này
                  </p>
                ) : (
                  <div className="space-y-3">
                    {classRates.map((c, i) => {
                      const pct = Math.round(
                        (c.totalSessions / maxClassSessions) * 100,
                      );
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-slate-700 truncate max-w-[60%]">
                              {formatClassName(c.cls, tAtt?.unassignedClass)}
                              <span className="text-slate-400 font-medium ml-1">
                                ({c.totalStudents} HS)
                              </span>
                            </span>
                            <span className="text-slate-700 shrink-0">
                              {c.totalSessions} buổi
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${classColors[i % classColors.length]} rounded-full transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium text-right">
                            TB {c.avgSessions} buổi/HS
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
