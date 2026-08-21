import React from 'react';
import { ShieldAlert, Layers, GraduationCap, Bug, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../../i18n/LanguageContext';

export interface AdminHeaderProps {
  onLogout?: () => void;
}

export function AdminHeader({ onLogout }: AdminHeaderProps) {
  const location = useLocation();
  const { t } = useLanguage();
  const tAdmin = t.admin;
  const activeTab = location.pathname.split('/')[2] || 'dashboard';

  const navItems = [
    { id: 'dashboard', label: tAdmin.tabOverview, icon: <Layers size={18} /> },
    { id: 'teachers', label: tAdmin.tabTeachers, icon: <GraduationCap size={18} /> },
    { id: 'logs', label: tAdmin.tabLogs, icon: <Bug size={18} /> },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-4 sm:px-8 py-3 flex justify-between items-center sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-900 font-black shadow-xs">
          <ShieldAlert size={20} />
        </div>
        <div>
          <h1 className="font-black text-sm sm:text-base text-slate-800 tracking-tight leading-none">
            Super Admin Portal
          </h1>
          <p className="text-[10px] font-extrabold text-amber-600 mt-0.5">
            {tAdmin.systemAdminTag}
          </p>
        </div>
      </div>

      {/* Navigation Tabs & Logout */}
      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
          {navItems.map(item => {
            const active = activeTab === item.id;
            return (
              <Link
                key={item.id}
                to={`/admin/${item.id}`}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                  active
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title={tAdmin.logout}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100/90 text-rose-600 border border-rose-200/80 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
          >
            <LogOut size={15} />
            <span className="hidden md:inline">{tAdmin.logout}</span>
          </button>
        )}
      </div>
    </header>
  );
}
