import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Calendar, Clock, User, FileText, CheckCircle2 } from "lucide-react";
import { apiService } from "../services/apiService";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "../lib/utils";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  onSuccess: () => void;
}

export default function BookingModal({ isOpen, onClose, selectedDate, onSuccess }: BookingModalProps) {
  const [patients, setPatients] = useState<any[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    reason: "",
    category: "Examination",
  });

  const categories = [
    { id: "Examination", label: "فحص", color: "emerald" },
    { id: "Filling", label: "حشوة", color: "blue" },
    { id: "Extraction", label: "خلع", color: "red" },
    { id: "Orthodontics", label: "تقويم", color: "purple" },
    { id: "Cleaning", label: "تنظيف", color: "teal" },
    { id: "Other", label: "أخرى", color: "slate" },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
      fetchSlots();
      if (selectedDate) {
        setFormData(prev => ({ ...prev, date: format(selectedDate, "yyyy-MM-dd") }));
      }
    }
  }, [isOpen, selectedDate]);

  const fetchPatients = async () => {
    try {
      const data = await apiService.getPatients();
      setPatients(data);
    } catch (err) {
      console.error("Failed to fetch patients", err);
    }
  };

  const fetchSlots = async () => {
    try {
      const data = await apiService.getSlots();
      setTimes(data.slots || []);
      // Set default time to first available if 10:00 is not there
      if (data.slots && data.slots.length > 0 && !data.slots.includes("10:00")) {
        setFormData(prev => ({ ...prev, time: data.slots[0] }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId) return;
    
    setLoading(true);
    try {
      await apiService.addAppointment({
        ...formData,
        status: "Upcoming",
        createdAt: new Date(),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Booking failed", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
        dir="rtl"
      >
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">حجز موعد جديد</h2>
            <p className="text-xs text-slate-500 mt-1">أدخل تفاصيل الموعد للمريض</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-900 shadow-sm">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-2">
                <User size={14} />
                <span>المريض</span>
              </label>
              <select 
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.patientId}
                onChange={(e) => {
                  const p = patients.find(p => p._id === e.target.value);
                  setFormData({...formData, patientId: e.target.value, patientName: p?.name || ""});
                }}
              >
                <option value="">اختر مريضاً...</option>
                {patients.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-2">
                  <Calendar size={14} />
                  <span>التاريخ</span>
                </label>
                <div className="relative group">
                  <input 
                    required
                    type="date"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer hover:bg-slate-100/50"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-blue-500 transition-colors">
                    <Calendar size={18} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-2">
                  <Clock size={14} />
                  <span>الوقت</span>
                </label>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none hover:bg-slate-100/50"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                  >
                    {[...times, "كتابة يدوية"].map(t => (
                      <option key={t} value={t === "كتابة يدوية" ? "manual" : t}>{t}</option>
                    ))}
                  </select>
                  {formData.time === "manual" || !times.includes(formData.time) ? (
                    <input 
                      type="text"
                      placeholder="HH:mm"
                      className="w-24 bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center font-mono"
                      value={formData.time === "manual" ? "" : formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-2">
                <FileText size={14} />
                <span>نوع الإجراء / التصنيف</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({...formData, category: cat.id})}
                    className={cn(
                      "p-3 rounded-2xl text-[10px] font-bold border transition-all",
                      formData.category === cat.id 
                        ? `bg-${cat.color}-100 border-${cat.color}-200 text-${cat.color}-700 shadow-sm`
                        : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-2">
                <FileText size={14} />
                <span>سبب الزيارة / ملاحظات إضافية</span>
              </label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all h-20 resize-none"
                placeholder="أدخل تفاصيل إضافية..."
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || success}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
              success ? "bg-emerald-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100"
            }`}
          >
            {success ? (
              <>
                <CheckCircle2 size={20} />
                <span>تم الحجز بنجاح</span>
              </>
            ) : loading ? "جاري الحفظ..." : "تأكيد الحجز"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
