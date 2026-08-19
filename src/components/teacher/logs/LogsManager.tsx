import React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  Download,
  RefreshCw,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Cloud,
  Laptop,
  Flame,
  User,
  Globe,
} from 'lucide-react';
import { useLogs } from './hooks/useLogs';
import { useLanguage } from '../../../i18n/LanguageContext';

export function LogsManager() {
  const { t } = useLanguage();
  const {
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
    availableModules,
    filteredLogs,
    stats,
    refetch,
    handleCopyStack,
    handleDeleteRemote,
    handleClearLogs,
    handleDownload,
  } = useLogs();

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-black">
            <AlertCircle size={12} className="text-rose-500" />
            ERROR
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-black">
            <AlertTriangle size={12} className="text-amber-600" />
            WARN
          </span>
        );
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-black">
            <Info size={12} className="text-blue-500" />
            INFO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-black">
            <Bug size={12} className="text-slate-500" />
            DEBUG
          </span>
        );
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return `${d.toLocaleTimeString('vi-VN')} • ${d.toLocaleDateString('vi-VN')}`;
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Bug size={20} />
            </span>
            Nhật Ký Lỗi & Trải Nghiệm Người Dùng
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Theo dõi sự cố, lỗi thu âm, lỗi mạng và phản hồi kỹ thuật từ học sinh và thiết bị
            client.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Source switch */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSource('remote')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                source === 'remote'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Cloud size={14} />
              Cloud Supabase
            </button>
            <button
              type="button"
              onClick={() => setSource('local')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                source === 'local'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Laptop size={14} />
              Máy này (Local)
            </button>
          </div>

          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-bold transition-all cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="h-9 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Download size={14} />
            Xuất file Log
          </button>

          {source === 'local' && (
            <button
              type="button"
              onClick={handleClearLogs}
              className="h-9 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Trash2 size={14} />
              Xóa log máy này
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-400">Tổng số Log</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{stats.total}</p>
        </div>

        <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200/60 shadow-xs">
          <p className="text-xs font-bold text-rose-500 flex items-center gap-1">
            <AlertCircle size={14} />
            Lỗi (ERROR)
          </p>
          <p className="text-2xl font-black text-rose-600 mt-1">{stats.errors}</p>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60 shadow-xs">
          <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
            <AlertTriangle size={14} />
            Cảnh báo (WARN)
          </p>
          <p className="text-2xl font-black text-amber-700 mt-1">{stats.warnings}</p>
        </div>

        <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200/60 shadow-xs">
          <p className="text-xs font-bold text-purple-700 flex items-center gap-1">
            <Flame size={14} />
            Crash / ErrorBoundary
          </p>
          <p className="text-2xl font-black text-purple-700 mt-1">{stats.crashes}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm theo nội dung lỗi, tên học sinh, stack..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Level Filter */}
          <select
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:outline-hidden"
          >
            <option value="all">Mọi cấp độ</option>
            <option value="ERROR">Chỉ ERROR</option>
            <option value="WARN">Chỉ WARN</option>
            <option value="INFO">Chỉ INFO</option>
            <option value="DEBUG">Chỉ DEBUG</option>
          </select>

          {/* Module Filter */}
          <select
            value={filterModule}
            onChange={e => setFilterModule(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:outline-hidden"
          >
            <option value="all">Mọi module</option>
            {availableModules.map(mod => (
              <option key={mod} value={mod}>
                {mod}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Log list */}
      <div className="space-y-3">
        {loading && filteredLogs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200/80">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-xs font-bold">Đang tải danh sách nhật ký...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200/80">
            <Check size={32} className="mx-auto mb-2 text-emerald-500" />
            <p className="text-sm font-black text-slate-700">Không có lỗi nào được ghi nhận</p>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Hệ thống đang hoạt động ổn định và trơn tru.
            </p>
          </div>
        ) : (
          filteredLogs.map(log => {
            const isExpanded = expandedLogId === log.id;
            const userName = (log as any).user_name || (log as any).userName;
            const userRole = (log as any).role || (log as any).userRole;
            const timestamp = (log as any).created_at || (log as any).timestamp;

            return (
              <div
                key={log.id}
                className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getLevelBadge(log.level)}
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-mono font-bold">
                      {log.module}
                    </span>
                    {userName && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-[11px] font-bold flex items-center gap-1">
                        <User size={10} />
                        {userName} {userRole ? `(${userRole})` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <span>{formatTimestamp(timestamp)}</span>
                    {source === 'remote' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRemote(log.id)}
                        disabled={deletingId === log.id}
                        className="p-1 hover:text-rose-600 text-slate-300 transition-colors cursor-pointer"
                        title="Xóa log này"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Message */}
                <p className="text-xs font-bold text-slate-800 break-words">{log.message}</p>

                {/* Toggle details */}
                {(log.stack || log.data || log.url) && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>{isExpanded ? 'Thu gọn chi tiết' : 'Xem chi tiết & Stack Trace'}</span>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 p-3 bg-slate-900 text-slate-300 rounded-xl text-xs font-mono space-y-2 select-all overflow-x-auto shadow-inner">
                        {log.url && (
                          <p className="text-slate-400 flex items-center gap-1 text-[11px]">
                            <Globe size={11} /> URL: {log.url}
                          </p>
                        )}

                        {log.data && (
                          <div>
                            <p className="text-slate-400 text-[11px] font-bold mb-1">
                              Metadata / Data:
                            </p>
                            <pre className="text-[11px] text-emerald-400 whitespace-pre-wrap">
                              {typeof log.data === 'object'
                                ? JSON.stringify(log.data, null, 2)
                                : String(log.data)}
                            </pre>
                          </div>
                        )}

                        {log.stack && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-rose-400 text-[11px] font-bold">Stack Trace:</p>
                              <button
                                type="button"
                                onClick={() => handleCopyStack(log.id, log.stack || '')}
                                className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-md text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                {copiedId === log.id ? (
                                  <Check size={10} className="text-emerald-400" />
                                ) : (
                                  <Copy size={10} />
                                )}
                                <span>{copiedId === log.id ? 'Đã sao chép' : 'Sao chép'}</span>
                              </button>
                            </div>
                            <pre className="text-[11px] text-rose-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                              {log.stack}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
