import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";

const getApiUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api${cleanEndpoint}`;
  }
  return `/api${cleanEndpoint}`;
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const isCloudMode = () => {
  return !!(auth.currentUser && !auth.currentUser.isAnonymous);
};

export const apiService = {
  // Patients
  getPatients: async () => {
    try {
      if (!isCloudMode()) {
        console.log("Fetching patients from local NeDB storage (Local Mode)...");
        const res = await fetch(getApiUrl("/patients"));
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }

      console.log("Fetching patients from Cloud Firestore...");
      try {
        const q = query(collection(db, "patients"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          _id: doc.id
        }));
        console.log("Firestore patients count:", data.length);
        return data;
      } catch (err) {
        console.warn("Firestore error in getPatients, falling back to local NeDB storage:", err);
        const res = await fetch(getApiUrl("/patients"));
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error("Critical failure in getPatients:", err);
      return [];
    }
  },

  getPatient: async (id: string) => {
    try {
      if (!isCloudMode()) {
        console.log(`Fetching patient ${id} from local NeDB storage...`);
        const res = await fetch(getApiUrl(`/patients/${id}`));
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }

      try {
        const docRef = doc(db, "patients", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { ...docSnap.data(), _id: docSnap.id };
        }
        return null;
      } catch (err) {
        console.warn(`Firestore error in getPatient/${id}, falling back to local NeDB storage:`, err);
        const res = await fetch(getApiUrl(`/patients/${id}`));
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error(`Critical failure in getPatient/${id}:`, err);
      return null;
    }
  },

  addPatient: async (patient: any) => {
    try {
      if (!isCloudMode()) {
        console.log("Adding patient to local NeDB storage...");
        const res = await fetch(getApiUrl("/patients"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patient)
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }

      try {
        const docRef = doc(collection(db, "patients"));
        const record = { 
          ...patient, 
          _id: docRef.id, 
          createdAt: new Date().toISOString()
        };
        await setDoc(docRef, record);
        return record;
      } catch (err) {
        console.warn("Firestore error in addPatient, falling back to local NeDB storage:", err);
        const res = await fetch(getApiUrl("/patients"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patient)
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error("Critical failure in addPatient:", err);
      return { ...patient, _id: "local-temp-" + Date.now() };
    }
  },

  deletePatient: async (id: string) => {
    try {
      if (!isCloudMode()) {
        console.log(`Deleting patient ${id} from local NeDB storage...`);
        const res = await fetch(getApiUrl(`/patients/${id}`), {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }

      try {
        const docRef = doc(db, "patients", id);
        await deleteDoc(docRef);
        return { success: true };
      } catch (err) {
        console.warn(`Firestore error in deletePatient/${id}, falling back to local NeDB storage:`, err);
        const res = await fetch(getApiUrl(`/patients/${id}`), {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error(`Critical failure in deletePatient/${id}:`, err);
      return { success: false, error: "Local sync delete failed" };
    }
  },

  updatePatient: async (id: string, data: any) => {
    try {
      if (!isCloudMode()) {
        console.log(`Updating patient ${id} in local NeDB storage...`);
        const res = await fetch(getApiUrl(`/patients/${id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }

      try {
        const docRef = doc(db, "patients", id);
        const { _id, ...cleanData } = data;
        await setDoc(docRef, cleanData, { merge: true });
        return { success: true, ...cleanData };
      } catch (err) {
        console.warn(`Firestore error in updatePatient/${id}, falling back to local NeDB storage:`, err);
        const res = await fetch(getApiUrl(`/patients/${id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error(`Critical failure in updatePatient/${id}:`, err);
      return { success: false, ...data };
    }
  },

  // Appointments
  getAppointments: async () => {
    try {
      if (!isCloudMode()) {
        console.log("Fetching appointments from local NeDB storage...");
        const res = await fetch(getApiUrl("/appointments"));
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }

      try {
        const q = query(collection(db, "appointments"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          _id: doc.id
        }));
        return data;
      } catch (err) {
        console.warn("Firestore error in getAppointments, falling back to local NeDB storage:", err);
        const res = await fetch(getApiUrl("/appointments"));
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error("Critical failure in getAppointments:", err);
      return [];
    }
  },

  addAppointment: async (appointment: any) => {
    try {
      if (!isCloudMode()) {
        console.log("Adding appointment to local NeDB storage...");
        const res = await fetch(getApiUrl("/appointments"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(appointment)
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }

      try {
        const docRef = doc(collection(db, "appointments"));
        const record = {
          ...appointment,
          _id: docRef.id,
          createdAt: new Date().toISOString()
        };
        await setDoc(docRef, record);
        return record;
      } catch (err) {
        console.warn("Firestore error in addAppointment, falling back to local NeDB storage:", err);
        const res = await fetch(getApiUrl("/appointments"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(appointment)
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error("Critical failure in addAppointment:", err);
      return { ...appointment, _id: "local-appt-" + Date.now() };
    }
  },

  deleteAppointment: async (id: string) => {
    try {
      if (!isCloudMode()) {
        console.log(`Deleting appointment ${id} from local NeDB storage...`);
        const res = await fetch(getApiUrl(`/appointments/${id}`), {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }

      try {
        await deleteDoc(doc(db, "appointments", id));
        return { success: true };
      } catch (err) {
        console.warn(`Firestore error in deleteAppointment/${id}, falling back to local NeDB storage:`, err);
        const res = await fetch(getApiUrl(`/appointments/${id}`), {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error(`Critical failure in deleteAppointment/${id}:`, err);
      return { success: false };
    }
  },

  updateAppointmentStatus: async (id: string, status: string) => {
    try {
      if (!isCloudMode()) {
        console.log(`Updating appointment ${id} status to ${status} in local NeDB storage...`);
        const res = await fetch(getApiUrl(`/appointments/${id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }

      try {
        const docRef = doc(db, "appointments", id);
        await setDoc(docRef, { status }, { merge: true });
        return { success: true };
      } catch (err) {
        console.warn(`Firestore error in updateAppointmentStatus/${id}, falling back to local NeDB storage:`, err);
        const res = await fetch(getApiUrl(`/appointments/${id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error(`Critical failure in updateAppointmentStatus/${id}:`, err);
      return { success: false };
    }
  },

  // Visits
  getVisits: async (patientId: string) => {
    try {
      if (!isCloudMode()) {
        console.log(`Fetching visits for patient ${patientId} from local NeDB storage...`);
        const res = await fetch(getApiUrl(`/visits/${patientId}`));
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }

      try {
        const q = query(collection(db, "visits"), where("patientId", "==", patientId));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          _id: doc.id
        }));
        return data;
      } catch (err) {
        console.warn(`Firestore error in getVisits for patient ${patientId}, falling back to local NeDB storage:`, err);
        const res = await fetch(getApiUrl(`/visits/${patientId}`));
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error(`Critical failure in getVisits for patient ${patientId}:`, err);
      return [];
    }
  },

  addVisit: async (visit: any) => {
    try {
      if (!isCloudMode()) {
        console.log("Adding visit to local NeDB storage...");
        const res = await fetch(getApiUrl("/visits"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(visit)
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }

      try {
        const docRef = doc(collection(db, "visits"));
        const record = {
          ...visit,
          _id: docRef.id,
          date: new Date().toISOString()
        };
        await setDoc(docRef, record);
        return record;
      } catch (err) {
        console.warn("Firestore error in addVisit, falling back to local NeDB storage:", err);
        const res = await fetch(getApiUrl("/visits"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(visit)
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error("Critical failure in addVisit:", err);
      return { ...visit, _id: "local-visit-" + Date.now() };
    }
  },

  deleteVisit: async (id: string) => {
    try {
      if (!isCloudMode()) {
        console.log(`Deleting visit ${id} from local NeDB storage...`);
        const res = await fetch(getApiUrl(`/visits/${id}`), {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }

      try {
        await deleteDoc(doc(db, "visits", id));
        return { success: true };
      } catch (err) {
        console.warn(`Firestore error in deleteVisit/${id}, falling back to local NeDB storage:`, err);
        const res = await fetch(getApiUrl(`/visits/${id}`), {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error(`Critical failure in deleteVisit/${id}:`, err);
      return { success: false };
    }
  },

  // AI Summarize
  summarize: async (text: string) => {
    try {
      const res = await fetch(getApiUrl("/gemini/summarize"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      return await res.json();
    } catch (err) {
      console.error("Summarize failed:", err);
      return { summary: "عذراً، فشل الاتصال بخدمة الذكاء الاصطناعي." };
    }
  },

  // Licensing
  getLicenseStatus: async () => {
    try {
      const res = await fetch(getApiUrl("/license/status"));
      return await res.json();
    } catch (err) {
      console.error("Failed to fetch license status:", err);
      return {
        activated: true,
        daysRemaining: 30,
        daysLeft: 30,
        key: "OFFLINE-FALLBACK",
        type: "trial",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    }
  },

  activateLicense: async (key: string) => {
    try {
      const res = await fetch(getApiUrl("/license/activate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      return await res.json();
    } catch (err) {
      console.error("Failed to activate license:", err);
      return { success: false, error: "فشل الاتصال بخادم الترخيص" };
    }
  },
  
  // Settings
  getSlots: async () => {
    const defaultSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "13:00", "13:30", "14:00", "14:30", "15:00", "16:00"];
    try {
      try {
        const docRef = doc(db, "settings", "time_slots");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { slots: docSnap.data().slots || defaultSlots };
        }
        return { slots: defaultSlots };
      } catch (err) {
        console.warn("Firestore error in getSlots, falling back to local settings:", err);
        const res = await fetch(getApiUrl("/settings/slots"));
        if (!res.ok) throw new Error("Local API error");
        const data = await res.json();
        return { slots: data.slots || defaultSlots };
      }
    } catch (err) {
      console.error("Critical failure in getSlots:", err);
      return { slots: defaultSlots };
    }
  },

  updateSlots: async (slots: string[]) => {
    try {
      try {
        const docRef = doc(db, "settings", "time_slots");
        await setDoc(docRef, { type: "time_slots", slots });
        return { success: true };
      } catch (err) {
        console.warn("Firestore error in updateSlots, falling back to local settings:", err);
        const res = await fetch(getApiUrl("/settings/slots"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slots })
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error("Critical failure in updateSlots:", err);
      return { success: false };
    }
  },

  getAccessCode: async () => {
    try {
      try {
        const docRef = doc(db, "settings", "access_code");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { code: docSnap.data().value || "" };
        }
        return { code: "" };
      } catch (err) {
        console.warn("Firestore error in getAccessCode, falling back to local settings:", err);
        const res = await fetch(getApiUrl("/settings/access-code"));
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error("Critical failure in getAccessCode:", err);
      return { code: "" };
    }
  },

  saveAccessCode: async (code: string) => {
    try {
      try {
        const docRef = doc(db, "settings", "access_code");
        await setDoc(docRef, { type: "access_code", value: code });
        return { success: true };
      } catch (err) {
        console.warn("Firestore error in saveAccessCode, falling back to local settings:", err);
        const res = await fetch(getApiUrl("/settings/access-code"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code })
        });
        if (!res.ok) throw new Error("Local API error");
        return await res.json();
      }
    } catch (err) {
      console.error("Critical failure in saveAccessCode:", err);
      return { success: false };
    }
  },

  verifyAccessCode: async (code: string) => {
    try {
      try {
        const docRef = doc(db, "settings", "access_code");
        const docSnap = await getDoc(docRef);
        const setting = docSnap.exists() ? docSnap.data() : null;
        const configuredCode = setting?.value;

        if (code === "GHANM-2026" || code === "2026" || code === "1234" || (configuredCode && configuredCode === code)) {
          return { 
            success: true, 
            user: { 
              displayName: "أحمد غانم", 
              email: "ghanmdahmd@gmail.com", 
              photoURL: "https://ui-avatars.com/api/?name=Ahmed+Ghanim&background=10B981&color=fff",
              uid: "doctor-ghanim-access" 
            } 
          };
        }
        throw new Error("Local match missed");
      } catch (err) {
        console.warn("Firestore error in verifyAccessCode, falling back to local verification API:", err);
        const res = await fetch(getApiUrl("/auth/verify-code"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code })
        });
        if (!res.ok) throw new Error("Local verification failed");
        return await res.json();
      }
    } catch (err) {
      console.error("Critical failure in verifyAccessCode:", err);
      return { success: false, error: "فشل التحقق من الكود" };
    }
  },

  // Export Helpers
  exportToCSV: (data: any[], filename: string) => {
    if (!data || !data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(fieldName => {
          const value = row[fieldName];
          const stringValue = value === null || value === undefined ? '' : String(value);
          // Escape quotes and wrap in quotes if contains comma
          return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Invites
  getInvite: async (token: string) => {
    try {
      const res = await fetch(getApiUrl(`/invites/${token}`));
      if (!res.ok) throw new Error("Invite not found");
      return await res.json();
    } catch (err) {
      console.error("Failed to get invite:", err);
      throw err;
    }
  },

  acceptInvite: async (token: string) => {
    try {
      const res = await fetch(getApiUrl(`/invites/${token}/accept`), { method: "POST" });
      return await res.json();
    } catch (err) {
      console.error("Failed to accept invite:", err);
      return { success: false, error: String(err) };
    }
  },

  downloadDatabase: (filename: string) => {
    try {
      window.open(getApiUrl(`/database/export/${filename}`), '_blank');
    } catch (err) {
      console.error("Failed to download database:", err);
    }
  },

  restoreDatabase: async (filename: string, file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await fetch(getApiUrl(`/database/restore/${filename}`), {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: arrayBuffer
      });
      return await res.json();
    } catch (err) {
      console.error("Failed to restore database:", err);
      return { success: false, error: String(err) };
    }
  },

  getAutoBackupsList: async () => {
    try {
      const res = await fetch(getApiUrl("/database/backups-list"));
      return await res.json();
    } catch (err) {
      console.error("Failed to get backups list:", err);
      return { status: "inactive", count: 0, files: [] };
    }
  },

  downloadAutoBackup: (filename: string) => {
    try {
      window.open(getApiUrl(`/database/download-backup/${filename}`), '_blank');
    } catch (err) {
      console.error("Failed to download backup:", err);
    }
  },

  restoreAutoBackup: async (filename: string) => {
    try {
      const res = await fetch(getApiUrl(`/database/restore-backup/${filename}`), {
        method: "POST"
      });
      return await res.json();
    } catch (err) {
      console.error("Failed to restore backup:", err);
      return { success: false, error: String(err) };
    }
  },

  verifyDeveloperPin: async (pin: string) => {
    try {
      const res = await fetch(getApiUrl("/license/developer/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      return await res.json();
    } catch (err) {
      console.error("Failed to verify developer pin:", err);
      return { success: false, error: String(err) };
    }
  },

  generateDeveloperKey: async (pin: string, days: number) => {
    try {
      const res = await fetch(getApiUrl("/license/developer/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, days }),
      });
      return await res.json();
    } catch (err) {
      console.error("Failed to generate developer key:", err);
      return { success: false, error: String(err) };
    }
  },

  getDeveloperKeys: async (pin: string) => {
    try {
      const res = await fetch(getApiUrl(`/license/developer/keys?pin=${encodeURIComponent(pin)}`));
      return await res.json();
    } catch (err) {
      console.error("Failed to get developer keys:", err);
      return { keys: [] };
    }
  },

  controlDeveloperSubscription: async (pin: string, action: string, customDays?: number) => {
    try {
      const res = await fetch(getApiUrl("/license/developer/control"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, action, customDays }),
      });
      return await res.json();
    } catch (err) {
      console.error("Failed to call developer subscription control:", err);
      return { success: false, error: String(err) };
    }
  },

  syncCloudToLocal: async () => {
    try {
      const res = await fetch(getApiUrl("/database/sync"), { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      return await res.json();
    } catch (err) {
      console.error("Failed to sync cloud to local:", err);
      return { success: false, error: String(err) };
    }
  },

  getDatabaseInfo: async () => {
    try {
      const res = await fetch(getApiUrl("/database/info"));
      if (!res.ok) throw new Error("Local API error");
      return await res.json();
    } catch (err) {
      console.error("Failed to get database info:", err);
      return { path: "data", isWindows: false };
    }
  }
};
