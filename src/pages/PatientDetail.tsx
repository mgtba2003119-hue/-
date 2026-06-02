import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowRight, Phone, Mail, User, ShieldAlert, History, 
  FileText, Plus, Sparkles, Send, CheckCircle2, Activity, Printer, Download, X, Trash2, CreditCard,
  Heart, Clipboard, UserCheck, Calendar, DollarSign, RefreshCw, AlertTriangle, FileSpreadsheet, Eye, Save
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../context/ThemeContext";
import { apiService } from "../services/apiService";
import ConfirmModal from "../components/ConfirmModal";
import DentalChart from "../components/DentalChart";

const tabs = [
  { id: "visits", label: "جلسات المداواة والعلاج", icon: History },
  { id: "dental_chart", label: "مخطط الفك والصحة من الموانع", icon: Activity },
  { id: "financial", label: "الحسابات والفوترة المالية", icon: CreditCard },
];

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clinicName, doctorName } = useTheme();
  
  // Core states
  const [patient, setPatient] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("visits");
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [showPrescription, setShowPrescription] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<string | null>(null);

  // New Visit States
  const [newNote, setNewNote] = useState("");
  const [diagnosisInput, setDiagnosisInput] = useState("استشارة طبية عامة");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState("");

  // Allergy editing State
  const [chronicInput, setChronicInput] = useState("");
  const [isSavingAllergy, setIsSavingAllergy] = useState(false);

  // Financial Transaction Entry
  const [paymentAmount, setPaymentAmount] = useState("");
  const [transactionType, setTransactionType] = useState<"payment" | "charge">("payment");
  const [transactionNote, setTransactionNote] = useState("");

  // Custom Prescription Builder
  const [medications, setMedications] = useState<{name: string, dose: string, qty: string}[]>([]);
  const [currentMed, setCurrentMed] = useState({name: "", dose: "", qty: ""});

  // UI feedback notifications
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const cleanPhoneForWhatsApp = (phoneStr: string) => {
    if (!phoneStr) return "";
    let clean = phoneStr.replace(/\D/g, "");
    if (clean.startsWith("00")) {
      clean = clean.substring(2);
    }
    
    // Check if it already has Iraqi country code (964)
    if (clean.startsWith("964")) {
      return clean;
    }
    
    // Iraqi number matching:
    // 07XXXXXXXXX (starts with 07 and total length is 11) -> 9647XXXXXXXXX
    if (clean.startsWith("07") && clean.length === 11) {
      return "964" + clean.substring(1);
    }
    // 7XXXXXXXXX (starts with 7 and total length is 10) -> 9647XXXXXXXXX (e.g. 7802010233)
    if (clean.startsWith("7") && clean.length === 10) {
      return "964" + clean;
    }
    
    // Fallback for Jordanian numbers (Jordanian standard length is 10 starting with 07)
    if (clean.startsWith("07") && clean.length === 10) {
      return "962" + clean.substring(1);
    } else if (clean.startsWith("7") && clean.length === 9) {
      return "962" + clean;
    }
    
    return clean;
  };

  const buildWhatsAppMessage = () => {
    if (!patient) return "";
    
    let dentalStatusesText = "";
    if (patient.dentalChart && Object.keys(patient.dentalChart).length > 0) {
      const affectedTeeth = Object.entries(patient.dentalChart)
        .filter(([_, data]: [string, any]) => data && data.status !== "Healthy")
        .map(([toothId, data]: [string, any]) => {
          return `• السن رقم #${toothId}: *${getToothStatusLabel(data.status)}* ${data.notes ? `(${data.notes})` : ""}`;
        });
      dentalStatusesText = affectedTeeth.length > 0 
        ? affectedTeeth.join("\n") 
        : "• جميع الأسنان سليمة وبحالة ممتازة.";
    } else {
      dentalStatusesText = "• لا توجد ملاحظات على خريطة الأسنان.";
    }

    let visitLogsText = "";
    if (visits && visits.length > 0) {
      visitLogsText = visits.map((v: any, idx: number) => {
        const dateStr = v.date ? new Date(v.date).toLocaleDateString('ar-JO') : "";
        return `${idx + 1}. *تشخيص:* ${v.diagnosis || "معاينة افتراضية"}\n   - *التاريخ:* ${dateStr}\n   - *الأعراض والملاحظات:* ${v.symptoms || "لا يوجد"}${v.aiSummary ? `\n   - *التحليل الذكي:* ${v.aiSummary}` : ""}`;
      }).join("\n\n");
    } else {
      visitLogsText = "• لم يتم تسجيل أي زيارات سابقة.";
    }

    const message = `*📄 التقرير الطبي الشامل للأسنان*
*المرسل:* عيادة ${clinicName}
*الدكتور المسؤول:* د. ${doctorName}
----------------------------------
*👥 معلومات المريض:*
- *الاسم:* ${patient.name}
- *العمر:* ${patient.age} سنة
- *فصيلة الدم:* ${patient.bloodType || "غير محدد"}
- *الملف المرضي / التحسس:* ${patient.chronicDiseases || "لا يوجد أمراض مزمنة مسجلة"}

*🦷 تشخيص ومحاذاة حالة الأسنان:*
${dentalStatusesText}

*📅 التسلسل الزمني للزيارات الطبية:*
${visitLogsText}

----------------------------------
تم إرسال هذا التقرير كتوثيق رقمي لمتابعة سجلكم العلاجي. نتمنى لكم دوام الصحة والعافية! ❤️`;

    return encodeURIComponent(message);
  };

  const handlePrintAndSendWhatsApp = () => {
    if (patient && patient.phone) {
      const cleanPhone = cleanPhoneForWhatsApp(patient.phone);
      const msg = buildWhatsAppMessage();
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;
      
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      triggerNotification("success", "تم توجية التقرير الطبي مباشرة إلى رقم واتساب المريض بنجاح");
    } else {
      triggerNotification("error", "خطأ: لم نتمكن من إرسال الواتساب، رقم هاتف المريض غير مسجل!");
    }
  };

  const handleSendPrescriptionWhatsApp = () => {
    if (!patient || !patient.phone) {
      triggerNotification("error", "خطأ: لم نتمكن من إرسال الواتساب، رقم هاتف المريض غير مسجل!");
      return;
    }
    
    if (medications.length === 0) {
      triggerNotification("error", "خطأ: يرجى إضافة دواء واحد على الأقل للمسودة لكي نتمكن من إرساله!");
      return;
    }
    
    const medText = medications.map((med, idx) => {
      return `${idx + 1}. *الدواء:* ${med.name}\n   - *الجرعة:* ${med.dose}\n   - *الكمية/حجم العبوة:* ${med.qty}`;
    }).join("\n\n");
    
    const message = `🏥 *الوصفة الطبية (Rx) الرقمية للأسنان*
    
عزيزي المراجع: *${patient.name}*
العيادة: عيادة ${clinicName}
الدكتور المسؤول: د. ${doctorName}
التاريخ: ${new Date().toLocaleDateString('ar-JO')}

نرفق لكم أدناه الوصفة العلاجية الرقمية والجرعات المقررة لكم ومواعيدها:

${medText}

----------------------------------
*⚠️ إشعار وتعليمات طبية:*
يرجى الالتزام الكامل بالجرعات والأوقات المحددة من قبل الطبيب المعالج. مع تمنياتنا لكم بالشفاء والعافية العاجلة! ❤️`;

    const cleanPhone = cleanPhoneForWhatsApp(patient.phone);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    triggerNotification("success", "تم توجية الوصفة الطبية (Rx) مباشرة إلى رقم واتساب المريض بنجاح");
  };

  const handlePayment = async () => {
    if (!paymentAmount || !patient) return;
    const amount = Number(paymentAmount);
    const isPayment = transactionType === "payment";
    
    const currentBalance = Number(patient.balance || 0);
    const newBalance = isPayment 
      ? Math.max(0, currentBalance - amount)
      : currentBalance + amount;
    
    const newTransaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      amount: amount,
      type: transactionType,
      note: transactionNote || (isPayment ? "دفعة نقدية واصلة" : "رسوم إجراء طبي في العيادة"),
      balanceAfter: newBalance
    };

    const updatedTransactions = [newTransaction, ...(patient.transactions || [])];
    
    try {
      await apiService.updatePatient(patient._id || patient.id, {
        ...patient,
        balance: newBalance.toString(),
        transactions: updatedTransactions
      });
      setPatient({
        ...patient, 
        balance: newBalance.toString(),
        transactions: updatedTransactions
      });
      setPaymentAmount("");
      setTransactionNote("");
      setShowPaymentModal(false);
      triggerNotification("success", "تم توثيق المعاملة المالية وإعادة ضبط الرصيد تلقائياً");
    } catch (err) {
      console.error("Transaction error:", err);
      triggerNotification("error", "فشلت معالجة القيد المالي على النظام");
    }
  };

  const addMedication = () => {
    if (!currentMed.name) return;
    setMedications([...medications, currentMed]);
    setCurrentMed({name: "", dose: "", qty: ""});
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const getToothStatusLabel = (status: string) => {
    switch(status) {
      case "Healthy": return "سليم";
      case "Decayed": return "تسوس نخر";
      case "RootCanal": return "سحب عصب مكتمل";
      case "Missing": return "مفقود / مقلوع سابقاً";
      case "Impaction": return "مطمور في العظم";
      case "Crown": return "تلبيسة / تاج حماية";
      case "Filling": return "حشوة تجميلية";
      case "Extraction": return "يتطلب قلع جراحي";
      case "Sensitive": return "حساسية شديدة";
      default: return status;
    }
  };

  const fetchData = async () => {
    if (!id) return;
    try {
      const pData: any = await apiService.getPatient(id);
      setPatient(pData);
      setChronicInput(pData.chronicDiseases || "");
      
      const vData = await apiService.getVisits(id);
      setVisits(vData);
    } catch (err) {
      console.error("Fetch detail error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const triggerNotification = (type: "success" | "error", text: string) => {
    setSaveStatus({ type, text });
    setTimeout(() => setSaveStatus(null), 4000);
  };

  const handleAiSummarize = async () => {
    if (!newNote) return;
    setIsAiGenerating(true);
    try {
      const data = await apiService.summarize(newNote);
      setAiSummary(data.summary);
      triggerNotification("success", "تم إنشاء ملخص طبي احترافي لتقرير الحالة");
    } catch (err) {
      console.error(err);
      triggerNotification("error", "فشل تحليل الذكاء الاصطناعي السريري");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSaveVisit = async () => {
    if (!newNote || !id) {
       triggerNotification("error", "يرجى كتابة ملاحظات الكشف السريري أولاً قبل الحفظ");
       return;
    }
    try {
      await apiService.addVisit({
        patientId: id,
        symptoms: newNote,
        aiSummary: aiSummary,
        diagnosis: diagnosisInput,
      });
      setNewNote("");
      setAiSummary("");
      setDiagnosisInput("استشارة طبية عامة");
      fetchData();
      triggerNotification("success", "تم تسجيل وحفظ المراجعة الطبية بنجاح");
    } catch (err) {
      console.error(err);
      triggerNotification("error", "حدث خطأ غير متوقع أثناء حفظ الزيارة");
    }
  };

  const handleDeleteVisit = async () => {
    if (!visitToDelete) return;
    try {
      await apiService.deleteVisit(visitToDelete);
      setVisitToDelete(null);
      fetchData();
      triggerNotification("success", "تم شطب سجل الزيارة نهائياً من أرشيف المريض");
    } catch (err) {
      console.error("Failed to delete visit:", err);
      triggerNotification("error", "فشل الاتصال لحذف السجل");
    }
  };

  const handleSaveDentalChart = async (chartData: any) => {
    if (!id) return;
    try {
      await apiService.updatePatient(id, { dentalChart: chartData });
      setPatient((prev: any) => ({ ...prev, dentalChart: chartData }));
      triggerNotification("success", "تم تحديث وحفظ لقطة مخطط الأسنان بنجاح");
    } catch (err) {
      console.error("Save dental chart error:", err);
      triggerNotification("error", "فشل تخزين إعدادات مخطط الفك على السيرفر");
    }
  };

  const handleSaveChronicDiseases = async () => {
    if (!id || !patient) return;
    setIsSavingAllergy(true);
    try {
      await apiService.updatePatient(id, { ...patient, chronicDiseases: chronicInput });
      setPatient((prev: any) => ({ ...prev, chronicDiseases: chronicInput }));
      triggerNotification("success", "تم تجديد وحفظ سجل الأمراض المزمنة والحساسية بنجاح");
    } catch (err) {
      console.error("Save chronicDiseases error:", err);
      triggerNotification("error", "فشل تحديث ملف الحساسية والمحاذير الطبية");
    } finally {
      setIsSavingAllergy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-32 space-y-4" dir="rtl">
        <RefreshCw className="animate-spin text-blue-600" size={36} />
        <p className="text-slate-500 font-black text-sm">جاري جلب الملف العلاجي للمريض وتأمين اتصال الاتصال الطبي...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-16 text-center max-w-xl mx-auto space-y-4 bg-white border rounded-3xl shadow-sm z-10" dir="rtl">
        <AlertTriangle className="text-rose-500 mx-auto" size={48} />
        <h3 className="text-xl font-bold text-slate-800">بيانات غير متاحة</h3>
        <p className="text-slate-500 text-sm font-semibold">عذرًا، يبدو أن ملف المريض المطلوب لم يتم العثور عليه أو قد يكون قد تم نقله أو حذفه من النظام.</p>
        <button onClick={() => navigate("/patients")} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2">
          <ArrowRight size={14} />
          العودة لقائمة السجلات
        </button>
      </div>
    );
  }

  const teethNeedingCare = patient?.dentalChart 
    ? Object.entries(patient.dentalChart).filter(([_, data]: [string, any]) => {
        return data && ["Decayed", "RootCanal", "Extraction"].includes(data.status);
      }).length
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32 px-4" dir="rtl">
      {/* Upper Navigation & Top-tier Interactive Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <button 
          onClick={() => navigate("/patients")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all font-bold text-sm bg-white px-4 py-2 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300"
        >
          <ArrowRight size={18} />
          <span>الرجوع إلى سجل الإداري للمرضى</span>
        </button>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={() => setShowPrescription(true)}
            className="flex-1 md:flex-initial bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Printer size={16} className="text-blue-600" />
            <span>إصدار وصفة طبية (Rx)</span>
          </button>
          <button 
            onClick={() => setShowFullReport(true)}
            className="flex-1 md:flex-initial bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-100"
          >
            <FileText size={16} />
            <span>تصدير التقرير الطبي الشامل</span>
          </button>
        </div>
      </div>

      {/* Floating Save Alert Feedback */}
      <AnimatePresence>
        {saveStatus && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "p-4 rounded-2xl flex items-center gap-3 border shadow-xl max-w-xl mx-auto fixed top-6 right-6 left-6 z-50",
              saveStatus.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-rose-50 border-rose-200 text-rose-800"
            )}
          >
            {saveStatus.type === "success" ? (
              <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
            ) : (
              <AlertTriangle className="text-rose-600 shrink-0" size={20} />
            )}
            <span className="font-bold text-xs md:text-sm leading-relaxed">{saveStatus.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Clinical Vitals & Status Dashboard Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800/80">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Patient Quick Identity & Contact Badges */}
          <div className="space-y-3.5 flex-1 select-none">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black tracking-wider uppercase text-blue-200 bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-400/30">
                رقم الهوية الطبية: #{patient._id ? patient._id.slice(-6).toUpperCase() : patient.id?.slice(-6).toUpperCase() || "MED-FILE"}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                الملف السريري للأسنان: مكتمل
              </span>
              {patient.bloodType && (
                <span className="text-[10px] font-black text-rose-300 bg-rose-500/20 px-2.5 py-1 rounded-full border border-rose-400/30">
                  فصيلة الدم: {patient.bloodType}
                </span>
              )}
            </div>
            
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <span>{patient.name}</span>
                <span className="text-xs font-medium text-blue-200 bg-white/10 px-3 py-1 rounded-lg">
                  {patient.age} سنة • {patient.gender === 'Male' ? 'ذكر' : 'أنثى'}
                </span>
              </h1>
              <p className="text-blue-200/70 text-xs font-semibold">
                التصنيف العلاجي: متابعة دورية لأنسجة ودعامات الفم والأسنان الشاملة
              </p>
            </div>

            {/* Concise Integrated Contact Row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-[11px] text-blue-100 font-bold">
              <div className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10 transition-colors">
                <Phone size={12} className="text-blue-300" />
                <span className="font-mono text-white" dir="ltr">{patient.phone}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(patient.phone);
                    triggerNotification("success", "تم نسخ هاتف المريض بنجاح");
                  }}
                  className="text-[9.5px] text-blue-300 hover:text-white underline mr-1.5 font-bold cursor-pointer"
                >
                  نسخ
                </button>
              </div>

              {patient.email && (
                <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10">
                  <Mail size={12} className="text-blue-300" />
                  <span className="truncate max-w-[160px] text-white">{patient.email}</span>
                </div>
              )}

              {patient.createdAt && (
                <div className="flex items-center gap-1.5 text-blue-200/60 text-[10.5px]">
                  <Calendar size={12} className="text-blue-400/80" />
                  <span>تاريخ فتح الملف: {new Date(patient.createdAt).toLocaleDateString('ar-JO')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Dental Clinic Indicators (المؤشرات الطبية السريرية لطب الأسنان) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 xl:w-2/3 animate-fade-in">
            {/* Teeth Needing Care Widget */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl hover:bg-white/10 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-rose-300 mb-1">
                  <Activity size={14} className="text-rose-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-white/60">أسنان بحاجة لتدخل</span>
                </div>
                <p className="text-base font-black">
                  {teethNeedingCare > 0 ? `${teethNeedingCare} أسنان` : "سليمة بالكامل ✨"}
                </p>
              </div>
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                <span className="text-[9px] text-white/40">تسوس وقنوات عصب</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("dental_chart")}
                  className="text-[9px] text-rose-300 hover:underline cursor-pointer"
                >
                  تفاصيل
                </button>
              </div>
            </div>

            {/* Medical Alerts Widget */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl hover:bg-white/10 transition-all truncate flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-300 mb-1">
                  <ShieldAlert size={14} className="text-amber-400" />
                  <span className="text-[10px] font-bold text-white/60">الموانع والمحاذير</span>
                </div>
                <p className="text-xs font-black truncate text-amber-100" title={patient.chronicDiseases || "لا يوجد"}>
                  {!patient.chronicDiseases || patient.chronicDiseases.trim() === "" || patient.chronicDiseases === "لا يوجد" 
                    ? "لا يوجد موانع" 
                    : patient.chronicDiseases}
                </p>
              </div>
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                <span className="text-[9px] text-white/30">حساسية وأمراض</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("dental_chart")}
                  className="text-[9px] text-amber-300 hover:underline cursor-pointer"
                >
                  تعديل
                </button>
              </div>
            </div>

            {/* Financial Dues Widget */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl hover:bg-white/10 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-300 mb-1">
                  <DollarSign size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-white/60">الرصيد المتبقي</span>
                </div>
                <p className={cn(
                  "text-base font-black font-mono",
                  Number(patient.balance || 0) > 0 ? "text-amber-300" : "text-emerald-300"
                )}>
                  {Number(patient.balance || 0).toLocaleString()} د.أ
                </p>
              </div>
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                <span className="text-[9px] text-white/40">
                  {Number(patient.balance || 0) > 0 ? "مستحق بدفع" : "مسدد بالكامل ✔️"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTransactionType("payment");
                    setShowPaymentModal(true);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg transition-all flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus size={10} />
                  <span>دفع</span>
                </button>
              </div>
            </div>

            {/* Sessions/Visits Widget */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl hover:bg-white/10 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-300 mb-1">
                  <Clipboard size={14} className="text-blue-400" />
                  <span className="text-[10px] font-bold text-white/60">الجلسات العلاجية</span>
                </div>
                <p className="text-base font-black font-mono">
                  {visits?.length || 0} جلسة
                </p>
              </div>
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                <span className="text-[9px] text-white/40 font-semibold">تاريخ الزيارات</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("visits")}
                  className="text-[9px] text-blue-300 hover:underline cursor-pointer"
                >
                  استعراض
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Info Hub vs Active Clinical Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Workspace: 12 columns - Full Dynamic Tabbed Workspace (Spacious & Clean) */}
        <div className="lg:col-span-12 space-y-6">
          
          {/* Tabs Control Header with Elite High-Contrast Dynamic Tab Indicator */}
          <div className="bg-slate-100 p-2 rounded-2xl border border-slate-200/60 flex overflow-x-auto md:flex-wrap flex-nowrap gap-1 shadow-inner relative z-10 scrollbar-none mb-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all text-xs font-black cursor-pointer select-none",
                    isSelected 
                      ? "text-blue-700 font-extrabold shadow-sm" 
                      : "text-slate-650 hover:text-slate-800"
                  )}
                >
                  <Icon size={14} className={isSelected ? "text-blue-600" : "text-slate-400"} />
                  <span>{tab.label}</span>
                  {isSelected && (
                    <motion.div 
                      layoutId="activeTabUnderline" 
                      className="absolute inset-0 bg-white border border-slate-200 -z-10 rounded-xl shadow-xs"
                      transition={{ type: "spring", stiffness: 420, damping: 28 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Core Tabs Workspace */}
          <div className="space-y-6">
            
            {/* TAB 1: TREATMENT SESSIONS & HISTORY TIMELINE */}
            {activeTab === "visits" && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 relative z-10"
              >
                {/* Clinical revision form panel */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xs overflow-hidden border-t-4 border-t-blue-600 animate-fade-in animate-duration-300">
                  <div className="p-5 bg-slate-50/50 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        <Plus className="text-blue-600" size={18} />
                        تسجيل وإدخال كشف طبي جديد
                      </h3>
                      <p className="text-slate-400 text-[10px] font-bold mt-0.5">تسجيل شكاوى المريض الحالية والإجراءات العلاجية المنفذة في العيادة</p>
                    </div>

                    <div className="flex gap-2">
                      {newNote && (
                        <button 
                          onClick={handleAiSummarize}
                          disabled={isAiGenerating}
                          className="bg-white hover:bg-slate-50 text-blue-600 px-3.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-2 border border-slate-200/80 transition-all disabled:opacity-50 shadow-xs cursor-pointer"
                        >
                          <Sparkles size={14} className="text-yellow-500 animate-pulse" />
                          <span>{isAiGenerating ? "تحليل صياغة التقرير..." : "صياغة احترافية بالذكاء الاصطناعي"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Diagnosis Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-600 block mr-1">نوع المعاملة أو الإجراء المنفذ</label>
                        <select 
                          value={diagnosisInput}
                          onChange={(e) => setDiagnosisInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-800 focus:bg-white outline-none focus:border-blue-500 transition-all cursor-pointer"
                        >
                          <option value="استشارة طبيبة ومعاينة كرت">استشارة طبيبة ومعاينة كرت</option>
                          <option value="علاج عصب وجذور للسن">علاج عصب وجذور للسن</option>
                          <option value="حشوة سن تجميلية كمبوزيت">حشوة سن تجميلية كمبوزيت</option>
                          <option value="قلع سن بسيط أو معقد">قلع سن بسيط أو معقد</option>
                          <option value="تنظيف كلسي وتثقيب اللثة">تنظيف كلسي وتثقيب اللثة</option>
                          <option value="زراعة غرسة أسنان (محور أول)">زراعة غرسة أسنان (محور أول)</option>
                          <option value="تركيب تاج زركوني أو سراميكي">تركيب تاج زركوني أو سراميكي</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 block mr-1">شكوى المريض، الأعراض السريرية وخطة المداواة</label>
                      <textarea 
                        rows={3}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="المريض يشتكي من حكة واهتزاز في الضرس... تم فحص الحالة وتقديم علاج سحب عصب وجلسة حشوة أولى..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all resize-none leading-relaxed"
                      />
                    </div>

                    {/* AI Preview Summary Section */}
                    <AnimatePresence>
                      {aiSummary && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="bg-blue-900 text-white rounded-2xl p-5 relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-6 opacity-5">
                            <Sparkles size={80} />
                          </div>
                          <h4 className="font-black text-xs flex items-center gap-1.5 mb-2 text-blue-200/90">
                            <Sparkles size={14} className="text-yellow-400" />
                            <span>المقترح السريري المصاغ بواسطة الذكاء الاصطناعي:</span>
                          </h4>
                          <p className="text-xs leading-relaxed whitespace-pre-wrap text-blue-50">{aiSummary}</p>
                          <div className="mt-4 flex gap-2">
                            <button 
                              onClick={() => {
                                setNewNote(prev => prev + `\n\n[الملخص السريري]:\n` + aiSummary);
                                setAiSummary("");
                              }}
                              className="bg-white/20 hover:bg-white/30 text-white px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              تبني السجل وإلحاقه بنص الملاحظة
                            </button>
                            <button 
                              onClick={() => setAiSummary("")}
                              className="text-white/60 hover:text-white text-[10px] font-bold px-2 py-1.5 cursor-pointer"
                            >
                              تجاهل
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit Section */}
                    <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                      <button 
                        onClick={handleSaveVisit}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-100 cursor-pointer"
                      >
                        <CheckCircle2 size={16} />
                        <span>توثيق الزيارة وحفظ القيد</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Historical Database Timeline list */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm">التاريخ المرضي وأرشيف الزيارات السابقة</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">سجل تراكمي متكامل وحركات العلاج المحفوظة للمريض رتبت زمنياً</p>
                    </div>
                    <span className="text-xs font-black bg-slate-50 border px-3 py-1.5 rounded-lg text-slate-700 font-mono">
                      {visits.length} معاينات وجلسات سابقة
                    </span>
                  </div>

                  {visits.length > 0 ? (
                    <div className="relative border-r-2 border-slate-100 mr-4 pr-6 space-y-5">
                      {visits.map((visit) => (
                        <div key={visit._id || visit.id} className="relative group">
                          
                          {/* Bullet circle connection */}
                          <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-xs group-hover:scale-110 transition-transform" />
                          
                          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all">
                            <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                              <div>
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                                  خطة: {visit.diagnosis || "معاينة عامة وبطاقة علاجية"}
                                </span>
                                <p className="text-[10px] text-slate-400 mt-2 font-bold flex items-center gap-1">
                                  <Calendar size={12} />
                                  <span>{visit.date ? new Date(visit.date).toLocaleDateString('ar-JO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "أرشيف سابق"}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                                  مكتملة سريرياً
                                </span>
                                <button 
                                  onClick={() => setVisitToDelete(visit._id || visit.id)}
                                  className="p-1.5 text-slate-300 hover:text-rose-600 transition-all rounded-lg hover:bg-rose-50 cursor-pointer"
                                  title="إلغاء سجل الزيارة من الأرشيف"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3 pt-3 border-t border-slate-100">
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">النتائج وعوارض التشخيص</p>
                                <p className="text-slate-700 text-xs leading-relaxed font-bold whitespace-pre-wrap mt-1">
                                  {visit.symptoms}
                                </p>
                              </div>

                              {visit.aiSummary && (
                                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/50">
                                  <p className="text-[9.5px] font-bold text-blue-600 flex items-center gap-1 mb-1">
                                    <Sparkles size={11} className="text-yellow-500" />
                                    <span>موجز الملخص الطبي المحفوظ:</span>
                                  </p>
                                  <p className="text-xs text-slate-500 leading-relaxed font-semibold italic">{visit.aiSummary}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl text-slate-400">
                      <History size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-xs font-bold">لا يوجد سجل تاريخي محفوظ للزيارات حالياً.</p>
                      <p className="text-[10px] text-slate-400 mt-1">بإمكانك إضافة أول بطاقة مراجعة للمريض أعلاه لتظهر في الأرشيف مباشرة.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 2: INTERACTIVE DENTAL CHART */}
            {activeTab === "dental_chart" && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 relative z-10"
              >
                {/* Oral Dental chart */}
                <div className="bg-white rounded-[2rem] border border-slate-200 p-4 md:p-6 shadow-xs">
                  <div className="mb-4 pr-2">
                    <h3 className="font-extrabold text-slate-800 text-sm">مخطط الفك والوضع السريري التفاعلي للأسنان</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">انقر على أي سن لتحديد حالته العلاجية ومتابعتها ومزامنة التغييرات</p>
                  </div>
                  <DentalChart 
                    initialData={patient.dentalChart} 
                    onSave={handleSaveDentalChart} 
                  />
                </div>

                {/* Embedded Medical Warnings Column */}
                <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-xs space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <ShieldAlert className="text-rose-500" size={18} />
                      <span>الموانع والتحذيرات الطبية الحرجة للمريض</span>
                    </h3>
                    <p className="text-slate-400 text-[10px] mt-1 font-bold">يرجى تسجيل أي حساسية لبنسلين، أمراض مزمنة، أو تداخلات أدوية لتلافي أي أخطاء طبية</p>
                  </div>

                  <div className="space-y-3">
                    <textarea 
                      rows={3}
                      value={chronicInput}
                      onChange={(e) => setChronicInput(e.target.value)}
                      placeholder="مثال: حساسية حادة من البنسلين ومستحضرات التخدير الكبرى، مريض ضغط الدم والسكري ويتناول المميعات..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 focus:bg-white focus:border-rose-500 outline-none transition-all leading-relaxed resize-none"
                    />
                    
                    <div className="flex justify-end">
                      <button 
                        onClick={handleSaveChronicDiseases}
                        disabled={isSavingAllergy}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-xs text-xs disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingAllergy ? <RefreshCw className="animate-spin" size={12} /> : <Save size={12} />}
                        <span>تحديث وحفظ التحذيرات</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 5: ADVANCED FINANCIAL ACCOUNTABILITY & TRANSACTIONS */}
            {activeTab === "financial" && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 relative z-10"
              >
                {/* Financial overview ledger cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-200 transition-colors">
                    <span className="text-[10px] text-slate-400 font-extrabold block">إجمالي المقبوضات (سداد نقد)</span>
                    <p className="text-lg font-black text-emerald-600 mt-2 font-mono">
                      {(patient.transactions || [])
                        .filter((t: any) => t.type === "payment")
                        .reduce((acc: number, t: any) => acc + t.amount, 0)
                        .toLocaleString()} <span className="text-[10px] font-bold text-slate-400">IQD</span>
                    </p>
                  </div>
                  
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-200 transition-colors">
                    <span className="text-[10px] text-slate-400 font-extrabold block">إجمالي رسوم العلاج (الديون)</span>
                    <p className="text-lg font-black text-blue-600 mt-2 font-mono">
                      {(patient.transactions || [])
                        .filter((t: any) => t.type === "charge")
                        .reduce((acc: number, t: any) => acc + t.amount, 0)
                        .toLocaleString()} <span className="text-[10px] font-bold text-slate-400">IQD</span>
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-200 transition-colors">
                    <span className="text-[10px] text-slate-400 font-extrabold block">صافي الرصيد المتبقي</span>
                    <p className="text-lg font-black text-rose-600 mt-2 font-mono">
                      {Number(patient.balance || 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">IQD</span>
                    </p>
                  </div>
                </div>

                {/* Billing ledger transactions list */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm">بيان الحركات المالية المسجلة</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">التسلسل الزمني لفواتير الذمم والمستحقات المباشرة</p>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setTransactionType("charge");
                          setShowPaymentModal(true);
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-xl text-[11px] font-black border border-red-100 transition-all flex items-center gap-1"
                      >
                        <Plus size={14} />
                        <span>تقييد رسوم إجراء طبي (دين)</span>
                      </button>
                      <button 
                        onClick={() => {
                          setTransactionType("payment");
                          setShowPaymentModal(true);
                        }}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-[11px] font-black border border-emerald-100 transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 size={14} />
                        <span>قيد دفعة مستلمة (سداد)</span>
                      </button>
                    </div>
                  </div>

                  {/* Ledger lines */}
                  <div className="divide-y divide-slate-100">
                    {patient.transactions && patient.transactions.length > 0 ? (
                      patient.transactions.map((t: any) => (
                        <div key={t.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50/50 transition-all gap-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center border",
                              t.type === "payment" 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                : "bg-rose-50 text-rose-600 border-rose-100"
                            )}>
                              {t.type === "payment" ? <CheckCircle2 size={16} /> : <CreditCard size={16} />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-xs">{t.note}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                {new Date(t.date).toLocaleDateString("ar-EG", {
                                  year: "numeric",
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-left w-full sm:w-auto">
                            <p className={cn(
                              "font-black text-sm font-mono",
                              t.type === "payment" ? "text-emerald-600" : "text-rose-600"
                            )}>
                              {t.type === "payment" ? "-" : "+"}{t.amount.toLocaleString()} IQD
                            </p>
                            <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">الرصيد بعدها: {t.balanceAfter?.toLocaleString()} IQD</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-16 text-center text-slate-400 italic">
                        <CreditCard className="mx-auto text-slate-300 mb-2" size={32} />
                        <p className="text-xs font-bold">لا يوجد سجل تاريخي للمعاملات المالية بعد.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: REGISTER PAYMENT/CHARGE MODAL */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full relative border border-slate-100"
            >
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-600 transition-all rounded-full hover:bg-slate-100"
              >
                <X size={18} />
              </button>

              <div className="text-right" dir="rtl">
                <h3 className="text-lg font-black text-slate-900 mb-1">تسجيل قيد مالي جديد</h3>
                <p className="text-slate-400 text-xs font-semibold mb-6">تنظيم حسابات العيادة بدقة عالية ومطابقة الخزينة</p>
                
                <div className="space-y-4">
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button 
                      onClick={() => setTransactionType("payment")}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-extrabold transition-all",
                        transactionType === "payment" 
                          ? "bg-white text-emerald-600 shadow-xs" 
                          : "text-slate-500"
                      )}
                    >
                      سداد نقدي (واصل)
                    </button>
                    <button 
                      onClick={() => setTransactionType("charge")}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-extrabold transition-all",
                        transactionType === "charge" 
                          ? "bg-white text-rose-600 shadow-xs" 
                          : "text-slate-500"
                      )}
                    >
                      تكلفة علاجية (دين)
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 block mr-1 uppercase">القيمة الطبية للعملية (IQD)</label>
                    <input 
                      type="number" 
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center text-lg font-black font-mono focus:bg-white outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 block mr-1 uppercase">ملاحظات توضيحية لدفتر الحساب</label>
                    <input 
                      type="text" 
                      value={transactionNote}
                      onChange={(e) => setTransactionNote(e.target.value)}
                      placeholder={transactionType === "payment" ? "واصل المريض نقداً بالكامل" : "أجور قلع جراحي وزراعة مبدئية للأسنان"}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={handlePayment}
                      className={cn(
                        "w-full py-3.5 rounded-xl font-bold text-xs text-white transition-all shadow-md",
                        transactionType === "payment" 
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-50" 
                          : "bg-rose-600 hover:bg-rose-700 shadow-rose-50"
                      )}
                    >
                      {transactionType === "payment" ? "تأكيد واستلام المبلغ العلاجي" : "تقييد الدين في كرت المريض"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* MODAL 2: MEDICAL RX PRESCRPTION FORM (World-class print standard) */}
      <AnimatePresence>
        {showPrescription && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white max-w-2xl w-full rounded-[2rem] shadow-2xl overflow-hidden relative border border-slate-100"
            >
              <button 
                onClick={() => setShowPrescription(false)}
                className="absolute top-6 left-6 p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all rounded-full print:hidden z-10"
              >
                <X size={18} />
              </button>

              <div className="p-8 md:p-12 space-y-8 text-right" id="printable-prescription" dir="rtl">
                
                {/* Visual Rx Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{clinicName}</h2>
                    <p className="text-[11px] font-extrabold text-slate-500 mt-0.5">العيادة الطبية المتكاملة المتخصصة</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">الطبيب المسؤول: {doctorName}</p>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <Activity size={32} />
                  </div>
                </div>

                {/* Patient RX data */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-center text-xs border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">اسم المريض</span>
                    <span className="font-extrabold text-slate-800">{patient.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">التاريخ والوقت</span>
                    <span className="font-extrabold text-slate-800 font-mono">{new Date().toLocaleDateString('ar-JO')}</span>
                  </div>
                  
                  {patient.chronicDiseases && (
                    <div className="col-span-2 pt-2 border-t border-slate-200/60 block text-right font-semibold text-rose-600 px-2">
                      <span>تنبيه صحي من الملف: {patient.chronicDiseases}</span>
                    </div>
                  )}
                </div>

                {/* RX Sign Symbol */}
                <div className="min-h-[220px] pb-6">
                  <div className="flex items-center gap-3 mb-4">
                     <span className="text-4xl font-serif italic text-blue-600 font-black">Rx</span>
                     <div className="h-[1.5px] flex-1 bg-slate-100 print:hidden"></div>
                  </div>
                  
                  {/* Drugs selection fields */}
                  <div className="space-y-3 print:hidden bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input 
                        type="text" 
                        placeholder="اسم المستحضر (e.g. Amoxicillin)" 
                        value={currentMed.name}
                        onChange={(e) => setCurrentMed({...currentMed, name: e.target.value})}
                        className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold outline-none focus:border-blue-500"
                      />
                      <input 
                        type="text" 
                        placeholder="الجرعة اليومية (Sig)" 
                        value={currentMed.dose}
                        onChange={(e) => setCurrentMed({...currentMed, dose: e.target.value})}
                        className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold outline-none focus:border-blue-500"
                      />
                      <input 
                        type="text" 
                        placeholder="الكمية الإجمالية (Qty)" 
                        value={currentMed.qty}
                        onChange={(e) => setCurrentMed({...currentMed, qty: e.target.value})}
                        className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                    <button 
                      onClick={addMedication}
                      className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1"
                    >
                      <Plus size={14} />
                      <span>تقييد العلاج في الوصفة الطبية الحالية</span>
                    </button>
                  </div>

                  {/* Medications Lines representation */}
                  <div className="space-y-4 mt-6">
                    {medications.length > 0 ? (
                      medications.map((med, idx) => (
                        <div key={idx} className="flex justify-between items-start border-b border-slate-100 pb-3 group">
                          <div>
                            <h4 className="font-extrabold text-[#111] text-sm uppercase tracking-wide">{med.name}</h4>
                            <div className="flex gap-4 mt-1 text-slate-500 text-[11px] font-bold">
                              <span>الجرعة المحددة: {med.dose}</span>
                              <span className="text-slate-300">|</span>
                              <span>حجم العبوة: {med.qty}</span>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => removeMedication(idx)}
                            className="p-1 text-slate-300 hover:text-red-500 transition-all rounded-lg hover:bg-slate-50 print:hidden"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-center py-8 text-xs font-bold italic">لا توجد عقاقير طبية مقيدة حالياً في مسودة الروشتة.</p>
                    )}
                  </div>
                </div>

                {/* Print Sign Stamp representation */}
                <div className="flex justify-between items-end pt-6 border-t border-slate-100">
                  <div className="text-[9px] text-slate-400 max-w-[220px] leading-relaxed">
                    * إشعار طبي قانوني: يرجى صرف الدواء وفق إرشادات الطبيب تماماً، في حال تظاهر أي رد فعل تحسسي يرجى مراجعة المشفى فوراً.
                  </div>
                  <div className="text-center min-w-[150px] space-y-4">
                    <span className="text-[10px] font-black text-slate-800 block">توقيع وختم الطبيب المعتمد</span>
                    <div className="h-10 border-b border-dashed border-slate-300 w-32 mx-auto" />
                  </div>
                </div>

                {/* Direct Print/Send Triggers */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-150 print:hidden">
                  <button 
                    onClick={handleSendPrescriptionWhatsApp}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-50 cursor-pointer"
                  >
                    <Send size={15} />
                    <span>إرسال الوصفة الطبية (Rx) لواتساب المريض</span>
                  </button>
                  <button 
                    onClick={() => setShowPrescription(false)}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold text-xs"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* MODAL 3: FULL COMPREHENSIVE MEDICAL REPORT (Print/PDF optimized layout) */}
      <AnimatePresence>
        {showFullReport && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto print:bg-white print:p-0"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white max-w-4xl w-full rounded-[2.5rem] shadow-2xl overflow-hidden relative print:shadow-none print:rounded-none"
            >
              <button 
                onClick={() => setShowFullReport(false)}
                className="absolute top-6 left-6 p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all rounded-full print:hidden"
              >
                <X size={18} />
              </button>

              <div className="p-8 md:p-12 space-y-8 text-right" id="printable-report" dir="rtl">
                
                {/* Print Header */}
                <div className="flex justify-between items-center border-b-2 border-slate-900 pb-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{clinicName}</h2>
                    <p className="text-xs font-bold text-slate-500 mt-1">التقرير السريري الطبي الشامل للملف العلاجي</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">الدكتور المسؤول عن المعاينات الكشفية: {doctorName}</p>
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-black text-blue-600 block">التقرير رقم #FILE-{patient.id || "001"}</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">تاريخ الطباعة: {new Date().toLocaleDateString('ar-JO')}</span>
                  </div>
                </div>

                {/* Patient demograpics bar */}
                <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <h3 className="text-xs font-black text-slate-900 border-r-4 border-blue-600 pr-2 pb-0.5">المعلومات الشخصية للمراجع</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold mb-0.5">الاسم بالكامل</p>
                      <p className="font-black text-slate-800">{patient.name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-0.5">العمر والسنوات</p>
                      <p className="font-black text-slate-800">{patient.age} سنة</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-0.5">فصيلة الكرات الدموية</p>
                      <p className="font-black text-rose-600">{patient.bloodType || "غير محدد"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-0.5">رقم الاتصال المباشر</p>
                      <p className="font-black text-slate-800 font-mono" dir="ltr">{patient.phone}</p>
                    </div>
                  </div>
                </section>

                {/* Medical alert on report */}
                <section className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100">
                  <h3 className="text-xs font-black text-rose-800 border-r-4 border-rose-600 pr-2 pb-0.5">الملف المرضي المزمن ومحاذير التحسس</h3>
                  <p className="text-xs font-semibold text-rose-700 leading-relaxed mt-2">
                    {patient.chronicDiseases || "لا توجد أمراض صحية أو تداخلات طارئة مسجلة في كرت المريض."}
                  </p>
                </section>
                <section className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 border-r-4 border-blue-600 pr-2 pb-0.5">التشخيص التشريحي لأعطال الأسنان والفكين (Jaw Chart Summary)</h3>
                  {patient.dentalChart && Object.keys(patient.dentalChart).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(patient.dentalChart).map(([toothId, data]: [string, any]) => (
                        data.status !== "Healthy" && (
                          <div key={toothId} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                            <span className="font-extrabold text-slate-700">السن الطبيعي رقم #{toothId}</span>
                            <div className="flex gap-3 items-center">
                              <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{getToothStatusLabel(data.status)}</span>
                              {data.notes && <span className="text-[10px] text-slate-400 font-bold italic">| {data.notes}</span>}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-xs py-2">لا توجد ملاحظات مرضية مخصصة أو مكتوبة على خريطة الأسنان.</p>
                  )}
                </section>

                {/* Visit logs list */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-slate-900 border-r-4 border-blue-600 pr-2 pb-0.5">التسلسل الزمني الكشفي للزيارات الطبية</h3>
                  <div className="space-y-4">
                    {visits.length > 0 ? (
                      visits.map((v) => (
                        <div key={v._id || v.id} className="border-b border-slate-100 pb-3 text-xs">
                           <div className="flex justify-between text-xs font-extrabold text-slate-950 mb-1">
                             <span>تشخيص/مراجعة: {v.diagnosis || "معاينة المراجع الافتراضية"}</span>
                             <span className="text-slate-400 font-mono">{v.date ? new Date(v.date).toLocaleDateString('ar-JO') : ""}</span>
                           </div>
                           <p className="text-slate-600 mt-1 font-semibold leading-relaxed">{v.symptoms}</p>
                           {v.aiSummary && <p className="text-[10px] text-blue-600 mt-2 italic font-bold">موجز التحليل الإكلينيكي: {v.aiSummary}</p>}
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic text-xs">لم يقم المريض لحين الوقت بأي زيارات رسمية.</p>
                    )}
                  </div>
                </section>

                {/* Sign Stamp section */}
                <div className="flex justify-between pt-16">
                  <div className="text-center font-bold text-xs min-w-[120px]">
                    مصادقة وتوقيع المريض
                    <div className="h-10 border-b border-slate-300 w-32 mt-2 mx-auto" />
                  </div>
                  <div className="text-center font-bold text-xs min-w-[120px]">
                    ختم العيادة والتوقيع
                    <div className="h-10 border-b border-slate-300 w-32 mt-2 mx-auto" />
                  </div>
                </div>

                {/* Print Control buttons */}
                <div className="flex gap-3 pt-8 border-t border-slate-100 print:hidden justify-end">
                  <button 
                    onClick={handlePrintAndSendWhatsApp}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition-all shadow-md shadow-emerald-50 cursor-pointer"
                  >
                    <Send size={15} />
                    <span>إرسال التقرير الطبي لواتساب المريض</span>
                  </button>
                  <button 
                    onClick={handlePrint}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all"
                  >
                    <Printer size={15} />
                    <span>طباعة التقرير</span>
                  </button>
                  <button 
                    onClick={() => setShowFullReport(false)}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold text-xs"
                  >
                    إغلاق التقرير
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm deletion of visit logs */}
      <ConfirmModal 
        isOpen={!!visitToDelete}
        onClose={() => setVisitToDelete(null)}
        onConfirm={handleDeleteVisit}
        title="حذف سجل الزيارة السريرية"
        message="هل أنت متأكد من رغبتك في حذف هذا السجل الطبي من أرشيف المريض؟ سيتم حذف الملاحظات والملخص الاستشاري المرتبط نهائياً من قاعدة البيانات ولا يمكن التراجع عينة."
        confirmText="تأكيد الشطب والمسح"
      />
    </div>
  );
}
