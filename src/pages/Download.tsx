import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Smartphone, Monitor, Download, Chrome, Info, CheckCircle2, 
  Share, PlusSquare, ArrowRight, ShieldCheck, Zap, Database, RefreshCw,
  AppWindow, Laptop, Package, Terminal, Play
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function DownloadPage() {
  const navigate = useNavigate();
  const { clinicName } = useTheme();
  const [activeTab, setActiveTab] = useState<"windows" | "mobile">("windows");

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32" dir="rtl">
      {/* Top Breadcrumb & Return button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-all font-bold text-xs bg-white px-5 py-3 rounded-xl border border-slate-200/80 shadow-xs cursor-pointer align-middle"
        >
          <ArrowRight size={16} />
          <span>العودة للوحة التحكم الرئيسية</span>
        </button>
        <span className="self-start sm:self-auto text-xs font-black text-blue-600 bg-blue-50/80 px-4 py-2 rounded-xl border border-blue-100">
          دليل التثبيت والتشغيل والتطبيقات
        </span>
      </div>

      {/* Modern High-End Tab Switcher */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex gap-2 border border-slate-200/50 max-w-md mx-auto">
        <button
          onClick={() => setActiveTab("windows")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
            activeTab === "windows"
              ? "bg-white text-blue-600 shadow-md shadow-slate-205"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Monitor size={16} />
          <span>أجهزة الكمبيوتر والـ Windows</span>
        </button>
        <button
          onClick={() => setActiveTab("mobile")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
            activeTab === "mobile"
              ? "bg-white text-blue-600 shadow-md shadow-slate-205"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Smartphone size={16} />
          <span>الهواتف والتابلت (Android & iOS)</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "windows" ? (
          <motion.div
            key="windows-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            {/* Windows Hero Header */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl relative overflow-hidden border border-slate-800">
              <div className="absolute top-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 right-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-4 max-w-xl">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-300 border border-white/20">
                    <Monitor size={24} />
                  </div>
                  
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                    تثبيت {clinicName} كتطبيق رسمي مستقل على أجهزة الكومبيوتر واللابتوب (Windows App)
                  </h1>
                  <p className="text-blue-100/80 text-xs md:text-sm leading-relaxed font-semibold">
                    احصل على أفضل تجربة لعيادتك على شاشة الكومبيوتر بنظام تطبيق كامل خالي من أشرطة التصفح ومطابق للبرامج الرسمية، مع أيقونة على سطح المكتب وشريط المهام وبدء تشغيل فوري تلقائي!
                  </p>
                </div>

                <div className="flex items-center justify-center shrink-0">
                  <motion.div 
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="w-44 h-28 border-4 border-slate-800 rounded-2xl bg-slate-900/60 flex flex-col justify-between p-2 shadow-xl shrink-0"
                  >
                    <div className="flex-1 rounded-lg bg-slate-950/80 flex items-center justify-center border border-white/5 relative overflow-hidden">
                      <div className="absolute inset-0 bg-blue-500/5" />
                      <AppWindow size={32} className="text-blue-400" />
                    </div>
                    <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mt-2" />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Core Advantages Grid for Laptop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs hover:shadow-sm transition-all text-center">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <AppWindow size={18} />
                </div>
                <h4 className="font-extrabold text-xs text-slate-850">مظهر رسمي كامل</h4>
                <p className="text-[11px] text-slate-400 font-bold mt-1">يعمل في نافذة مستقلة أنيقة وبدون عرض شريط روابط للمتصفح لتوفير مساحة عمل كاملة واحترافية.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs hover:shadow-sm transition-all text-center">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={18} />
                </div>
                <h4 className="font-extrabold text-xs text-slate-850">اختصارات سطح المكتب</h4>
                <p className="text-[11px] text-slate-400 font-bold mt-1">يُشغل النظام مباشرة بنقرة واحدة من شاشة سطح المكتب أو من قائمة ابدأ بويندوز كأي برنامج آخر.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs hover:shadow-sm transition-all text-center">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Zap size={18} />
                </div>
                <h4 className="font-extrabold text-xs text-slate-850">تزامن تلقائي فوري</h4>
                <p className="text-[11px] text-slate-400 font-bold mt-1">يرتبط بالتأريخ السحابي الموحد دون أي بطء أو تأخير، مع تخزين سريع بالذاكرة ومستوى أمان مضاعف.</p>
              </div>
            </div>

            {/* Windows Installation PWA Method - Highly Recommended */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200/80 p-8 shadow-xs md:p-10 space-y-8">
              <div>
                <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100/50">
                  الطريقة الأولى والأسرع (موصى بها بشدة)
                </span>
                <h2 className="text-lg font-black text-slate-900 border-r-4 border-blue-600 pr-3 pb-0.5 mt-4">
                  تثبيت برنامج العيادة بلمسة واحدة (عبر PWA)
                </h2>
                <p className="text-slate-400 text-xs font-semibold mt-1">
                  هذه الطريقة تحول رابط متصفحك الحالي إلى تطبيق سطح مكتب مستقل، وهي مدعومة مباشرة ومضمونة التحديث.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Step 1 */}
                <div className="space-y-3 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 hover:bg-slate-50/80 transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xl font-black text-blue-500 font-mono">01</span>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Chrome size={16} />
                    </div>
                  </div>
                  <h4 className="font-black text-xs text-slate-800">تأكد من استخدام Chrome أو Edge</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    افتح هذا الرابط الحالي للعيادة من خلال متصفح <span className="text-blue-600 font-black">Google Chrome</span> أو متصفح <span className="font-black text-indigo-600">Microsoft Edge</span> على كمبيوترك.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="space-y-3 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 hover:bg-slate-50/80 transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xl font-black text-blue-500 font-mono">02</span>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Download size={16} />
                    </div>
                  </div>
                  <h4 className="font-black text-xs text-slate-800">اضغط على أيقونة التثبيت الفوري</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    انظر إلى شريط العنوان (في الأعلى بجوار النجمة المفضلة)، ستلاحظ ظهور أيقونة شاشة كمبيوتر صغيرة وبها سهم للأسفل تسمى <span className="font-black">"تثبيت التطبيق"</span>. اضغط عليها واقبل التثبيت.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="space-y-3 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 hover:bg-slate-50/80 transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xl font-black text-blue-500 font-mono">03</span>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <AppWindow size={16} />
                    </div>
                  </div>
                  <h4 className="font-black text-xs text-slate-800">الآن ولديك تطبيق رسمي كامل!</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    سيقفل المتصفح وتفتح العيادة تلقائياً في نافذة مستقلة فخمة خالية تماماً من الروابط، وتظهر أيقونة العيادة بجمالية على شاشة سطح مكتبك وفي الأسفل أيضاً!
                  </p>
                </div>
              </div>

              {/* Interactive Help Box */}
              <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-100">
                <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-105 px-2 py-1 rounded-md">تعليمات بديلة سريعة</span>
                <p className="text-[11px] text-slate-600 leading-relaxed font-semibold mt-2.5">
                  إذا لم تلاحظ الأيقونة في شريط العنوان، اضغط ببساطة على زر الخيارات الثلاث في أعلى يمين المتصفح <span className="font-black">⋮</span> (أو <span className="font-black">...</span> في Edge)، ثم اختر <span className="text-blue-650 font-black">"تثبيت ClinicFlow"</span> أو اختر <span className="font-black">"التطبيقات (Apps)"</span> ثُم <span className="text-blue-650 font-black">"تثبيت هذا الموقع كتطبيق (Install this site as an app)"</span>.
                </p>
              </div>
            </div>

            {/* Offline Native Application Electron Setup for Clinicians */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200/80 p-8 shadow-xs md:p-10 space-y-8">
              <div>
                <span className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-205/50">
                  الطريقة الثانية (لتشغيل تطبيق أوفلاين محلي بالكامل)
                </span>
                <h2 className="text-lg font-black text-slate-900 border-r-4 border-slate-600 pr-3 pb-0.5 mt-4">
                  تطبيق الـ Electron المستقل للويندوز (مطورين وغرف مغلقة)
                </h2>
                <p className="text-slate-400 text-xs font-semibold mt-1">
                  المشروع يحتوي على نظام مدمج وجاهز لبناء ملف تثبيت رسمي لنظام ويندوز للتجوال والبيانات المحلية الأوفلاين.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                      <Terminal size={16} />
                    </div>
                    <h4 className="font-extrabold text-xs text-slate-800">خطوات التشغيل البرمجي على الكومبيوتر</h4>
                  </div>
                  <ol className="text-[11px] text-slate-600 space-y-3 list-decimal pr-4 font-semibold">
                    <li>تأكد من وجود برنامج <span className="font-bold">Node.js</span> مثبت على كمبيوترك الخاص.</li>
                    <li>افتح مجلد المشروع في الـ Command Prompt أو الـ PowerShell.</li>
                    <li>اكتب الأمر: <code className="bg-slate-200 text-slate-800 font-mono px-1.5 py-0.5 rounded text-[10px]">npm install</code> لتثبيت مكتبات النظام.</li>
                    <li>اكتب الأمر: <code className="bg-slate-200 text-slate-800 font-mono px-1.5 py-0.5 rounded text-[10px]">npm run build:win</code> لبناء ملف التثبيت المستقل.</li>
                  </ol>
                </div>

                <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Package size={16} />
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-800">ملف التثبيت (.exe) الناتج</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      بعد انتهاء البناء المبرمج، سينشئ النظام مجلد باسم <span className="font-black text-rose-600">release/</span> وبداخله ملف التثبيت المسمى <span className="font-black text-slate-800">"ClinicFlow Medical Setup.exe"</span>.
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      يمكنك نقله وتثبيته على أي جهاز حاسب آلي آخر مباشرة لتجربة عمل أوفلاين تامة!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="mobile-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            {/* Mobile Hero Header */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl relative overflow-hidden border border-slate-850">
              <div className="absolute top-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 right-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-4 max-w-xl">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-300 border border-white/20">
                    <Smartphone size={24} />
                  </div>
                  
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                    تثبيت منصة {clinicName} وتنزيلها كـتطبيق رسمي على هاتف Android و iOS
                  </h1>
                  <p className="text-blue-200/70 text-xs md:text-sm leading-relaxed font-semibold">
                    تم تطوير هذا النظام بأحدث تقنيات التطبيقات السريعة المتوافقة والمتجاوبة (Progressive Web App - PWA). لتجهيز المنصة على جوالك الشخصي أو التابلت الخاص بك خلال ثوانٍ وبأداء أصيل فائق السرعة وبدون حجم تخزين!
                  </p>
                </div>

                <div className="flex items-center justify-center shrink-0">
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="w-24 h-40 border-4 border-slate-800 rounded-2xl bg-slate-900/60 flex flex-col justify-between p-2 shadow-xl shrink-0"
                  >
                    <div className="w-8 h-1 bg-slate-800 rounded mx-auto" />
                    <div className="w-10 h-10 bg-blue-600 rounded-xl mx-auto flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                      <Download size={16} />
                    </div>
                    <div className="w-4 h-4 bg-slate-800 rounded-full mx-auto" />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Core Advantages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs hover:shadow-sm transition-all text-center">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Database size={18} />
                </div>
                <h4 className="font-extrabold text-xs text-slate-850">يعمل بدون إنترنت (Offline)</h4>
                <p className="text-[11px] text-slate-400 font-bold mt-1">تصفح ملفات مرضاك المسجلين والاحتياط حتى في غياب الشبكة</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs hover:shadow-sm transition-all text-center">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck size={18} />
                </div>
                <h4 className="font-extrabold text-xs text-slate-850">أمان وحماية تامة</h4>
                <p className="text-[11px] text-slate-400 font-bold mt-1">تشفير بيوميتري وشهادة SSL موثقة بالكامل لحماية الأرشيف</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs hover:shadow-sm transition-all text-center">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <RefreshCw size={18} className="animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <h4 className="font-extrabold text-xs text-slate-850">تحديثات تلقائية مجاناً</h4>
                <p className="text-[11px] text-slate-400 font-bold mt-1">يتعلم النظام ويتلقى التحسينات الإضافية في السيرفر دون الحاجة للمتجر</p>
              </div>
            </div>

            {/* Mobile Installation Guide */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200/80 p-8 shadow-xs md:p-10 space-y-8">
              <div>
                <h2 className="text-lg font-black text-slate-900 border-r-4 border-blue-600 pr-3 pb-0.5">
                  كيفية التثبيت على نظام Android (خطوة بخطوة)
                </h2>
                <p className="text-slate-400 text-xs font-semibold mt-1">يرجى قراءة الخطوات وطريقة التثبيت الآلية الفائقة المريحة</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Step 1 */}
                <div className="space-y-3 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 hover:bg-slate-50/80 transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xl font-black text-blue-500 font-mono">01</span>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Chrome size={16} />
                    </div>
                  </div>
                  <h4 className="font-black text-xs text-slate-800">افتح الرابط عبر Chrome</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    افتح متصفح الـ Chrome الرسمي على هاتف الأندرويد لديك، واكتب رابط العيادة الخاص بك في حقل البحث.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="space-y-3 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 hover:bg-slate-50/80 transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xl font-black text-blue-500 font-mono">02</span>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Share size={16} />
                    </div>
                  </div>
                  <h4 className="font-black text-xs text-slate-800">اضغط على الخيارات</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    اضغط على النقاط الثلاث الرأسية <span className="font-black">⋮</span> في أعلى يمين/يسار المتصفح لفتح قائمة الخيارات.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="space-y-3 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 hover:bg-slate-50/80 transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xl font-black text-blue-500 font-mono">03</span>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <PlusSquare size={16} />
                    </div>
                  </div>
                  <h4 className="font-black text-xs text-slate-800">اضغط "إضافة للشاشة الرئيسية"</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    ابحث عن خيار <span className="font-black text-blue-600">"إضافة إلى الشاشة الرئيسية"</span> أو <span className="font-black text-blue-600">"تثبيت التطبيق"</span> واضغط عليه للتأكيد.
                  </p>
                </div>
              </div>

              {/* Apple iOS System guide just in case */}
              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 mb-3">
                  <Info size={16} className="text-blue-500" />
                  <span>ماذا لو كان لدي نظام iPhone أو جهاز iPad؟</span>
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                  الأمر غاية في البساطة أيضاً! على أجهزة الـ Apple افتح النظام عبر متصفح <span className="font-black">Safari</span>، ثم اضغط على زر ميزة المشاركة <span className="font-bold underline">Share</span> في الأسفل، واختر <span className="font-black">"Add to Home Screen" (إضافة إلى الشاشة الرئيسية)</span> ليتثبت معك كتطبيق على الشاشة الرئيسية فوراً بأيقونة مستقلة كاملة.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final success footer advice with beautiful design */}
      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-start gap-4">
        <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5 animate-bounce" size={20} />
        <div>
          <h4 className="font-black text-xs text-emerald-900">تنبيه المظهر الرسمي ومطابقة برامج سطح المكتب</h4>
          <p className="text-[11px] text-emerald-700 leading-relaxed font-semibold mt-1">
            بمجرد قيامك بتثبيت تطبيق الـ PWA الفوري على كمبيوتر Windows أو Mac أو حتى على هاتفك الشخصي، ستعمل المنصة داخل إطار مستقل رسمي كامل وبدون عنوان URL أو شريط تبويب يشتت عينيك، مع استجابة كاملة، لتبدو المنصة كأنها برنامج مثبت محلياً على جهازك لتأدية دوركم على أكمل وجه.
          </p>
        </div>
      </div>
    </div>
  );
}
