import type { AttendanceRecord, AttendanceStudent } from '../../../types';
import { formatClassName, getSessionValue } from '../../../utils';
import { interpolate } from '../../../i18n/LanguageContext';

/** Một dòng trong bảng tổng hợp học phí: học sinh kèm số buổi và học phí của tháng */
export type TuitionSummaryRow = AttendanceStudent & {
  unit_price: number;
  total_sessions: number;
  total_fee: number;
  hoc_lieu_label: string;
  hoc_lieu_value: number;
  phone: string;
  /** Cột học liệu kiểu cũ, chỉ còn ở dữ liệu trước khi tách label/value */
  hoc_lieu?: number;
};

interface ExportContext {
  tAtt: any;
  month: number;
  year: number;
}

export async function exportSummaryExcel({
  tAtt,
  month,
  year,
  monthLabel,
  allSummary,
  byClass,
  grandSessions,
  grandTotal,
}: ExportContext & {
  monthLabel: string;
  allSummary: TuitionSummaryRow[];
  byClass: Record<string, TuitionSummaryRow[]>;
  grandSessions: number;
  grandTotal: number;
}) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Sheet 1: All students
  const allRows = [
    [tAtt.attendanceReport + ' — ' + monthLabel],
    [],
    [
      tAtt.studentNameLabel,
      tAtt.classLabel,
      tAtt.sessionsLabel,
      tAtt.unitPriceLabel,
      tAtt.tuitionFeeLabel,
    ],
    ...allSummary.map(s => [
      s.name,
      s.class_name || tAtt.unassignedClass,
      s.total_sessions,
      s.unit_price,
      s.total_fee,
    ]),
    [],
    ['', '', grandSessions, '', grandTotal],
  ];
  const wsAll = XLSX.utils.aoa_to_sheet(allRows);
  wsAll['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsAll, tAtt.summary);

  // One sheet per class
  Object.entries(byClass).forEach(([cls, rows]) => {
    const clsTotal = rows.reduce((s, r) => s + r.total_fee, 0);
    const clsRows = [
      [`${tAtt.classReport}: ${cls} — ` + monthLabel],
      [],
      [tAtt.studentNameLabel, tAtt.sessionsLabel, tAtt.unitPriceLabel, tAtt.tuitionFeeLabel],
      ...rows.map(s => [s.name, s.total_sessions, s.unit_price, s.total_fee]),
      [],
      [tAtt.total, rows.reduce((s, r) => s + r.total_sessions, 0), '', clsTotal],
    ];
    const ws = XLSX.utils.aoa_to_sheet(clsRows);
    ws['!cols'] = [{ wch: 24 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, cls.slice(0, 31));
  });

  XLSX.writeFile(wb, `diem-danh-${month}-${year}.xlsx`);
}

export async function exportStudentExcel({
  tAtt,
  month,
  year,
  lang,
  student: s,
  studentRecs,
}: ExportContext & {
  lang: string;
  student: TuitionSummaryRow;
  studentRecs: AttendanceRecord[];
}) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const rows = [
    [`${tAtt.tuitionSlip} — ${s.name}`],
    [
      formatClassName(
        s.class_name,
        tAtt.unassignedClass,
        tAtt.className ? tAtt.className + ': ' : 'Lớp: '
      ),
      '',
      interpolate(tAtt.monthYear || 'Tháng {month}/{year}', { month, year }),
    ],
    [],
    [tAtt.no, tAtt.date, tAtt.time, tAtt.note],
    ...studentRecs.map((r, i) => {
      const dt = new Date(r.checkin_time);
      return [
        i + 1,
        dt.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US'),
        dt.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        getSessionValue(r) < 1
          ? `${tAtt.present} (${tAtt.halfSessionOption || '½ buổi'})`
          : tAtt.present,
      ];
    }),
    [],
    [tAtt.totalSessionsLabel, s.total_sessions, '', ''],
    [tAtt.unitPricePerSession, s.unit_price, '', ''],
    [tAtt.monthlyTuition, s.total_fee, '', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  XLSX.writeFile(wb, `hoc-phi-${s.name.replace(/\s+/g, '-')}-${month}-${year}.xlsx`);
}
