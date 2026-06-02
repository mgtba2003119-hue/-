import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Cpu, Sparkles, Key, Copy, Check, Lock, Unlock, 
  RefreshCw, AlertCircle, CalendarRange, Share2 
} from "lucide-react";
import { apiService } from "../services/apiService";

export default function DeveloperLicensePanel() {
  const [pin, setPin] = useState(() => sessionStorage.getItem("developer_pin") || "");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Key Generation State
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [generatedKey, setGeneratedKey] = useState<string>("");
  const [keyList, setKeyList] = useState<any[]>([]);
  const [copySuccess, setCopySuccess] = useState<string>("");

  useEffect(() => {
    if (pin) {
      handleVerify(null, pin);
    }
  }, []);

  const handleVerify = async (e: React.FormEvent | null, providedPin?: string) => {
    if (e) e.preventDefault();
    const activePin = providedPin || pin;
    if (!activePin) return;

    setLoading(true);
    setError("");
    try {
      const res = await apiService.verifyDeveloperPin(activePin);
      if (res.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem("developer_pin", activePin);
        fetchGeneratedKeys(activePin);
      } else {
        setError(res.error || "رمز المرور خاطئ!");
        setIsAuthenticated(false);
      }
    } catch (err) {
      setError("فشل الاتصال بخادم التراخيص المحلي");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneratedKeys = async (activePin: string) => {
    try {
      const res = await apiService.getDeveloperKeys(activePin);
      if (res && res.keys) {
        setKeyList(res.keys);
      }
    } catch (err) {
      console.error("فشل جلب مفاتيح الترخيص السابقة", err);
    }
  };

  const handleGenerateKey = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiService.generateDeveloperKey(pin, selectedDays);
      if (res.success && res.key) {
        setGeneratedKey(res.key.key);
        setSuccess("تم توليد مفتاح تفعيل فريد بنجاح!");
        fetchGeneratedKeys(pin);
      } else {
        setError(res.error || "فشل توليد مفتاح التنشيط");
      }
    } catch (err) {
      setError("حدث خطأ أثناء الاتصال لتوليد الترخيص");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(""), 1500);
  };

  const handleLogoutDeveloper = () => {
    setIsAuthenticated(false);
    setPin("");
    sessionStorage.removeItem("developer_pin");
    setGeneratedKey("");
    setKeyList([]);
  };

  // Pre-formatted messages for WhatsApp
  const getWhatsAppMessage = (key: string, days: number) => {
    const title = days === 7 ? "كود التفعيل التجريبي المجاني (أسبوع)" : "كود الترخيص الطبي السنوي (سنة كاملة)";
    const durationText = days === 7 ? "7 أيام تجريبية مجانية بالكامل" : "365 يوم تفعيل مدفوع للعيادة";
    const appUrl = window.location.origin;

    const text = `أهلاً دكتور،
يسرني تزويدك بكود التنشيط الخاص بك لتشغيل منصة *الغانم Clinic* لإدارة عيادات الأسنان:

🔑 *كود التنشيط الخاص بك:*
\`\`\`${key}\`\`\`

📋 *نوع الاشتراك:* ${title}
🕒 *الصلاحية:* تفعيل فوري لـ ${durationText} بدءاً من تاريخ التنشيط داخل البرنامج.

💻 *رابط الوصول المنصة:*
${appUrl}

في حال وجود أي استفسار يسعدنا دائماً خدمتك! 🦷🩺`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-8" dir="rtl">
      
      {/* 1. Unauthorized Verification Gateway */}
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[2rem] p-8 md:p-10 border border-slate-200/60 shadow-lg max-w-lg mx-auto space-y-6 text-center"
          >
            <div className="w-20 h-20 bg-slate-900 text-amber-400 rounded-[1.8rem] flex items-center justify-center mx-auto shadow-inner">
              <Lock size={36} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">بوابة مطور ومزود النظام المعتمد</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                هذا القسم مخصص حصرياً للمطور وممولي عيادات الأسنان لتوليد وإحصاء رموز الاشتراك الطبي المفتوحة والمحدودة (السرية).
              </p>
            </div>

            <form onSubmit={e => handleVerify(e)} className="space-y-4 pt-2">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-black text-slate-600 mr-1.5">الرمز السري الرئيسي للمطور (Access PIN)</label>
                <div className="relative">
                  <input
                    required
                    type="password"
                    placeholder="•••••••••••••••"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 font-mono text-center text-lg focus:border-slate-900 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <>
                    <Unlock size={16} className="text-amber-400" />
                    <span>تأكيد الهوية وفتح البوابة</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          /* 2. Authorized Developer Actions */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            {/* Header section with logout */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900 text-white p-6 rounded-[2rem] border border-slate-800 shadow-xl gap-4">
              <div className="flex items-center gap-4 text-center sm:text-right">
                <div className="w-14 h-14 bg-slate-850 text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                  <Cpu size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">بوابة المطور الحية: توليد التراخيص</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">المنصة مفتوحة لتصميم عروض الأسبوع المجاني والتراخيص السنوية</p>
                </div>
              </div>

              <button
                onClick={handleLogoutDeveloper}
                className="px-5 py-2.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 rounded-xl font-bold text-xs border border-slate-700 hover:border-rose-900 transition-all"
              >
                خروج من بوابة المطور
              </button>
            </div>

            {/* Main generation workstation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Box 1: Generation inputs */}
              <div className="lg:col-span-1 bg-white p-6 rounded-[1.8rem] border border-slate-200/60 shadow-sm space-y-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h4 className="font-black text-slate-900 flex items-center gap-2">
                      <Sparkles className="text-amber-500 animate-pulse" size={20} />
                      توليد رخصة جديدة للعيادة
                    </h4>
                    <p className="text-slate-400 text-[10px] font-semibold mt-1">حدد فترة الترخيص المعطاة واكبس توليد لإنشاء رمز تشفير فريد</p>
                  </div>

                  {/* Period Selection cards */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-600 block mr-1">الفترة الزمنية المطلوبة</label>
                    <div className="grid grid-cols-1 gap-3">
                      
                      {/* Option 1: 7 days free trial */}
                      <button
                        type="button"
                        onClick={() => setSelectedDays(7)}
                        className={`p-4 rounded-2xl text-right border-2 transition-all flex justify-between items-center ${
                          selectedDays === 7 
                            ? "bg-blue-50/50 border-blue-500 shadow-xs" 
                            : "bg-slate-50 border-slate-150 hover:bg-slate-100/50"
                        }`}
                      >
                        <div>
                          <p className={`font-black text-xs ${selectedDays === 7 ? "text-blue-900" : "text-slate-700"}`}>أسبوع مجاني (Trial)</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-bold">لإعطاء فترات فحص مجانية لأطباء جدد</p>
                        </div>
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selectedDays === 7 ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300"
                        }`}>
                          {selectedDays === 7 && <Check size={12} className="stroke-[3]" />}
                        </span>
                      </button>

                      {/* Option 2: 1 year subscription */}
                      <button
                        type="button"
                        onClick={() => setSelectedDays(365)}
                        className={`p-4 rounded-2xl text-right border-2 transition-all flex justify-between items-center ${
                          selectedDays === 365 
                            ? "bg-emerald-50/50 border-emerald-500 shadow-xs" 
                            : "bg-slate-50 border-slate-150 hover:bg-slate-100/50"
                        }`}
                      >
                        <div>
                          <p className={`font-black text-xs ${selectedDays === 365 ? "text-emerald-955" : "text-slate-700"}`}>سنة كاملة (الاشتراك السنوي)</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-bold">للبيع الفردي أو استلام المستحقات المالية</p>
                        </div>
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selectedDays === 365 ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"
                        }`}>
                          {selectedDays === 365 && <Check size={12} className="stroke-[3]" />}
                        </span>
                      </button>

                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-6 lg:mt-0">
                  <button
                    onClick={handleGenerateKey}
                    disabled={loading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Key size={16} className="text-amber-400" />
                    <span>إنشاء الكود وتشفيره الآن</span>
                  </button>
                </div>
              </div>

              {/* Box 2: Generated outputs */}
              <div className="lg:col-span-2 space-y-6">
                
                {generatedKey && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-slate-900 rounded-[1.8rem] border border-slate-800 text-white space-y-4 shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">الكود جاهز للإرسال</span>
                        <h4 className="font-extrabold text-sm mt-1">كود التنشيط الفريد للمريض/الطبيب</h4>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(generatedKey, "gen-key")}
                          className="p-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-350 transition-all flex items-center gap-1.5 text-xs font-bold"
                          title="نسخ كود الترخيص"
                        >
                          {copySuccess === "gen-key" ? <Check className="text-emerald-400" size={14} /> : <Copy size={14} />}
                          <span>{copySuccess === "gen-key" ? "تم نسخ الكود!" : "نسخ لليحافظة"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-center py-6 bg-slate-950/80 rounded-2xl border border-slate-850 font-mono text-2xl tracking-widest font-extrabold text-emerald-400 select-all">
                      {generatedKey}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center p-3 bg-slate-850 rounded-xl border border-slate-800 gap-3">
                      <div className="flex gap-2 text-right">
                        <CalendarRange className="text-slate-400 shrink-0 self-center" size={18} />
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold">امتداد الصلاحية</p>
                          <p className="text-xs font-black text-slate-200">صلاحية التنشيط تعادل {selectedDays} يوم كامل عند الإدخال</p>
                        </div>
                      </div>
                      
                      <a
                        href={getWhatsAppMessage(generatedKey, selectedDays)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                      >
                        <Share2 size={14} />
                        <span>إرسال كرسالة ترحيبية عبر WhatsApp دكتور</span>
                      </a>
                    </div>
                  </motion.div>
                )}

                {/* Listing of generated keys */}
                <div className="bg-white p-6 rounded-[1.8rem] border border-slate-200/60 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">أرشيف الكودات الطبية المنشأة مؤخراً</h4>
                      <p className="text-slate-400 text-[10px] font-bold mt-0.5">آخر 50 مفتاح قمت بتوليده للدكاترة والزملاء</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">العدد الإجمالي: {keyList.length} كود</span>
                  </div>

                  {keyList.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      <Key className="mx-auto text-slate-300 opacity-60 mb-2" size={32} />
                      <p className="font-bold">لم تقم بتوليد أي كودات تفعيل حالياً.</p>
                      <p className="text-[10px] mt-1">اختر الفترة من القائمة الجانبية لتوليد مفتاحك الأول.</p>
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
                      {keyList.map((item: any, idx: number) => {
                        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar-JO') : "غير معلووم";
                        const isTrial = item.type === "trial";
                        
                        return (
                          <div 
                            key={idx} 
                            className="p-3 bg-slate-50 border border-slate-150 rounded-xl hover:bg-slate-100 hover:border-slate-200 transition-all flex flex-col sm:flex-row justify-between items-center gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                isTrial 
                                  ? "bg-blue-50 text-blue-600 border-blue-100" 
                                  : "bg-emerald-50 text-emerald-600 border-emerald-100"
                              }`}>
                                <Key size={14} />
                              </div>
                              <div className="text-right">
                                <p className="font-mono font-black text-slate-800 select-all">{item.key}</p>
                                <div className="flex gap-1.5 items-center mt-1 text-[10px] text-slate-400 font-bold">
                                  <span className={isTrial ? "text-blue-600" : "text-emerald-600"}>
                                    {isTrial ? "نسخة تجريبية 7 أيام" : "نسخة سنوية 365 يوم"}
                                  </span>
                                  <span>•</span>
                                  <span>توليد: {dateStr}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                              <button
                                onClick={() => handleCopy(item.key, `list-key-${idx}`)}
                                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-600 transition-all flex items-center gap-1.5"
                                title="نسخ الكود"
                              >
                                {copySuccess === `list-key-${idx}` ? (
                                  <>
                                    <Check className="text-emerald-500" size={13} />
                                    <span className="text-[10px] font-bold text-emerald-600">منسوخ!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={13} />
                                    <span className="text-[10px] font-bold">نسخ الكود</span>
                                  </>
                                )}
                              </button>

                              <a
                                href={getWhatsAppMessage(item.key, item.days)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-emerald-50 border border-emerald-100 hover:bg-emerald-105 text-emerald-600 rounded-lg transition-all"
                                title="مشاركة الكود السريع للواتساب"
                              >
                                <Share2 size={13} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
