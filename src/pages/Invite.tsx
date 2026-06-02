import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Monitor, ShieldCheck, Zap, AlertTriangle, Loader2 } from "lucide-react";
import { apiService } from "../services/apiService";

export default function Invite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);

  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setError("رابط غير صحيح");
        setLoading(false);
        return;
      }

      try {
        const data = await apiService.getInvite(token);

        if (data) {
          if (data.used) {
            setError("هذا الرابط تم استخدامه مسبقاً ولم يعد صالحاً.");
          } else {
            setInviteData(data);
          }
        } else {
          setError("الرابط الذي تحاول استخدامه غير موجود أو انتهت صلاحيته.");
        }
      } catch (err) {
        console.error(err);
        setError("الرابط غير موجود أو انتهت صلاحيته.");
      } finally {
        setLoading(false);
      }
    }
    checkToken();
  }, [token]);

  const handleAcceptInvite = async () => {
    setLoading(true);
    try {
      await apiService.acceptInvite(token!);
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء تفعيل الرابط. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-bold">جاري التحقق من صلاحية الرابط...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="bg-red-50 rounded-[3rem] p-12 border border-red-100 space-y-8">
           <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto">
             <AlertTriangle className="w-10 h-10 text-red-600" />
           </div>
           <h1 className="text-3xl font-black text-slate-900">رابط غير صالح</h1>
           <p className="text-slate-600 text-lg leading-relaxed">{error}</p>
           <button 
            onClick={() => navigate("/")}
            className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold"
           >
            العودة للرئيسية
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 space-y-12 text-right" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 rounded-[4rem] p-12 md:p-20 text-white text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[120px] opacity-20 -mr-32 -mt-32"></div>
        
        <div className="relative z-10 space-y-10">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 backdrop-blur-md text-blue-300 text-sm font-bold border border-white/10 uppercase tracking-widest">
            دعوة خاصة للطبيب
          </div>

          <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight">
            مرحباً بك في <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">الغانم clinic</span>
          </h1>

          <p className="text-blue-100/70 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
             لقد تلقيت رابطاً خاصاً للدخول إلى المنصة. هذا الرابط صالح للاستخدام لمرة واحدة فقط لضمان خصوصية بياناتك وأمن المنصة. يمكنك الآن البدء باستخدام كافة المميزات السحابية مباشرة من المتصفح.
          </p>

          <div className="pt-6">
            <button 
              onClick={handleAcceptInvite}
              className="group relative inline-flex items-center gap-6 px-16 py-8 rounded-[2.5rem] font-black text-2xl shadow-3xl bg-white text-blue-700 hover:scale-[1.03] transition-all active:scale-95"
            >
              <Zap className="w-8 h-8 text-blue-600" />
              ابدأ الآن مجاناً
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-10 text-sm font-bold text-white/40 pt-10 border-t border-white/10">
             <div className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-green-400" /> تشفير آمن 256-bit</div>
             <div className="flex items-center gap-3"><Zap className="w-5 h-5 text-yellow-400" /> تحديثات سحابية فورية</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
         <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
               <ShieldCheck className="text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">أمان البيانات</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
               بيانات المرضى والملفات الطبية يتم تشفيرها وحفظها في خوادم سحابية آمنة تضمن لك الوصول إليها من أي مكان.
            </p>
         </div>
         <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
               <Zap className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">سهولة الاستخدام</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
               واجهة الغانم clinic مصممة لتكون بسيطة وسريعة، مما يساعدك على التركيز على رعاية مرضاك بدلاً من التعقيدات التقنية.
            </p>
         </div>
      </div>
    </div>
  );
}
