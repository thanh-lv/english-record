import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AdminHeader, useAdminData } from '../components/admin';

const AdminDashboard = lazy(() =>
  import('../components/admin').then(m => ({
    default: m.AdminDashboard,
  }))
);

const AdminTeachers = lazy(() =>
  import('../components/admin').then(m => ({
    default: m.AdminTeachers,
  }))
);

const LogsManager = lazy(() =>
  import('../components/admin').then(m => ({
    default: m.LogsManager,
  }))
);

export interface AdminPageProps {
  user?: any;
  onLogout?: () => void;
}

export default function AdminPage({ onLogout }: AdminPageProps) {
  const { stats, teachers, loading, refetch } = useAdminData();

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#FFFDF6] via-[#F8FAFC] to-[#F1F5F9] pb-16 text-slate-800">
      {/* Top Banner / Navbar */}
      <AdminHeader onLogout={onLogout} />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        <Suspense
          fallback={
            <div className="flex justify-center items-center py-20">
              <Loader2 size={36} className="animate-spin text-indigo-600" />
            </div>
          }
        >
          <Routes>
            <Route
              path="dashboard"
              element={
                <AdminDashboard
                  stats={stats}
                  teachers={teachers}
                  loading={loading}
                  onRefresh={refetch}
                />
              }
            />
            <Route
              path="teachers"
              element={<AdminTeachers teachers={teachers} loading={loading} onRefresh={refetch} />}
            />
            <Route path="logs" element={<LogsManager />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
