import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import {
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  X,
  Phone,
} from "lucide-react";
import { formatClassName, useBodyScrollLock } from "../../../utils";
import { interpolate } from "../../../i18n/LanguageContext";

import { useLanguage } from "../../../i18n/LanguageContext";

interface ZaloShareModalProps {
  student: any;
  month: number;
  year: number;
  isPaid: boolean;
  note?: string;
  onClose: () => void;
}

export function ZaloShareModal({
  student,
  month,
  year,
  isPaid,
  note,
  onClose,
}: ZaloShareModalProps) {
  const { t } = useLanguage();
  const tAtt = t.attendance;
  const tc = t.common;
  useBodyScrollLock(true);
  const [phone, setPhone] = useState(student.phone || "");
  const [copied, setCopied] = useState(false);

  const handleSavePhone = async (newPhone: string) => {
    setPhone(newPhone);
    const cleaned = newPhone.trim();
    if (student.id) {
      try {
        await supabase
          .from("attendance_students")
          .update({ phone: cleaned })
          .eq("id", student.id);
        student.phone = cleaned;
      } catch (e) {
        console.error("Error saving student phone:", e);
      }
    }
  };

  const formattedFee = (student.total_fee || 0).toLocaleString();
  const statusText = isPaid
    ? tAtt.paid || "🟢 Đã nộp"
    : tAtt.unpaid || "🔴 Chưa nộp";
  const classNameStr = student.class_name
    ? ` (${formatClassName(student.class_name, tAtt.unassignedClass, tAtt.className ? tAtt.className + " " : "Lớp ")})`
    : "";

  const noteStr = note
    ? interpolate(tAtt.zaloNotePrefix || "- Ghi chú: {note}\n", { note })
    : "";
  const defaultMessage = interpolate(
    tAtt.zaloMessageTemplate ||
      "Kính gửi Phụ huynh em {name}{className},\n\nCô xin gửi thông báo học phí Tháng {month}/{year}:\n- Số buổi đi học: {sessions} buổi\n- Tổng học phí: {fee} VNĐ\n- Trạng thái HP: {status}\n{note}\nPhụ huynh kiểm tra giúp cô ạ. Cô xin cảm ơn Phụ huynh!",
    {
      name: student.name,
      className: classNameStr,
      month,
      year,
      sessions: student.total_sessions || 0,
      fee: formattedFee,
      status: statusText,
      note: noteStr,
    },
  );

  const [message, setMessage] = useState(defaultMessage);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenZalo = () => {
    handleCopyMessage();
    const cleanedPhone = phone.trim().replace(/\D/g, "");
    if (cleanedPhone) {
      window.open(`https://zalo.me/${cleanedPhone}`, "_blank");
    } else {
      window.open("https://chat.zalo.me", "_blank");
    }
  };

  return (
    <div className="!m-0 fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overscroll-contain">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0068FF]/10 text-[#0068FF] flex items-center justify-center font-black">
            <MessageCircle size={26} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base sm:text-lg">
              {tAtt.sendZaloTitle || "Gửi Thông Báo Zalo"}
            </h3>
            <p className="text-xs text-slate-500 font-bold">
              {tAtt.studentParentOf || "Phụ huynh em:"}{" "}
              <span className="text-[#0068FF]">{student.name}</span>
            </p>
          </div>
        </div>

        {/* SĐT Phụ huynh Input */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-600 flex items-center gap-1">
            <Phone size={13} className="text-[#0068FF]" />{" "}
            {tAtt.zaloPhoneLabelModal || "Số điện thoại Zalo Phụ huynh:"}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => handleSavePhone(e.target.value)}
            placeholder={
              tAtt.zaloPhonePlaceholder || "Nhập SĐT (VD: 0912345678)..."
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#0068FF]/30 focus:border-[#0068FF] outline-none"
          />
        </div>

        {/* Preview & Edit Message */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold text-slate-600">
              {tAtt.zaloMessagePreviewLabel || "Nội dung tin nhắn mẫu:"}
            </label>
            <button
              onClick={handleCopyMessage}
              className="text-xs font-black text-[#0068FF] hover:underline flex items-center gap-1"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? tc.copied || "Đã sao chép!" : tc.copy || "Sao chép"}
            </button>
          </div>
          <textarea
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0068FF]/30 focus:border-[#0068FF] outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Toast note */}
        {copied && (
          <div className="bg-emerald-50 text-emerald-700 text-xs font-black p-2.5 rounded-xl border border-emerald-200 flex items-center gap-2 animate-bounce">
            <Check size={16} />{" "}
            {tAtt.zaloCopiedHint ||
              "Tin nhắn đã tự động sao chép! Bạn chỉ cần sang Zalo bấm Dán (Paste) & Gửi."}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
          >
            {tAtt.close || "Đóng"}
          </button>
          <button
            onClick={handleOpenZalo}
            className="flex-1 py-2.5 bg-[#0068FF] hover:bg-[#0052cc] text-white font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
          >
            <ExternalLink size={16} />
            {tAtt.openZaloBtn || "Mở Zalo Nhắn Ngay"}
          </button>
        </div>
      </div>
    </div>
  );
}
