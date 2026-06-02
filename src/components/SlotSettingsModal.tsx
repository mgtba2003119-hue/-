import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, Trash2, Save, Clock, Info } from "lucide-react";
import { apiService } from "../services/apiService";

interface SlotSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (slots: string[]) => void;
}

export default function SlotSettingsModal({ isOpen, onClose, onSuccess }: SlotSettingsModalProps) {
  const [slots, setSlots] = useState<string[]>([]);
  const [newSlot, setNewSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSlots();
    }
  }, [isOpen]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const data = await apiService.getSlots();
      setSlots(data.slots || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = () => {
    if (!newSlot) return;
    if (slots.includes(newSlot)) return;
    
    // Sort slots after adding
    const sorted = [...slots, newSlot].sort((a, b) => {
      return a.localeCompare(b);
    });
    setSlots(sorted);
    setNewSlot("");
  };

  const handleRemoveSlot = (slot: string) => {
    setSlots(slots.filter(s => s !== slot));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.updateSlots(slots);
      onSuccess(slots);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
        dir="rtl"
      >
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-100/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">إعدادات الفترات الزمنية</h2>
            <p className="text-xs text-slate-500 mt-1">إضافة أو حذف أوقات المواعيد المتاحة</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-900">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 text-blue-700">
            <Info size={18} className="shrink-0" />
            <p className="text-xs leading-relaxed">
              هذه الفترات ستظهر في قائمة الحجز وجدول المواعيد. يفضل استخدام نظام الـ 24 ساعة (مثلاً 14:00 بدلاً من 02:00) لمنع الالتباس.
            </p>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-2">
              <Clock size={14} />
              <span>إضافة فترة جديدة</span>
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="مثال: 09:45"
                className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={newSlot}
                onChange={(e) => setNewSlot(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSlot()}
              />
              <button 
                onClick={handleAddSlot}
                className="bg-blue-600 text-white p-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-2">
              <span>الفترات الحالية ({slots.length})</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <div 
                  key={slot}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center gap-2 group hover:border-blue-200 transition-all"
                >
                  <span className="text-sm font-mono font-bold text-slate-700">{slot}</span>
                  <button 
                    onClick={() => handleRemoveSlot(slot)}
                    className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            {slots.length === 0 && !loading && (
              <p className="text-center text-slate-400 text-xs py-10">لا توجد فترات مضافة بعد</p>
            )}
            {loading && <p className="text-center text-slate-400 text-xs py-10">جاري التحميل...</p>}
          </div>
        </div>

        <div className="p-8 bg-slate-50/50 border-t border-slate-50">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <Save size={20} />
            <span>{saving ? "جاري الحفظ..." : "حفظ التعديلات"}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
