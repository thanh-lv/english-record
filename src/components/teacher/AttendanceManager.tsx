import { useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { Users, Calendar, FileText, Trophy } from "lucide-react";
import { StudentsTab } from "./attendance/StudentsTab";
import { CheckinTab } from "./attendance/CheckinTab";
import { SummaryTab } from "./attendance/SummaryTab";
import { AttendanceLeaderboard } from "./attendance/AttendanceLeaderboard";

export function AttendanceManager() {
  const { t } = useLanguage();
  const tAtt = (t as any).attendance;
  const [activeTab, setActiveTab] = useState<
    "students" | "checkin" | "summary" | "leaderboard"
  >("students");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap bg-white rounded-lg p-1.5 border border-slate-100 shadow-md gap-1.5 w-full">
        <button
          onClick={() => setActiveTab("summary")}
          className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 min-w-[120px] ${
            activeTab === "summary"
              ? "bg-purple-50 text-purple-600 shadow-md"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <FileText size={16} />
          <span>{tAtt.summaryTab}</span>
        </button>
        <button
          onClick={() => setActiveTab("checkin")}
          className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 min-w-[120px] ${
            activeTab === "checkin"
              ? "bg-emerald-50 text-emerald-600 shadow-md"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Calendar size={16} />
          <span>{tAtt.checkinTab}</span>
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 min-w-[120px] ${
            activeTab === "leaderboard"
              ? "bg-amber-50 text-amber-600 shadow-md"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Trophy size={16} />
          <span>{tAtt.leaderboardTab || "Bảng Xếp Hạng"}</span>
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 min-w-[120px] ${
            activeTab === "students"
              ? "bg-blue-50 text-blue-600 shadow-md"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Users size={16} />
          <span>{tAtt.studentsTab}</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-100 shadow-md p-3 min-h-[500px]">
        {activeTab === "students" && <StudentsTab tAtt={tAtt} />}
        {activeTab === "checkin" && <CheckinTab tAtt={tAtt} />}
        {activeTab === "summary" && <SummaryTab tAtt={tAtt} />}
        {activeTab === "leaderboard" && <AttendanceLeaderboard tAtt={tAtt} />}
      </div>
    </div>
  );
}
