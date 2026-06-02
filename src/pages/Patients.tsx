import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, Filter, MoreVertical, Phone, Calendar, X, Trash2, Download, List, Grid, CreditCard, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { apiService } from "../services/apiService";
import { cn } from "../lib/utils";
import ConfirmModal from "../components/ConfirmModal";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "debtor">("all");
  const [patients, setPatients] = useState<any[]>([]);
  const [view, setView] = useState<"card" | "table">("card");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", phone: "", age: "", gender: "Male", balance: "0" });
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchPatients = async () => {
    try {
      const data = await apiService.getPatients();
      setPatients(data);
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const handleExport = () => {
    const exportData = patients.map(({ _id, history, ...rest }) => ({
      ...rest,
      registrationDate: new Date(rest.createdAt || Date.now()).toLocaleDateString('ar-EG')
    }));
    apiService.exportToCSV(exportData, 'Patients_Backup');
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.phone) return;
    
    try {
      await apiService.addPatient({
        ...newPatient,
        age: parseInt(newPatient.age) || 0,
      });
      setShowAddModal(false);
      setNewPatient({ name: "", phone: "", age: "", gender: "Male", balance: "0" });
      fetchPatients();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;
    try {
      await apiService.deletePatient(patientToDelete);
      setPatientToDelete(null);
      fetchPatients();
    } catch (err) {
      console.error("Failed to delete patient:", err);
    }
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.phone && p.phone.includes(searchTerm));
    const matchesFilter = filterType === "all" || (Number(p.balance) > 0);
    return matchesSearch && matchesFilter;
  });

  // Pagination logic
  const totalItems = filteredPatients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">سجل المرضى</h1>
          <p className="text-slate-500 mt-1">إدارة بيانات ومحفوظات المرضى المسجلين.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            className="bg-white text-slate-700 border border-slate-200 px-6 py-2.5 rounded-xl font-medium hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Download size={20} />
            <span>تصدير البيانات</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
          >
            <Plus size={20} />
            <span>إضافة مريض جديد</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search size={20} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="بحث بالاسم أو رقم الهاتف..." 
            className="bg-transparent border-none outline-none w-full text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button 
            onClick={() => setFilterType("all")}
            className={cn(
              "px-6 py-2 rounded-lg font-bold text-xs transition-all",
              filterType === "all" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            الكل
          </button>
          <button 
            onClick={() => setFilterType("debtor")}
            className={cn(
              "px-6 py-2 rounded-lg font-bold text-xs transition-all",
              filterType === "debtor" ? "bg-white text-red-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            الديون
          </button>
        </div>

        <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          <button 
            onClick={() => setView("card")}
            className={cn("p-2 rounded-lg transition-all", view === "card" ? "bg-slate-100 text-blue-600 shadow-inner" : "text-slate-400 hover:text-slate-600")}
            title="عرض بطاقات"
          >
            <Grid size={20} />
          </button>
          <button 
            onClick={() => setView("table")}
            className={cn("p-2 rounded-lg transition-all", view === "table" ? "bg-slate-100 text-blue-600 shadow-inner" : "text-slate-400 hover:text-slate-600")}
            title="عرض جدول"
          >
            <List size={20} />
          </button>
        </div>
        <button className="bg-white border border-slate-200 p-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
          <Filter size={20} />
        </button>
      </div>

      {view === "card" ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {paginatedPatients.map((patient, i) => (
              <motion.div
                key={patient._id || patient.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative"
              >
                <button 
                  onClick={() => setPatientToDelete(patient._id || patient.id)}
                  className="absolute top-4 left-4 p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>

                <Link to={`/patient/${patient._id || patient.id}`} className="block">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 font-bold group-hover:bg-blue-100 group-hover:text-blue-600 transition-all uppercase">
                        {(patient.name || 'P').charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 leading-none">{patient.name}</h3>
                        <p className="text-xs text-slate-500 mt-2">{patient.gender === 'Male' ? 'ذكر' : 'أنثى'} • {patient.age} عاماً</p>
                      </div>
                    </div>
                    {patient.balance && Number(patient.balance) > 0 && (
                      <div className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-red-200 flex items-center gap-1 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                        <span>دين: {Number(patient.balance).toLocaleString()} IQD</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Phone size={14} className="text-slate-400" />
                      <span>{patient.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Calendar size={14} className="text-slate-400" />
                      <span className="truncate">الأمراض: {patient.chronicDiseases || "لا يوجد"}</span>
                    </div>
                  </div>
                </Link>

                <div className="mt-6 flex gap-2">
                  <Link
                    to={`/patient/${patient._id || patient.id}`}
                    className="flex-1 bg-slate-50 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition-all text-center"
                  >
                    الملف الطبي
                  </Link>
                  <button className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-all">
                    حجز موعد
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          {filteredPatients.length === 0 && !searchTerm && (
            <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
              <p className="text-slate-400 italic">لا يوجد مرضى مسجلين حالياً.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">المريض</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">الهاتف</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">العمر/الجنس</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">الرصيد المتبقي</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedPatients.map((patient) => (
                <tr key={patient._id || patient.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-bold text-[10px] uppercase">
                        {(patient.name || 'P').charAt(0)}
                      </div>
                      <Link to={`/patient/${patient._id || patient.id}`} className="font-bold text-slate-900 hover:text-blue-600 transition-colors">{patient.name}</Link>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-slate-600 font-mono">{patient.phone}</td>
                  <td className="px-6 py-4 text-center text-sm text-slate-500">
                    {patient.age} عاماً / {patient.gender === 'Male' ? 'ذكر' : 'أنثى'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {patient.balance && Number(patient.balance) > 0 ? (
                      <span className="flex items-center justify-center gap-1.5 text-red-600 font-black text-sm">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                        {Number(patient.balance).toLocaleString()} IQD
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">---</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                       <Link to={`/patient/${patient._id || patient.id}`} className="p-2 text-slate-400 hover:text-blue-600 transition-all">
                        <ArrowUpRight size={18} />
                      </Link>
                      <button 
                        onClick={() => setPatientToDelete(patient._id || patient.id)}
                        className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">لا يوجد بيانات لعرضها</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500 font-medium">
            عرض <span className="text-slate-900 font-bold">{startIndex + 1}</span> إلى <span className="text-slate-900 font-bold">{Math.min(startIndex + itemsPerPage, totalItems)}</span> من أصل <span className="text-slate-900 font-bold">{totalItems}</span> مريض
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={20} />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-sm font-bold transition-all",
                    currentPage === page 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
                <h3 className="font-bold text-lg text-blue-900">إضافة مريض جديد</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddPatient} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={newPatient.name}
                    onChange={e => setNewPatient({...newPatient, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف</label>
                  <input 
                    required
                    type="tel" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={newPatient.phone}
                    onChange={e => setNewPatient({...newPatient, phone: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">العمر</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={newPatient.age}
                      onChange={e => setNewPatient({...newPatient, age: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الرصيد المتبقي (دين)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                      value={newPatient.balance}
                      onChange={e => setNewPatient({...newPatient, balance: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الجنس</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={newPatient.gender}
                      onChange={e => setNewPatient({...newPatient, gender: e.target.value})}
                    >
                      <option value="Male">ذكر</option>
                      <option value="Female">أنثى</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-4 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                  حفظ البيانات
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={!!patientToDelete} 
        onClose={() => setPatientToDelete(null)}
        onConfirm={handleDeletePatient}
        title="حذف مريض"
        message="هل أنت متأكد من رغبتك في حذف هذا المريض؟ سيتم حذف جميع بياناته وسجلاته."
        confirmText="تأكيد الحذف"
      />
    </div>
  );
}
