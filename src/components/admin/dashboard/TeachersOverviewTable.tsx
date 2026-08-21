import React from 'react';
import { GraduationCap } from 'lucide-react';
import { AdminTeacherItem } from '../../../services/adminService';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';

export interface TeachersOverviewTableProps {
  teachers: AdminTeacherItem[];
}

export function TeachersOverviewTable({ teachers }: TeachersOverviewTableProps) {
  const { t } = useLanguage();
  const tAdmin = t.admin;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
      <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
        <GraduationCap size={18} className="text-indigo-600" />
        {interpolate(tAdmin.teachersDistributionTitle, { count: teachers.length })}
      </h3>

      {teachers.length === 0 ? (
        <p className="text-xs font-bold text-slate-400 py-6 text-center">{tAdmin.noTeachersYet}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">{tAdmin.thTeacherName}</th>
                <th className="py-3 px-3 text-center">{tAdmin.thStudentsCount}</th>
                <th className="py-3 px-3 text-center">{tAdmin.thRecordingsCount}</th>
                <th className="py-3 px-3 text-right">{tAdmin.thTopicsCount}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map(tc => (
                <tr key={tc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-black text-slate-800 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center border border-indigo-100">
                      {tc.name.slice(0, 2).toUpperCase()}
                    </span>
                    {tc.name}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">
                    {tc.student_count}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-blue-600">
                    {tc.recording_count}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-600">
                    {tc.topic_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
