import React from 'react';
import { GraduationCap, Users, Mic, Bug, BookOpen, Library, BookMarked, Video } from 'lucide-react';
import { SystemStats } from '../../../services/adminService';
import { useLanguage } from '../../../i18n/LanguageContext';

export interface StatCardsGridProps {
  stats: SystemStats;
}

export function StatCardsGrid({ stats }: StatCardsGridProps) {
  const { t } = useLanguage();
  const tAdmin = t.admin;

  const statCards = [
    {
      label: tAdmin.statTotalTeachers,
      value: stats.totalTeachers,
      icon: <GraduationCap size={22} />,
      bg: 'bg-indigo-500/10 text-indigo-600 border-indigo-200/60',
    },
    {
      label: tAdmin.statTotalStudents,
      value: stats.totalStudents,
      icon: <Users size={22} />,
      bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-200/60',
    },
    {
      label: tAdmin.statRecordingsSubmitted,
      value: stats.totalRecordings,
      icon: <Mic size={22} />,
      bg: 'bg-blue-500/10 text-blue-600 border-blue-200/60',
    },
    {
      label: tAdmin.statRecentErrors,
      value: stats.totalErrors24h,
      icon: <Bug size={22} />,
      bg:
        stats.totalErrors24h > 0
          ? 'bg-rose-500/10 text-rose-600 border-rose-200/60'
          : 'bg-slate-500/10 text-slate-600 border-slate-200/60',
    },
    {
      label: tAdmin.statTopics,
      value: stats.totalTopics,
      icon: <BookOpen size={22} />,
      bg: 'bg-amber-500/10 text-amber-600 border-amber-200/60',
    },
    {
      label: tAdmin.statStories,
      value: stats.totalStories,
      icon: <Library size={22} />,
      bg: 'bg-purple-500/10 text-purple-600 border-purple-200/60',
    },
    {
      label: tAdmin.statVocabSets,
      value: stats.totalVocabSets,
      icon: <BookMarked size={22} />,
      bg: 'bg-cyan-500/10 text-cyan-600 border-cyan-200/60',
    },
    {
      label: 'Shadowing Videos',
      value: stats.totalShadowingVideos,
      icon: <Video size={22} />,
      bg: 'bg-orange-500/10 text-orange-600 border-orange-200/60',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wide">
              {card.label}
            </span>
            <div className={`p-2.5 rounded-xl border ${card.bg}`}>{card.icon}</div>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            {card.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
