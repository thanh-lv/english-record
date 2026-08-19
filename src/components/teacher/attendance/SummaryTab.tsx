import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../../lib/supabase";
import {
  Download,
  CalendarDays,
  Users,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Save,
  Wallet,
  BookOpen,
  MessageCircle,
  Check,
  X,
} from "lucide-react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { TuitionSlipTemplate } from "./TuitionSlipTemplate";
import { ZaloShareModal } from "./ZaloShareModal";
import { formatClassName, useBodyScrollLock } from "../../../utils";
import { useLanguage, interpolate } from "../../../i18n/LanguageContext";

export function SummaryTab() {
  const { t, lang } = useLanguage();
  const tAtt = t.attendance;
  const tc = t.common;
  const [records, setRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [generalNote, setGeneralNote] = useState("");
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});
  const [classHocLieu, setClassHocLieu] = useState<Record<string, string>>(
    () => {
      try {
        const saved = localStorage.getItem("english_record_class_hoc_lieu");
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        return {};
      }
    },
  );

  const handleClassHocLieuChange = (cls: string, val: string) => {
    setClassHocLieu((prev) => {
      const next = { ...prev, [cls]: val };
      try {
        localStorage.setItem(
          "english_record_class_hoc_lieu",
          JSON.stringify(next),
        );
      } catch (e) {}
      return next;
    });
  };

  const [classHocLieuMap, setClassHocLieuMap] = useState<
    Record<string, { label: string; value: number }>
  >(() => {
    try {
      const saved = localStorage.getItem("english_record_class_hoc_lieu_map");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const handleUpdateClassHocLieuMap = async (
    className: string,
    newLabel?: string,
    newValue?: number,
  ) => {
    const current = classHocLieuMap[className] || {
      label: tAtt.hocLieuSlip || "📚 Học liệu",
      value: 0,
    };
    const updatedLabel = newLabel !== undefined ? newLabel : current.label;
    const updatedValue = newValue !== undefined ? newValue : current.value;

    setClassHocLieuMap((prev) => {
      const next = {
        ...prev,
        [className]: { label: updatedLabel, value: updatedValue },
      };
      try {
        localStorage.setItem(
          "english_record_class_hoc_lieu_map",
          JSON.stringify(next),
        );
      } catch (e) {}
      return next;
    });

    setStudents((prev) =>
      prev.map((s) =>
        (s.class_name || tAtt.unassignedClass) === className
          ? {
              ...s,
              hoc_lieu_label: updatedLabel,
              hoc_lieu_value: updatedValue,
            }
          : s,
      ),
    );

    if (
      selectedStudent &&
      (selectedStudent.class_name || tAtt.unassignedClass) === className
    ) {
      setSelectedStudent((prev: any) => ({
        ...prev,
        hoc_lieu_label: updatedLabel,
        hoc_lieu_value: updatedValue,
      }));
    }

    try {
      await supabase
        .from("attendance_students")
        .update({
          hoc_lieu_label: updatedLabel,
          hoc_lieu_value: updatedValue,
        })
        .eq("class_name", className);
    } catch (e) {
      console.error("Error updating class hoc_lieu in Supabase:", e);
    }
  };

  const handleUpdateStudentNote = async (
    studentId: string,
    noteVal: string,
  ) => {
    setStudentNotes((prev) => ({ ...prev, [studentId]: noteVal }));

    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, note: noteVal } : s)),
    );

    if (selectedStudent && selectedStudent.id === studentId) {
      setSelectedStudent((prev: any) => ({ ...prev, note: noteVal }));
    }

    try {
      const { error } = await supabase
        .from("attendance_students")
        .update({ note: noteVal })
        .eq("id", studentId);
      if (error) {
        await supabase
          .from("attendance_students")
          .update({ student_note: noteVal })
          .eq("id", studentId);
      }
    } catch (e) {
      console.error("Error saving student note to Supabase:", e);
    }
  };
  const slipRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportStudent, setExportStudent] = useState<any>(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [rpcSummary, setRpcSummary] = useState<any[] | null>(null);
  const [filterPayment, setFilterPayment] = useState<"all" | "paid" | "unpaid">(
    "all",
  );
  const [paymentsMap, setPaymentsMap] = useState<Record<string, boolean>>({});
  const [zaloStudent, setZaloStudent] = useState<any | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when student detail modal or Zalo modal is open
  useBodyScrollLock(Boolean(selectedStudent || zaloStudent));

  // Edit / Add attendance record state for single student
  const [showAddDateForm, setShowAddDateForm] = useState(false);
  const [newDateVal, setNewDateVal] = useState("");
  const [newTimeVal, setNewTimeVal] = useState("08:00");
  const [editingRecId, setEditingRecId] = useState<string | null>(null);
  const [editDateVal, setEditDateVal] = useState("");
  const [editTimeVal, setEditTimeVal] = useState("08:00");
  const [recActionLoading, setRecActionLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      // Try RPC first for fast backend calculation (Step 1)
      const rpcRes = await supabase.rpc("get_monthly_attendance_summary", {
        p_year: year,
        p_month: month,
      });

      if (!rpcRes.error && rpcRes.data) {
        setRpcSummary(rpcRes.data);
      } else {
        setRpcSummary(null);
      }

      const [studRes, recRes, payRes] = await Promise.all([
        supabase.from("attendance_students").select("*"),
        supabase
          .from("attendance_records")
          .select("*, attendance_students(name, unit_price)")
          .gte("checkin_time", startDate)
          .lte("checkin_time", endDate),
        supabase
          .from("attendance_payments")
          .select("student_id, is_paid")
          .eq("year", year)
          .eq("month", month),
      ]);

      if (studRes.data) {
        setStudents(studRes.data);
        const nMap: Record<string, string> = {};
        studRes.data.forEach((s: any) => {
          if (s.note || s.student_note) {
            nMap[s.id] = s.note || s.student_note;
          }
        });
        setStudentNotes((prev) => ({ ...nMap, ...prev }));
      }
      if (recRes.data) setRecords(recRes.data);
      if (payRes && payRes.data) {
        const pMap: Record<string, boolean> = {};
        payRes.data.forEach((p: any) => {
          pMap[p.student_id] = p.is_paid;
        });
        setPaymentsMap(pMap);
      } else {
        setPaymentsMap({});
      }
      setLoading(false);
    };

    loadData();
  }, [month, year]);

  const allSummary = rpcSummary
    ? rpcSummary.map((item) => {
        const matchingStudent = students.find((s) => s.id === item.student_id);
        const studentClass = item.class_name || tAtt.unassignedClass;
        const hlObj = classHocLieuMap[studentClass] || {
          label:
            matchingStudent?.hoc_lieu_label ||
            tAtt.hocLieuSlip ||
            "📚 Học liệu",
          value: Number(
            matchingStudent?.hoc_lieu_value ?? matchingStudent?.hoc_lieu ?? 0,
          ),
        };
        const baseFee = Number(item.total_fee || 0);

        return {
          id: item.student_id,
          name: item.name,
          class_name: item.class_name,
          unit_price: Number(item.unit_price),
          total_sessions: Number(item.total_sessions),
          total_fee: baseFee + Number(hlObj.value || 0),
          hoc_lieu_label: hlObj.label,
          hoc_lieu_value: hlObj.value,
          phone: item.phone || matchingStudent?.phone || "",
        };
      })
    : students
        .map((student) => {
          const studentRecords = records.filter(
            (r) => r.student_id === student.id,
          );
          const studentClass = student.class_name || tAtt.unassignedClass;
          const hlObj = classHocLieuMap[studentClass] || {
            label: student.hoc_lieu_label || tAtt.hocLieuSlip || "📚 Học liệu",
            value: Number(student.hoc_lieu_value ?? student.hoc_lieu ?? 0),
          };
          const baseFee = studentRecords.length * student.unit_price;

          return {
            ...student,
            total_sessions: studentRecords.length,
            total_fee: baseFee + Number(hlObj.value || 0),
            hoc_lieu_label: hlObj.label,
            hoc_lieu_value: hlObj.value,
            phone: student.phone || "",
          };
        })
        .filter((s) => s.total_sessions > 0)
        .sort((a, b) => {
          const classCompare = (a.class_name || "").localeCompare(
            b.class_name || "",
          );
          return classCompare !== 0
            ? classCompare
            : b.total_sessions - a.total_sessions;
        });

  const availableClasses = Array.from(
    new Set(allSummary.map((s) => s.class_name || tAtt.unassignedClass)),
  ).sort();

  let summary =
    filterClass === "all"
      ? allSummary
      : allSummary.filter(
          (s) => (s.class_name || tAtt.unassignedClass) === filterClass,
        );
  if (filterPayment === "paid")
    summary = summary.filter((s) => !!paymentsMap[s.id]);
  if (filterPayment === "unpaid")
    summary = summary.filter((s) => !paymentsMap[s.id]);

  // Group by class for display
  const byClass: Record<string, typeof allSummary> = {};
  summary.forEach((s) => {
    const key = s.class_name || tAtt.unassignedClass;
    if (!byClass[key]) byClass[key] = [];
    byClass[key].push(s);
  });

  const grandTotal = summary.reduce((sum, s) => sum + s.total_fee, 0);
  const totalCollected = summary.reduce(
    (sum, s) => sum + (paymentsMap[s.id] ? s.total_fee : 0),
    0,
  );
  const totalOutstanding = grandTotal - totalCollected;
  const grandSessions = summary.reduce((sum, s) => sum + s.total_sessions, 0);
  const MONTH_LABEL = tAtt.monthYear
    .replace("{month}", month.toString())
    .replace("{year}", year.toString());

  // ---- Export all to Excel ----
  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    // Sheet 1: All students
    const allRows = [
      [tAtt.attendanceReport + " — " + MONTH_LABEL],
      [],
      [
        tAtt.studentNameLabel,
        tAtt.classLabel,
        tAtt.sessionsLabel,
        tAtt.unitPriceLabel,
        tAtt.tuitionFeeLabel,
      ],
      ...allSummary.map((s) => [
        s.name,
        s.class_name || tAtt.unassignedClass,
        s.total_sessions,
        s.unit_price,
        s.total_fee,
      ]),
      [],
      ["", "", grandSessions, "", grandTotal],
    ];
    const wsAll = XLSX.utils.aoa_to_sheet(allRows);
    wsAll["!cols"] = [
      { wch: 24 },
      { wch: 16 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsAll, tAtt.summary);

    // One sheet per class
    Object.entries(byClass).forEach(([cls, rows]) => {
      const clsTotal = rows.reduce((s, r) => s + r.total_fee, 0);
      const clsRows = [
        [`${tAtt.classReport}: ${cls} — ` + MONTH_LABEL],
        [],
        [
          tAtt.studentNameLabel,
          tAtt.sessionsLabel,
          tAtt.unitPriceLabel,
          tAtt.tuitionFeeLabel,
        ],
        ...rows.map((s) => [
          s.name,
          s.total_sessions,
          s.unit_price,
          s.total_fee,
        ]),
        [],
        [
          tAtt.total,
          rows.reduce((s, r) => s + r.total_sessions, 0),
          "",
          clsTotal,
        ],
      ];
      const ws = XLSX.utils.aoa_to_sheet(clsRows);
      ws["!cols"] = [{ wch: 24 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, cls.slice(0, 31));
    });

    XLSX.writeFile(wb, `diem-danh-${month}-${year}.xlsx`);
  };

  const handleTogglePayment = async (studentId: string) => {
    const next = !paymentsMap[studentId];
    setPaymentsMap((prev) => ({ ...prev, [studentId]: next }));
    try {
      await supabase.from("attendance_payments").upsert(
        {
          student_id: studentId,
          year: year,
          month: month,
          is_paid: next,
        },
        { onConflict: "student_id,year,month" },
      );
    } catch (e) {
      console.error("Error toggling payment status:", e);
    }
  };

  // ---- Export single student to Excel ----
  const exportStudentExcel = async (s: any) => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const studentRecs = records
      .filter((r) => r.student_id === s.id)
      .sort(
        (a, b) =>
          new Date(a.checkin_time).getTime() -
          new Date(b.checkin_time).getTime(),
      );

    const rows = [
      [`${tAtt.tuitionSlip} — ${s.name}`],
      [
        formatClassName(
          s.class_name,
          tAtt.unassignedClass,
          tAtt.className ? tAtt.className + ": " : "Lớp: ",
        ),
        "",
        interpolate(tAtt.monthYear || "Tháng {month}/{year}", { month, year }),
      ],
      [],
      [tAtt.no, tAtt.date, tAtt.time, tAtt.note],
      ...studentRecs.map((r, i) => {
        const dt = new Date(r.checkin_time);
        return [
          i + 1,
          dt.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US"),
          dt.toLocaleTimeString(lang === "vi" ? "vi-VN" : "en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          tAtt.present,
        ];
      }),
      [],
      [tAtt.totalSessionsLabel, s.total_sessions, "", ""],
      [tAtt.unitPricePerSession, s.unit_price, "", ""],
      [tAtt.monthlyTuition, s.total_fee, "", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
    XLSX.writeFile(
      wb,
      `hoc-phi-${s.name.replace(/\s+/g, "-")}-${month}-${year}.xlsx`,
    );
  };

  // ---- Export single student to Image ----
  const handleExportSingle = async (s: any) => {
    setExporting(true);
    setExportStudent(s);
    // Wait for state to update and render the hidden component
    setTimeout(async () => {
      if (slipRef.current) {
        try {
          const dataUrl = await toPng(slipRef.current, {
            pixelRatio: 2,
            backgroundColor: "#ffffff",
          });
          const link = document.createElement("a");
          link.download = `Phieu-Hoc-Phi-${s.name.replace(/\s+/g, "-")}-${month}-${year}.png`;
          link.href = dataUrl;
          link.click();
        } catch (e) {
          console.error("Export image error:", e);
        }
      }
      setExporting(false);
      setExportStudent(null);
    }, 600);
  };

  // ---- Export all students to Image (ZIP) ----
  const handleExportAllImages = async () => {
    setExporting(true);
    const zip = new JSZip();
    const folder = zip.folder(`Phieu-Hoc-Phi-${month}-${year}`);

    for (const s of summary) {
      setExportStudent(s);
      // Wait a bit for React to render the new student in the hidden div
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (slipRef.current && folder) {
        try {
          const dataUrl = await toPng(slipRef.current, {
            pixelRatio: 2,
            backgroundColor: "#ffffff",
          });
          const imgData = dataUrl.replace(/^data:image\/png;base64,/, "");
          folder.file(
            `Phieu-Hoc-Phi-${s.name.replace(/\s+/g, "-")}.png`,
            imgData,
            { base64: true },
          );
        } catch (e) {
          console.error("Export image error:", e);
        }
      }
    }

    try {
      const zipContent = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipContent);
      link.download = `Tat-Ca-Phieu-Hoc-Phi-${month}-${year}.zip`;
      link.click();
    } catch (e) {
      console.error("ZIP generation error:", e);
    }

    setExporting(false);
    setExportStudent(null);
  };

  // ---- Manage Student Attendance Records (Add Makeup / Edit / Delete) ----
  const handleAddMakeupSession = async (studentId: string) => {
    if (!newDateVal) return;
    setRecActionLoading(true);
    try {
      const timestamp = new Date(
        `${newDateVal}T${newTimeVal}:00`,
      ).toISOString();
      const { data, error } = await supabase
        .from("attendance_records")
        .insert({
          student_id: studentId,
          checkin_time: timestamp,
          status: "present",
        })
        .select("*, attendance_students(name, unit_price)")
        .single();
      if (error) throw error;
      if (data) {
        setRecords((prev) => [...prev, data]);
        setShowAddDateForm(false);
        setNewDateVal("");
      }
    } catch (e) {
      console.error("Error adding makeup session:", e);
      alert(
        tAtt.addSessionError || "Không thể thêm buổi học. Vui lòng thử lại.",
      );
    } finally {
      setRecActionLoading(false);
    }
  };

  const handleSaveEditSession = async (recId: string) => {
    if (!editDateVal) return;
    setRecActionLoading(true);
    try {
      const timestamp = new Date(
        `${editDateVal}T${editTimeVal}:00`,
      ).toISOString();
      const { error } = await supabase
        .from("attendance_records")
        .update({ checkin_time: timestamp })
        .eq("id", recId);
      if (error) throw error;
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recId ? { ...r, checkin_time: timestamp } : r,
        ),
      );
      setEditingRecId(null);
    } catch (e) {
      console.error("Error editing session date:", e);
      alert(tAtt.updateSessionError || "Không thể cập nhật ngày học.");
    } finally {
      setRecActionLoading(false);
    }
  };

  const handleDeleteSession = async (recId: string) => {
    if (
      !confirm(
        tAtt.deleteCheckinConfirm ||
          "Bạn có chắc chắn muốn xóa buổi điểm danh này?",
      )
    )
      return;
    setRecActionLoading(true);
    try {
      const { error } = await supabase
        .from("attendance_records")
        .delete()
        .eq("id", recId);
      if (error) throw error;
      setRecords((prev) => prev.filter((r) => r.id !== recId));
    } catch (e) {
      console.error("Error deleting session:", e);
      alert(tAtt.deleteCheckinError || "Không thể xóa buổi điểm danh.");
    } finally {
      setRecActionLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-400">
          Đang tải dữ liệu học phí...
        </span>
      </div>
    );

  return (
    <div
      className="space-y-5 animate-in fade-in duration-300"
      id="printable-summary"
    >
      {/* ---- Controls bar ---- */}
      <div className="bg-slate-50/80 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs space-y-3 print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          {/* Month */}
          <div className="w-full min-[420px]:w-auto">
            <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
              {tAtt.month}
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full min-[420px]:w-36 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-bold text-slate-800 text-xs sm:text-sm shadow-2xs cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {interpolate(tAtt.monthName || "Tháng {m}", { m })}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className="w-full min-[420px]:w-auto">
            <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
              {tAtt.year}
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full min-[420px]:w-28 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-bold text-slate-800 text-xs sm:text-sm shadow-2xs cursor-pointer"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          {availableClasses.length > 0 && (
            <div className="w-full sm:w-auto">
              <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                {tAtt.filterClass}
              </label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full sm:w-44 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-bold text-slate-800 text-xs sm:text-sm shadow-2xs cursor-pointer"
              >
                <option value="all">{tAtt.allClasses}</option>
                {availableClasses.map((c) => (
                  <option key={c} value={c}>
                    {formatClassName(
                      c,
                      tAtt.unassignedClass,
                      tAtt.className ? tAtt.className + " " : "Lớp ",
                    )}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Status Filter */}
          <div className="w-full sm:w-auto">
            <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
              {tAtt.filterPayment || "Trạng thái HP"}
            </label>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value as any)}
              className="w-full sm:w-44 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-bold text-slate-800 text-xs sm:text-sm shadow-2xs cursor-pointer"
            >
              <option value="all">
                {tAtt.filterAllPayments || "Tất cả trạng thái"}
              </option>
              <option value="paid">🟢 {tAtt.paid || "Đã nộp"}</option>
              <option value="unpaid">🔴 {tAtt.unpaid || "Chưa nộp"}</option>
            </select>
          </div>

          {/* General Note */}
          <div className="w-full sm:flex-1 min-w-[200px]">
            <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
              {tAtt.noteLabel || "Ghi chú chung"}
            </label>
            <input
              type="text"
              placeholder={tAtt.notePlaceholder}
              value={generalNote}
              onChange={(e) => setGeneralNote(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-bold text-slate-800 text-xs sm:text-sm shadow-2xs"
            />
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto pt-1 sm:pt-0">
            <button
              type="button"
              onClick={handleExportAllImages}
              disabled={exporting || summary.length === 0}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white rounded-xl font-black shadow-md shadow-teal-500/20 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95 cursor-pointer"
            >
              {exporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ImageIcon size={16} />
              )}
              <span>
                {exporting ? tAtt.exportingImage : tAtt.exportImageAll}
              </span>
            </button>

            <button
              type="button"
              onClick={exportExcel}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-black shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95 cursor-pointer"
            >
              <Download size={15} />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print header (visible only when printing) */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-black text-slate-800">
          {tAtt.title || "Báo Cáo Điểm Danh"}
        </h1>
        <p className="text-slate-500 font-bold mt-1">
          {MONTH_LABEL}
          {filterClass !== "all" ? ` — ${filterClass}` : ""}
        </p>
      </div>

      {summary.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 p-6">
          <CalendarDays size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">{tAtt.summaryEmpty}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ---- Stat cards ---- */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:grid-cols-4">
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-[11px] sm:text-xs font-black text-blue-200 uppercase tracking-wider">
                  {tAtt.studentsStat || "Học sinh"}
                </p>
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <Users size={16} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2">
                {summary.length}
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-[11px] sm:text-xs font-black text-emerald-200 uppercase tracking-wider">
                  {tAtt.totalSessionsStat || "Tổng buổi"}
                </p>
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2">
                {grandSessions}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-600 via-violet-600 to-purple-800 text-white rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-[11px] sm:text-xs font-black text-purple-200 uppercase tracking-wider">
                  {tAtt.totalClassesStat || "Số lớp"}
                </p>
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <BookOpen size={16} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2">
                {Object.keys(byClass).length}
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-white rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-[11px] sm:text-xs font-black text-amber-100 uppercase tracking-wider">
                  {tAtt.totalFeeStat || "Tổng học phí"}
                </p>
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <Wallet size={16} />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-black mt-2 leading-tight">
                {tAtt.currencyVnd.replace(
                  "{amount}",
                  grandTotal.toLocaleString(),
                )}
              </p>
            </div>
          </div>

          {/* ---- Tables grouped by class ---- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {Object.entries(byClass).map(([cls, rows]) => {
              const classTotal = rows.reduce((s, r) => s + r.total_fee, 0);
              const classSessions = rows.reduce(
                (s, r) => s + r.total_sessions,
                0,
              );
              return (
                <div
                  key={cls}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 overflow-hidden shadow-2xs print:break-inside-avoid"
                >
                  {/* Class header */}
                  <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 px-5 py-3.5 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-purple-200" />
                      <span className="font-black text-white text-sm sm:text-base">
                        {formatClassName(cls, tAtt.unassignedClass)}
                      </span>
                      <span className="text-purple-200 text-xs font-bold bg-white/10 px-2 py-0.5 rounded-full">
                        {tAtt.studentCount.replace(
                          "{count}",
                          rows.length.toString(),
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-purple-200 font-bold">
                        {tAtt.sessionCount.replace(
                          "{count}",
                          classSessions.toString(),
                        )}
                      </p>
                      <p className="text-sm font-black text-white">
                        {tAtt.currencyVnd.replace(
                          "{amount}",
                          classTotal.toLocaleString(),
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Input Học liệu theo từng Lớp (Label + Value số đ) */}
                  <div className="bg-purple-50/70 px-4 py-2.5 border-b border-purple-100/80 flex flex-wrap items-center justify-between gap-2 print:hidden">
                    <div className="flex items-center gap-1.5 min-w-[180px] flex-1">
                      <span className="text-xs font-black text-purple-900 shrink-0">
                        {tAtt.labelField || "📚 Nhãn:"}
                      </span>
                      <input
                        type="text"
                        value={
                          classHocLieuMap[cls]?.label !== undefined
                            ? classHocLieuMap[cls].label
                            : rows[0]?.hoc_lieu_label ||
                              tAtt.hocLieuSlip ||
                              "📚 Học liệu"
                        }
                        placeholder={
                          tAtt.materialPlaceholder || "Mô tả (VD: Vở + Sách)..."
                        }
                        onChange={(e) =>
                          handleUpdateClassHocLieuMap(
                            cls,
                            e.target.value,
                            undefined,
                          )
                        }
                        className="w-full max-w-[180px] px-2.5 py-1 text-xs font-bold text-slate-800 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none shadow-2xs"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-purple-900 shrink-0">
                        {tAtt.amountField || "Số tiền:"}
                      </span>
                      <input
                        type="text"
                        value={
                          (classHocLieuMap[cls]?.value !== undefined
                            ? classHocLieuMap[cls].value
                            : Number(
                                rows[0]?.hoc_lieu_value ||
                                  rows[0]?.hoc_lieu ||
                                  0,
                              )) > 0
                            ? Number(
                                classHocLieuMap[cls]?.value !== undefined
                                  ? classHocLieuMap[cls].value
                                  : Number(
                                      rows[0]?.hoc_lieu_value ||
                                        rows[0]?.hoc_lieu ||
                                        0,
                                    ),
                              ).toLocaleString()
                            : ""
                        }
                        placeholder="0"
                        onChange={(e) => {
                          const raw =
                            parseInt(e.target.value.replace(/\D/g, ""), 10) ||
                            0;
                          handleUpdateClassHocLieuMap(cls, undefined, raw);
                        }}
                        className="w-24 px-2 py-1 text-xs font-black text-right text-purple-900 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none shadow-2xs"
                      />
                      <span className="text-xs font-bold text-purple-800">
                        {tAtt.vndPerStudent || "đ / HS"}
                      </span>
                    </div>
                  </div>

                  {/* Student card list */}
                  <div className="divide-y divide-slate-100">
                    {rows.map((s, i) => (
                      <div
                        key={s.id}
                        className="p-3.5 sm:p-4 hover:bg-purple-50/40 transition-colors space-y-2"
                      >
                        {/* Row 1: STT + Tên + Buổi + Học phí */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-black shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-black text-slate-800 text-sm flex-1 min-w-0 truncate">
                            {s.name}
                          </span>
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs shrink-0">
                            {s.total_sessions} {tAtt.sessionUnit || "buổi"}
                          </span>
                          <span className="font-black text-purple-700 text-sm shrink-0">
                            {tAtt.currencyVnd.replace(
                              "{amount}",
                              s.total_fee.toLocaleString(),
                            )}
                          </span>
                        </div>

                        {/* Row 2: Đơn giá + Controls */}
                        <div className="flex items-center gap-2 flex-wrap pl-7">
                          <span className="text-xs text-slate-400 font-bold">
                            {interpolate(
                              tAtt.pricePerSession || "{price} đ/buổi",
                              { price: s.unit_price.toLocaleString() },
                            )}
                          </span>
                          <div className="flex-1" />
                          {/* Toggle trạng thái HP */}
                          <button
                            type="button"
                            onClick={() => handleTogglePayment(s.id)}
                            className={`px-3 py-1 text-xs font-black rounded-full border transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer print:hidden ${
                              paymentsMap[s.id]
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-2xs"
                                : "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 shadow-2xs"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${paymentsMap[s.id] ? "bg-emerald-500" : "bg-rose-500"}`}
                            />
                            {paymentsMap[s.id]
                              ? tAtt.paid || "Đã nộp"
                              : tAtt.unpaid || "Chưa nộp"}
                          </button>

                          {/* Gửi Zalo */}
                          <button
                            type="button"
                            onClick={() => setZaloStudent(s)}
                            className="px-2.5 py-1 text-xs font-black text-[#0068FF] bg-[#0068FF]/10 hover:bg-[#0068FF]/20 rounded-xl transition-all flex items-center gap-1 print:hidden shadow-2xs active:scale-95 cursor-pointer"
                            title={
                              tAtt.sendZaloTooltip ||
                              "Gửi thông báo Zalo cho Phụ huynh"
                            }
                          >
                            <MessageCircle size={13} /> Zalo
                          </button>

                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudent(s);
                              setPreviewMode(false);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-black text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all active:scale-95 cursor-pointer print:hidden shadow-2xs"
                          >
                            <CalendarDays size={13} /> {tAtt.details || "Xem"}
                          </button>
                        </div>

                        {/* Row 3: Ghi chú riêng (Lưu CSDL Supabase) */}
                        <div className="pl-7 print:hidden">
                          <input
                            type="text"
                            placeholder={
                              tAtt.individualNotePlaceholder ||
                              "Nhập ghi chú riêng (Tự động lưu)..."
                            }
                            value={
                              studentNotes[s.id] !== undefined
                                ? studentNotes[s.id]
                                : s.note || s.student_note || ""
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              setStudentNotes((prev) => ({
                                ...prev,
                                [s.id]: val,
                              }));
                            }}
                            onBlur={(e) =>
                              handleUpdateStudentNote(s.id, e.target.value)
                            }
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/50 focus:bg-white placeholder:text-slate-400 shadow-2xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer tổng lớp */}
                  <div className="bg-purple-50/80 border-t border-purple-100 px-5 py-3 flex items-center justify-between">
                    <span className="font-black text-purple-900 text-sm">
                      {tAtt.sum || "Cộng lớp"}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-xl bg-purple-200 text-purple-900 font-black text-xs">
                        {classSessions} {tAtt.sessionUnit || "buổi"}
                      </span>
                      <span className="font-black text-purple-800 text-sm sm:text-base">
                        {tAtt.currencyVnd.replace(
                          "{amount}",
                          classTotal.toLocaleString(),
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---- Grand total footer ---- */}
          {filterClass === "all" && (
            <div className="flex justify-end">
              <div className="bg-gradient-to-r from-purple-700 via-indigo-800 to-purple-900 text-white rounded-2xl sm:rounded-3xl px-6 py-5 shadow-lg text-right min-w-[260px]">
                <p className="text-xs font-bold opacity-80 uppercase tracking-wider">
                  {tAtt.grandTotal || "Tổng cộng tất cả"}
                </p>
                <p className="text-2xl sm:text-3xl font-black mt-1">
                  {tAtt.currencyVnd.replace(
                    "{amount}",
                    grandTotal.toLocaleString(),
                  )}
                </p>
                <p className="text-xs text-purple-200 mt-1">
                  {interpolate(
                    tAtt.summaryFooter ||
                      "{sessions} buổi · {students} học sinh · ",
                    {
                      sessions: grandSessions,
                      students: summary.length,
                    },
                  )}
                  {MONTH_LABEL}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Student Detail Modal ---- */}
      {selectedStudent &&
        (() => {
          const s = selectedStudent;
          const studentRecs = records
            .filter((r) => r.student_id === s.id)
            .sort(
              (a, b) =>
                new Date(a.checkin_time).getTime() -
                new Date(b.checkin_time).getTime(),
            );
          return createPortal(
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[200] print:hidden overscroll-contain">
              <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
                {/* Modal header */}
                <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 px-6 py-4 flex items-start justify-between shrink-0 text-white">
                  <div>
                    <h2 className="font-black text-white text-lg sm:text-xl">
                      {s.name}
                    </h2>
                    <p className="text-purple-200 text-xs sm:text-sm font-bold mt-0.5">
                      {formatClassName(s.class_name, tAtt.unassignedClass)} ·{" "}
                      {MONTH_LABEL}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors ml-4 cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Summary strip */}
                <div className="grid grid-cols-3 border-b border-slate-100 shrink-0 bg-slate-50/50">
                  <div className="px-4 py-3 text-center border-r border-slate-100">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wide">
                      {tAtt.totalSessionsStat || "Số buổi"}
                    </p>
                    <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
                      {s.total_sessions}
                    </p>
                  </div>
                  <div className="px-4 py-3 text-center border-r border-slate-100">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wide">
                      {tAtt.unitPrice || "Đơn giá"}
                    </p>
                    <p className="text-xs sm:text-sm font-black text-slate-700 mt-0.5">
                      {tAtt.currencyVnd.replace(
                        "{amount}",
                        s.unit_price.toLocaleString(),
                      )}
                    </p>
                  </div>
                  <div className="px-4 py-3 text-center">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wide">
                      {tAtt.tuitionFeeLabel || "Học phí"}
                    </p>
                    <p className="text-xs sm:text-sm font-black text-purple-700 mt-0.5">
                      {tAtt.currencyVnd.replace(
                        "{amount}",
                        s.total_fee.toLocaleString(),
                      )}
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
                        ? "bg-white text-purple-700 shadow-2xs"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <CalendarDays size={14} />{" "}
                    {tAtt.attendanceCalendar || "Lịch điểm danh"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(true)}
                    className={`flex-1 py-2 text-xs sm:text-sm font-black rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      previewMode
                        ? "bg-white text-purple-700 shadow-2xs"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Eye size={14} />{" "}
                    {tAtt.previewTuitionSlip || "Preview phiếu học phí"}
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
                              tAtt.attendanceHistoryTitle ||
                                "Danh sách điểm danh ({count} buổi)",
                              { count: studentRecs.length },
                            )}
                          </p>
                          <p className="text-[11px] text-purple-600 font-medium">
                            {tAtt.attendanceHistorySubtitle ||
                              "Thêm học bù hoặc điều chỉnh ngày học của học sinh"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddDateForm(!showAddDateForm);
                            if (!newDateVal) {
                              const defaultD = `${year}-${String(month).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
                              setNewDateVal(defaultD);
                            }
                          }}
                          className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        >
                          <Plus size={14} />{" "}
                          {tAtt.addMakeupSessionBtn || "Thêm học bù"}
                        </button>
                      </div>

                      {/* Add makeup form */}
                      {showAddDateForm && (
                        <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in duration-150">
                          <p className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                            <CalendarDays
                              size={14}
                              className="text-purple-600"
                            />
                            {tAtt.addCheckinModalTitle ||
                              "Thêm buổi điểm danh / học bù mới"}
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[140px]">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                {tAtt.sessionDate || "Ngày học"}
                              </label>
                              <input
                                type="date"
                                value={newDateVal}
                                onChange={(e) => setNewDateVal(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-400"
                              />
                            </div>
                            <div className="w-28">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                {tAtt.sessionTime || "Giờ học"}
                              </label>
                              <input
                                type="time"
                                value={newTimeVal}
                                onChange={(e) => setNewTimeVal(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-400"
                              />
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
                                {tc.save || "Lưu"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowAddDateForm(false)}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              >
                                {tc.cancel || "Hủy"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Attendance records table */}
                      {studentRecs.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                          <p className="text-slate-400 font-bold text-sm">
                            {tAtt.noCheckinsThisMonth ||
                              "Chưa có buổi điểm danh nào trong tháng này."}
                          </p>
                          <p className="text-slate-400 text-xs mt-1">
                            {tAtt.noCheckinsHint ||
                              'Bấm nút "Thêm buổi học bù" ở trên để thêm điểm danh.'}
                          </p>
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2.5 text-left text-xs font-black text-slate-500 uppercase w-10">
                                  {tAtt.tableIndex || "STT"}
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-black text-slate-500 uppercase">
                                  {tAtt.dateHeader || "Ngày"}
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-black text-slate-500 uppercase">
                                  {tAtt.timeHeader || "Giờ"}
                                </th>
                                <th className="px-3 py-2.5 text-center text-xs font-black text-slate-500 uppercase">
                                  {tAtt.statusHeader || "Trạng thái"}
                                </th>
                                <th className="px-3 py-2.5 text-right text-xs font-black text-slate-500 uppercase w-24">
                                  {tAtt.actionsHeader || "Thao tác"}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {studentRecs.map((r, i) => {
                                const dt = new Date(r.checkin_time);
                                const isEditing = editingRecId === r.id;

                                return (
                                  <tr
                                    key={r.id}
                                    className="hover:bg-purple-50/50 transition-colors"
                                  >
                                    <td className="px-3 py-2.5 text-slate-400 font-bold">
                                      {i + 1}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      {isEditing ? (
                                        <input
                                          type="date"
                                          value={editDateVal}
                                          onChange={(e) =>
                                            setEditDateVal(e.target.value)
                                          }
                                          className="px-2 py-1 border border-purple-300 rounded-lg text-xs font-bold text-slate-800"
                                        />
                                      ) : (
                                        <p className="font-black text-slate-800 text-xs sm:text-sm">
                                          {dt.toLocaleDateString("vi-VN", {
                                            weekday: "short",
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                          })}
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 font-bold text-slate-500 text-xs sm:text-sm">
                                      {isEditing ? (
                                        <input
                                          type="time"
                                          value={editTimeVal}
                                          onChange={(e) =>
                                            setEditTimeVal(e.target.value)
                                          }
                                          className="px-2 py-1 border border-purple-300 rounded-lg text-xs font-bold text-slate-800"
                                        />
                                      ) : (
                                        dt.toLocaleTimeString("vi-VN", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded-lg">
                                        <CheckCircle2 size={11} />{" "}
                                        {tAtt.present || "Có mặt"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                      {isEditing ? (
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleSaveEditSession(r.id)
                                            }
                                            disabled={recActionLoading}
                                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                                            title={tc.save || "Lưu"}
                                          >
                                            <Save size={13} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditingRecId(null)
                                            }
                                            className="p-1.5 bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                            title={tc.cancel || "Hủy"}
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
                                              const dStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
                                              const tStr = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
                                              setEditDateVal(dStr);
                                              setEditTimeVal(tStr);
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                                            title={
                                              tAtt.editDateTime ||
                                              "Sửa ngày/giờ"
                                            }
                                          >
                                            <Pencil size={13} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteSession(r.id)
                                            }
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                            title={
                                              tAtt.deleteThisSession ||
                                              "Xóa buổi này"
                                            }
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
                        <Eye size={12} />{" "}
                        {tAtt.previewTuitionSlip || "Xem trước phiếu học phí"}
                      </p>
                      <div
                        style={{
                          width: "500px",
                          transform: "scale(0.78)",
                          transformOrigin: "top center",
                          marginBottom: "-110px",
                        }}
                        className="shadow-xl rounded-2xl overflow-hidden"
                      >
                        <TuitionSlipTemplate
                          student={s}
                          records={studentRecs}
                          month={month}
                          hocLieuLabel={
                            classHocLieuMap[
                              s.class_name || tAtt.unassignedClass
                            ]?.label !== undefined
                              ? classHocLieuMap[
                                  s.class_name || tAtt.unassignedClass
                                ].label
                              : s.hoc_lieu_label ||
                                tAtt.hocLieuSlip ||
                                "📚 Học liệu"
                          }
                          hocLieuValue={
                            classHocLieuMap[
                              s.class_name || tAtt.unassignedClass
                            ]?.value !== undefined
                              ? classHocLieuMap[
                                  s.class_name || tAtt.unassignedClass
                                ].value
                              : Number(s.hoc_lieu_value ?? s.hoc_lieu ?? 0)
                          }
                          note={
                            (studentNotes[s.id] && studentNotes[s.id].trim()) ||
                            generalNote
                          }
                          onHocLieuLabelChange={(lbl: string) =>
                            handleUpdateClassHocLieuMap(
                              s.class_name || tAtt.unassignedClass,
                              lbl,
                              undefined,
                            )
                          }
                          onHocLieuValueChange={(val: number) =>
                            handleUpdateClassHocLieuMap(
                              s.class_name || tAtt.unassignedClass,
                              undefined,
                              val,
                            )
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal footer: export actions */}
                <div className="border-t border-slate-100 px-5 py-3.5 flex justify-between items-center gap-2 bg-slate-50/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    {tAtt.close || "Đóng"}
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => exportStudentExcel(s)}
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
                      title={
                        tAtt.previewTuitionSlip || "Xem trước phiếu học phí"
                      }
                    >
                      <Eye size={14} /> Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportSingle(selectedStudent)}
                      disabled={exporting}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-purple-500/20 transition-all active:scale-95 cursor-pointer"
                    >
                      {exporting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ImageIcon size={14} />
                      )}
                      {tAtt.printImage}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          );
        })()}

      {/* Hidden container for image export - dùng top thay left để layout tính đúng */}
      <div
        style={{
          position: "fixed",
          top: "-9999px",
          left: "0",
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        {exportStudent && (
          <TuitionSlipTemplate
            ref={slipRef}
            student={exportStudent}
            records={records
              .filter((r) => r.student_id === exportStudent.id)
              .sort(
                (a, b) =>
                  new Date(a.checkin_time).getTime() -
                  new Date(b.checkin_time).getTime(),
              )}
            month={month}
            hocLieuLabel={
              classHocLieuMap[exportStudent.class_name || tAtt.unassignedClass]
                ?.label !== undefined
                ? classHocLieuMap[
                    exportStudent.class_name || tAtt.unassignedClass
                  ].label
                : exportStudent.hoc_lieu_label ||
                  tAtt.hocLieuSlip ||
                  "📚 Học liệu"
            }
            hocLieuValue={
              classHocLieuMap[exportStudent.class_name || tAtt.unassignedClass]
                ?.value !== undefined
                ? classHocLieuMap[
                    exportStudent.class_name || tAtt.unassignedClass
                  ].value
                : Number(
                    exportStudent.hoc_lieu_value ?? exportStudent.hoc_lieu ?? 0,
                  )
            }
            note={
              (studentNotes[exportStudent.id] &&
                studentNotes[exportStudent.id].trim()) ||
              generalNote
            }
          />
        )}
      </div>
      {zaloStudent && (
        <ZaloShareModal
          student={zaloStudent}
          month={month}
          year={year}
          isPaid={!!paymentsMap[zaloStudent.id]}
          note={studentNotes[zaloStudent.id] || generalNote}
          onClose={() => setZaloStudent(null)}
        />
      )}
    </div>
  );
}
