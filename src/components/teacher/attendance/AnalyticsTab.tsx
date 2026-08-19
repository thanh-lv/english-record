import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { AttendanceAnalytics } from './AttendanceAnalytics';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';

export function AnalyticsTab() {
  const { t } = useLanguage();
  const tAtt = t.attendance;
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Controls Bar for Analytics Tab */}
      <div className="bg-slate-50/80 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-sm sm:text-base">
              {tAtt.analyticsTab || 'Biểu Đồ Thống Kê & Doanh Thu'}
            </h3>
            <p className="text-xs text-slate-400 font-bold">
              {tAtt?.analyticsSubtitle || 'Phân tích xu hướng học phí & chuyên cần 6 tháng'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Month */}
          <div>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-bold text-slate-800 text-xs sm:text-sm shadow-2xs cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>
                  {interpolate(tAtt.monthName || 'Tháng {m}', { m })}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-bold text-slate-800 text-xs sm:text-sm shadow-2xs cursor-pointer"
            >
              {[year - 1, year, year + 1].map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Analytics Main Widget */}
      <AttendanceAnalytics tAtt={tAtt} month={month} year={year} />
    </div>
  );
}
