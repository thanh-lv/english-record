import { useState, type Dispatch, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { attendanceService } from '../../../services/attendanceService';
import { supabase } from '../../../lib/supabase';
import {
  Download,
  CalendarDays,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Save,
  Check,
  X,
} from 'lucide-react';
import { TuitionSlipTemplate } from './TuitionSlipTemplate';
import { formatClassName, getSessionValue, sumSessions } from '../../../utils';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';
import type { AttendanceRecord } from '../../../types';
import type { TuitionSummaryRow } from './tuitionExport';

interface StudentTuitionDetailModalProps {
  student: TuitionSummaryRow;
  /** Các buổi điểm danh trong tháng của học sinh này, đã sắp theo thời gian */
  studentRecs: AttendanceRecord[];
  onRecordsChange: Dispatch<SetStateAction<AttendanceRecord[]>>;
  month: number;
  year: number;
  monthLabel: string;
  previewMode: boolean;
  setPreviewMode: (preview: boolean) => void;
  hocLieuLabel: string;
  hocLieuValue: number;
  note: string;
  onHocLieuLabelChange: (label: string) => void;
  onHocLieuValueChange: (value: number) => void;
  exporting: boolean;
  onExportExcel: () => void;
  onExportImage: () => void;
  onClose: () => void;
}

export function StudentTuitionDetailModal({
  student: s,
  studentRecs,
  onRecordsChange,
  month,
  year,
  monthLabel,
  previewMode,
  setPreviewMode,
  hocLieuLabel,
  hocLieuValue,
  note,
  onHocLieuLabelChange,
  onHocLieuValueChange,
  exporting,
  onExportExcel,
  onExportImage,
  onClose,
}: StudentTuitionDetailModalProps) {
  const { t } = useLanguage();
  const tAtt = t.attendance;
  const tc = t.common;

  // Edit / Add attendance record state
  const [showAddDateForm, setShowAddDateForm] = useState(false);
  const [newDateVal, setNewDateVal] = useState('');
  const [newTimeVal, setNewTimeVal] = useState('08:00');
  const [newSessionVal, setNewSessionVal] = useState(1);
  const [editingRecId, setEditingRecId] = useState<string | null>(null);
  const [editDateVal, setEditDateVal] = useState('');
  const [editTimeVal, setEditTimeVal] = useState('08:00');
  const [editSessionVal, setEditSessionVal] = useState(1);
  const [recActionLoading, setRecActionLoading] = useState(false);

  // ---- Manage Student Attendance Records (Add Makeup / Edit / Delete) ----
  const handleAddMakeupSession = async (studentId: string) => {
    if (!newDateVal) return;
    setRecActionLoading(true);
    try {
      const timestamp = new Date(`${newDateVal}T${newTimeVal}:00`).toISOString();
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          student_id: studentId,
          checkin_time: timestamp,
          status: 'present',
          ...(newSessionVal !== 1 ? { session_value: newSessionVal } : {}),
        })
        .select('*, attendance_students(name, unit_price)')
        .single();
      if (error) throw error;
      if (data) {
        onRecordsChange(prev => [...prev, data]);
        setShowAddDateForm(false);
        setNewDateVal('');
        setNewSessionVal(1);
      }
    } catch (e) {
      console.error('Error adding makeup session:', e);
      alert(tAtt.addSessionError || 'Không thể thêm buổi học. Vui lòng thử lại.');
    } finally {
      setRecActionLoading(false);
    }
  };

  const handleSaveEditSession = async (recId: string) => {
    if (!editDateVal) return;
    setRecActionLoading(true);
    try {
      const timestamp = new Date(`${editDateVal}T${editTimeVal}:00`).toISOString();
      const current = studentRecs.find(r => r.id === recId);
      const changes: { checkin_time: string; session_value?: number } = {
        checkin_time: timestamp,
      };
      if (getSessionValue(current) !== editSessionVal) changes.session_value = editSessionVal;
      const { error } = await supabase.from('attendance_records').update(changes).eq('id', recId);
      if (error) throw error;
      onRecordsChange(prev => prev.map(r => (r.id === recId ? { ...r, ...changes } : r)));
      setEditingRecId(null);
    } catch (e) {
      console.error('Error editing session date:', e);
      alert(tAtt.updateSessionError || 'Không thể cập nhật ngày học.');
    } finally {
      setRecActionLoading(false);
    }
  };

  const handleDeleteSession = async (recId: string) => {
    if (!confirm(tAtt.deleteCheckinConfirm || 'Bạn có chắc chắn muốn xóa buổi điểm danh này?'))
      return;
    setRecActionLoading(true);
    try {
      await attendanceService.deleteAttendanceRecord(recId);
      onRecordsChange(prev => prev.filter(r => r.id !== recId));
    } catch (e) {
      console.error('Error deleting session:', e);
      alert(tAtt.deleteCheckinError || 'Không thể xóa buổi điểm danh.');
    } finally {
      setRecActionLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[200] print:hidden overscroll-contain">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        {/* Modal header */}
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 px-6 py-4 flex items-start justify-between shrink-0 text-white">
          <div>
            <h2 className="font-black text-white text-lg sm:text-xl">{s.name}</h2>
            <p className="text-purple-200 text-xs sm:text-sm font-bold mt-0.5">
              {formatClassName(s.class_name, tAtt.unassignedClass)} · {monthLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose()}
            className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors ml-4 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <div className="px-4 py-3 text-center border-r border-slate-100">
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wide">
              {tAtt.totalSessionsStat || 'Số buổi'}
            </p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
              {s.total_sessions}
            </p>
          </div>
          <div className="px-4 py-3 text-center border-r border-slate-100">
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wide">
              {tAtt.unitPrice || 'Đơn giá'}
            </p>
            <p className="text-xs sm:text-sm font-black text-slate-700 mt-0.5">
              {tAtt.currencyVnd.replace('{amount}', s.unit_price.toLocaleString())}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wide">
              {tAtt.tuitionFeeLabel || 'Học phí'}
            </p>
            <p className="text-xs sm:text-sm font-black text-purple-700 mt-0.5">
              {tAtt.currencyVnd.replace('{amount}', s.total_fee.toLocaleString())}
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 shrink-0 bg-slate-50/80 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className={`flex-1 py-2 text-xs sm:text-sm font-black rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              !previewMode
                ? 'bg-white text-purple-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CalendarDays size={14} /> {tAtt.attendanceCalendar || 'Lịch điểm danh'}
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className={`flex-1 py-2 text-xs sm:text-sm font-black rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              previewMode
                ? 'bg-white text-purple-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Eye size={14} /> {tAtt.previewTuitionSlip || 'Preview phiếu học phí'}
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {!previewMode ? (
            /* ---- Attendance list tab ---- */
            <div className="p-4 space-y-4">
              {/* Top action bar: Add makeup session */}
              <div className="flex justify-between items-center bg-purple-50/70 border border-purple-100 rounded-2xl p-3 sm:p-4">
                <div>
                  <p className="text-xs font-black text-purple-900">
                    {interpolate(
                      tAtt.attendanceHistoryTitle || 'Danh sách điểm danh ({count} buổi)',
                      { count: sumSessions(studentRecs) }
                    )}
                  </p>
                  <p className="text-[11px] text-purple-600 font-medium">
                    {tAtt.attendanceHistorySubtitle ||
                      'Thêm học bù hoặc điều chỉnh ngày học của học sinh'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDateForm(!showAddDateForm);
                    if (!newDateVal) {
                      const defaultD = `${year}-${String(month).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                      setNewDateVal(defaultD);
                    }
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus size={14} /> {tAtt.addMakeupSessionBtn || 'Thêm học bù'}
                </button>
              </div>

              {/* Add makeup form */}
              {showAddDateForm && (
                <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in duration-150">
                  <p className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <CalendarDays size={14} className="text-purple-600" />
                    {tAtt.addCheckinModalTitle || 'Thêm buổi điểm danh / học bù mới'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        {tAtt.sessionDate || 'Ngày học'}
                      </label>
                      <input
                        type="date"
                        value={newDateVal}
                        onChange={e => setNewDateVal(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        {tAtt.sessionTime || 'Giờ học'}
                      </label>
                      <input
                        type="time"
                        value={newTimeVal}
                        onChange={e => setNewTimeVal(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        {tAtt.sessionValueLabel || 'Thời lượng'}
                      </label>
                      <select
                        value={newSessionVal}
                        onChange={e => setNewSessionVal(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-400 bg-white"
                      >
                        <option value={1}>{tAtt.fullSessionOption || '1 buổi'}</option>
                        <option value={0.5}>{tAtt.halfSessionOption || '½ buổi'}</option>
                      </select>
                    </div>
                    <div className="flex items-end gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => handleAddMakeupSession(s.id)}
                        disabled={recActionLoading || !newDateVal}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow transition-all flex items-center gap-1 cursor-pointer"
                      >
                        {recActionLoading ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Check size={13} />
                        )}
                        {tc.save || 'Lưu'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddDateForm(false)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        {tc.cancel || 'Hủy'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Attendance records table */}
              {studentRecs.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                  <p className="text-slate-400 font-bold text-sm">
                    {tAtt.noCheckinsThisMonth || 'Chưa có buổi điểm danh nào trong tháng này.'}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    {tAtt.noCheckinsHint || 'Bấm nút "Thêm buổi học bù" ở trên để thêm điểm danh.'}
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-xs font-black text-slate-500 uppercase w-10">
                          {tAtt.tableIndex || 'STT'}
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-black text-slate-500 uppercase">
                          {tAtt.dateHeader || 'Ngày'}
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-black text-slate-500 uppercase">
                          {tAtt.timeHeader || 'Giờ'}
                        </th>
                        <th className="px-3 py-2.5 text-center text-xs font-black text-slate-500 uppercase">
                          {tAtt.statusHeader || 'Trạng thái'}
                        </th>
                        <th className="px-3 py-2.5 text-right text-xs font-black text-slate-500 uppercase w-24">
                          {tAtt.actionsHeader || 'Thao tác'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentRecs.map((r, i) => {
                        const dt = new Date(r.checkin_time);
                        const isEditing = editingRecId === r.id;

                        return (
                          <tr key={r.id} className="hover:bg-purple-50/50 transition-colors">
                            <td className="px-3 py-2.5 text-slate-400 font-bold">{i + 1}</td>
                            <td className="px-3 py-2.5">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={editDateVal}
                                  onChange={e => setEditDateVal(e.target.value)}
                                  className="px-2 py-1 border border-purple-300 rounded-lg text-xs font-bold text-slate-800"
                                />
                              ) : (
                                <p className="font-black text-slate-800 text-xs sm:text-sm">
                                  {dt.toLocaleDateString('vi-VN', {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  })}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2.5 font-bold text-slate-500 text-xs sm:text-sm">
                              {isEditing ? (
                                <input
                                  type="time"
                                  value={editTimeVal}
                                  onChange={e => setEditTimeVal(e.target.value)}
                                  className="px-2 py-1 border border-purple-300 rounded-lg text-xs font-bold text-slate-800"
                                />
                              ) : (
                                dt.toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {isEditing ? (
                                <select
                                  value={editSessionVal}
                                  onChange={e => setEditSessionVal(Number(e.target.value))}
                                  className="px-2 py-1 border border-purple-300 rounded-lg text-xs font-bold text-slate-800 bg-white"
                                >
                                  <option value={1}>{tAtt.fullSessionOption || '1 buổi'}</option>
                                  <option value={0.5}>{tAtt.halfSessionOption || '½ buổi'}</option>
                                </select>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-black rounded-lg ${
                                    getSessionValue(r) < 1
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  <CheckCircle2 size={11} />{' '}
                                  {getSessionValue(r) < 1
                                    ? tAtt.halfSessionOption || '½ buổi'
                                    : tAtt.present || 'Có mặt'}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditSession(r.id)}
                                    disabled={recActionLoading}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                                    title={tc.save || 'Lưu'}
                                  >
                                    <Save size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingRecId(null)}
                                    className="p-1.5 bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                    title={tc.cancel || 'Hủy'}
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingRecId(r.id);
                                      const dStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                                      const tStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
                                      setEditDateVal(dStr);
                                      setEditTimeVal(tStr);
                                      setEditSessionVal(getSessionValue(r));
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                                    title={tAtt.editDateTime || 'Sửa ngày/giờ'}
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSession(r.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                    title={tAtt.deleteThisSession || 'Xóa buổi này'}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* ---- Preview phiếu học phí tab ---- */
            <div className="flex flex-col items-center bg-slate-100 min-h-full py-4 px-4">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Eye size={12} /> {tAtt.previewTuitionSlip || 'Xem trước phiếu học phí'}
              </p>
              <div
                style={{
                  width: '500px',
                  transform: 'scale(0.78)',
                  transformOrigin: 'top center',
                  marginBottom: '-110px',
                }}
                className="shadow-xl rounded-2xl overflow-hidden"
              >
                <TuitionSlipTemplate
                  student={s}
                  records={studentRecs}
                  month={month}
                  hocLieuLabel={hocLieuLabel}
                  hocLieuValue={hocLieuValue}
                  note={note}
                  onHocLieuLabelChange={onHocLieuLabelChange}
                  onHocLieuValueChange={onHocLieuValueChange}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal footer: export actions */}
        <div className="border-t border-slate-100 px-5 py-3.5 flex justify-between items-center gap-2 bg-slate-50/80 shrink-0">
          <button
            type="button"
            onClick={() => onClose()}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            {tAtt.close || 'Đóng'}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onExportExcel()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition-colors active:scale-95 cursor-pointer"
            >
              <Download size={14} /> Excel
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewMode(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-black bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl shadow-2xs transition-colors active:scale-95 cursor-pointer"
              title={tAtt.previewTuitionSlip || 'Xem trước phiếu học phí'}
            >
              <Eye size={14} /> Preview
            </button>
            <button
              type="button"
              onClick={() => onExportImage()}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-purple-500/20 transition-all active:scale-95 cursor-pointer"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
              {tAtt.printImage}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
