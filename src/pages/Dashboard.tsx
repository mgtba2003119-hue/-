import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Users, Calendar, Clock, CreditCard, TrendingUp, ArrowUpRight, Plus, BarChart3, Trash2, PieChart as PieChartIcon, Activity } from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../context/ThemeContext";
import { apiService } from "../services/apiService";
import { Link } from "react-router-dom";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import ConfirmModal from "../components/ConfirmModal";

const getCategoryStyles = (category: string) => {
  switch (category) {
    case "Examination": return "bg-emerald-50 text-emerald-600 border-emerald-100";
    case "Filling": return "bg-blue-50 text-blue-600 border-blue-100";
    case "Extraction": return "bg-red-50 text-red-600 border-red-100";
    case "Orthodontics": return "bg-purple-50 text-purple-600 border-purple-100";
    case "Cleaning": return "bg-teal-50 text-teal-600 border-teal-100";
    default: return "bg-slate-50 text-slate-600 border-slate-100";
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

export default function Dashboard() {
  const { doctorName } = useTheme();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const stats = useMemo(() => {
    const totalDebt = patients.reduce((acc: number, p: any) => acc + (Number(p.balance) || 0), 0);
    const todayAppointments = appointments.filter((a: any) => a.date === new Date().toISOString().split('T')[0]);
    const activeCases = appointments.filter((a: any) => a.status !== "Completed");

    return [
      { label: "إجمالي المرضى", value: patients.length.toString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50", trend: "+12%" },
      { label: "مواعيد اليوم", value: todayAppointments.length.toString(), icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50", trend: "نشط" },
      { label: "إجمالي الديون", value: totalDebt.toLocaleString() + " د.ع", icon: CreditCard, color: "text-red-600", bg: "bg-red-50", trend: "-5% تحسن" },
      { label: "حالات نشطة", value: activeCases.length.toString(), icon: Activity, color: "text-purple-600", bg: "bg-purple-50", trend: "قيد المتابعة" },
    ];
  }, [patients, appointments]);

  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const pData = await apiService.getPatients();
      const aData = await apiService.getAppointments();
      setPatients(pData);
      setAppointments(aData);
    } catch (err) {
      console.error("Dashboard error:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const treatmentData = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach(a => {
      counts[a.category] = (counts[a.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ 
      name: getCategoryLabel(name), 
      value 
    }));
  }, [appointments]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'];

  // ... (keep helper functions)

  const handleDeleteAppointment = async () => {
    if (!appointmentToDelete) return;
    try {
      await apiService.deleteAppointment(appointmentToDelete);
      setAppointmentToDelete(null);
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to delete appointment:", err);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">مرحباً بك، د. {doctorName}</h1>
          <p className="text-slate-500 mt-1">إليك ملخص لمواعيد وبيانات اليوم.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/patients" className="bg-blue-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg">
            <span>إضافة مريض جديد</span>
            <Plus size={18} />
          </Link>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start">
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={stat.color} size={24} />
              </div>
              {stat.trend && (
                <span className={cn(
                  "flex items-center text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter transition-colors",
                  stat.trend.includes("+") || stat.trend.includes("نشط") ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                )}>
                  {stat.trend.includes("+") && <TrendingUp size={10} className="ml-1" />}
                  {stat.trend}
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Treatment Distribution Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <PieChartIcon size={20} />
            </div>
            <h3 className="font-bold">توزيع الإجراءات الطبية</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={treatmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {treatmentData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-4">
               {treatmentData.map((item, index) => (
                 <div key={item.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                   <div className="flex items-center gap-3">
                     <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                     <span className="text-sm text-slate-600 font-medium">{item.name}</span>
                   </div>
                   <span className="text-sm font-black text-slate-900">{item.value}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Top Debtors List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                  <CreditCard size={20} />
                </div>
                <h3 className="font-bold">أعلى الديون</h3>
              </div>
              <Link to="/patients" className="text-xs text-blue-600 hover:underline">عرض الكل</Link>
           </div>
           <div className="space-y-4">
              {patients.filter(p => Number(p.balance) > 0).sort((a,b) => Number(b.balance) - Number(a.balance)).slice(0, 5).map((p) => (
                <Link key={p._id || p.id} to={`/patient/${p._id || p.id}`} className="block group">
                  <div className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{p.phone}</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-red-600">{Number(p.balance).toLocaleString()} IQD</span>
                  </div>
                </Link>
              ))}
              {patients.filter(p => Number(p.balance) > 0).length === 0 && (
                <div className="py-20 text-center text-slate-400 text-sm italic">
                  لا توجد ديون معلقة حالياً
                </div>
              )}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Appointments Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-lg">المواعيد القادمة</h3>
            <Link to="/appointments" className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">
              <span>عرض الكل</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto text-right">
            <table className="w-full">
              <thead>
                <tr className="text-slate-500 text-sm bg-slate-50">
                  <th className="px-6 py-4 font-medium">المريض</th>
                  <th className="px-6 py-4 font-medium">التاريخ</th>
                  <th className="px-6 py-4 font-medium">نوع الإجراء</th>
                  <th className="px-6 py-4 font-medium">الحالة</th>
                  <th className="px-6 py-4 font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {appointments.length > 0 ? appointments.slice(0, 5).map((apt) => (
                  <tr key={apt._id || apt.id} className="hover:bg-slate-50 transition-all cursor-pointer">
                    <td className="px-6 py-4 font-medium text-slate-900">{apt.patientName || "مريض مجهول"}</td>
                    <td className="px-6 py-4 text-slate-600">{apt.date} - {apt.time}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[11px] font-bold border",
                        getCategoryStyles(apt.category)
                      )}>
                        {getCategoryLabel(apt.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[11px] font-bold",
                        apt.status === "Upcoming" ? "bg-blue-50 text-blue-600 border border-blue-100" : 
                        apt.status === "Waiting" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        apt.status === "In Clinic" ? "bg-purple-50 text-purple-600 border border-purple-100" :
                        "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      )}>
                        {apt.status === "Upcoming" ? "قادم" : 
                         apt.status === "Waiting" ? "في الانتظار" : 
                         apt.status === "In Clinic" ? "داخل العيادة" : "مكتمل"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {apt.status === "Upcoming" && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              apiService.updateAppointmentStatus(apt._id || apt.id, "Waiting").then(() => fetchDashboardData());
                            }}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm"
                          >
                            تأكيد الحضور
                          </button>
                        )}
                        {apt.status === "Waiting" && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              apiService.updateAppointmentStatus(apt._id || apt.id, "In Clinic").then(() => fetchDashboardData());
                            }}
                            className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-700 transition-all shadow-sm"
                          >
                            بدء الجلسة
                          </button>
                        )}
                        {apt.status === "In Clinic" && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              apiService.updateAppointmentStatus(apt._id || apt.id, "Completed").then(() => fetchDashboardData());
                            }}
                            className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700 transition-all shadow-sm"
                          >
                            إنهاء الجلسة
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setAppointmentToDelete(apt._id || apt.id);
                          }}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="إلغاء الموعد"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400">لا توجد مواعيد قادمة في الوقت الحالي</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!appointmentToDelete}
        onClose={() => setAppointmentToDelete(null)}
        onConfirm={handleDeleteAppointment}
        title="إلغاء الموعد"
        message="هل أنت متأكد من رغبتك في إلغاء هذا الموعد؟"
        confirmText="تأكيد الإلغاء"
      />
    </div>
  );
}
