import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { Trophy, Crown, Loader2, Calendar } from "lucide-react";
import { formatClassName } from "../../../utils";
import { useLanguage, interpolate } from "../../../i18n/LanguageContext";

export function AttendanceLeaderboard() {
  const { t } = useLanguage();
  const tAtt = t.attendance;
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">(
    "month",
  );
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        // Try RPC function first
        const rpcRes = await supabase.rpc("get_attendance_leaderboard", {
          p_type: timeframe,
        });

        if (!rpcRes.error && rpcRes.data && rpcRes.data.length > 0) {
          setData(
            rpcRes.data.map((item: any) => ({
              id: item.student_id,
              name: item.name,
              class_name: item.class_name,
              total_sessions: Number(item.total_sessions),
            })),
          );
          setLoading(false);
          return;
        }

        // Fallback calculation on client-side if RPC is not installed yet
        const now = new Date();
        let startTime = new Date();
        if (timeframe === "week") {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          startTime = new Date(now.setDate(diff));
          startTime.setHours(0, 0, 0, 0);
        } else if (timeframe === "year") {
          startTime = new Date(now.getFullYear(), 0, 1);
        } else {
          startTime = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const [studRes, recRes] = await Promise.all([
          supabase.from("attendance_students").select("*"),
          supabase
            .from("attendance_records")
            .select("student_id, checkin_time")
            .gte("checkin_time", startTime.toISOString()),
        ]);

        if (studRes.data && recRes.data) {
          const countMap: Record<string, number> = {};
          recRes.data.forEach((r) => {
            countMap[r.student_id] = (countMap[r.student_id] || 0) + 1;
          });

          const ranked = studRes.data
            .map((s) => ({
              id: s.id,
              name: s.name,
              class_name: s.class_name || tAtt.unassignedClass,
              total_sessions: countMap[s.id] || 0,
            }))
            .filter((s) => s.total_sessions > 0)
            .sort((a, b) => b.total_sessions - a.total_sessions)
            .slice(0, 10);

          setData(ranked);
        }
      } catch (e) {
        console.error("Leaderboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeframe, tAtt]);

  const top1 = data[0];
  const top2 = data[1];
  const top3 = data[2];
  const rest = data.slice(3);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 sm:p-6 shadow-md space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
            <Trophy size={22} />
          </div>
          <div>
            <h2 className="font-black text-slate-800 text-lg sm:text-xl flex items-center gap-2">
              {tAtt.leaderboardTitle || "Bảng Xếp Hạng Chăm Chỉ"}
            </h2>
            <p className="text-xs text-slate-400 font-bold">
              {tAtt.leaderboardSubtitle ||
                "Top học sinh có số buổi đi học nhiều nhất"}
            </p>
          </div>
        </div>

        {/* Timeframe Filter Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
          <button
            onClick={() => setTimeframe("week")}
            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
              timeframe === "week"
                ? "bg-white text-amber-700 shadow-md"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tAtt.filterWeek || "Tuần này"}
          </button>
          <button
            onClick={() => setTimeframe("month")}
            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
              timeframe === "month"
                ? "bg-white text-amber-700 shadow-md"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tAtt.filterMonth || "Tháng này"}
          </button>
          <button
            onClick={() => setTimeframe("year")}
            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
              timeframe === "year"
                ? "bg-white text-amber-700 shadow-md"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tAtt.filterYear || "Năm nay"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-amber-500" size={32} />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-10 text-slate-400 font-bold">
          <Calendar size={36} className="mx-auto mb-2 opacity-50" />
          <p>
            {tAtt.noLeaderboardData ||
              "Chưa có dữ liệu điểm danh trong thời gian này."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4 max-w-xl mx-auto">
            {/* Rank 2 - Silver */}
            {top2 ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-black text-slate-700 text-lg relative shadow">
                  🥈
                  <span className="absolute -top-2 -right-1 bg-slate-200 text-slate-700 text-[10px] font-black px-1.5 py-0.5 rounded-lg border border-slate-300">
                    2nd
                  </span>
                </div>
                <p className="font-black text-slate-800 text-xs sm:text-sm mt-2 text-center truncate w-full">
                  {top2.name}
                </p>
                <p className="text-[11px] text-slate-400 font-bold truncate w-full text-center">
                  {formatClassName(
                    top2.class_name,
                    tAtt.unassignedClass,
                    tAtt.className ? tAtt.className + " " : "Lớp ",
                  )}
                </p>
                <div className="mt-2 bg-gradient-to-t from-slate-200 to-slate-100 w-full py-4 rounded-t-lg border border-slate-300 text-center">
                  <span className="font-black text-slate-800 text-sm sm:text-base">
                    {interpolate(tAtt.sessionCount || "{count} buổi", {
                      count: top2.total_sessions,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <div />
            )}

            {/* Rank 1 - Gold */}
            {top1 ? (
              <div className="flex flex-col items-center -mt-4">
                <div className="relative">
                  <Crown
                    size={24}
                    className="text-amber-500 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce"
                  />
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gradient-to-br from-amber-300 to-yellow-500 border-4 border-amber-200 flex items-center justify-center font-black text-white text-2xl shadow-md">
                    🥇
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[11px] font-black px-2 py-0.5 rounded-lg border border-white">
                      1st
                    </span>
                  </div>
                </div>
                <p className="font-black text-amber-900 text-sm sm:text-base mt-2 text-center truncate w-full">
                  {top1.name}
                </p>
                <p className="text-xs text-amber-700/70 font-bold truncate w-full text-center">
                  {formatClassName(
                    top1.class_name,
                    tAtt.unassignedClass,
                    tAtt.className ? tAtt.className + " " : "Lớp ",
                  )}
                </p>
                <div className="mt-2 bg-gradient-to-t from-amber-400 to-amber-200 w-full py-6 rounded-t-lg border border-amber-300 text-center shadow-md">
                  <span className="font-black text-amber-950 text-base sm:text-lg">
                    {interpolate(tAtt.sessionCount || "{count} buổi", {
                      count: top1.total_sessions,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <div />
            )}

            {/* Rank 3 - Bronze */}
            {top3 ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-orange-100 border-2 border-orange-300 flex items-center justify-center font-black text-orange-700 text-lg relative shadow">
                  🥉
                  <span className="absolute -top-2 -right-1 bg-orange-200 text-orange-800 text-[10px] font-black px-1.5 py-0.5 rounded-lg border border-orange-300">
                    3rd
                  </span>
                </div>
                <p className="font-black text-slate-800 text-xs sm:text-sm mt-2 text-center truncate w-full">
                  {top3.name}
                </p>
                <p className="text-[11px] text-slate-400 font-bold truncate w-full text-center">
                  {formatClassName(
                    top3.class_name,
                    tAtt.unassignedClass,
                    tAtt.className ? tAtt.className + " " : "Lớp ",
                  )}
                </p>
                <div className="mt-2 bg-gradient-to-t from-orange-200 to-amber-100 w-full py-3 rounded-t-lg border border-orange-300 text-center">
                  <span className="font-black text-orange-900 text-sm sm:text-base">
                    {interpolate(tAtt.sessionCount || "{count} buổi", {
                      count: top3.total_sessions,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <div />
            )}
          </div>

          {/* Ranks 4 to 10 List */}
          {rest.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
              {rest.map((student, idx) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-slate-100 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 font-black text-xs text-slate-600 flex items-center justify-center">
                      #{idx + 4}
                    </span>
                    <div>
                      <p className="font-black text-slate-800 text-sm">
                        {student.name}
                      </p>
                      <p className="text-xs text-slate-400 font-bold">
                        {formatClassName(
                          student.class_name,
                          tAtt.unassignedClass,
                          tAtt.className ? tAtt.className + " " : "Lớp ",
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="font-black text-emerald-600 text-sm bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                    {interpolate(tAtt.sessionCount || "{count} buổi", {
                      count: student.total_sessions,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
