import React, { useState } from "react";
import { AlertCircle, LogIn, Loader2 } from "lucide-react";
import { supabase } from "./lib/supabase";

export default function LoginScreen({ setProfile, user }: { setProfile: (p: any) => void; user: any }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
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

    const role = trimmedName.toLowerCase() === "my admin" ? "teacher" : "student";

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
              throw new Error("Tên này đã được đăng ký. Sai mật khẩu! Vui lòng thử lại.");
            }
            profileData = {
              ...existingUser,
              auth_user_id: user.id,
              password: password,
              updated_at: new Date().toISOString(),
            };
            const { error: dbError } = await supabase
              .from("profiles")
              .update({
                auth_user_id: user.id,
                password: password,
                updated_at: profileData.updated_at,
              })
              .eq("id", existingUser.id);
            if (dbError) throw dbError;
          } else {
            const newProfile = {
              auth_user_id: user.id,
              name: trimmedName,
              role: role,
              password: password,
              updated_at: new Date().toISOString(),
            };
            const { data: inserted, error: dbError } = await supabase
              .from("profiles")
              .insert(newProfile)
              .select()
              .single();
            if (dbError?.code === "23505") {
              throw new Error("Tên này đã được người khác sử dụng. Vui lòng chọn tên khác.");
            }
            if (dbError) throw dbError;
            profileData = inserted;
          }
          return profileData;
        };

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Lỗi mạng: Thời gian kết nối quá lâu. Vui lòng thử lại!")),
            8000,
          ),
        );

        const profileData = await Promise.race([dbOperation(), timeoutPromise]);
        localStorage.setItem("english_record_profile_id", (profileData as any).id);
        setProfile(profileData);
      } else {
        setError("Hệ thống đang khởi tạo bảo mật. Vui lòng đợi 3 giây và bấm Đăng nhập lại.");
      }
    } catch (err: any) {
      console.error("Lưu thông tin đăng nhập thất bại:", err);
      setError(err.message || "Không thể khởi tạo tài khoản trên hệ thống.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center mt-6 md:mt-16 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1E88E5] to-[#F06292]">
            Luyện Speaking với Ms My
          </span>
        </h2>
        <p className="text-slate-500 max-w-md mx-auto text-sm font-medium leading-relaxed">
          Con hãy nhập tên của mình để bắt đầu bài học nói thú vị nhé!
        </p>
      </div>

      <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-[2rem] shadow-xl shadow-pink-100/50 border-4 border-[#FFFDE7]">
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-extrabold text-slate-700 mb-2">
              Nhập Tên của con:
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Bông bé, Tuệ Minh..."
              className="w-full px-5 py-4 bg-[#FFFDF6] border-3 border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-200 focus:border-amber-400 focus:outline-none text-lg transition-all shadow-inner text-slate-700 font-bold placeholder-slate-300"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              disabled={isLoggingIn}
            />
          </div>

          <div>
            <label className="block text-sm font-extrabold text-slate-700 mb-2">
              Mật khẩu:
            </label>
            <input
              type="password"
              placeholder="Nhập mật khẩu..."
              className="w-full px-5 py-4 bg-[#FFFDF6] border-3 border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-200 focus:border-amber-400 focus:outline-none text-lg transition-all shadow-inner text-slate-700 font-bold placeholder-slate-300"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              disabled={isLoggingIn}
            />
            {error && (
              <p className="text-rose-500 text-sm mt-3 flex items-center gap-1.5 font-bold">
                <AlertCircle size={16} /> {error}
              </p>
            )}
          </div>

          <div className="pt-2 border-t-2 border-dashed border-slate-100">
            <button
              type="submit"
              disabled={isLoggingIn}
              className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-[#1E88E5] to-[#2196F3] hover:from-[#1565C0] hover:to-[#1976D2] disabled:from-slate-300 disabled:to-slate-400 text-white rounded-full font-black text-xl transition-all shadow-lg hover:shadow-xl active:scale-95 border-b-4 border-blue-800"
            >
              {isLoggingIn ? <Loader2 size={24} className="animate-spin" /> : <LogIn size={24} />}{" "}
              Đăng nhập
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
