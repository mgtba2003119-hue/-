import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Settings, LogOut, Search, Bell, Wifi, WifiOff, ShieldCheck, Stethoscope } from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../context/ThemeContext";
import { useState, useEffect } from "react";
import { apiService } from "../services/apiService";

const navItems = [
  { icon: LayoutDashboard, label: "لوحة التحكم", path: "/" },
  { icon: Users, label: "المرضى", path: "/patients" },
  { icon: Calendar, label: "المواعيد", path: "/appointments" },
  { icon: Settings, label: "الإعدادات", path: "/settings" },
];

export default function Layout() {
  const location = useLocation();
  const { clinicName, doctorName } = useTheme();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [license, setLicense] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  useEffect(() => {
    const fetchLicense = async () => {
      const data = await apiService.getLicenseStatus();
      setLicense(data);
    };
    fetchLicense();
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Stethoscope size={20} />
            </div>
            {clinicName}
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-blue-50 text-blue-600 font-medium" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
          {license?.activated && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-bold bg-blue-50 text-blue-600">
              <ShieldCheck size={14} />
              <span>متبقي {license.daysLeft} يوم اشتراك</span>
            </div>
          )}
          <div className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-bold transition-all",
            isOnline ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600 animate-pulse"
          )}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isOnline ? "متصل مباشر" : "يعمل بدون إنترنت (Offline)"}</span>
          </div>
          <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-full w-96">
            <Search size={18} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="بحث عن مريض أو موعد..." 
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setHasUnread(false);
                }}
                className="relative text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-all"
              >
                <Bell size={22} />
                {hasUnread && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <>
                  {/* Backdrop to close the dropdown when clicking outside ("ومن يضغط عليها ويطلع") */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute left-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 transition-all animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <h3 className="font-semibold text-slate-800 text-sm">الإشعارات</h3>
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">جديد</span>
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-50 flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          ت
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-slate-900">تحديث 0.1</p>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            تم إصدار التحديث بنجاح! تم إلغاء خاصية حذف حسابات وملفات المرضى لحفظ البيانات من التلف أو الحذف العرضي.
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">الآن</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3 border-r pr-6 transition-all">
              <div className="text-left text-right">
                <p className="text-sm font-semibold">{doctorName}</p>
                <p className="text-xs text-slate-500">طبيب عام</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm">
                د
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
