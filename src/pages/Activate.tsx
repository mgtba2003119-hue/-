import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, ShieldAlert, Key, Loader2, Globe, Cpu, Sparkles } from "lucide-react";
import { apiService } from "../services/apiService";
import DeveloperLicensePanel from "../components/DeveloperLicensePanel";

export default function Activate({ onActivated }: { onActivated: () => void }) {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showDevPortal, setShowDevPortal] = useState(false);
  const [devClicks, setDevClicks] = useState(0);

  const isUrlDev = new URLSearchParams(window.location.search).get("dev") === "true";

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await apiService.getLicenseStatus();
      setStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiService.activateLicense(key);
      if (res.success) {
        if (res.user) {
          localStorage.setItem('clinic_local_user', JSON.stringify(res.user));
          setSuccess(true);
          setTimeout(() => {
            window.location.reload();
          }, 1500);
          return;
        }
        setSuccess(true);
        setTimeout(() => onActivated(), 2000);
      } else {
        setError(res.error || "مفتاح التنشيط غير صحيح أو منتهي الصلاحية!");
      }
    } catch (err) {
      setError("فشل الاتصال بالنظام المحلي");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative" dir="rtl">
      {/* Background ambient radial gradients */}
      <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="p-8 pb-0 text-center">
          <div 
            onClick={() => {
              setDevClicks(prev => {
                const next = prev + 1;
                if (next >= 5) {
                  setShowDevPortal(true);
                  return 0;
                }
                return next;
              });
            }}
            className="w-20 h-20 bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600 shadow-inner cursor-pointer"
            title="تنشيط المنصة"
          >
            {success ? <ShieldCheck size={40} className="text-emerald-500" /> : <Key size={40} />}
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">تنشيط منصة الغانم Clinic</h1>
          <p className="text-slate-500 text-xs font-semibold">أدخل مفتاح الترخيص المعتمد للوصول لكامل ميزات العيادة.</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-505 uppercase tracking-wider mr-1">مفتاح الترخيص (License Key)</label>
              <input 
                required
                type="text"
                placeholder="CF-T7-XXXX-XXXX"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center font-mono text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                value={key}
                onChange={e => setKey(e.target.value.toUpperCase())}
                disabled={loading || success}
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2 border border-red-100 font-bold"
              >
                <ShieldAlert size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={loading || success}
              className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-3 ${
                success ? "bg-emerald-500 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              {loading ? <Loader2 className="animate-spin" /> : success ? "تم التنشيط بنجاح ✓" : "تأكيد كود التفعيل"}
            </button>
          </form>

          {!success && (
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={async () => {
                  setKey("GHANM-2026");
                  setLoading(true);
                  setError("");
                  try {
                    const res = await apiService.activateLicense("GHANM-2026");
                    if (res && (res.success || res.activated)) {
                      if (res.user) {
                        localStorage.setItem('clinic_local_user', JSON.stringify(res.user));
                      }
                      setSuccess(true);
                      setTimeout(() => {
                        window.location.reload();
                      }, 1000);
                    } else {
                      setError(res.error || "فشل التفعيل التلقائي");
                    }
                  } catch (e) {
                    setError("فشل الاتصال بالخادم للتفعيل التلقائي");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full py-4 rounded-2xl font-black text-center text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 text-xs cursor-pointer active:scale-98"
              >
                <ShieldCheck size={16} />
                <span>دخول وتفعيل فوري لمطور النظام (أحمد غانم)</span>
              </button>

              <div className="pt-2">
                <a 
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `السلام عليكم، أود تفعيل منصة الغانم لطب الأسنان لدي. معرف جهازي هو:\n${status?.machineId || "Local Machine"}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 rounded-2xl font-bold text-center text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all flex items-center justify-center gap-2 border border-blue-100 text-xs"
                >
                  <Sparkles size={16} className="text-blue-500 animate-pulse" />
                  <span>طلب كود تجريبي مجاني (أسبوع)</span>
                </a>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 items-center justify-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <Cpu size={18} className="text-slate-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase leading-none">معرف الجهاز</span>
              <span className="text-[10px] font-mono text-slate-600 truncate w-full text-center mt-1 select-all">{status?.machineId || "جاري التحميل..."}</span>
            </div>
            <div className="flex flex-col gap-1 items-center justify-center p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
              <Globe size={18} />
              <span className="text-[9px] font-black uppercase leading-none">حالة المزامنة السحابية</span>
              <span className="text-[10px] text-emerald-600 font-bold mt-1">جاهز للربط</span>
            </div>
          </div>

          <p className="mt-6 text-center text-[10px] text-slate-400 leading-relaxed font-semibold">
            للحصول على مفتاح التنشيط أو تجديد الاشتراك، يرجى التواصل مع مطور المنصة. 
            <br />
            يتم تشفير وتوليد كل مفتاح ليعمل على جهازك الحالي فقط.
          </p>

          {/* Secure Developer backdoor gate link */}
          {(devClicks >= 3 || isUrlDev) && (
            <div className="text-center mt-6 pt-4 border-t border-slate-100 animate-fade-in">
              <button
                type="button"
                onClick={() => setShowDevPortal(true)}
                className="text-[10px] text-slate-400 hover:text-slate-800 transition-colors font-bold underline flex items-center justify-center gap-1 mx-auto"
              >
                <Cpu size={11} className="text-slate-400" />
                <span>بوابة مطور المنصة وتوليد التراخيص</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Developer Portal Slide-Over Modal Overlay */}
      <AnimatePresence>
        {showDevPortal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 z-50 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-50 rounded-[2.5rem] w-full max-w-4xl p-6 md:p-10 relative shadow-2xl border border-slate-200"
            >
              {/* Close Button */}
              <button 
                type="button"
                onClick={() => {
                  setShowDevPortal(false);
                  fetchStatus(); // Re-read status
                }}
                className="absolute top-6 left-6 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 w-10.5 h-10.5 rounded-full flex items-center justify-center shadow-md font-bold text-sm transition-all hover:scale-105"
              >
                ✕
              </button>
              
              <div className="mt-4">
                <DeveloperLicensePanel />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
