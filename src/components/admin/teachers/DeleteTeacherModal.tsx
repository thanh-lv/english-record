import React, { useState } from 'react';
import { adminService, AdminTeacherItem } from '../../../services/adminService';
import { DeleteConfirmModal } from '../../common/DeleteConfirmModal';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';

export interface DeleteTeacherModalProps {
  teacher: AdminTeacherItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteTeacherModal({ teacher, onClose, onSuccess }: DeleteTeacherModalProps) {
  const { t } = useLanguage();
  const tAdmin = t.admin;

  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined);

  if (!teacher) return null;

  const handleDelete = async () => {
    setDeleteSaving(true);
    setDeleteError(undefined);
    try {
      await adminService.deleteTeacher(teacher.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting teacher');
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <DeleteConfirmModal
      title={tAdmin.deleteTeacherTitle}
      description={interpolate(tAdmin.deleteTeacherNote, { name: teacher.name })}
      confirmLabel={t.common.delete}
      saving={deleteSaving}
      error={deleteError}
      onConfirm={handleDelete}
      onCancel={onClose}
    />
  );
}
