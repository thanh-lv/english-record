import { AlertCircle, Check, Eye, EyeOff, Loader2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

interface CreateStudentModalProps {
  onCreated: (student: any) => void;
  onClose: () => void;
}

export function CreateStudentModal({ onCreated, onClose }: CreateStudentModalProps) {
  const [name, setName] = useState("");
  const [yearBorn, setYearBorn] = useState("2015");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const trimName = name.trim();
    const trimPass = password.trim();
    if (trimName.length < 2) { setError("Tên phải có ít nhất 2 ký tự."); return; }
    if (trimPass.length < 3) { setError("Mật khẩu phải có ít nhất 3 ký tự."); return; }

    setSaving(true);
    setError("");
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .ilike("name", trimName)
        .maybeSingle();
      if (existing) { setError("Tên này đã tồn tại. Vui lòng chọn tên khác."); return; }

      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({ name: trimName, role: "student", password: trimPass, year_born: parseInt(yearBorn) || 2015 })
        .select()
        .single();
      if (insertError) throw insertError;
      onCreated(inserted);
      onClose();
    } catch (err: any) {
      setError(err.message || "Không thể tạo học sinh. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-emerald-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 flex items-center justify-center">
            <UserPlus size={20} />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-lg leading-tight">Thêm học sinh mới</h4>
            <p className="text-xs text-slate-400 font-medium">Tạo tài khoản cho học sinh</p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">Tên học sinh</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Ví dụ: Tuệ Minh, Bông bé..."
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">Năm sinh</label>
            <input
              type="number"
              value={yearBorn}
              onChange={(e) => { setYearBorn(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Ví dụ: 2015"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">Mật khẩu</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Nhập mật khẩu..."
                className="w-full px-4 py-3 pr-11 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#90CAF9] transition-colors"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200">
            Hủy
          </button>
          <button type="button" onClick={handleCreate} disabled={saving} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-full text-sm transition-colors shadow-md border-b-4 border-emerald-900 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Tạo học sinh
          </button>
        </div>
      </div>
    </div>
  );
}
