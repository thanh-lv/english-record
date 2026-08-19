import { useState, useEffect, useCallback } from 'react';
import { attendanceService } from '../../../services/attendanceService';
import { Student as AttendanceStudent } from '../../../types';
import { sanitizeText, validateStudentName, validatePhone } from '../../../utils';

export function useAttendanceStudents(t: any) {
  const tAtt = t?.attendance || {};
  const tc = t?.common || {};

  const [students, setStudents] = useState<AttendanceStudent[]>([]);
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

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await attendanceService.fetchAttendanceStudents();
      setStudents(data);
    } catch (err) {
      console.error('Error fetching attendance students:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

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

  const openCreateModal = () => {
    setEditId(null);
    setName('');
    setClassName('');
    setUnitPrice('');
    setPhone('');
    setHocLieuFee('');
    setNote('');
    setError('');
    setShowForm(true);
  };

  const openEditModal = (s: any) => {
    setEditId(s.id);
    setName(s.name);
    setClassName(s.class_name || '');
    setUnitPrice(s.unit_price ? s.unit_price.toLocaleString() : '');
    setPhone(s.phone || '');
    setHocLieuFee(s.hoc_lieu_fee ? s.hoc_lieu_fee.toLocaleString() : '');
    setNote(s.note || '');
    setError('');
    setShowForm(true);
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
    const payload = {
      name: cleanName,
      class_name: cName,
      unit_price: rawPrice,
      phone: cleanPhone || undefined,
      hoc_lieu_fee: rawHlPrice,
      note: sanitizeText(note) || undefined,
    };

    try {
      if (editId) {
        const updated = await attendanceService.updateAttendanceStudent(editId, payload);
        setStudents(prev => prev.map(s => (s.id === editId ? updated : s)));
      } else {
        const created = await attendanceService.createAttendanceStudent(payload);
        setStudents(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
      }
      setShowForm(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi lưu thông tin học sinh');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteSaving(true);
    try {
      await attendanceService.deleteAttendanceStudent(deleteId);
      setStudents(prev => prev.filter(s => s.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteSaving(false);
    }
  };

  return {
    students,
    loading,
    showForm,
    setShowForm,
    editId,
    name,
    setName,
    className,
    setClassName,
    unitPrice,
    handlePriceChange,
    phone,
    setPhone,
    hocLieuFee,
    handleHocLieuFeeChange,
    note,
    setNote,
    saving,
    error,
    deleteId,
    setDeleteId,
    deleteSaving,
    openCreateModal,
    openEditModal,
    handleSave,
    handleDelete,
    loadStudents,
  };
}
