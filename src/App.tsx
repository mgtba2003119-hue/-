/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import { ThemeProvider } from "./context/ThemeContext";
import { useAuth } from "./hooks/useAuth";
import { apiService } from "./services/apiService";

// Lazy load pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Patients = lazy(() => import("./pages/Patients"));
const Appointments = lazy(() => import("./pages/Appointments"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const Invite = lazy(() => import("./pages/Invite"));
const Login = lazy(() => import("./pages/Login"));
const Activate = lazy(() => import("./pages/Activate"));
const Download = lazy(() => import("./pages/Download"));

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-xs font-bold uppercase tracking-widest">تحميل النظام...</p>
    </div>
  </div>
);

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [isActivated, setIsActivated] = useState(true);

  const checkLicense = async () => {
    try {
      const status = await apiService.getLicenseStatus();
      if (status && typeof status.activated !== "undefined") {
        setIsActivated(!!status.activated);
      }
    } catch (err) {
      console.warn("Could not check license status on load:", err);
    }
  };

  useEffect(() => {
    checkLicense();
  }, []);

  // Public Invite Route Bypass
  if (window.location.pathname.startsWith('/invite/')) {
    return (
      <Routes>
        <Route path="/invite/:token" element={<Invite />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (licenseLoading || authLoading) {
    return <LoadingScreen />;
  }

  if (!isActivated) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Activate onActivated={checkLicense} />
      </Suspense>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/download" element={<Download />} />
          <Route path="/invite/:token" element={<Invite />} />
          <Route path="/patient/:id" element={<PatientDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-900">
          <AppContent />
        </div>
      </Router>
    </ThemeProvider>
  );
}

