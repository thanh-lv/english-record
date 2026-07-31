import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import {
  Download,
  CalendarDays,
  Users,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  X as XIcon,
  Plus,
  Pencil,
  Trash2,
  Save,
  Clock,
} from "lucide-react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { TuitionSlipTemplate } from "./TuitionSlipTemplate";
import { AttendanceLeaderboard } from "./AttendanceLeaderboard";
import { AttendanceAnalytics } from "./AttendanceAnalytics";
import { ZaloShareModal } from "./ZaloShareModal";
import { MessageCircle } from "lucide-react";
import { Check, X, DollarSign } from "lucide-react";
import { formatClassName, useBodyScrollLock } from "../../../utils";

export function SummaryTab({ tAtt }: { tAtt: any }) {
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
      label: "📚 Học liệu",
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

      if (studRes.data) setStudents(studRes.data);
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
          label: matchingStudent?.hoc_lieu_label || "📚 Học liệu",
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
            label: student.hoc_lieu_label || "📚 Học liệu",
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
        `Lớp: ${s.class_name || tAtt.unassignedClass}`,
        "",
        `Tháng ${month}/${year}`,
      ],
      [],
      [tAtt.no, tAtt.date, tAtt.time, tAtt.note],
      ...studentRecs.map((r, i) => {
        const dt = new Date(r.checkin_time);
        return [
          i + 1,
          dt.toLocaleDateString("vi-VN"),
          dt.toLocaleTimeString("vi-VN", {
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
      alert("Không thể thêm buổi học. Vui lòng thử lại.");
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
      alert("Không thể cập nhật ngày học.");
    } finally {
      setRecActionLoading(false);
    }
  };

  const handleDeleteSession = async (recId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa buổi điểm danh này?")) return;
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
      alert("Không thể xóa buổi điểm danh.");
    } finally {
      setRecActionLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-purple-500" />
      </div>
    );

  return (
    <div className="space-y-5" id="printable-summary">
      {/* ---- Controls bar ---- */}
      <div className="flex flex-wrap items-end gap-3 bg-purple-50 border border-purple-100 rounded-lg p-4 print:hidden">
        <div>
          <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">
            {tAtt.month}
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white font-bold text-slate-700 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">
            {tAtt.year}
          </label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white font-bold text-slate-700 text-sm"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {availableClasses.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">
              {tAtt.filterClass}
            </label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white font-bold text-slate-700 text-sm"
            >
              <option value="all">{tAtt.allClasses}</option>
              {availableClasses.map((c) => (
                <option key={c} value={c}>
                  {formatClassName(c, tAtt.unassignedClass)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">
            {tAtt.filterPayment || "Trạng thái HP"}
          </label>
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value as any)}
            className="px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white font-bold text-slate-700 text-sm"
          >
            <option value="all">
              {tAtt.filterAllPayments || "Tất cả trạng thái"}
            </option>
            <option value="paid">🟢 {tAtt.paid || "Đã nộp"}</option>
            <option value="unpaid">🔴 {tAtt.unpaid || "Chưa nộp"}</option>
          </select>
        </div>

        <div className="w-full sm:w-auto flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">
            {tAtt.noteLabel || "Ghi chú chung"}
          </label>
          <input
            type="text"
            placeholder={tAtt.notePlaceholder}
            value={generalNote}
            onChange={(e) => setGeneralNote(e.target.value)}
            className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white font-bold text-slate-700 text-sm"
          />
        </div>

        <div className="flex gap-2 ml-auto flex-wrap">
          <button
            onClick={handleExportAllImages}
            disabled={exporting || summary.length === 0}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-md transition-all flex items-center gap-2 text-sm"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ImageIcon size={16} />
            )}
            {exporting ? tAtt.exportingImage : tAtt.exportImageAll}
          </button>

          <button
            onClick={exportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center gap-2 text-sm"
          >
            <Download size={15} />
            Excel
          </button>
        </div>
      </div>

      {/* Print header (visible only when printing) */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-black text-slate-800">
          Báo Cáo Điểm Danh
        </h1>
        <p className="text-slate-500 font-bold mt-1">
          {MONTH_LABEL}
          {filterClass !== "all" ? ` — ${filterClass}` : ""}
        </p>
      </div>

      {summary.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-lg">
          <CalendarDays size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">{tAtt.summaryEmpty}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ---- Stat cards ---- */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:grid-cols-4">
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-lg p-4 shadow-md">
              <p className="text-xs font-bold opacity-80 uppercase tracking-wide">
                Học sinh
              </p>
              <p className="text-3xl font-black mt-1">{summary.length}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-lg p-4 shadow-md">
              <p className="text-xs font-bold opacity-80 uppercase tracking-wide">
                Tổng buổi
              </p>
              <p className="text-3xl font-black mt-1">{grandSessions}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-lg p-4 shadow-md">
              <p className="text-xs font-bold opacity-80 uppercase tracking-wide">
                Số lớp
              </p>
              <p className="text-3xl font-black mt-1">
                {Object.keys(byClass).length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-lg p-4 shadow-md">
              <p className="text-xs font-bold opacity-80 uppercase tracking-wide">
                Tổng học phí
              </p>
              <p className="text-xl font-black mt-1">
                {tAtt.currencyVnd.replace(
                  "{amount}",
                  grandTotal.toLocaleString(),
                )}
              </p>
            </div>
          </div>

          {/* ---- Analytics Charts Widget ---- */}
          <AttendanceAnalytics
            tAtt={tAtt}
            month={month}
            year={year}
            paymentsMap={paymentsMap}
          />

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
                  className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-md print:break-inside-avoid"
                >
                  {/* Class header */}
                  <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-5 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-purple-200" />
                      <span className="font-black text-white">
                        {formatClassName(cls, tAtt.unassignedClass)}
                      </span>
                      <span className="text-purple-200 text-sm font-bold">
                        (
                        {tAtt.studentCount.replace(
                          "{count}",
                          rows.length.toString(),
                        )}
                        )
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-purple-200 font-bold">
                        {tAtt.sessionCount.replace(
                          "{count}",
                          classSessions.toString(),
                        )}
                      </p>
                      <p className="text-sm text-white font-black">
                        {tAtt.currencyVnd.replace(
                          "{amount}",
                          classTotal.toLocaleString(),
                        )}
                      </p>
                    </div>
                  </div>
                  {/* Input Học liệu theo từng Lớp (Label + Value số đ) */}
                  <div className="bg-purple-50/90 px-4 py-2 border-b border-purple-100 flex flex-wrap items-center justify-between gap-2 print:hidden">
                    <div className="flex items-center gap-1.5 min-w-[200px] flex-1">
                      <span className="text-xs font-black text-purple-900 shrink-0">
                        📚 Nhãn:
                      </span>
                      <input
                        type="text"
                        value={
                          classHocLieuMap[cls]?.label !== undefined
                            ? classHocLieuMap[cls].label
                            : rows[0]?.hoc_lieu_label || "📚 Học liệu"
                        }
                        placeholder="Mô tả (VD: Vở + Sách)..."
                        onChange={(e) =>
                          handleUpdateClassHocLieuMap(
                            cls,
                            e.target.value,
                            undefined,
                          )
                        }
                        className="w-full max-w-[200px] px-2.5 py-1 text-xs font-bold text-slate-800 bg-white border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-purple-900 shrink-0">
                        Số tiền:
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
                            parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
                          handleUpdateClassHocLieuMap(cls, undefined, raw);
                        }}
                        className="w-24 px-2 py-1 text-xs font-black text-right text-purple-900 bg-white border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                      />
                      <span className="text-xs font-bold text-purple-800">
                        đ / HS
                      </span>
                    </div>
                  </div>

                  {/* Student card list – no horizontal scroll */}
                  <div className="divide-y divide-slate-100">
                    {rows.map((s, i) => (
                      <div
                        key={s.id}
                        className={`px-4 py-3 hover:bg-purple-50/60 transition-colors ${
                          paymentsMap[s.id] ? "" : ""
                        }`}
                      >
                        {/* Row 1: STT + Tên + Buổi + Học phí */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-400 font-bold w-5 shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-black text-slate-800 flex-1 min-w-0 truncate">
                            {s.name}
                          </span>
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-black text-xs shrink-0">
                            {s.total_sessions}
                          </span>
                          <span className="text-xs text-slate-400 font-medium shrink-0">
                            buổi
                          </span>
                          <span className="font-black text-purple-700 text-sm shrink-0">
                            {tAtt.currencyVnd.replace(
                              "{amount}",
                              s.total_fee.toLocaleString(),
                            )}
                          </span>
                        </div>
                        {/* Row 2: Đơn giá + Controls */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap pl-7">
                          <span className="text-xs text-slate-400 font-medium">
                            {s.unit_price.toLocaleString()}đ/buổi
                          </span>
                          <div className="flex-1" />
                          {/* Toggle trạng thái HP */}
                          <button
                            onClick={() => handleTogglePayment(s.id)}
                            className={`px-2.5 py-1 text-xs font-black rounded-full border transition-all flex items-center gap-1 print:hidden ${
                              paymentsMap[s.id]
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
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
                            onClick={() => setZaloStudent(s)}
                            className="px-2.5 py-1 text-xs font-black text-[#0068FF] bg-[#0068FF]/10 hover:bg-[#0068FF]/20 rounded-lg transition-all flex items-center gap-1 print:hidden shadow-sm active:scale-95"
                            title="Gửi thông báo Zalo cho Phụ huynh"
                          >
                            <MessageCircle size={12} /> Zalo
                          </button>
                          {/* Xem chi tiết */}
                          <button
                            onClick={() => {
                              setSelectedStudent(s);
                              setPreviewMode(false);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-black text-purple-600 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors print:hidden"
                          >
                            <CalendarDays size={12} /> Xem
                          </button>
                        </div>
                        {/* Row 3: Ghi chú */}
                        <div className="mt-2 pl-7 print:hidden">
                          <input
                            type="text"
                            placeholder="Nhập ghi chú riêng..."
                            value={studentNotes[s.id] || ""}
                            onChange={(e) =>
                              setStudentNotes((prev) => ({
                                ...prev,
                                [s.id]: e.target.value,
                              }))
                            }
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-purple-400 bg-white placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Footer tổng lớp */}
                  <div className="bg-purple-50 border-t-2 border-purple-200 px-4 py-3 flex items-center justify-between">
                    <span className="font-black text-purple-800 text-sm">
                      Cộng
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-200 text-purple-800 font-black text-xs">
                        {classSessions}
                      </span>
                      <span className="text-xs text-purple-600 font-bold">
                        buổi
                      </span>
                      <span className="font-black text-purple-700 text-base">
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
              <div className="bg-gradient-to-r from-purple-700 to-purple-900 text-white rounded-lg px-6 py-4 shadow-md text-right">
                <p className="text-xs font-bold opacity-70 uppercase tracking-wider">
                  Tổng cộng tất cả
                </p>
                <p className="text-3xl font-black mt-0.5">
                  {tAtt.currencyVnd.replace(
                    "{amount}",
                    grandTotal.toLocaleString(),
                  )}
                </p>
                <p className="text-xs opacity-70 mt-0.5">
                  {grandSessions} buổi · {summary.length} học sinh ·{" "}
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
          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
              <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Modal header */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4 flex items-start justify-between shrink-0">
                  <div>
                    <h2 className="font-black text-white text-xl">{s.name}</h2>
                    <p className="text-purple-200 text-sm font-bold mt-0.5">
                      {formatClassName(s.class_name, tAtt.unassignedClass)} ·{" "}
                      {MONTH_LABEL}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="text-purple-300 hover:text-white text-2xl font-black leading-none ml-4"
                  >
                    ✕
                  </button>
                </div>

                {/* Summary strip */}
                <div className="grid grid-cols-3 border-b border-slate-100 shrink-0">
                  <div className="px-5 py-3 text-center border-r border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                      Số buổi
                    </p>
                    <p className="text-2xl font-black text-emerald-600 mt-0.5">
                      {s.total_sessions}
                    </p>
                  </div>
                  <div className="px-5 py-3 text-center border-r border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                      Đơn giá
                    </p>
                    <p className="text-sm font-black text-slate-700 mt-0.5">
                      {tAtt.currencyVnd.replace(
                        "{amount}",
                        s.unit_price.toLocaleString(),
                      )}
                    </p>
                  </div>
                  <div className="px-5 py-3 text-center">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                      Học phí
                    </p>
                    <p className="text-sm font-black text-purple-700 mt-0.5">
                      {tAtt.currencyVnd.replace(
                        "{amount}",
                        s.total_fee.toLocaleString(),
                      )}
                    </p>
                  </div>
                </div>

                {/* Tab switcher */}
                <div className="flex border-b border-slate-200 shrink-0 bg-slate-50">
                  <button
                    onClick={() => setPreviewMode(false)}
                    className={`flex-1 py-2.5 text-sm font-black flex items-center justify-center gap-1.5 transition-colors ${
                      !previewMode
                        ? "text-purple-700 border-b-2 border-purple-600 bg-white"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <CalendarDays size={14} /> Lịch điểm danh
                  </button>
                  <button
                    onClick={() => setPreviewMode(true)}
                    className={`flex-1 py-2.5 text-sm font-black flex items-center justify-center gap-1.5 transition-colors ${
                      previewMode
                        ? "text-purple-700 border-b-2 border-purple-600 bg-white"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Eye size={14} /> Preview phiếu học phí
                  </button>
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-y-auto">
                  {!previewMode ? (
                    /* ---- Attendance list tab ---- */
                    <div className="p-4 space-y-4">
                      {/* Top action bar: Add makeup session */}
                      <div className="flex justify-between items-center bg-purple-50/70 border border-purple-100 rounded-xl p-3">
                        <div>
                          <p className="text-xs font-black text-purple-900">
                            Danh sách điểm danh ({studentRecs.length} buổi)
                          </p>
                          <p className="text-[11px] text-purple-600 font-medium">
                            Thêm học bù hoặc điều chỉnh ngày học của học sinh
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setShowAddDateForm(!showAddDateForm);
                            if (!newDateVal) {
                              const defaultD = `${year}-${String(month).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
                              setNewDateVal(defaultD);
                            }
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-black shadow-sm flex items-center gap-1 transition-all active:scale-95"
                        >
                          <Plus size={14} /> Thêm buổi học bù
                        </button>
                      </div>

                      {/* Add makeup form */}
                      {showAddDateForm && (
                        <div className="bg-white border-2 border-purple-200 rounded-xl p-3.5 shadow-sm space-y-3 animate-in fade-in duration-150">
                          <p className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                            <CalendarDays
                              size={14}
                              className="text-purple-600"
                            />
                            Thêm buổi điểm danh / học bù mới
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[140px]">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                Ngày học
                              </label>
                              <input
                                type="date"
                                value={newDateVal}
                                onChange={(e) => setNewDateVal(e.target.value)}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-400"
                              />
                            </div>
                            <div className="w-28">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                Giờ học
                              </label>
                              <input
                                type="time"
                                value={newTimeVal}
                                onChange={(e) => setNewTimeVal(e.target.value)}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-400"
                              />
                            </div>
                            <div className="flex items-end gap-2 pt-4">
                              <button
                                onClick={() => handleAddMakeupSession(s.id)}
                                disabled={recActionLoading || !newDateVal}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-black shadow transition-all flex items-center gap-1"
                              >
                                {recActionLoading ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Check size={13} />
                                )}
                                Lưu
                              </button>
                              <button
                                onClick={() => setShowAddDateForm(false)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Attendance records table */}
                      {studentRecs.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                          <p className="text-slate-400 font-bold text-sm">
                            Chưa có buổi điểm danh nào trong tháng này.
                          </p>
                          <p className="text-slate-400 text-xs mt-1">
                            Bấm nút &quot;Thêm buổi học bù&quot; ở trên để thêm
                            điểm danh.
                          </p>
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2.5 text-left text-xs font-black text-slate-500 uppercase w-10">
                                  STT
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-black text-slate-500 uppercase">
                                  Ngày
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-black text-slate-500 uppercase">
                                  Giờ
                                </th>
                                <th className="px-3 py-2.5 text-center text-xs font-black text-slate-500 uppercase">
                                  Trạng thái
                                </th>
                                <th className="px-3 py-2.5 text-right text-xs font-black text-slate-500 uppercase w-24">
                                  Thao tác
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
                                          className="px-2 py-1 border border-purple-300 rounded text-xs font-bold text-slate-800"
                                        />
                                      ) : (
                                        <p className="font-black text-slate-800">
                                          {dt.toLocaleDateString("vi-VN", {
                                            weekday: "short",
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                          })}
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 font-bold text-slate-500">
                                      {isEditing ? (
                                        <input
                                          type="time"
                                          value={editTimeVal}
                                          onChange={(e) =>
                                            setEditTimeVal(e.target.value)
                                          }
                                          className="px-2 py-1 border border-purple-300 rounded text-xs font-bold text-slate-800"
                                        />
                                      ) : (
                                        dt.toLocaleTimeString("vi-VN", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-black rounded-lg">
                                        <CheckCircle2 size={11} /> Có mặt
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                      {isEditing ? (
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            onClick={() =>
                                              handleSaveEditSession(r.id)
                                            }
                                            disabled={recActionLoading}
                                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                                            title="Lưu"
                                          >
                                            <Save size={13} />
                                          </button>
                                          <button
                                            onClick={() =>
                                              setEditingRecId(null)
                                            }
                                            className="p-1.5 bg-slate-200 text-slate-600 rounded transition-colors"
                                            title="Hủy"
                                          >
                                            <X size={13} />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            onClick={() => {
                                              setEditingRecId(r.id);
                                              const dStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
                                              const tStr = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
                                              setEditDateVal(dStr);
                                              setEditTimeVal(tStr);
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-100 rounded transition-colors"
                                            title="Sửa ngày/giờ"
                                          >
                                            <Pencil size={13} />
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleDeleteSession(r.id)
                                            }
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded transition-colors"
                                            title="Xóa buổi này"
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
                        <Eye size={12} /> Xem trước phiếu học phí
                      </p>
                      {/* Preview: scale down to fit modal width (modal max-w-2xl = 672px, slip = 500px) */}
                      <div
                        style={{
                          width: "500px",
                          transform: "scale(0.78)",
                          transformOrigin: "top center",
                          marginBottom: "-110px",
                        }}
                        className="shadow-xl rounded-lg overflow-hidden"
                      >
                        <TuitionSlipTemplate
                          tAtt={tAtt}
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
                              : s.hoc_lieu_label || "📚 Học liệu"
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
                          onHocLieuLabelChange={(lbl) =>
                            handleUpdateClassHocLieuMap(
                              s.class_name || tAtt.unassignedClass,
                              lbl,
                              undefined,
                            )
                          }
                          onHocLieuValueChange={(val) =>
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
                <div className="border-t border-slate-100 px-5 py-3 flex justify-between items-center gap-2 bg-slate-50 shrink-0">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Đóng
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportStudentExcel(s)}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow transition-colors"
                    >
                      <Download size={14} /> Excel
                    </button>
                    <button
                      onClick={() => {
                        setPreviewMode(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-black bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg shadow-sm transition-colors"
                      title="Xem trước phiếu học phí"
                    >
                      <Eye size={14} /> Preview
                    </button>
                    <button
                      onClick={() => handleExportSingle(selectedStudent)}
                      disabled={exporting}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-black bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg shadow transition-colors"
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
            </div>
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
            tAtt={tAtt}
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
              classHocLieuMap[
                exportStudent.class_name || tAtt.unassignedClass
              ]?.label !== undefined
                ? classHocLieuMap[
                    exportStudent.class_name || tAtt.unassignedClass
                  ].label
                : exportStudent.hoc_lieu_label || "📚 Học liệu"
            }
            hocLieuValue={
              classHocLieuMap[
                exportStudent.class_name || tAtt.unassignedClass
              ]?.value !== undefined
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
