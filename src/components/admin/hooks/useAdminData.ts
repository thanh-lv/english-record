import { useState, useEffect, useCallback } from 'react';
import { adminService, AdminTeacherItem, SystemStats } from '../../../services/adminService';

export function useAdminData() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [teachers, setTeachers] = useState<AdminTeacherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, teachersData] = await Promise.all([
        adminService.fetchSystemStats(),
        adminService.fetchTeachers(),
      ]);
      setStats(statsData);
      setTeachers(teachersData);
    } catch (err: any) {
      console.error('Error loading admin data:', err);
      setError(err?.message || 'Không thể tải dữ liệu quản trị');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    stats,
    teachers,
    loading,
    error,
    refetch: loadData,
  };
}
