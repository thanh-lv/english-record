import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { supabase } from "./lib/supabase";

const FLOATING = ["🌟", "🎈", "📚", "🎵", "✨", "🦋", "🌈", "🎯"];

export default function LoginScreen({
  setProfile,
  user,
}: {
  setProfile: (p: any) => void;
  user: any;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Vui lòng nhập tên của bạn (ít nhất 2 ký tự)");
      return;
    }
    if (password.length < 3) {
      setError("Vui lòng nhập mật khẩu (ít nhất 3 ký tự)");
      return;
    }
    setError("");
    setIsLoggingIn(true);

    const role =
      trimmedName.toLowerCase() === "my admin" ? "teacher" : "student";

    try {
      if (user) {
        const dbOperation = async () => {
          const { data: existingUser, error: searchError } = await supabase
            .from("profiles")
            .select("*")
            .ilike("name", trimmedName)
            .maybeSingle();
          if (searchError) throw searchError;

          let profileData;
          if (existingUser) {
            if (existingUser.password && existingUser.password !== password) {
              throw new Error(
                "Tên này đã được đăng ký. Sai mật khẩu! Vui lòng thử lại.",
              );
            }
            profileData = {
              ...existingUser,
              auth_user_id: user.id,
              password,
              updated_at: new Date().toISOString(),
            };
            const { error: dbError } = await supabase
              .from("profiles")
              .update({
                auth_user_id: user.id,
                password,
                updated_at: profileData.updated_at,
              })
              .eq("id", existingUser.id);
            if (dbError) throw dbError;
          } else {
            const { data: inserted, error: dbError } = await supabase
              .from("profiles")
              .insert({
                auth_user_id: user.id,
                name: trimmedName,
                role,
                password,
                updated_at: new Date().toISOString(),
              })
              .select()
              .single();
            if (dbError?.code === "23505")
              throw new Error(
                "Tên này đã được người khác sử dụng. Vui lòng chọn tên khác.",
              );
            if (dbError) throw dbError;
            profileData = inserted;
          }
          return profileData;
        };

        const profileData = await Promise.race([
          dbOperation(),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Lỗi mạng: Thời gian kết nối quá lâu. Vui lòng thử lại!",
                  ),
                ),
              8000,
            ),
          ),
        ]);
        localStorage.setItem(
          "english_record_profile_id",
          (profileData as any).id,
        );
        setProfile(profileData);
      } else {
        setError(
          "Hệ thống đang khởi tạo bảo mật. Vui lòng đợi 3 giây và bấm Đăng nhập lại.",
        );
      }
    } catch (err: any) {
      console.error("Lưu thông tin đăng nhập thất bại:", err);
      setError(err.message || "Không thể khởi tạo tài khoản trên hệ thống.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Floating decorations */}
      {FLOATING.map((emoji, i) => (
        <span
          key={i}
          className="absolute text-2xl pointer-events-none select-none animate-float opacity-40"
          style={{
            left: `${8 + ((i * 12) % 84)}%`,
            top: `${5 + ((i * 17) % 80)}%`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${3 + (i % 3)}s`,
          }}
        >
          {emoji}
        </span>
      ))}

      <div className="relative z-10 w-full max-w-sm mx-auto px-4 animate-in fade-in zoom-in-95 duration-500">
        {/* Mascot + title */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-pink-100 rounded-full flex items-center justify-center text-5xl shadow-lg border-4 border-white mb-4 animate-in zoom-in duration-700">
              🎤
            </div>
            <span className="absolute -top-1 -right-1 text-xl animate-bounce">
              ✨
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 leading-tight">
            Chào mừng đến với
          </h2>
          <h1 className="text-3xl font-black bg-gradient-to-r from-[#1E88E5] to-[#F06292] bg-clip-text text-transparent">
            SpeakwithMsMy!
          </h1>
          <p className="text-slate-400 text-sm font-bold mt-1">
            Luyện nói tiếng Anh mỗi ngày 🌟
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-[2rem] shadow-xl shadow-blue-100/60 border-4 border-[#FFFDE7] p-6 space-y-4">
          {/* Name input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wide">
              Tên của con 👦👧
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Bông Bé, Tuệ Minh..."
              className="w-full px-4 py-3.5 bg-[#FFFDF6] border-2 border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-100 focus:border-amber-400 focus:outline-none text-base transition-all text-slate-700 font-bold placeholder-slate-300"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              disabled={isLoggingIn}
              autoComplete="username"
            />
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wide">
              Mật khẩu 🔑
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu..."
                className="w-full px-4 py-3.5 pr-12 bg-[#FFFDF6] border-2 border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-100 focus:border-amber-400 focus:outline-none text-base transition-all text-slate-700 font-bold placeholder-slate-300"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin(e as any)}
                disabled={isLoggingIn}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn || !name.trim() || !password}
            className="w-full py-4 bg-gradient-to-r from-[#1E88E5] to-[#42A5F5] hover:from-[#1565C0] hover:to-[#1E88E5] disabled:from-slate-300 disabled:to-slate-300 text-white rounded-full font-black text-lg transition-all shadow-lg shadow-blue-200 hover:shadow-xl active:scale-95 border-b-4 border-blue-800 disabled:border-slate-400 flex items-center justify-center gap-2 mt-2"
          >
            {isLoggingIn ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Đang vào...
              </>
            ) : (
              <>🚀 Bắt đầu học!</>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 font-bold mt-4">
          Nếu con chưa có tài khoản, hãy nhờ thầy cô tạo nhé! 💌
        </p>
      </div>
    </div>
  );
}
