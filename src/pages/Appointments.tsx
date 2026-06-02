import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock, Users, Plus, List, Grid, Trash2, Settings, Download } from "lucide-react";
import { cn } from "../lib/utils";
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ar } from "date-fns/locale";
import { apiService } from "../services/apiService";
import BookingModal from "../components/BookingModal";
import SlotSettingsModal from "../components/SlotSettingsModal";

const getCategoryStyles = (category: string) => {
  switch (category) {
    case "Examination": return { bg: "bg-emerald-50/80", border: "border-emerald-600", text: "text-emerald-700", iconBg: "bg-emerald-600", dot: "bg-emerald-600" };
    case "Filling": return { bg: "bg-blue-50/80", border: "border-blue-600", text: "text-blue-700", iconBg: "bg-blue-600", dot: "bg-blue-600" };
    case "Extraction": return { bg: "bg-red-50/80", border: "border-red-600", text: "text-red-700", iconBg: "bg-red-600", dot: "bg-red-600" };
    case "Orthodontics": return { bg: "bg-purple-50/80", border: "border-purple-600", text: "text-purple-700", iconBg: "bg-purple-600", dot: "bg-purple-600" };
    case "Cleaning": return { bg: "bg-teal-50/80", border: "border-teal-600", text: "text-teal-700", iconBg: "bg-teal-600", dot: "bg-teal-600" };
    default: return { bg: "bg-slate-50/80", border: "border-slate-400", text: "text-slate-600", iconBg: "bg-slate-500", dot: "bg-slate-400" };
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case "Examination": return "فحص";
    case "Filling": return "حشوة";
    case "Extraction": return "خلع";
    case "Orthodontics": return "تقويم";
    case "Cleaning": return "تنظيف";
    default: return "أخرى";
  }
};

export default function Appointments() {
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSlotsModalOpen, setIsSlotsModalOpen] = useState(false);
  const [times, setTimes] = useState<string[]>([]);

  const fetchAppointments = async () => {
    try {
      const data = await apiService.getAppointments();
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = appointments.map(({ _id, ...rest }) => ({
      ...rest,
      formattedDate: new Date(rest.date).toLocaleDateString('ar-EG')
    }));
    apiService.exportToCSV(exportData, 'Appointments_Backup');
  };

  const fetchSlots = async () => {
    try {
      const data = await apiService.getSlots();
      setTimes(data.slots || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchSlots();
  }, []);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 6 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا الموعد؟")) {
      await apiService.deleteAppointment(id);
      fetchAppointments();
    }
  };

  const getDayAppointments = (day: Date) => {
    return appointments.filter(app => isSameDay(new Date(app.date), day));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">جدول المواعيد</h1>
          <p className="text-slate-500 mt-1">تتبع وتنظيم حجوزات المرضى اليومية والأسبوعية.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            className="bg-white text-slate-700 border border-slate-200 px-6 py-2.5 rounded-xl font-medium hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Download size={20} />
            <span>تصدير البيانات</span>
          </button>
          <div className="bg-white border border-slate-200 p-1 rounded-xl flex">
            <button 
              onClick={() => setIsSlotsModalOpen(true)}
              className="p-2 text-slate-400 hover:text-blue-600 transition-all rounded-lg hover:bg-slate-50"
              title="إعدادات الفترات"
            >
              <Settings size={20} />
            </button>
            <div className="w-px bg-slate-100 mx-1 self-stretch" />
            <button 
              onClick={() => setView("calendar")}
              className={cn("p-2 rounded-lg transition-all", view === "calendar" ? "bg-slate-100 text-blue-600" : "text-slate-400")}
            >
              <Grid size={20} />
            </button>
            <button 
              onClick={() => setView("list")}
              className={cn("p-2 rounded-lg transition-all", view === "list" ? "bg-slate-100 text-blue-600" : "text-slate-400")}
            >
              <List size={20} />
            </button>
          </div>
          <button 
            onClick={() => setIsBookingOpen(true)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
          >
            <Plus size={20} />
            <span>حجز موعد</span>
          </button>
        </div>
      </header>

      {/* Calendar Controls */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-h-[600px]">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ar })}
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all border border-slate-100 text-slate-500"
            >
              <ChevronRight size={20} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              اليوم
            </button>
            <button 
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all border border-slate-100 text-slate-500"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>

        {/* Days Row */}
        <div className="grid grid-cols-7 gap-4 mb-8">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDay);
            const dayAppointments = getDayAppointments(day);
            
            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "flex flex-col items-center p-4 rounded-2xl transition-all border-2 relative",
                  isSelected 
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                    : isToday ? "border-blue-100 bg-blue-50/30 text-blue-600" : "border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100"
                )}
              >
                <span className="text-[10px] font-bold uppercase opacity-60 mb-1">
                  {format(day, "EEEE", { locale: ar })}
                </span>
                <span className="text-xl font-bold">{format(day, "d")}</span>
                
                {dayAppointments.length > 0 && !isSelected && (
                  <div className="absolute top-2 left-2 w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Time Slots Area */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400 mb-6">
            <Clock size={16} />
            <span className="text-[10px] font-bold tracking-widest uppercase">الفترات الزمنية المتاحة لليوم</span>
          </div>

          <div className="divide-y divide-slate-50">
            {times.map((time) => {
              const dayApps = getDayAppointments(selectedDay);
              const appAtTime = dayApps.find(a => a.time === time);

              return (
                <div key={time} className="flex gap-6 py-6 group">
                  <div className="w-20 text-sm font-mono text-slate-400 mt-1">{time}</div>
                  <div className="flex-1">
                    {appAtTime ? (
                      <motion.div 
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={cn(
                          "border-r-4 p-4 rounded-2xl flex justify-between items-center transition-all",
                          getCategoryStyles(appAtTime.category).bg,
                          getCategoryStyles(appAtTime.category).border
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 text-white rounded-xl flex items-center justify-center font-bold shadow-lg",
                            getCategoryStyles(appAtTime.category).iconBg
                          )}>
                            {appAtTime.patientName?.charAt(0) || "P"}
                          </div>
                          <div>
                            <div className="flex items-center justify-between min-w-[150px]">
                              <p className="text-sm font-bold text-slate-900">{appAtTime.patientName}</p>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[9px] font-bold border",
                                  getCategoryStyles(appAtTime.category).bg,
                                  getCategoryStyles(appAtTime.category).border,
                                  getCategoryStyles(appAtTime.category).text
                                )}>
                                  {getCategoryLabel(appAtTime.category)}
                                </span>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[9px] font-bold",
                                  appAtTime.status === "Upcoming" ? "bg-blue-100/50 text-blue-600" : 
                                  appAtTime.status === "Waiting" ? "bg-amber-100/50 text-amber-600" :
                                  appAtTime.status === "In Clinic" ? "bg-purple-100/50 text-purple-600" :
                                  "bg-emerald-100/50 text-emerald-600"
                                )}>
                                  {appAtTime.status === "Upcoming" ? "قادم" : 
                                   appAtTime.status === "Waiting" ? "انتظار" : 
                                   appAtTime.status === "In Clinic" ? "في العيادة" : "مكتمل"}
                                </span>
                              </div>
                            </div>
                            <p className={cn(
                              "text-[11px] font-medium mt-0.5",
                              getCategoryStyles(appAtTime.category).text
                            )}>{appAtTime.reason || getCategoryLabel(appAtTime.category)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {appAtTime.status === "Upcoming" && (
                            <button 
                              onClick={() => apiService.updateAppointmentStatus(appAtTime._id, "Waiting").then(() => fetchAppointments())}
                              className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded-lg font-bold hover:bg-blue-700 transition-all"
                            >
                              تأكيد
                            </button>
                          )}
                          {appAtTime.status === "Waiting" && (
                            <button 
                              onClick={() => apiService.updateAppointmentStatus(appAtTime._id, "In Clinic").then(() => fetchAppointments())}
                              className="text-[10px] bg-amber-600 text-white px-2 py-1 rounded-lg font-bold hover:bg-amber-700 transition-all"
                            >
                              بدء
                            </button>
                          )}
                          {appAtTime.status === "In Clinic" && (
                            <button 
                              onClick={() => apiService.updateAppointmentStatus(appAtTime._id, "Completed").then(() => fetchAppointments())}
                              className="text-[10px] bg-purple-600 text-white px-2 py-1 rounded-lg font-bold hover:bg-purple-700 transition-all"
                            >
                              إنهاء
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(appAtTime._id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                            title="إلغاء"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <button 
                        onClick={() => {
                          setSelectedDay(selectedDay);
                          setIsBookingOpen(true);
                        }}
                        className="w-full h-16 border-2 border-dashed border-slate-50 rounded-2xl hover:border-blue-200 hover:bg-blue-50/20 transition-all flex items-center justify-center gap-2 text-slate-300 hover:text-blue-500 group"
                      >
                        <Plus size={18} className="opacity-0 group-hover:opacity-100 transition-all" />
                        <span className="text-sm font-medium">متاح للحجز</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BookingModal 
        isOpen={isBookingOpen} 
        onClose={() => setIsBookingOpen(false)} 
        selectedDate={selectedDay}
        onSuccess={fetchAppointments}
      />

      <SlotSettingsModal 
        isOpen={isSlotsModalOpen}
        onClose={() => setIsSlotsModalOpen(false)}
        onSuccess={(newSlots) => setTimes(newSlots)}
      />
    </div>
  );
}

