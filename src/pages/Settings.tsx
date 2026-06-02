import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, 
  User, 
  Save, 
  RefreshCw, 
  Key, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Cloud, 
  Phone, 
  MapPin, 
  Mail, 
  FileText, 
  Printer, 
  Clock, 
  DollarSign, 
  ShieldCheck,
  Award,
  Calendar,
  Lock,
  Plus,
  Trash2,
  Database,
  History,
  Scale
} from "lucide-react";
import { apiService } from "../services/apiService";
import { syncService } from "../services/syncService";
import { auth, signInWithGoogle, logout } from "../lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useTheme } from "../context/ThemeContext";
import DeveloperLicensePanel from "../components/DeveloperLicensePanel";

type SettingsTab = "clinic" | "schedule" | "cloud" | "developer";

export default function Settings() {
  const { clinicName, setClinicName, doctorName, setDoctorName } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("clinic");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // General Settings
  const [specialty, setSpecialty] = useState(() => localStorage.getItem("clinicSpecialty") || "طب وزراعة الأسنان وعلاجات اللثة");
  const [phone, setPhone] = useState(() => localStorage.getItem("clinicPhone") || "07701234567");
  const [address, setAddress] = useState(() => localStorage.getItem("clinicAddress") || "");
  const [email, setEmail] = useState(() => localStorage.getItem("clinicEmail") || "");
  
  // Finance & Print
  const [defaultFee, setDefaultFee] = useState(() => localStorage.getItem("defaultFee") || "30");
  const [defaultDuration, setDefaultDuration] = useState(() => localStorage.getItem("defaultDuration") || "20");
  const [printHeader, setPrintHeader] = useState(() => localStorage.getItem("printHeader") || "");
  const [printFooter, setPrintFooter] = useState(() => localStorage.getItem("printFooter") || "");
  const [slots, setSlots] = useState<string[]>([]);
  const [newSlot, setNewSlot] = useState("");
  const [generatorStart, setGeneratorStart] = useState("09:00");
  const [generatorEnd, setGeneratorEnd] = useState("17:00");
  const [generatorInterval, setGeneratorInterval] = useState(30);

  // Security / License
  const [accessCode, setAccessCode] = useState("");
  const [sessionTimeout, setSessionTimeout] = useState(() => localStorage.getItem("sessionTimeout") || "30");
  const [licenseKey, setLicenseKey] = useState("");
  const [license, setLicense] = useState<any>(null);
  const [isActivating, setIsActivating] = useState(false);

  // Sync / Cloud
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoBackups, setAutoBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dbInfo, setDbInfo] = useState<{ path: string; isWindows: boolean } | null>(null);

  useEffect(() => {
    fetchSettings();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === "cloud") {
      fetchAutoBackups();
    }
  }, [activeTab]);

  const fetchAutoBackups = async () => {
    setLoadingBackups(true);
    try {
      const res = await apiService.getAutoBackupsList();
      if (res && res.files) {
        setAutoBackups(res.files);
      }
    } catch (err) {
      console.error("Failed to load auto-backups:", err);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (confirm(`تنبيه أمان!\n\nهل أنت متأكد من استرجاع هذا الأرشيف الإلكتروني الحفظ (${filename})؟\nسيتم استبدال سجلات المرضى والزيارات الحالية ببيانات الأرشيف المالي.`)) {
      try {
        const res = await apiService.restoreAutoBackup(filename);
        if (res && res.success) {
          alert("تم استرجاع سجلات المرضى بنجاح! سيتم الآن إعادة تحميل النظام لتفعيل التحديثات.");
          window.location.reload();
        } else {
          alert("فشلت عملية استرجاع الحفظ التلقائي.");
        }
      } catch (err) {
        console.error(err);
        alert("فشل الاتصال بالخادم.");
      }
    }
  };

  const fetchSettings = async () => {
    try {
      const codeRes = await apiService.getAccessCode();
      if (codeRes && codeRes.code) setAccessCode(codeRes.code);

      const licenseRes = await apiService.getLicenseStatus();
      setLicense(licenseRes);

      const slotsRes = await apiService.getSlots();
      if (slotsRes && Array.isArray(slotsRes)) {
        setSlots(slotsRes);
      } else if (slotsRes && slotsRes.slots) {
        setSlots(slotsRes.slots);
      } else {
        setSlots(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "13:00", "13:30", "14:00", "14:30", "15:00", "16:00"]);
      }

      try {
        const infoRes = await apiService.getDatabaseInfo();
        if (infoRes) setDbInfo(infoRes);
      } catch (e) {
        console.warn("Failed to get database details in frontend:", e);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const handleSaveClinic = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      localStorage.setItem("clinicSpecialty", specialty);
      localStorage.setItem("clinicPhone", phone);
      localStorage.setItem("clinicAddress", address);
      localStorage.setItem("clinicEmail", email);
      localStorage.setItem("defaultFee", defaultFee);
      localStorage.setItem("defaultDuration", defaultDuration);
      localStorage.setItem("printHeader", printHeader);
      localStorage.setItem("printFooter", printFooter);
      
      // Update Access Code
      await apiService.saveAccessCode(accessCode);
      localStorage.setItem("sessionTimeout", sessionTimeout);

      setMessage({ type: "success", text: "تم حفظ بيانات ومعلومات العيادة وقوالب الوصفات بنجاح" });
    } catch (err) {
      setMessage({ type: "error", text: "حدث خطأ غير متوقع أثناء حفظ الإعدادات" });
    } finally {
      setIsSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSaveSlots = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await apiService.updateSlots(slots);
      setMessage({ type: "success", text: "تم تحديث جدول فترات العمل اليومية للاستقبال بنجاح" });
    } catch (err) {
      setMessage({ type: "error", text: "فشل تحديث فترات العمل على السيرفر" });
    } finally {
      setIsSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      setMessage({ type: "error", text: "يرجى إدخال كود الترخيص أولاً" });
      return;
    }
    setIsActivating(true);
    setMessage(null);
    try {
      const res = await apiService.activateLicense(licenseKey);
      if (res && res.activated) {
        setLicense(res);
        setLicenseKey("");
        setMessage({ type: "success", text: "تمت تفعيل رخصة البرنامج والتحديثات بنجاح!" });
      } else {
        setMessage({ type: "error", text: res.message || "كود التفعيل المدخل غير صحيح" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "فشل الاتصال بخدمة التحقق من التراخيص" });
    } finally {
      setIsActivating(false);
    }
  };

  const formatSlot12h = (slot24: string) => {
    const [h, m] = slot24.split(":");
    const hours = parseInt(h, 10);
    const suffix = hours >= 12 ? "م" : "ص";
    const hours12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hours12.toString().padStart(2, '0')}:${m} ${suffix}`;
  };

  const handleAddSlot = () => {
    if (!newSlot) return;
    if (slots.includes(newSlot)) {
      alert("هذا التوقيت مضاف مسبقاً.");
      return;
    }
    const updated = [...slots, newSlot].sort();
    setSlots(updated);
    setNewSlot("");
  };

  const handleRemoveSlot = (slotToRemove: string) => {
    setSlots(slots.filter(s => s !== slotToRemove));
  };

  const handleAutoGenerateSlots = () => {
    if (!generatorStart || !generatorEnd) {
      alert("يرجى تحديد بداية ونهاية الدوام للتوليد.");
      return;
    }
    
    const [startH, startM] = generatorStart.split(":").map(Number);
    const [endH, endM] = generatorEnd.split(":").map(Number);
    
    let currentMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    
    if (currentMin >= endMin) {
      alert("وقت البداية يجب أن يكون قبل وقت النهاية.");
      return;
    }
    
    const generated: string[] = [];
    while (currentMin <= endMin) {
      const h = Math.floor(currentMin / 60);
      const m = currentMin % 60;
      const slotStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      generated.push(slotStr);
      currentMin += Number(generatorInterval);
    }
    
    if (confirm(`سيتم توليد ${generated.length} فترات حجز جديدة من ${generatorStart} إلى ${generatorEnd} كل ${generatorInterval} دقيقة.\n\nهل تريد استبدال الجدول الحالي بالجدول الجديد؟`)) {
      setSlots(generated.sort());
    }
  };

  const clearAllSlots = () => {
    if (confirm("تحذير! هل أنت متأكد من تصفير ومسح كافة فترات المواعيد والحدود الزمنية اليومية للدوام؟")) {
      setSlots([]);
    }
  };

  const applyPresetSlots = (type: "morning" | "evening" | "fullday") => {
    let preset: string[] = [];
    if (type === "morning") {
      preset = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00"];
    } else if (type === "evening") {
      preset = ["16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"];
    } else if (type === "fullday") {
      preset = [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", 
        "13:00", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
      ];
    }
    setSlots(preset);
  };

  const generateRandomCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setAccessCode(code);
  };

  const triggerCloudSync = async () => {
    if (!currentUser || currentUser.isAnonymous) return;
    setIsSyncing(true);
    setMessage(null);
    try {
      await syncService.pushToCloud(currentUser.uid);
      setMessage({ type: "success", text: "تهانينا! تمت المزامنة بنجاح ورفع كافة ملفات وبيانات المرضى للحوسبة السحابية" });
    } catch (err) {
      setMessage({ type: "error", text: "فشلت عملية المزامنة السحابية الاستثنائية" });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4" dir="rtl">
      {/* Visual Elegant Sub-Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">الإعدادات والتحكم</h1>
          <p className="text-slate-500 text-xs font-semibold mt-1">تخصيص الخيارات، أمان الملفات، إدارة قاعدة البيانات والمستندات الطبية</p>
        </div>
        {license && (
          <div className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold ${
            license.activated ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700 animate-pulse"
          }`}>
            <span>الترخيص الطبي: {license.activated ? `ساري ومتبقي ${license.daysLeft} يوم` : "منتهي الاشتراك"}</span>
          </div>
        )}
      </header>

      {/* Dynamic Toast Messaging */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${
              message.type === "success" 
                ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                : "bg-rose-50 border-rose-100 text-rose-800"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 className="text-emerald-600 shrink-0" size={18} /> : <AlertCircle className="text-rose-600 shrink-0" size={18} />}
            <span className="font-bold text-xs">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs Menu in clean Pill form representing modern apps */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl max-w-max">
        <button
          onClick={() => setActiveTab("clinic")}
          className={`px-4 py-2 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 ${
            activeTab === "clinic" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 size={15} />
          <span>هوية العيادة ومظهر المطبوعات</span>
        </button>

        <button
          onClick={() => setActiveTab("schedule")}
          className={`px-4 py-2 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 ${
            activeTab === "schedule" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Clock size={15} />
          <span>أوقات الدوام والجدولة</span>
        </button>

        <button
          onClick={() => setActiveTab("cloud")}
          className={`px-4 py-2 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 ${
            activeTab === "cloud" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Cloud size={15} />
          <span>الأمن السحابي والنسخ الاحتياطي</span>
        </button>

        {currentUser?.email === "ghanmdahmd@gmail.com" && (
          <button
            onClick={() => setActiveTab("developer")}
            className={`px-4 py-2 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 ${
              activeTab === "developer" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>بوابة المطور</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        
        {/* TAB 1: CLINIC IDENTITY & PRINTING & BASIC FINANCE */}
        {activeTab === "clinic" && (
          <div className="divide-y divide-slate-100">
            
            {/* Section A: Basic Identity */}
            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <User size={16} className="text-blue-600" />
                  المعلومات الأساسية وبيانات الطبيب
                </h3>
                <p className="text-slate-400 text-[11px] font-semibold mt-1">تُعرض هذه المعلومات في الواجهات الرئيسية وتساعد في تقديم هويتك الطبية للمرضى.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 mr-1 block">اسم المركز / العيادة</label>
                  <div className="relative">
                    <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                      type="text"
                      value={clinicName}
                      onChange={e => setClinicName(e.target.value)}
                      placeholder="مثال: مجمع عيادات الغانم للأسنان"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pr-9 pl-3 font-semibold text-slate-800 text-xs transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 mr-1 block">الطبيب المسؤول</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                      type="text"
                      value={doctorName}
                      onChange={e => setDoctorName(e.target.value)}
                      placeholder="الأستاذ د. أحمد غانم"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pr-9 pl-3 font-semibold text-slate-800 text-xs transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 mr-1 block">التخصص الطبي الدقيق</label>
                  <input 
                    type="text"
                    value={specialty}
                    onChange={e => setSpecialty(e.target.value)}
                    placeholder="مثال: طب وزراعة الأسنان، تقويم وتجميل الفكين والمحيط الفموي"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 px-3 font-semibold text-slate-800 text-xs transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 mr-1 block">رقم هاتف الاتصال والمتابعة</label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="07701234567"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pr-9 pl-3 font-semibold text-slate-800 text-xs transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 mr-1 block">العنوان والتفاصيل الجغرافية</label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="مثال: عمان، شارع الجاردنز، الطابق طبيب عيادة 4"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pr-9 pl-3 font-semibold text-slate-800 text-xs transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 mr-1 block">البريد الإلكتروني للتقارير الطبية</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="doctor@example.com"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pr-9 pl-3 font-semibold text-slate-800 text-xs transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section B: Finance defaults */}
            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <DollarSign size={16} className="text-indigo-600" />
                  السياسة المالية والجلسات التقديرية
                </h3>
                <p className="text-slate-400 text-[11px] font-semibold mt-1">تسهيل عمليات التسجيل السريع للكشفيات والمتابعات في العيادة.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 mr-1 block">رسوم الكشفية / المعاينة الافتراضية</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">JD/دولار</span>
                    <input 
                      type="number"
                      value={defaultFee}
                      onChange={e => setDefaultFee(e.target.value)}
                      placeholder="30"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 px-3 font-semibold text-slate-800 text-xs transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 mr-1 block">الوقت الافتراضي المخصص لكل مريض (بالدقائق)</label>
                  <input 
                    type="number"
                    value={defaultDuration}
                    onChange={e => setDefaultDuration(e.target.value)}
                    placeholder="20"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 px-3 font-semibold text-slate-800 text-xs transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section C: Printing Headers & Footers */}
            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Printer size={16} className="text-indigo-600" />
                  قوالب طباعة الوصفات والتقارير الطبية
                </h3>
                <p className="text-slate-400 text-[11px] font-semibold mt-1">النص العلوي والسفلي الذي يظهر في أعلى وأسفل ملفات الـ PDF المطبوعة للمرضى.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 mr-1 block">ترويسة الوثائق الرسمية (Header)</label>
                  <input 
                    type="text"
                    value={printHeader}
                    onChange={e => setPrintHeader(e.target.value)}
                    placeholder="مركز الغانم التخصصي لطب وزراعة الأسنان وعلاجات الوجه والفكين"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 px-3 font-semibold text-slate-800 text-xs transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 mr-1 block">حاشية الوصفة والتقارير (Footer)</label>
                  <input 
                    type="text"
                    value={printFooter}
                    onChange={e => setPrintFooter(e.target.value)}
                    placeholder="مواعيد العمل: السبت إلى الخميس 10 صباحاً - 8 مساءً - هاتف العيادة"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 px-3 font-semibold text-slate-800 text-xs transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save Action */}
            <div className="p-6 bg-slate-50 flex justify-end">
              <button 
                onClick={handleSaveClinic}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md text-xs disabled:opacity-50"
              >
                <Save size={15} />
                <span>{isSaving ? "جاري الحفظ..." : "حفظ التغييرات الأساسية"}</span>
              </button>
            </div>
            
          </div>
        )}

        {/* TAB 2: SCHEDULE WORKING HOURS */}
        {activeTab === "schedule" && (
          <div className="p-6 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Clock className="text-blue-600 animate-pulse" size={17} />
                  إدارة فترات الحجز ومواعيد العمل اليومية
                </h3>
                <p className="text-slate-400 text-[11px] font-semibold mt-1">تحديد وتنظيم الأوقات المتاحة لاستقبال المرضى وتنسيق المواعيد بطرق ذكية وتلقائية.</p>
              </div>
              <div className="flex items-center gap-2 font-bold text-xs bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-lg text-slate-600">
                <span>إجمالي الفترات المضافة:</span>
                <span className="bg-blue-600 text-white rounded px-2 py-0.5 text-[11px] font-black">{slots.length} فترة</span>
              </div>
            </div>

            {/* A: Quick Presets */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 mr-1 block"> تطبيق سريع لقوالب العمل الجاهزة:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => applyPresetSlots("morning")}
                  className="p-3 bg-gradient-to-br from-amber-50 to-white hover:from-amber-100 border border-amber-200/40 rounded-xl text-right transition-all shadow-sm group hover:-translate-y-0.5"
                >
                  <p className="text-xs font-black text-amber-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    الدوام الصباحي فقط
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">9:00 صباحاً - 1:00 ظهراً (نصف ساعة فواصل)</p>
                </button>

                <button
                  type="button"
                  onClick={() => applyPresetSlots("evening")}
                  className="p-3 bg-gradient-to-br from-indigo-50 to-white hover:from-indigo-100 border border-indigo-200/40 rounded-xl text-right transition-all shadow-sm group hover:-translate-y-0.5"
                >
                  <p className="text-xs font-black text-indigo-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    الدوام المسائي فقط
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">4:00 مساءً - 8:00 مساءً (نصف ساعة فواصل)</p>
                </button>

                <button
                  type="button"
                  onClick={() => applyPresetSlots("fullday")}
                  className="p-3 bg-gradient-to-br from-blue-50 to-white hover:from-blue-100 border border-blue-200/40 rounded-xl text-right transition-all shadow-sm group hover:-translate-y-0.5"
                >
                  <p className="text-xs font-black text-blue-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    الدوام الكامل المستمر
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">9:00 صباحاً - 6:00 مساءً (متواصل)</p>
                </button>
              </div>
            </div>

            {/* B: Interactive Auto Generator */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/60 p-4 md:p-6 space-y-4">
              <div>
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <RefreshCw size={13} className="text-emerald-600" />
                  أداة توليد المواعيد والتقسيم التلقائي الذكي
                </h4>
                <p className="text-slate-400 text-[10px] font-semibold mt-0.5">أدخل وقت بدء الدوام وانتهائه مع الفواصل الزمنية ليقوم النظام بتقسيم وتوزيع المواعيد تلقائياً وثوانٍ معدودة.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">بدء فترات العمل اليومي</label>
                  <input
                    type="time"
                    value={generatorStart}
                    onChange={(e) => setGeneratorStart(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">انتهاء فترات العمل اليومي</label>
                  <input
                    type="time"
                    value={generatorEnd}
                    onChange={(e) => setGeneratorEnd(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">الفترة / الوقت المخصص لكل مريض</label>
                  <select
                    value={generatorInterval}
                    onChange={(e) => setGeneratorInterval(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value={10}>كل 10 دقائق من الجلسة</option>
                    <option value={15}>كل 15 دقيقة</option>
                    <option value={20}>كل 20 دقيقة</option>
                    <option value={30}>كل 30 دقيقة (نصف ساعة - مستحسن)</option>
                    <option value={45}>كل 45 دقيقة</option>
                    <option value={60}>كل ساعة واحدة (60 دقيقة)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAutoGenerateSlots}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <RefreshCw size={13} />
                  <span>توليد وتحديث المواعيد آلياً</span>
                </button>
                <button
                  type="button"
                  onClick={clearAllSlots}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/40 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>تفريغ جدول المواعيد بالكامل</span>
                </button>
              </div>
            </div>

            {/* C: Manual slot customizer */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 mr-1 block">لم تجد توقيتاً معيناً؟ أضفه يدوياً هنا:</span>
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <input
                  type="time"
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="w-full sm:w-48 bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 font-bold text-slate-800 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm w-full sm:w-auto justify-center"
                >
                  <Plus size={14} />
                  <span>إضافة التوقيت اليدوي</span>
                </button>
              </div>
            </div>

            {/* D: Grouped current slots visually sorted with 12h labels */}
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-black text-slate-800">توزيع المواعيد المضافة حالياً في فترة الدوام:</h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">تُعرض المواعيد مرتبة ومنظمة حسب فترة اليوم (صباحاً، بعد الظهر، مساءً) لجعلها غاية في الوضوح للطاقم الطبي.</p>
              </div>

              {slots.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200/80">
                  لا توجد فترات حجز مضافة حالياً. يرجى توليدها تلقائياً بالضغط على زر المولد بالأعلى أو تطبيق القوالب الفورية.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Morning Group (before 12:00) */}
                  {(() => {
                    const morning = slots.filter((slot) => {
                      const hour = parseInt(slot.split(":")[0], 10);
                      return hour < 12;
                    });
                    if (morning.length === 0) return null;
                    return (
                      <div className="space-y-2">
                        <h5 className="text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg w-max flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          فترات الفترة الصباحية ({morning.length} مواعيد)
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {morning.map((slot) => (
                            <div
                              key={slot}
                              className="group flex items-center justify-between bg-white border border-slate-200 hover:border-blue-400 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-all"
                            >
                              <div className="flex flex-col text-right">
                                <span className="font-mono text-[9px] text-slate-400">({slot})</span>
                                <span className="text-slate-800 text-xs font-black">{formatSlot12h(slot)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(slot)}
                                className="text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                title="مسح الموعد"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Afternoon Group (12:00 to 15:59) */}
                  {(() => {
                    const afternoon = slots.filter((slot) => {
                      const hour = parseInt(slot.split(":")[0], 10);
                      return hour >= 12 && hour < 16;
                    });
                    if (afternoon.length === 0) return null;
                    return (
                      <div className="space-y-2">
                        <h5 className="text-[11px] font-black text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-lg w-max flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                          فترة بعد الظهر والظهيرة ({afternoon.length} مواعيد)
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {afternoon.map((slot) => (
                            <div
                              key={slot}
                              className="group flex items-center justify-between bg-white border border-slate-200 hover:border-blue-400 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-all"
                            >
                              <div className="flex flex-col text-right">
                                <span className="font-mono text-[9px] text-slate-400">({slot})</span>
                                <span className="text-slate-800 text-xs font-black">{formatSlot12h(slot)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(slot)}
                                className="text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                title="مسح الموعد"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Evening Group (16:00 to 23:59) */}
                  {(() => {
                    const evening = slots.filter((slot) => {
                      const hour = parseInt(slot.split(":")[0], 10);
                      return hour >= 16;
                    });
                    if (evening.length === 0) return null;
                    return (
                      <div className="space-y-2">
                        <h5 className="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg w-max flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          فترات الفترة المسائية ({evening.length} مواعيد)
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {evening.map((slot) => (
                            <div
                              key={slot}
                              className="group flex items-center justify-between bg-white border border-slate-200 hover:border-blue-400 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-all"
                            >
                              <div className="flex flex-col text-right">
                                <span className="font-mono text-[9px] text-slate-400">({slot})</span>
                                <span className="text-slate-800 text-xs font-black">{formatSlot12h(slot)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(slot)}
                                className="text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                title="مسح الموعد"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Bottom Actions for Tab 2 */}
            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSlots}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md text-xs disabled:opacity-50"
              >
                <Save size={15} />
                <span>{isSaving ? "جاري الحفظ والرفع..." : "حفظ وتثبيت جدول أوقات الدوام"}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: CLOUD SYNC & LOCAL DATABASES & ACCESS CODE */}
        {activeTab === "cloud" && (
              <div className="divide-y divide-slate-100">
                
                {/* Section A: Google Cloud Sync Explanation & Button */}
                <div className="p-6 md:p-8 space-y-6 bg-slate-50/50">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Cloud className="text-blue-600" size={17} />
                        المزامنة السحابية الذكية وحماية السجلات (Google Cloud Firestore)
                      </h3>
                      <p className="text-slate-500 text-[11px] font-semibold leading-relaxed max-w-2xl">
                        حماية عيادتك من أي فقدان لملفات المرضى أو زياراتهم. عند تفعيل الاتصال بحساب Google، سيتم حفظ ومعالجة وسحب كافة التفاصيل من خوادم قوقل السحابية المؤمنة فوراً، مما يعني عدم ضياع أي سجل حتى لو تم تحديث المنصة أو مسح بيانات المتصفح أو تبديل الأجهزة.
                      </p>
                    </div>
                  </div>

                  {!currentUser || currentUser.isAnonymous ? (
                    <div className="p-6 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-1 text-center sm:text-right">
                        <h4 className="text-xs font-black text-slate-800">بروتوكول تفعيل خادم السحاب</h4>
                        <p className="text-[11px] text-slate-400 font-semibold max-w-md">قم بربط حساب Google لتأمين الأجهزة ورفع السجلات التاريخية للعيادة فوراً وسحابياً.</p>
                      </div>
                      <button 
                        onClick={signInWithGoogle}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm text-xs w-full sm:w-auto justify-center"
                      >
                        <Globe size={15} />
                        <span>تسجيل الدخول وربط Google Cloud</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100 gap-4">
                        <div className="flex items-center gap-3">
                          <img src={currentUser.photoURL || "/default-avatar.png"} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full border border-white shadow-sm shrink-0" alt="Avatar" />
                          <div>
                            <p className="font-black text-emerald-900 text-xs">{currentUser.displayName || "الاسم غير محدد"}</p>
                            <p className="text-[10px] font-bold text-emerald-600/70">{currentUser.email}</p>
                          </div>
                        </div>
                        <button 
                          onClick={logout}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
                        >
                          <LogOut size={13} />
                          <span>قطع الاتصال والمزامنة</span>
                        </button>
                      </div>

                      <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="font-black text-xs flex items-center gap-1.5 text-emerald-900">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            الحفظ السحابي التلقائي والآمن نشط الآن (Cloud Active)
                          </h4>
                          <p className="text-[11px] font-semibold text-emerald-700 leading-relaxed">
                            كل إضافة لملف مريض، موعد، كشفيات أو جلسة أسنان جديدة يتم حفظها مباشرة على خادم جوجل مشفرة وآمنة تماماً، مما يحميك بنسبة 100% من ضياع معلومات المرضى عند أي تحديث للمواقع أو الخوادم.
                          </p>
                        </div>
                        <button 
                          onClick={triggerCloudSync}
                          disabled={isSyncing}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-4 py-2 rounded-lg flex items-center gap-1 shadow-sm shrink-0 transition-all disabled:opacity-50"
                        >
                          <RefreshCw className={isSyncing ? "animate-spin" : ""} size={13} />
                          <span>{isSyncing ? "جاري الرفع..." : "مزامنة اللحظة الحالية"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Database Folder Location Info on Hard Drive */}
                {dbInfo && (
                  <div className="mx-6 md:mx-8 mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/70 flex flex-col justify-between items-start gap-4">
                    <div className="space-y-1.5 w-full">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-900">
                        <Database size={11} />
                        حفظ تجمّعي فوري على القرص الصلب (Hard Disk Storage)
                      </span>
                      <h4 className="text-xs font-black text-slate-800 mt-1">موقع حفظ البيانات وملفات قواعد البيانات الفعلي على حاسوبك الشخصي:</h4>
                      <div className="bg-white/80 p-3 rounded-lg border border-slate-200/60 font-mono text-xs text-slate-800 text-left overflow-x-auto break-all">
                        {dbInfo.path}
                      </div>
                      <p className="text-slate-500 text-[10px] font-bold leading-relaxed">
                        جميع سجلات العيادة، المرضى، والمواعيد محفوظة بدقة وأمان تام داخل هذا المجلد على جهازك. يمكنك أخذ نسخة احتياطية من المجلد ونقله لقرص خارجي أو فلاش ميموري (Flash Memory) متى شئت لضمان عدم ضياع أي سجل للعيادة مطلقاً.
                      </p>
                    </div>
                  </div>
                )}

                {/* Section B: Local Backup Manual Downloader & Imports */}
                <div className="p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Database size={16} className="text-indigo-600" />
                  أدوات النسخ الاحتياطي اليدوي (.db)
                </h3>
                <p className="text-slate-400 text-[11px] font-semibold mt-1">تنزيل وتصدير واستيراد ملفات قواعد البيانات المحلية يدوياً للأرشفة على حاسوبك الشخصي.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { filename: "patients.db", label: "سجلات المرضى الأساسية" },
                  { filename: "appointments.db", label: "جدول المواعيد والحجوزات" },
                  { filename: "visits.db", label: "تفاصيل الجلسات والزيارات والروشتات" }
                ].map((dbFile) => (
                  <div key={dbFile.filename} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-between space-y-3">
                    <div>
                      <span className="font-mono text-[9px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">{dbFile.filename}</span>
                      <h4 className="font-bold text-slate-800 text-xs mt-2">{dbFile.label}</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button 
                        onClick={() => apiService.downloadDatabase(dbFile.filename)}
                        className="py-1.5 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-all"
                      >
                        <Save size={12} />
                        <span>تنزيل</span>
                      </button>

                      <label className="py-1.5 bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-600 text-slate-600 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all">
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".db"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (confirm(`هل أنت متأكد من استيراد ملف (${dbFile.filename})؟ البيانات الحالية سيتم استبدالها كلياً بدقة.`)) {
                                try {
                                  await apiService.restoreDatabase(dbFile.filename, file);
                                  alert("تم الاستيراد بنجاح! سيتم الآن إجراء تحديث لضمان إبقاء السجل نشطاً.");
                                  window.location.reload();
                                } catch (err) {
                                  alert("حدث خطأ في قراءة ملف قاعدة البيانات.");
                                }
                              }
                            }
                          }}
                        />
                        <RefreshCw size={12} />
                        <span>استيراد</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-[11px] text-slate-500 font-semibold text-center sm:text-right">حفظ شامل بنقرة واحدة لتنزيل كافة ملفات وسجلات العيادة دفعة واحدة لحفظها بالكمبيوتر</span>
                <button 
                  onClick={() => {
                    ["patients.db", "appointments.db", "visits.db", "settings.db", "invites.db"].forEach((file, index) => {
                      setTimeout(() => {
                        apiService.downloadDatabase(file);
                      }, index * 500);
                    });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all w-full sm:w-auto justify-center"
                >
                  <span>حفظ أرشيف النسخ الاحتياطي كاملاً (.db)</span>
                  <Save size={14} />
                </button>
              </div>

              {/* Cloud Sync & Hybrid Mode Management Panel */}
              <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/40 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 mt-6">
                <div className="space-y-1 text-center md:text-right">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100/80 text-teal-800">
                    <Cloud size={10} className="animate-pulse" />
                    المزامنة الثنائية نشطة (محلي + سحابي)
                  </span>
                  <p className="text-xs font-black text-slate-800">تزامن وتكامل البيانات الفوري مع خادم Firestore السحابي</p>
                  <p className="text-slate-500 text-[10px] font-bold">بشكل تلقائي، يتم حفظ وتحديث كافة بيانات العيادة (المرضى، المواعيد، الزيارات) في السيرفر السحابي والملف المحلي معاً. اضغط على زر التحميل إذا كنت ترغب في تنزيل التحديثات السحابية للعمل أوفلاين.</p>
                </div>
                <button 
                  onClick={async () => {
                    try {
                      const btn = document.getElementById("cloud-sync-btn");
                      if (btn) btn.setAttribute("disabled", "true");
                      const res = await apiService.syncCloudToLocal();
                      alert(res.message || "تمت مزامنة البيانات وتحديث الحفظ المحلي بالكامل!");
                      window.location.reload();
                    } catch (err: any) {
                      alert(err.message || "فشلت المزامنة السحابية.");
                    } finally {
                      const btn = document.getElementById("cloud-sync-btn");
                      if (btn) btn.removeAttribute("disabled");
                    }
                  }}
                  id="cloud-sync-btn"
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all w-full md:w-auto justify-center cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '4s' }} />
                  <span>تنزيل ومزامنة السيرفر السحابي</span>
                </button>
              </div>
            </div>

            {/* Section C: Auto historical snapshot archives */}
            {autoBackups.length > 0 && (
              <div className="p-6 md:p-8 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <History className="text-amber-500" size={16} />
                    سجل لقطات الأرشفة التلقائية التاريخية (خلفية الخادم)
                  </h3>
                  <p className="text-slate-400 text-[11px] font-semibold mt-1">يقوم النظام تلقائياً وبانتظام بإنشاء لقطة أمان شاملة لقاعدة البيانات في الخلفية بهدف حمايتك من فقدان البيانات.</p>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-black border-b border-slate-100">
                        <th className="p-3">تسمية الملف التاريخي</th>
                        <th className="p-3">الحجم</th>
                        <th className="p-3">تاريخ الحفظ التلقائي</th>
                        <th className="p-3 text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                      {autoBackups.map((file) => (
                        <tr key={file.name} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-mono text-indigo-600">{file.name}</td>
                          <td className="p-3 text-slate-500">{file.size}</td>
                          <td className="p-3 text-slate-500">
                            {new Date(file.time).toLocaleString('ar-JO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => apiService.downloadAutoBackup(file.name)}
                                className="px-2 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-[10px] font-black tracking-wide shadow-sm flex items-center gap-1 transition-all"
                              >
                                <Save size={12} />
                                <span>تحميل</span>
                              </button>
                              <button 
                                onClick={() => handleRestoreBackup(file.name)}
                                className="px-2 py-1.5 bg-white border border-slate-200 text-amber-600 hover:bg-amber-50 rounded-lg text-[10px] font-black tracking-wide shadow-sm flex items-center gap-1 transition-all"
                              >
                                <RefreshCw size={12} />
                                <span>استرجاع</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section D: Team security PIN and session rules */}
            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Lock className="text-blue-600" size={16} />
                  كود الدخول السريع للطاقم وأمان الجلسة
                </h3>
                <p className="text-slate-400 text-[11px] font-semibold mt-1">يُشغل هذا الرمز الموحد للأطباء والمساعدين إمكانية ولوج المنصة مباشرة دون كتابة اسم مستخدم/كلمة مرور ثقيلة.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">كود الدخول الموحد للعيادة (6 أرقام)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      maxLength={6}
                      value={accessCode}
                      onChange={e => setAccessCode(e.target.value)}
                      placeholder="XXXXXX"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-lg font-mono font-black text-center text-slate-800 focus:border-amber-500 focus:bg-white transition-all"
                    />
                    <button 
                      onClick={generateRandomCode}
                      className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                      title="توليد كود عشوائي"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">صلاحية إنهاء الجلسة ومستوى الأمان (في حال الخمول)</label>
                  <select 
                    value={sessionTimeout}
                    onChange={e => setSessionTimeout(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 px-3 font-semibold text-slate-800 text-xs transition-all"
                  >
                    <option value="15">إنهاء تلقائي بعد 15 دقيقة خمول</option>
                    <option value="30">إنهاء تلقائي بعد 30 دقيقة خمول</option>
                    <option value="60">إنهاء تلقائي بعد ساعة واحدة</option>
                    <option value="120">إنهاء تلقائي بعد ساعتين خمول</option>
                    <option value="240">إبقاء الجلسة مفتوحة بدون حد أقصى للوقت</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section E: Software Licenses */}
            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-500" size={17} />
                  إدارة تراخيص البرنامج وتثبيت الصلاحية
                </h3>
                <p className="text-slate-400 text-[11px] font-semibold mt-1">تجديد رخصة الاستعمال وتحديث وتمديد فترة الاتصال والاشتراك السنوي للعيادة.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold">نوع الرخصة الفعالة</span>
                    <h4 className="text-xs font-black text-slate-800 mt-1">النسخة التخصصية الكاملة للاستقبال</h4>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-bold">حالة التفعيل:</span>
                    {license?.activated ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-black rounded-lg text-[9px]">نشط مفعل</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-600 font-black rounded-lg text-[9px]">غير نشط</span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">أدخل كود الترخيص الطبي الجديد (License Key)</label>
                    <input 
                      type="text"
                      value={licenseKey}
                      onChange={e => setLicenseKey(e.target.value)}
                      placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 px-3 font-mono text-xs font-black text-slate-800 tracking-wider"
                    />
                  </div>
                  <button 
                    onClick={handleActivateLicense}
                    disabled={isActivating}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isActivating ? (
                      <>
                        <RefreshCw className="animate-spin" size={13} />
                        <span>جاري التحقق وتطبيق الرخصة...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        <span>تأكيد وتفعيل مفتاح الرخصة الآن</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Save Action */}
            <div className="p-6 bg-slate-50 flex justify-end">
              <button 
                onClick={handleSaveClinic}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md text-xs disabled:opacity-50"
              >
                <Save size={15} />
                <span>{isSaving ? "جاري الحفظ..." : "حفظ التغييرات الأمنية"}</span>
              </button>
            </div>

          </div>
        )}

        {/* TAB 4: DEVELOPER GATEWAY */}
        {activeTab === "developer" && currentUser?.email === "ghanmdahmd@gmail.com" && (
          <div className="p-6 md:p-8">
            <DeveloperLicensePanel />
          </div>
        )}

      </div>
    </div>
  );
}
