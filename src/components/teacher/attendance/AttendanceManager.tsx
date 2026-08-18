import { useState } from "react";
import { useLanguage } from "../../../i18n/LanguageContext";
import { Users, Calendar, Wallet, BarChart3 } from "lucide-react";
import { StudentsTab } from "./StudentsTab";
import { CheckinTab } from "./CheckinTab";
import { SummaryTab } from "./SummaryTab";
import { AnalyticsTab } from "./AnalyticsTab";

export function AttendanceManager() {
  const { t } = useLanguage();
  const tAtt = t.attendance;
  const [activeTab, setActiveTab] = useState<
    "tuition" | "checkin" | "analytics" | "students"
  >("tuition");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap bg-white/95 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200/80 shadow-xs gap-1.5 w-full">
        {/* Tab 1: Học Phí */}
        <button
          onClick={() => setActiveTab("tuition")}
          className={`flex-1 sm:flex-none px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 min-w-[130px] cursor-pointer ${
            activeTab === "tuition"
              ? "bg-purple-50 text-purple-700 shadow-xs border border-purple-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold"
          }`}
        >
          <Wallet size={16} />
          <span>{tAtt.tuitionTab || "Học Phí"}</span>
        </button>

        {/* Tab 2: Lịch Điểm Danh */}
        <button
          onClick={() => setActiveTab("checkin")}
          className={`flex-1 sm:flex-none px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 min-w-[130px] cursor-pointer ${
            activeTab === "checkin"
              ? "bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold"
          }`}
        >
          <Calendar size={16} />
          <span>{tAtt.checkinTab}</span>
        </button>

        {/* Tab 3: Biểu Đồ Thống Kê */}
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex-1 sm:flex-none px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 min-w-[130px] cursor-pointer ${
            activeTab === "analytics"
              ? "bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold"
          }`}
        >
          <BarChart3 size={16} />
          <span>{tAtt.analyticsTab || "Biểu Đồ Thống Kê"}</span>
        </button>

        {/* Tab 4: Danh Sách Học Sinh */}
        <button
          onClick={() => setActiveTab("students")}
          className={`flex-1 sm:flex-none px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 min-w-[130px] cursor-pointer ${
            activeTab === "students"
              ? "bg-blue-50 text-[#1E88E5] shadow-xs border border-blue-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold"
          }`}
        >
          <Users size={16} />
          <span>{tAtt.studentsTab}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 min-h-[500px]">
        {activeTab === "tuition" && <SummaryTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "checkin" && <CheckinTab />}
        {activeTab === "students" && <StudentsTab />}
      </div>
    </div>
  );
}
