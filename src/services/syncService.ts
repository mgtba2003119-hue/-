import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { apiService } from './apiService';

export const syncService = {
  pushToCloud: async (userId: string) => {
    try {
      console.log("Sync protocol started: Reading local patients database...");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const patientsRes = await fetch((origin || "") + '/api/patients');
      if (!patientsRes.ok) throw new Error("Could not fetch local NeDB patients");
      const patients = await patientsRes.json();

      console.log(`Read ${patients.length} patients locally. Writing to Firestore...`);
      const patientBatch = writeBatch(db);
      for (const p of patients) {
        const ref = doc(db, 'patients', p._id);
        patientBatch.set(ref, { ...p, userId, id: p._id }, { merge: true });
      }
      if (patients.length > 0) {
        await patientBatch.commit();
      }

      // 2. Appointments
      console.log("Reading local appointments database...");
      const apptsRes = await fetch((origin || "") + '/api/appointments');
      if (!apptsRes.ok) throw new Error("Could not fetch local NeDB appointments");
      const appointments = await apptsRes.json();

      console.log(`Read ${appointments.length} appointments locally. Writing to Firestore...`);
      const apptBatch = writeBatch(db);
      for (const a of appointments) {
        const ref = doc(db, 'appointments', a._id);
        apptBatch.set(ref, { ...a, userId, id: a._id }, { merge: true });
      }
      if (appointments.length > 0) {
        await apptBatch.commit();
      }

      // 3. Visits
      console.log("Syncing dental visits for each patient...");
      for (const p of patients) {
        const visitsRes = await fetch((origin || "") + `/api/visits/${p._id}`);
        if (!visitsRes.ok) continue;
        const visits = await visitsRes.json();

        if (visits.length > 0) {
          const visitBatch = writeBatch(db);
          for (const v of visits) {
            const ref = doc(db, 'visits', v._id);
            visitBatch.set(ref, { ...v, userId, id: v._id }, { merge: true });
          }
          await visitBatch.commit();
        }
      }

      console.log("Muted sync completed successfully!");
      return { success: true };
    } catch (error) {
      console.error("Push to cloud failed:", error);
      throw error;
    }
  },

  restoreFromCloud: async (userId: string) => {
    // This would involve pulling from Firestore and using the restoreDatabase API or similar.
    // However, the restoreDatabase API expects a file. 
    // For simplicity, let's just implement Push for now as it's the safest way to "Connect to cloud".
    // Pulling would overwrite local data which is risky.
    throw new Error("Restore not implemented yet. Please use manual database restore for safety.");
  }
};
