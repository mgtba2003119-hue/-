import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Sparkles, Stethoscope, LogIn } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState("");
  const { user, loginLocally, loginWithGoogle, loginWithCode, error } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    await loginWithGoogle();
    setIsLoggingIn(false);
  };

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode) return;
    setIsLoggingIn(true);
    await loginWithCode(accessCode);
    setIsLoggingIn(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[3rem] border border-slate-200 p-10 shadow-2xl shadow-blue-100/50 text-right"
      >
        <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-blue-200">
          <Stethoscope size={48} />
        </div>
        
        <h1 className="text-4xl font-black text-slate-900 mb-2 text-center">الغانم clinic</h1>
        <p className="text-slate-500 mb-10 text-center font-bold">مرحباً بك في نظام عيادتك الذكي</p>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm leading-relaxed text-right">
            <p className="font-bold mb-1 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {error.includes("كود") ? "خطأ في الكود" : "مشكلة في الدخول"}
            </p>
            <p className="text-xs text-center">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Access Code Login - PROMINENT */}
          <form onSubmit={handleCodeLogin} className="space-y-3">
             <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">الدخول عبر كود الطاقم</label>
             <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="أدخل الكود الخاص (مثلاً: 1234)"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-center font-black text-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
                <button 
                  type="submit"
                  disabled={isLoggingIn || !accessCode}
                  className="bg-blue-600 text-white px-6 rounded-2xl font-black hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  <LogIn size={24} />
                </button>
             </div>
          </form>

          <div className="relative py-4">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
             <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-bold tracking-widest leading-none translate-y-[-2px]">أو اختر طريقة أخرى</span></div>
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full bg-white border-2 border-slate-100 text-slate-700 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:border-blue-600 hover:text-blue-600 transition-all flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="google" />
            <span>تسجيل الدخول عبر جوجل</span>
          </button>

          <button
            onClick={loginLocally}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-200"
          >
            <span>دخول سريع كمسؤول (محلي)</span>
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-50 text-center">
           <p className="text-[10px] text-slate-400 font-bold leading-relaxed px-4">
            تنبيه: يمكنك الحصول على "الكود الخاص" من مدير النظام في صفحة الإعدادات.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
