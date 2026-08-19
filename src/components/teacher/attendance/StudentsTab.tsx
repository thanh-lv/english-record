import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';
import { Users, Plus, Pencil, Trash2, Loader2, Save, Phone } from 'lucide-react';
import { DeleteConfirmModal } from '../shared/DeleteConfirmModal';
import {
  formatClassName,
  useBodyScrollLock,
  validateStudentName,
  validatePhone,
  sanitizeText,
} from '../../../utils';

export function StudentsTab() {
  const { t } = useLanguage();
  const tAtt = t.attendance;
  const tc = t.common;
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [hocLieuFee, setHocLieuFee] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Lock body scroll when modal is open
  useBodyScrollLock(Boolean(showForm || deleteId));

  const loadStudents = async () => {
    setLoading(true);
    const { data } = await supabase.from('attendance_students').select('*').order('name');
    setStudents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setUnitPrice('');
      return;
    }
    setUnitPrice(parseInt(rawValue, 10).toLocaleString());
  };

  const handleHocLieuFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setHocLieuFee('');
      return;
    }
    setHocLieuFee(parseInt(rawValue, 10).toLocaleString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeText(name);
    const nameVal = validateStudentName(cleanName, {
      required: tc.nameMin,
      min: tc.nameMin,
      max: tc.nameMax,
    });
    if (!nameVal.isValid) {
      setError(nameVal.error || tc.nameMin);
      return;
    }

    const cleanPhone = phone.trim();
    if (cleanPhone) {
      const phoneVal = validatePhone(cleanPhone, tc.phoneInvalid);
      if (!phoneVal.isValid) {
        setError(phoneVal.error || tc.phoneInvalid);
        return;
      }
    }

    const rawPrice = parseInt(unitPrice.replace(/\D/g, ''), 10) || 0;
    const rawHlPrice = parseInt(hocLieuFee.replace(/\D/g, ''), 10) || 0;

    if (rawPrice < 0 || rawPrice > 100000000 || rawHlPrice < 0 || rawHlPrice > 100000000) {
      setError(tc.amountInvalid || 'Số tiền không hợp lệ');
      return;
    }

    setSaving(true);
    setError('');

    const cName = sanitizeText(className) || tAtt.unassignedClass;
    const cleanNote = sanitizeText(note);

    const payload: any = {
      name: cleanName,
      class_name: cName.slice(0, 50),
      unit_price: rawPrice,
      phone: cleanPhone.slice(0, 20),
      hoc_lieu: rawHlPrice,
      note: cleanNote.slice(0, 1000),
    };

    try {
      if (editId) {
        const { error: err } = await supabase
          .from('attendance_students')
          .update(payload)
          .eq('id', editId);
        if (err) {
          delete payload.hoc_lieu;
          const { error: errFallback } = await supabase
            .from('attendance_students')
            .update(payload)
            .eq('id', editId);
          if (errFallback) throw errFallback;
        }
      } else {
        const { error: err } = await supabase.from('attendance_students').insert(payload);
        if (err) {
          delete payload.hoc_lieu;
          const { error: errFallback } = await supabase.from('attendance_students').insert(payload);
          if (errFallback) throw errFallback;
        }
      }

      await loadStudents();
      setShowForm(false);
      setName('');
      setClassName('');
      setUnitPrice('');
      setPhone('');
      setHocLieuFee('');
      setNote('');
      setEditId(null);
    } catch (err: any) {
      setError(err.message || 'Error saving student. Name might already exist.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (student: any) => {
    setEditId(student.id);
    setName(student.name);
    setClassName(student.class_name || '');
    setUnitPrice(student.unit_price ? student.unit_price.toLocaleString() : '');
    setHocLieuFee(student.hoc_lieu ? Number(student.hoc_lieu).toLocaleString() : '');
    setPhone(student.phone || '');
    setNote(student.note || student.student_note || '');
    setShowForm(true);
  };

  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deleteId) return;
    setDeleteSaving(true);
    try {
      await supabase.from('attendance_students').delete().eq('id', deleteId);
      await loadStudents();
      setDeleteId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteSaving(false);
    }
  };

  // Group students by class for display
  const [search, setSearch] = useState('');
  const [filterCls, setFilterCls] = useState('all');

  const availableClasses = Array.from(
    new Set(students.map(s => s.class_name || tAtt.unassignedClass))
  ).sort();
  const filtered = students.filter(s => {
    const matchCls = filterCls === 'all' || (s.class_name || tAtt.unassignedClass) === filterCls;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchCls && matchSearch;
  });

  // Group filtered by class
  const byClass: Record<string, typeof students> = {};
  filtered.forEach(s => {
    const key = s.class_name || tAtt.unassignedClass;
    if (!byClass[key]) byClass[key] = [];
    byClass[key].push(s);
  });

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800">{tAtt.studentsTab}</h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            {tAtt.studentClassCount
              .replace('{students}', students.length.toString())
              .replace('{classes}', availableClasses.length.toString())}
          </p>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setName('');
            setClassName('');
            setUnitPrice('');
            setError('');
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-black shadow-md transition-colors"
        >
          <Plus size={16} />
          {tAtt.addStudent}
        </button>
      </div>

      {/* Search + Filter row */}
      {students.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tAtt.searchStudentPlaceholder}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-slate-50"
            />
            <Users size={15} className="absolute left-3 top-2.5 text-slate-400" />
          </div>
          <select
            value={filterCls}
            onChange={e => setFilterCls(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold text-slate-700 text-sm"
          >
            <option value="all">{tAtt.allClasses}</option>
            {availableClasses.map(c => (
              <option key={c} value={c}>
                {formatClassName(c, tAtt.unassignedClass)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overscroll-contain">
          <div className="bg-white rounded-lg w-full max-w-md shadow-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`px-6 py-4 ${editId ? 'bg-blue-600' : 'bg-blue-600'} text-white`}>
              <h3 className="font-black text-lg">{editId ? tAtt.editStudent : tAtt.addStudent}</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-1.5">
                  {tAtt.studentName} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  maxLength={50}
                  onChange={e => setName(e.target.value)}
                  placeholder={tAtt.studentNamePlaceholder}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-1.5">
                    {tAtt.className}
                  </label>
                  <input
                    type="text"
                    value={className}
                    maxLength={50}
                    onChange={e => setClassName(e.target.value)}
                    placeholder={tAtt.classNamePlaceholder}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-1.5">
                    {tAtt.unitPrice} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={unitPrice}
                    maxLength={15}
                    onChange={handlePriceChange}
                    placeholder={tAtt.unitPricePlaceholder}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-1.5">
                    {tAtt.hocLieuLabelWithUnit || '📚 Học liệu (đ)'}
                  </label>
                  <input
                    type="text"
                    value={hocLieuFee}
                    maxLength={15}
                    onChange={handleHocLieuFeeChange}
                    placeholder="VD: 50.000"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-1.5">
                  {tAtt.zaloPhoneLabel || 'Số điện thoại Zalo Phụ huynh'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  maxLength={20}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="VD: 0912345678"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg px-4 py-2.5 text-sm font-bold">
                  <span>⚠️</span> {error}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError('');
                  }}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {tc.cancel || 'Hủy'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-black bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-md disabled:opacity-60"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {tAtt.saveStudent}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <DeleteConfirmModal
          title={tAtt.deleteStudent}
          description={tAtt.confirmDeleteStudent}
          confirmLabel={tAtt.deleteStudent}
          saving={deleteSaving}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Empty state */}
      {students.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <Users size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-bold">{tAtt.noStudents}</p>
          <p className="text-slate-400 text-sm mt-1">
            {tAtt.clickAddStudentToStart || 'Nhấn "Thêm học sinh" để bắt đầu'}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400 font-bold">
          {tAtt.noStudentFound || 'Không tìm thấy học sinh nào'}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byClass).map(([cls, rows]) => (
            <div
              key={cls}
              className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-md"
            >
              {/* Class header */}
              <div className="bg-blue-600 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-blue-200" />
                  <span className="font-black text-white text-sm">
                    {formatClassName(
                      cls,
                      tAtt.unassignedClass,
                      tAtt.className ? tAtt.className + ' ' : 'Lớp '
                    )}
                  </span>
                </div>
                <span className="text-blue-200 text-xs font-bold">
                  {interpolate(tAtt.studentCount || '{count} học sinh', {
                    count: rows.length,
                  })}
                </span>
              </div>

              {/* Students table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        #
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {tAtt.studentName}
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {tAtt.unitPrice}
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {tAtt.zaloPhoneShort || 'SĐT Zalo Phụ Huynh'}
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {tAtt.action || 'Thao tác'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((student, i) => (
                      <tr key={student.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-bold whitespace-nowrap">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3 font-black text-slate-800 whitespace-nowrap">
                          {student.name}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg text-xs">
                            {tAtt.pricePerSession.replace(
                              '{price}',
                              student.unit_price.toLocaleString()
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {student.phone ? (
                            <span className="text-[#0068FF] bg-[#0068FF]/10 px-2 py-0.5 rounded-lg text-xs font-black inline-flex items-center gap-1">
                              <Phone size={12} /> {student.phone}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(student)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                            >
                              <Pencil size={12} />
                              {tAtt.edit || 'Sửa'}
                            </button>
                            <button
                              onClick={() => setDeleteId(student.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                            >
                              <Trash2 size={12} />
                              {tAtt.delete || 'Xóa'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
