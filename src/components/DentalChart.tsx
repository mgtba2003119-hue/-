import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { 
  Check, 
  X, 
  Shield, 
  Info, 
  AlertTriangle, 
  Layers, 
  Trash2, 
  Heart, 
  Sparkles, 
  Smile, 
  Baby, 
  Zap,
  Activity,
  FileEdit,
  ClipboardList
} from "lucide-react";

export type ToothStatus = "Healthy" | "Decayed" | "RootCanal" | "Missing" | "Impaction" | "Crown" | "Filling" | "Extraction" | "Sensitive";

interface ToothData {
  id: number;
  status: ToothStatus;
  notes?: string;
}

interface DentalChartProps {
  initialData?: Record<number, ToothData>;
  onSave: (data: Record<number, ToothData>) => void;
  readOnly?: boolean;
}

// Rich clinical statuses configuration with localized labels, icon, color grades and styling
export const statusConfig: Record<ToothStatus, { 
  label: string; 
  color: string; 
  bg: string; 
  border: string;
  lightBg: string;
  glow: string;
  icon: any; 
  overlay: string;
}> = {
  Healthy: { 
    label: "سليم / طبيعي", 
    color: "text-emerald-700", 
    bg: "bg-emerald-500", 
    border: "border-emerald-200", 
    lightBg: "bg-emerald-50/50",
    glow: "shadow-emerald-100",
    icon: Shield, 
    overlay: "fill-emerald-100/40" 
  },
  Decayed: { 
    label: "تسوس نخر", 
    color: "text-amber-700", 
    bg: "bg-amber-500", 
    border: "border-amber-200", 
    lightBg: "bg-amber-50/50",
    glow: "shadow-amber-100",
    icon: AlertTriangle, 
    overlay: "fill-amber-500/20" 
  },
  RootCanal: { 
    label: "سحب عصب", 
    color: "text-purple-700", 
    bg: "bg-purple-500", 
    border: "border-purple-200", 
    lightBg: "bg-purple-50/50",
    glow: "shadow-purple-100",
    icon: Layers, 
    overlay: "fill-purple-500/20" 
  },
  Missing: { 
    label: "مفقود غائب", 
    color: "text-slate-500", 
    bg: "bg-slate-400", 
    border: "border-slate-200", 
    lightBg: "bg-slate-50/50",
    glow: "shadow-slate-100",
    icon: X, 
    overlay: "fill-slate-500/10 opacity-30 saturate-0" 
  },
  Impaction: { 
    label: "سن مطمور", 
    color: "text-sky-700", 
    bg: "bg-sky-500", 
    border: "border-sky-200", 
    lightBg: "bg-sky-50/50",
    glow: "shadow-sky-100",
    icon: Info, 
    overlay: "fill-sky-500/10" 
  },
  Crown: { 
    label: "تلبيسة / تاج", 
    color: "text-indigo-700", 
    bg: "bg-indigo-600", 
    border: "border-indigo-200", 
    lightBg: "bg-indigo-50/50",
    glow: "shadow-indigo-100",
    icon: Layers, 
    overlay: "fill-indigo-600/20" 
  },
  Filling: { 
    label: "حشوة سنية", 
    color: "text-teal-700", 
    bg: "bg-teal-500", 
    border: "border-teal-200", 
    lightBg: "bg-teal-50/50",
    glow: "shadow-teal-100",
    icon: Check, 
    overlay: "fill-teal-500/20" 
  },
  Extraction: { 
    label: "مقلوع جراحياً", 
    color: "text-rose-700", 
    bg: "bg-rose-500", 
    border: "border-rose-200", 
    lightBg: "bg-rose-50/40",
    glow: "shadow-rose-100",
    icon: Trash2, 
    overlay: "fill-rose-500/30 line-through" 
  },
  Sensitive: { 
    label: "حساسية مفرطة", 
    color: "text-rose-600", 
    bg: "bg-pink-500", 
    border: "border-pink-200", 
    lightBg: "bg-pink-50/50",
    glow: "shadow-pink-100",
    icon: Heart, 
    overlay: "fill-pink-500/20" 
  },
};

// Realistic clinical note templates to speed up diagnostic data entry
const noteTemplates = [
  "تسوس تاجي مبكر يحتاج حشوة تجميلية ملونة",
  "التهاب لب حاد بحاجة لعلاج جذور مكتمل وتلبيسة زيركون",
  "خضوع للخلع بسبب اللثة الضعيفة والتهابات متكررة",
  "حشوة أملغم قديمة وتتطلب استبدالاً بحشوة سيراميك تجميلية",
  "مطمور بالكامل بحاجة إلى كشف ومتابعة تقويمية",
  "حساسية مفرطة للمشروبات الساخنة والباردة تفرز علاج وقائي",
];

// Returns the correct tooth anatomical category
const getToothType = (id: number) => {
  const lastDigit = id % 10;
  if (lastDigit >= 6) return 'molar';
  if (lastDigit >= 4) return 'premolar';
  if (lastDigit === 3) return 'canine';
  return 'incisor';
};

// Returns localized Arabic medical name of specific tooth
const getToothArabicName = (id: number) => {
  const isChild = id >= 51 && id <= 85;
  const lastDigit = id % 10;
  
  if (isChild) {
    const names: Record<number, string> = {
      5: "الضرس اللبني الثاني (مؤخر)",
      4: "الضرس اللبني الأول (مقدم)",
      3: "الناب اللبني",
      2: "القاطع اللبني الجانبي",
      1: "القاطع اللبني المركزي"
    };
    return names[lastDigit] || `سن لبني #${id}`;
  } else {
    const names: Record<number, string> = {
      8: "ضرس العقل (الرحى الثالثة)",
      7: "الضرس الثاني (الرحى الثانية)",
      6: "الضرس الأول (الرحى الأولى)",
      5: "الضاحك الثاني (النواجذ الثاني)",
      4: "الضاحك الأول (النواجذ الأول)",
      3: "الناب",
      2: "القاطع الجانبي (الرباعية)",
      1: "القاطع المركزي (الثنايا)"
    };
    return names[lastDigit] || `سن دائم #${id}`;
  }
};

const getQuadrantArabicName = (id: number) => {
  if (id >= 11 && id <= 18) return "الربع العلوي الأيمن (Q1)";
  if (id >= 21 && id <= 28) return "الربع العلوي الأيسر (Q2)";
  if (id >= 31 && id <= 38) return "الربع السفلي الأيسر (Q3)";
  if (id >= 41 && id <= 48) return "الربع السفلي الأيمن (Q4)";
  
  if (id >= 51 && id <= 55) return "الربع العلوي الأيمن للأطفال (Q5)";
  if (id >= 61 && id <= 65) return "الربع العلوي الأيسر للأطفال (Q6)";
  if (id >= 71 && id <= 75) return "الربع السفلي الأيسر للأطفال (Q7)";
  if (id >= 81 && id <= 85) return "الربع السفلي الأيمن للأطفال (Q8)";
  
  return "غير معروف";
};

// Exquisite Tooth Drawing Component (Highly realistic clinical-grade with roots & crown rendering)
const ToothSVG = ({ 
  type, 
  className, 
  isUpper, 
  status 
}: { 
  type: 'molar' | 'premolar' | 'incisor' | 'canine', 
  className?: string, 
  isUpper: boolean, 
  status: ToothStatus 
}) => {
  const gradientId = `tooth-grad-${type}-${isUpper ? 'up' : 'down'}`;
  
  // Realistic clinical anatomical paths mapped inside viewBox 0 0 24 44
  // Roots are at Y: 2..22, cervical line at Y: 22..24, crown is at Y: 24..41
  const paths = {
    molar: {
      roots: "M 6,21 C 5,15 3.5,9 5.5,3 C 7.5,3 8.5,8 10,13 C 10.5,10 11.5,6 12,3 C 12.5,6 13.5,10 14,13 C 15.5,8 16.5,3 18.5,3 C 20.5,9 19,15 18,21 Z",
      crown: "M 5,21 C 2.5,22 2,26 2.5,31 C 3.5,36 7,41 12,41 C 17,41 20.5,36 21.5,31 C 22,26 21.5,22 19,21 Z",
      fissures: "M 5,26 C 8,25 16,25 19,26 M 12,21 L 12,39 M 7,31 C 10,30 14,30 17,31",
      canals: ["M 12,21 L 6,10", "M 12,21 L 12,7", "M 12,21 L 18,10"],
      filling: "M 7,25 H 17 V 32 H 7 Z",
      decay: "M 10,28 Q 12,26 14,29 Q 13,32 11,31 Z"
    },
    premolar: {
      roots: "M 7,21 C 6,15 5,9 9,4 C 10,7 11,11 12,13 C 13,11 14,7 15,4 C 19,9 18,15 17,21 Z",
      crown: "M 6,21 C 3.5,22 3,25.5 4,29.5 C 5,34.5 8,39.5 12,39.5 C 16,39.5 19,34.5 20,29.5 C 21,25.5 20.5,22 18,21 Z",
      fissures: "M 6,26 C 9,25 15,25 18,26 M 12,21 L 12,35",
      canals: ["M 12,21 L 9,11", "M 12,21 L 15,11"],
      filling: "M 8,26 H 16 V 32 H 8 Z",
      decay: "M 10,27 Q 12,25 13,29 Q 11,30 10,28 Z"
    },
    canine: {
      roots: "M 8,21 C 7,15 7.5,8.5 12,2 C 16.5,8.5 17,15 16,21 Z",
      crown: "M 6,21 C 4,23 4,27 5,31 L 12,40 L 19,31 C 20,27 20,23 18,21 Z",
      fissures: "M 12,21 L 12,36",
      canals: ["M 12,21 L 12,6"],
      filling: "M 10,23 H 14 V 31 L 12,34 Z",
      decay: "M 11,26 Q 12,25 13,27 Q 12.5,29 11.5,28 Z"
    },
    incisor: {
      roots: "M 8.5,21 C 7.5,15 7.5,9.5 12,3 C 16.5,9.5 16.5,15 15.5,21 Z",
      crown: "M 6.5,21 C 5,22.5 4,26 4,31 L 6,39 C 8,40 16,40 18,39 L 20,31 C 20,26 19,22.5 17.5,21 Z",
      fissures: "M 7,35 H 17 M 12,21 L 12,35",
      canals: ["M 12,21 L 12,6"],
      filling: "M 8,24 H 16 V 30 H 8 Z",
      decay: "M 11,27 Q 12.5,25.5 13.5,28 Q 12,30 10.5,29 Z"
    }
  };

  const p = paths[type];

  // Colors based on Status (Zirconia White vs Golden Crown)
  const isCrown = status === "Crown";
  const crownFill = isCrown ? "url(#gold-crown-grad)" : `url(#enamel-grad)`;
  const crownStroke = isCrown ? "#ca8a04" : "#94a3b8";

  return (
    <svg 
      viewBox="0 0 24 44" 
      className={cn("w-full h-full filter saturate-[1.15]", className)} 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Enamel Gradient: Soft biological white shine */}
        <radialGradient id="enamel-grad" cx="50%" cy="65%" r="65%" fx="45%" fy="60%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#FFFDF4" />
          <stop offset="90%" stopColor="#F6F4ED" />
          <stop offset="100%" stopColor="#DDD8C1" />
        </radialGradient>
        
        {/* Cementum Root Gradient */}
        <linearGradient id="root-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E2DEC9" />
          <stop offset="60%" stopColor="#ECEDE6" />
          <stop offset="100%" stopColor="#D2CBB7" />
        </linearGradient>

        {/* Premium Gold Crown Cap */}
        <radialGradient id="gold-crown-grad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="40%" stopColor="#EAB308" />
          <stop offset="85%" stopColor="#A16207" />
          <stop offset="100%" stopColor="#713F12" />
        </radialGradient>

        {/* Silver Amalgam Filling */}
        <linearGradient id="silver-filling-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="40%" stopColor="#94A3B8" />
          <stop offset="75%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>

        <filter id="fissure-blur-soft">
          <feGaussianBlur stdDeviation="0.2" />
        </filter>
      </defs>

      {/* Main vertical layout mirroring. If upper teeth: roots UP, crown DOWN. If lower teeth: roots DOWN, crown UP */}
      <g transform={isUpper ? undefined : "scale(1, -1) translate(0, -44)"}>
        {/* Soft shadow */}
        <path d={p.roots} fill="#475569" className="opacity-10 translate-y-0.5" />
        <path d={p.crown} fill="#475569" className="opacity-10 translate-y-0.5" />

        {/* Root rendering */}
        <path 
          d={p.roots} 
          fill="url(#root-grad)" 
          stroke={status === "Impaction" ? "#3b82f6" : "#B4AD97"} 
          strokeWidth="0.5" 
          className="transition-all duration-300"
        />

        {/* Crown rendering */}
        <path 
          d={p.crown} 
          fill={crownFill} 
          stroke={crownStroke} 
          strokeWidth="0.55" 
          className="transition-all duration-300"
        />

        {/* Fissures contours details */}
        <path 
          d={p.fissures} 
          fill="none" 
          stroke="#57534E" 
          strokeWidth="0.32" 
          strokeLinecap="round" 
          filter="url(#fissure-blur-soft)" 
          className="opacity-45" 
        />

        {/* CLINICAL STATUS OVERLAYS (Highly Realistic rendering) */}
        
        {/* 1. CLINICAL FILLING: rendered directly on crown */}
        {status === "Filling" && (
          <path 
            d={p.filling} 
            fill="url(#silver-filling-grad)" 
            stroke="#334155" 
            strokeWidth="0.4"
            className="animate-fade-in" 
          />
        )}

        {/* 2. CLINICAL DECAY/CAVITY: rendered directly on enamel fissures */}
        {status === "Decayed" && (
          <path 
            d={p.decay} 
            fill="#451a03" 
            stroke="#f43f5e" 
            strokeWidth="0.4"
            className="animate-pulse" 
          />
        )}

        {/* 3. CLINICAL ROOT CANAL TREATMENT: rendered directly inside root canals */}
        {status === "RootCanal" && (
          <g>
            {p.canals.map((canalPath, index) => (
              <path 
                key={index}
                d={canalPath} 
                fill="none" 
                stroke="#d946ef" 
                strokeWidth="1.25" 
                strokeLinecap="round"
                className="shadow-md"
              />
            ))}
          </g>
        )}

        {/* 4. SENSITIVE: Coral-glow border warning around enamel */}
        {status === "Sensitive" && (
          <path 
            d={p.crown} 
            fill="none" 
            stroke="#f43f5e" 
            strokeWidth="1.2" 
            strokeDasharray="1, 1"
          />
        )}

        {/* 5. IMPACTION / RETENTION: translucent blue-shadowing bone overlay */}
        {status === "Impaction" && (
          <path 
            d={p.roots} 
            fill="#2563eb" 
            fillOpacity="0.1" 
            stroke="#3b82f6" 
            strokeWidth="0.5" 
            strokeDasharray="2, 1" 
          />
        )}

        {/* 6. EXTRACTION: Red empty placeholder marker */}
        {status === "Extraction" && (
          <g>
            <path d="M 5,10 L 19,34" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 19,10 L 5,34" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}
      </g>
    </svg>
  );
};

export default function DentalChart({ initialData = {}, onSave, readOnly = false }: DentalChartProps) {
  const [teeth, setTeeth] = useState<Record<number, ToothData>>(initialData || {});
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [ageGroup, setAgeGroup] = useState<"adults" | "kids">("adults");

  React.useEffect(() => {
    if (initialData && JSON.stringify(initialData) !== JSON.stringify(teeth)) {
      setTeeth(initialData);
    }
  }, [initialData]);

  // Handle setting status for the selected tooth
  const handleStatusChange = (status: ToothStatus) => {
    if (readOnly) return;
    if (selectedTooth === null) return;
    const currentNotes = teeth[selectedTooth]?.notes || "";
    const newTeeth = {
      ...teeth,
      [selectedTooth]: { id: selectedTooth, status, notes: currentNotes },
    };
    setTeeth(newTeeth);
    onSave(newTeeth);
  };

  // Handle notes change
  const handleNotesChange = (notes: string) => {
    if (readOnly) return;
    if (selectedTooth === null) return;
    const currentStatus = teeth[selectedTooth]?.status || "Healthy";
    const newTeeth = {
      ...teeth,
      [selectedTooth]: { id: selectedTooth, status: currentStatus, notes },
    };
    setTeeth(newTeeth);
    onSave(newTeeth);
  };

  // Settle individual tooth status clear
  const handleClearTooth = () => {
    if (readOnly) return;
    if (selectedTooth === null) return;
    const newTeeth = { ...teeth };
    delete newTeeth[selectedTooth];
    setTeeth(newTeeth);
    onSave(newTeeth);
  };

  // Define structured teeth alignments
  // Adult permanent teeth FDI: Q1 & Q2 on top row, Q4 & Q3 on bottom row
  const adultUpperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const adultUpperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  
  const adultLowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  const adultLowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  // Kids deciduous teeth FDI: Q5 & Q6 on top row, Q8 & Q7 on bottom row
  const kidUpperRight = [55, 54, 53, 52, 51];
  const kidUpperLeft = [61, 62, 63, 64, 65];

  const kidLowerRight = [85, 84, 83, 82, 81];
  const kidLowerLeft = [71, 72, 73, 74, 75];

  // Render a single tooth controller block
  const renderToothCell = (id: number) => {
    const data = teeth[id] || { id, status: "Healthy" as ToothStatus };
    const config = statusConfig[data.status] || statusConfig.Healthy;
    const isSelected = selectedTooth === id;
    const type = getToothType(id);
    const isUpper = (id >= 11 && id <= 28) || (id >= 51 && id <= 65);
    const hasCustomNotes = !!data.notes;

    return (
      <button
        key={id}
        id={`tooth-cell-${id}`}
        type="button"
        onClick={() => setSelectedTooth(id)}
        className={cn(
          "flex flex-col items-center justify-between p-0.5 sm:p-1 rounded-lg sm:rounded-xl transition-all duration-300 border h-24 sm:h-28 flex-1 min-w-[24px] sm:min-w-[28px] md:min-w-[32px] max-w-[42px] shrink relative group",
          isSelected 
            ? "bg-blue-50/85 border-blue-500 shadow-md ring-2 ring-blue-400/20 scale-102" 
            : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 hover:shadow-xs hover:-translate-y-0.5",
          data.status !== "Healthy" && !isSelected && "bg-slate-50/50"
        )}
      >
        {/* Symmetrical Top/Bottom Indicators */}
        <div className="flex items-center justify-between w-full text-[9px] font-black text-slate-400 px-0.5">
          <span className={cn(
            "font-mono transition-colors", 
            isSelected ? "text-blue-600 animate-pulse" : "text-slate-500",
            data.status !== "Healthy" && "text-slate-700 font-extrabold"
          )}>
            {id}
          </span>
          {hasCustomNotes && (
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" title="ملاحظات تشخيصية" />
          )}
        </div>

        {/* Dynamic High Quality Graphic SVG */}
        <div className={cn(
          "w-full h-11 xs:h-12 sm:h-14 md:h-16 transition-transform duration-300 group-hover:scale-105 my-1 flex items-center justify-center",
          data.status === "Missing" && "opacity-20 saturate-0 scale-90",
          data.status === "Extraction" && "opacity-10 scale-75"
        )}>
          <ToothSVG type={type} isUpper={isUpper} status={data.status} />
        </div>

        {/* Minimalist Status Badge Indicator */}
        <div className="w-full flex items-center justify-center">
          {data.status === "Healthy" ? (
            <span className="text-[7.5px] text-slate-400 font-bold group-hover:text-slate-600">سليم</span>
          ) : (
            <div className={cn(
              "text-[7px] font-bold px-0.5 py-0.5 rounded-sm sm:rounded-md flex items-center justify-center text-white w-full max-w-[38px] leading-none",
              config.bg
            )}>
              <span className="truncate">{config.label.split(" ")[0]}</span>
            </div>
          )}
        </div>

        {/* Selected Highlight Borders Overlay */}
        {isSelected && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 rounded-b-lg sm:rounded-b-xl" />
        )}
      </button>
    );
  };

  // Quick statistical overview calculated in real-time
  const statusCounts = (Object.values(teeth) as ToothData[]).reduce((acc, current) => {
    if (current && current.status !== "Healthy") {
      acc[current.status] = (acc[current.status] || 0) + 1;
    }
    return acc;
  }, {} as Record<ToothStatus, number>);

  const totalDiagnosed = (Object.values(teeth) as ToothData[]).filter(t => t && t.status !== "Healthy").length;

  return (
    <div className="bg-slate-50/50 p-3 sm:p-5 lg:p-6 rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-xs relative text-right" dir="rtl" id="dental-chart-root">
      
      {/* 1. Header & Controls Workspace */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-200/60 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-md">
              <Activity size={20} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">مخطط الأسنان السريري المطور</h3>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">لوحة تشخيصية تفاعلية ثنائية الأبعاد (FDI) لإدارة حالات فكي المريض وسجل العلاج</p>
            </div>
          </div>
        </div>

        {/* Interactive Responsive Age Switcher */}
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs scale-95 md:scale-100 shrink-0">
          <button
            type="button"
            onClick={() => {
              setAgeGroup("adults");
              setSelectedTooth(null);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all",
              ageGroup === "adults" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <span>👨‍💼 الأسنان الدائمة للبالغين</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md group-hover:bg-slate-200">32 سن</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAgeGroup("kids");
              setSelectedTooth(null);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all",
              ageGroup === "kids" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Baby size={14} className={cn(ageGroup === "kids" ? "text-amber-400" : "text-slate-400")} />
            <span>👶 الأسنان اللبنية للأطفال</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md">20 سن</span>
          </button>
        </div>
      </div>

      {/* 2. Visual Clinic Status Indicator Legend */}
      <div className="flex flex-wrap gap-2 mb-6 p-3 bg-white rounded-2xl border border-slate-200/60 shadow-xxs">
        <span className="text-xs font-extrabold text-slate-600 self-center ml-2">دليل الحالة السريرية:</span>
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = statusCounts[key as ToothStatus] || 0;
          return (
            <div 
              key={key} 
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs",
                count > 0 ? "border-slate-300 bg-slate-50/50" : "border-slate-100 bg-white"
              )}
            >
              <div className={cn("w-2.5 h-2.5 rounded-full", config.bg)} />
              <span className="font-extrabold text-slate-700">{config.label.split(" / ")[0]}</span>
              {count > 0 && (
                <span className={cn("text-[9px] font-black px-1.5 py-0.2 rounded-full text-white", config.bg)}>
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Symmetrical Full Mouth Workstation Grid (Saves scrolling down) */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 p-3 sm:p-4 md:p-5 shadow-xxs mb-8 overflow-hidden relative">
        
        {/* Subtle dental midlines */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200 border-dashed pointer-events-none z-0" />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-200 border-dashed pointer-events-none z-0" />

        {/* Scroll helper indicator on mobile */}
        <div className="block lg:hidden text-center text-[10px] text-slate-400 font-bold mb-3 bg-slate-50 py-1.5 rounded-lg border border-slate-100">
          ← اسحب المخطط أفقياً لتصفح كامل الأسنان بدقة →
        </div>

        <div className="overflow-x-auto scrollbar-none pb-4 z-10 relative">
          <div className="min-w-[500px] lg:min-w-0 lg:w-full space-y-8 py-2">
            
            {/* UPPER JAW SECTION */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-4 pb-1">
                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
                  الفك العلوي - الأيمن (Q1)
                </span>
                <span className="text-xs font-black text-slate-700 tracking-tight flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  الفك العلوي للمريض (Maxilla)
                </span>
                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
                  الفك العلوي - الأيسر (Q2)
                </span>
              </div>

              <div className="flex items-center justify-between gap-1 sm:gap-2">
                {/* Upper Right Quadrant (Shows Right-to-Left visually) */}
                <div className="flex items-center justify-end gap-1 flex-1 min-w-0 border-r border-slate-100 pr-1 sm:pr-2">
                  {ageGroup === "adults" 
                    ? adultUpperRight.map(id => renderToothCell(id)) 
                    : kidUpperRight.map(id => renderToothCell(id))
                  }
                </div>

                {/* Symmetrical Central Line (Mouth center) */}
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 text-[10px] font-black flex items-center justify-center border border-slate-200 shadow-inner">
                    CL
                  </div>
                </div>

                {/* Upper Left Quadrant (Shows Left-to-Right visually) */}
                <div className="flex items-center justify-start gap-1 flex-1 min-w-0 border-l border-slate-100 pl-1 sm:pl-2">
                  {ageGroup === "adults" 
                    ? adultUpperLeft.map(id => renderToothCell(id)) 
                    : kidUpperLeft.map(id => renderToothCell(id))
                  }
                </div>
              </div>
            </div>

            {/* LOWER JAW SECTION */}
            <div className="space-y-2 pt-4">
              <div className="flex items-center justify-between px-4 pb-1">
                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
                  الفك السفلي - الأيمن (Q4)
                </span>
                <span className="text-xs font-black text-slate-700 tracking-tight flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  الفك السفلي للمريض (Mandible)
                </span>
                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
                  الفك السفلي - الأيسر (Q3)
                </span>
              </div>

              <div className="flex items-center justify-between gap-1 sm:gap-2">
                {/* Lower Right Quadrant */}
                <div className="flex items-center justify-end gap-1 flex-1 min-w-0 border-r border-slate-100 pr-1 sm:pr-2">
                  {ageGroup === "adults" 
                    ? adultLowerRight.map(id => renderToothCell(id)) 
                    : kidLowerRight.map(id => renderToothCell(id))
                  }
                </div>

                {/* Symmetrical Central Line */}
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 text-[10px] font-black flex items-center justify-center border border-slate-200 shadow-inner">
                    CL
                  </div>
                </div>

                {/* Lower Left Quadrant */}
                <div className="flex items-center justify-start gap-1 flex-1 min-w-0 border-l border-slate-100 pl-1 sm:pl-2">
                  {ageGroup === "adults" 
                    ? adultLowerLeft.map(id => renderToothCell(id)) 
                    : kidLowerLeft.map(id => renderToothCell(id))
                  }
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 4. Diagnostics & Treatment Panel Below the Chart (Seamless 1-Click flow with no jarring modals) */}
      <AnimatePresence mode="wait">
        {selectedTooth !== null ? (
          <motion.div
            key={`diagnostic-workarea-${selectedTooth}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-[2rem] border border-blue-100 shadow-md p-6 relative overflow-hidden"
          >
            {/* Ambient Background Accent Glow */}
            <div className="absolute top-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -ml-24 -mt-24 pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-5 mb-6">
              
              {/* Selected Tooth Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex flex-col items-center justify-center shadow-md shadow-blue-100 shrink-0">
                  <span className="text-[9px] font-black tracking-widest opacity-80 uppercase leading-none">الأسن</span>
                  <span className="text-2xl font-black leading-tight mt-0.5 font-mono">{selectedTooth}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-lg text-slate-800">{getToothArabicName(selectedTooth)}</h4>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">
                      {getQuadrantArabicName(selectedTooth)}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1 font-medium">
                    الرجاء تحديد الحالة السريرية الحالية لهذا السن وإضافة أي ملاحظات أو توصيات طبية ملائمة.
                  </p>
                </div>
              </div>

              {/* Close / Action controls */}
              <div className="flex gap-2 w-full lg:w-auto shrink-0">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={handleClearTooth}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200/80 rounded-xl text-xs font-bold transition-all relative"
                    title="إلغاء التشخيص للسن والرجوع كطبيعي"
                  >
                    <Trash2 size={14} />
                    <span>إعادة ضبط كسن سليم</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedTooth(null)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black transition-all flex-1 lg:flex-initial"
                >
                  <span>{readOnly ? "إغلاق المعاينة" : "موافق وحفظ التعديلات"}</span>
                </button>
              </div>
            </div>

            {/* Diagonal Grid Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Instant Status Grid Selection */}
              <div className="lg:col-span-7">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={14} className="text-amber-500" />
                  <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider">الحالة والتصنيف السريري للسن {readOnly && "(مغلق)"}</h5>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(statusConfig).map(([key, config]) => {
                    const isCurrentStatus = (teeth[selectedTooth]?.status || "Healthy") === key;
                    const ToothIcon = config.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => !readOnly && handleStatusChange(key as ToothStatus)}
                        disabled={readOnly}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-2xl border transition-all text-right group",
                          isCurrentStatus 
                            ? "bg-white border-blue-600 shadow-xs ring-1 ring-blue-600/50" 
                            : "bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xxs border-slate-200/80",
                          readOnly && "opacity-75 cursor-not-allowed"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xxs transition-transform duration-300 group-hover:scale-105 shrink-0",
                          config.bg
                        )}>
                          <ToothIcon size={14} />
                        </div>
                        <div className="overflow-hidden">
                          <span className={cn(
                            "block text-[11px] font-black truncate",
                            isCurrentStatus ? "text-blue-700" : "text-slate-800"
                          )}>
                            {config.label}
                          </span>
                          <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            DIAGNOSTIC
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Custom notes & templates area */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <FileEdit size={14} className="text-indigo-500" />
                    <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider">ملاحظات الطبيب وتوصيات العلاج {readOnly && "(عرض فقط)"}</h5>
                  </div>
                  
                  {/* Notes Textarea */}
                  <textarea
                    id="tooth-custom-notes"
                    value={teeth[selectedTooth]?.notes || ""}
                    onChange={(e) => !readOnly && handleNotesChange(e.target.value)}
                    readOnly={readOnly}
                    placeholder={readOnly ? "لا توجد ملاحظات إضافية." : "أدخل أي ملاحظات علاجية إضافية، تاريخ البدء، تفاصيل الحشوة أو نوع التلبيسة..."}
                    className={cn(
                      "w-full h-24 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:bg-white outline-none transition-all resize-none text-right",
                      readOnly && "cursor-not-allowed bg-slate-100/60"
                    )}
                    dir="rtl"
                  />
                </div>

                {/* Templates presets */}
                {!readOnly && (
                  <div className="mt-4">
                    <div className="text-[10px] text-slate-400 font-bold mb-2">قوالب وتوصيات سريعة بنقرة واحدة:</div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-none pb-1">
                      {noteTemplates.map((tpl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleNotesChange(tpl)}
                          className="text-[9px] bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 px-2 py-1 rounded-lg block font-medium transition-all text-right max-w-full truncate"
                        >
                          {tpl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty-diagnostic-prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-slate-100/40 rounded-[2rem] border border-slate-200/60 p-8 text-center flex flex-col items-center justify-center gap-3 relative py-12"
          >
            <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400 shadow-xxs">
              <ClipboardList size={22} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-700">لم تقم بتحديد أي سن حالياً</p>
              <p className="text-xs text-slate-500 mt-1 font-medium max-w-md mx-auto">
                اضغط على أي سن في المخطط السريري أعلاه لتوضيح حالته السنية، لإضافة تشخيص نخر أو علاج عصب، أو لتعديل الملاحظات الفورية والوصول لملخص الطبي لمريضك.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
