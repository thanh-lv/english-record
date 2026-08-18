import { useState } from "react";
import { useLanguage } from "../../../i18n/LanguageContext";
import { Users, Calendar, FileText } from "lucide-react";
import { StudentsTab } from "./StudentsTab";
import { CheckinTab } from "./CheckinTab";
import { SummaryTab } from "./SummaryTab";

export function AttendanceManager() {
  const { t } = useLanguage();
  const tAtt = t.attendance;
  const [activeTab, setActiveTab] = useState<
    "students" | "checkin" | "summary"
  >("summary");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap bg-white/95 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200/80 shadow-xs gap-1.5 w-full">
        <button
          onClick={() => setActiveTab("summary")}
          className={`flex-1 sm:flex-none px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 min-w-[130px] ${
            activeTab === "summary"
              ? "bg-purple-50 text-purple-700 shadow-xs border border-purple-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold"
          }`}
        >
          <FileText size={16} />
          <span>{tAtt.summaryTab}</span>
        </button>
        <button
          onClick={() => setActiveTab("checkin")}
          className={`flex-1 sm:flex-none px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 min-w-[130px] ${
            activeTab === "checkin"
              ? "bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold"
          }`}
        >
          <Calendar size={16} />
          <span>{tAtt.checkinTab}</span>
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`flex-1 sm:flex-none px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 min-w-[130px] ${
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
        {activeTab === "students" && <StudentsTab />}
        {activeTab === "checkin" && <CheckinTab />}
        {activeTab === "summary" && <SummaryTab />}
      </div>
    </div>
  );
}

