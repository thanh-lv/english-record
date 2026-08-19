import { useState, useEffect, useCallback, useMemo } from 'react';
import { loggerService } from '../../../../services/loggerService';
import { supabase } from '../../../../lib/supabase';
import { LogEntry, RemoteLogRecord } from '../../../../types';

export function useLogs() {
  const [source, setSource] = useState<'remote' | 'local'>('remote');
  const [remoteLogs, setRemoteLogs] = useState<RemoteLogRecord[]>([]);
  const [localLogs, setLocalLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      if (source === 'remote') {
        const data = await loggerService.fetchRemoteLogs({ limit: 100 });
        setRemoteLogs(data);
      } else {
        const data = loggerService.getLogs();
        setLocalLogs(data);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    fetchLogs();

    if (source === 'remote') {
      const channel = supabase
        .channel('client-error-logs-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'client_error_logs' },
          payload => {
            setRemoteLogs(prev => [payload.new as RemoteLogRecord, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchLogs, source]);

  const activeLogs = source === 'remote' ? remoteLogs : localLogs;

  const availableModules = useMemo(() => {
    const modules = new Set(activeLogs.map(l => l.module).filter(Boolean));
    return Array.from(modules).sort();
  }, [activeLogs]);

  const filteredLogs = useMemo(() => {
    return activeLogs.filter(log => {
      // Level filter
      if (filterLevel !== 'all' && log.level !== filterLevel) {
        return false;
      }

      // Module filter
      if (filterModule !== 'all' && log.module !== filterModule) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const msg = (log.message || '').toLowerCase();
        const mod = (log.module || '').toLowerCase();
        const stack = (log.stack || '').toLowerCase();
        const userName = ((log as any).user_name || (log as any).userName || '').toLowerCase();
        const url = (log.url || '').toLowerCase();

        return (
          msg.includes(q) ||
          mod.includes(q) ||
          stack.includes(q) ||
          userName.includes(q) ||
          url.includes(q)
        );
      }

      return true;
    });
  }, [activeLogs, filterLevel, filterModule, searchQuery]);

  const stats = useMemo(() => {
    const total = activeLogs.length;
    const errors = activeLogs.filter(l => l.level === 'ERROR').length;
    const warnings = activeLogs.filter(l => l.level === 'WARN').length;
    const crashes = activeLogs.filter(
      l => l.module === 'ReactErrorBoundary' || l.module === 'WindowError'
    ).length;

    return { total, errors, warnings, crashes };
  }, [activeLogs]);

  const handleCopyStack = (id: string, text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2500);
      });
    }
  };

  const handleDeleteRemote = async (id: string) => {
    setDeletingId(id);
    try {
      await loggerService.deleteRemoteLog(id);
      setRemoteLogs(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('Error deleting remote log:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearLogs = () => {
    if (source === 'local') {
      loggerService.clearLogs();
      setLocalLogs([]);
    }
    setShowClearConfirm(false);
  };

  const handleDownload = () => {
    loggerService.downloadLogs(`client-logs-${Date.now()}.json`);
  };

  return {
    source,
    setSource,
    loading,
    filterLevel,
    setFilterLevel,
    filterModule,
    setFilterModule,
    searchQuery,
    setSearchQuery,
    expandedLogId,
    setExpandedLogId,
    copiedId,
    deletingId,
    showClearConfirm,
    setShowClearConfirm,
    availableModules,
    filteredLogs,
    stats,
    refetch: fetchLogs,
    handleCopyStack,
    handleDeleteRemote,
    handleClearLogs,
    handleDownload,
  };
}
