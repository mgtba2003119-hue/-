import React, { createContext, useContext, useState } from 'react';

interface ThemeContextType {
  clinicName: string;
  doctorName: string;
  setClinicName: (name: string) => void;
  setDoctorName: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [clinicName, setClinicNameState] = useState(() => localStorage.getItem("clinicName") || "عيادة الغانم التخصصية");
  const [doctorName, setDoctorNameState] = useState(() => localStorage.getItem("doctorName") || "الدكتور أحمد غانم");

  const setClinicName = (name: string) => {
    setClinicNameState(name);
    localStorage.setItem("clinicName", name);
  };

  const setDoctorName = (name: string) => {
    setDoctorNameState(name);
    localStorage.setItem("doctorName", name);
  };

  return (
    <ThemeContext.Provider value={{ clinicName, doctorName, setClinicName, setDoctorName }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
