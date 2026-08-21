import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { AdminTeacherItem, SystemStats } from '../../../services/adminService';
import { StatCardsGrid } from './StatCardsGrid';
import { TeachersOverviewTable } from './TeachersOverviewTable';
import { useLanguage } from '../../../i18n/LanguageContext';

export interface AdminDashboardProps {
  stats: SystemStats | null;
  teachers: AdminTeacherItem[];
  loading: boolean;
  onRefresh: () => void;
}

export function AdminDashboard({ stats, teachers, loading, onRefresh }: AdminDashboardProps) {
  const { t } = useLanguage();
  const tAdmin = t.admin;

  if (loading || !stats) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 size={36} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header with quick refresh */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            {tAdmin.dashboardTitle}
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-0.5">{tAdmin.dashboardSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw size={14} /> {tAdmin.refreshBtn}
        </button>
      </div>

      {/* Metric Cards Grid */}
      <StatCardsGrid stats={stats} />

      {/* Teachers Overview Table */}
      <TeachersOverviewTable teachers={teachers} />
    </div>
  );
}

export default AdminDashboard;
