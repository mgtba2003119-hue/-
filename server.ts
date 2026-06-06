import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import Datastore from "nedb-promises";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";
import archiver from "archiver";
import net from "net";

dotenv.config();

// Port finder helper for ultimate conflict prevention
function getAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const checkPort = (port: number) => {
      const socketTester = net.createServer();
      socketTester.listen(port, "0.0.0.0", () => {
        socketTester.close(() => resolve(port));
      });
      socketTester.on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          console.warn(`[PORT CHECK] Port ${port} is in use, trying port ${port + 1}...`);
          if (port < startPort + 20) {
            checkPort(port + 1);
          } else {
            resolve(startPort); // limit retries, fallback
          }
        } else {
          resolve(port);
        }
      });
    };
    checkPort(startPort);
  });
}

// Helper to safely locate bundled files in both Dev (root) and Prod (Inside dist/ or parent of dist/ in ASAR)
function getBundleFilePath(filename: string): string {
  // Try directly in working dir (dev or local manual run)
  const cwdPath = path.join(process.cwd(), filename);
  if (fs.existsSync(cwdPath)) return cwdPath;

  // Try relative to __dirname (production /dist/server.cjs inside electron ASAR)
  const relativeParentPath = path.join(__dirname, "..", filename);
  if (fs.existsSync(relativeParentPath)) return relativeParentPath;

  const directPath = path.join(__dirname, filename);
  if (fs.existsSync(directPath)) return directPath;

  // Fallback
  return cwdPath;
}

// Define a safe log output directory (use AppData/Roaming "USER_DATA_PATH" in production to avoid write-protection)
const safeLogDir = process.env.USER_DATA_PATH || process.cwd();
const bootLogPath = path.join(safeLogDir, "boot-error.log");
const serverLogPath = path.join(safeLogDir, "server-output.log");

// Server Boot Logging & Error Capture
try {
  fs.writeFileSync(bootLogPath, "Server boot initiated at " + new Date().toISOString() + "\n");
} catch (err) {
  // Fail-safe if writing is temporarily restricted
}

process.on("uncaughtException", (err) => {
  try {
    fs.appendFileSync(bootLogPath, "Uncaught Exception: " + (err.stack || err.message || String(err)) + "\n");
  } catch (e) {}
});
process.on("unhandledRejection", (reason: any) => {
  try {
    fs.appendFileSync(bootLogPath, "Unhandled Rejection: " + (reason?.stack || reason?.message || String(reason)) + "\n");
  } catch (e) {}
});

// Redirect console logs to a log file for runtime diagnostics of dev server
let logStream: any;
try {
  logStream = fs.createWriteStream(serverLogPath, { flags: "w" });
} catch (err) {
  // Fail-safe dummy stream if writing files has restriction
  logStream = { write: () => {} };
}
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function (...args) {
  originalLog.apply(console, args);
  const msg = args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" ");
  try {
    logStream.write("[LOG] " + msg + "\n");
  } catch (e) {}
};
console.error = function (...args) {
  const msg = args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" ");
  if (msg.includes("Disconnecting idle stream") || msg.includes("GrpcConnection RPC") || msg.includes("CANCELLED") || msg.includes("Timed out waiting for new targets")) {
    // Silence benign gRPC connection warning logs/unimportant streaming warnings from Firebase client in Node environments
    return;
  }
  originalError.apply(console, args);
  try {
    logStream.write("[ERR] " + msg + "\n");
  } catch (e) {}
};
console.warn = function (...args) {
  const msg = args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" ");
  if (msg.includes("Disconnecting idle stream") || msg.includes("GrpcConnection RPC") || msg.includes("CANCELLED") || msg.includes("Timed out waiting for new targets")) {
    // Silence benign gRPC connection warning logs/unimportant streaming warnings from Firebase client in Node environments
    return;
  }
  originalWarn.apply(console, args);
  try {
    logStream.write("[WARN] " + msg + "\n");
  } catch (e) {}
};

// Initialize Cloud Firebase on the Server lazily and safely
let firestoreDb: any = null;
try {
  const configPath = getBundleFilePath("firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const firebaseApp = initializeApp(firebaseConfig);
    // Use initializeFirestore with experimentalForceLongPolling to avoid opening streaming gRPC sockets under Node
    firestoreDb = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase Firestore initialized successfully on the server.");
  } else {
    console.warn("firebase-applet-config.json not found, proceeding with local fallback.");
  }
} catch (err) {
  console.error("Failed to initialize Firebase Firestore:", err);
}

// Ensure local data directory exists for NeDB
// We prioritize a highly accessible, visible local drive folder on Windows so the doctor can easily copy, back up, and secure their database.
let dataDir = "";

if (process.platform === "win32") {
  // On Windows, use the User's Home Profile directory (e.g., C:\Users\<Username>\ClinicFlow_Database)
  // This is highly visible on the computer's physical hard drive, easily accessible, protected from AppData hiding, 
  // fully writable/immune to administrative blocks, and perfectly persistent across system updates.
  const userHome = process.env.USERPROFILE || process.env.HOMEPATH || "";
  if (userHome) {
    dataDir = path.join(userHome, "ClinicFlow_Database");
  } else {
    dataDir = "C:\\ClinicFlow_Database";
  }
} else {
  // Standard Unix/OSX USER_DATA_PATH or fallback to local directory
  dataDir = process.env.USER_DATA_PATH 
    ? path.join(process.env.USER_DATA_PATH, 'ClinicFlowData')
    : path.join(process.cwd(), 'data');
}

// Automatic Data Migration from older versions/hidden folders to the visible Hard Drive folder
try {
  // Identify possible old data origin paths
  const oldCwdDataDir = path.join(process.cwd(), 'data');
  const oldAppDataDir = process.env.USER_DATA_PATH ? path.join(process.env.USER_DATA_PATH, 'ClinicFlowData') : "";
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log("Created visible hard drive data folder at:", dataDir);
  }

  // Safe file copy helper
  const dbFiles = ['patients.db', 'appointments.db', 'visits.db', 'settings.db', 'invites.db'];
  dbFiles.forEach(dbFile => {
    const targetFile = path.join(dataDir, dbFile);
    
    // If the file does not exist in the new visible directory, check if it exists in the old directories
    if (!fs.existsSync(targetFile)) {
      let sourceFile = "";
      
      if (oldAppDataDir && fs.existsSync(path.join(oldAppDataDir, dbFile))) {
        sourceFile = path.join(oldAppDataDir, dbFile);
      } else if (fs.existsSync(path.join(oldCwdDataDir, dbFile))) {
        sourceFile = path.join(oldCwdDataDir, dbFile);
      }
      
      if (sourceFile) {
        console.log(`[Database Migration] Migrating existing local data from ${sourceFile} to ${targetFile}`);
        fs.copyFileSync(sourceFile, targetFile);
      }
    }
  });

  // Migrating existing daily backups too so there is no history lost
  const oldBackupDirs = [
    oldAppDataDir ? path.join(oldAppDataDir, 'backups') : "",
    path.join(oldCwdDataDir, 'backups')
  ].filter(Boolean);

  const targetBackupDir = path.join(dataDir, 'backups');
  if (!fs.existsSync(targetBackupDir)) {
    fs.mkdirSync(targetBackupDir, { recursive: true });
  }

  oldBackupDirs.forEach(oldBackupDir => {
    if (oldBackupDir && fs.existsSync(oldBackupDir)) {
      try {
        const files = fs.readdirSync(oldBackupDir);
        files.forEach(f => {
          if (f.endsWith('.db')) {
            const srcBkp = path.join(oldBackupDir, f);
            const dstBkp = path.join(targetBackupDir, f);
            if (!fs.existsSync(dstBkp)) {
              fs.copyFileSync(srcBkp, dstBkp);
            }
          }
        });
      } catch (backupMigErr) {
        console.warn("[Database Migration] Failed migrating backup subfolder:", backupMigErr);
      }
    }
  });

} catch (err) {
  console.error("[Database Migration] Critical error during automatic hard drive path migration:", err);
}

try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  console.log("Active Database directory set to:", dataDir);
} catch (err) {
  console.error("Failed to create data directory:", err);
}

// Initialize Local Databases (NeDB)
const localDb = {
  patients: Datastore.create({ filename: path.join(dataDir, 'patients.db'), autoload: true }),
  appointments: Datastore.create({ filename: path.join(dataDir, 'appointments.db'), autoload: true }),
  visits: Datastore.create({ filename: path.join(dataDir, 'visits.db'), autoload: true }),
  settings: Datastore.create({ filename: path.join(dataDir, 'settings.db'), autoload: true }),
  invites: Datastore.create({ filename: path.join(dataDir, 'invites.db'), autoload: true }),
};

// Automatic Local Backup System for Ultimate Data Assurance
function cleanupOldBackups(backupDir: string) {
  try {
    const files = fs.readdirSync(backupDir);
    const backupFiles = files
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const filePath = path.join(backupDir, f);
        return {
          name: f,
          path: filePath,
          time: fs.statSync(filePath).mtime.getTime()
        };
      })
      .sort((a, b) => a.time - b.time);
      
    // Maximum backup snapshot files to keep (30 days * 5 databases = 150 files)
    const MAX_BACKUP_FILES = 150; 
    if (backupFiles.length > MAX_BACKUP_FILES) {
      const toDeleteCount = backupFiles.length - MAX_BACKUP_FILES;
      console.log(`[AutoBackup] Cleaning up ${toDeleteCount} older backup snapshots...`);
      for (let i = 0; i < toDeleteCount; i++) {
        fs.unlinkSync(backupFiles[i].path);
      }
    }
  } catch (err) {
    console.error("[AutoBackup] Failed to clean up old backups:", err);
  }
}

function runAutoBackup() {
  try {
    const backupDir = path.join(dataDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Get current local date as suffix
    const todayStr = new Date().toISOString().split('T')[0];
    const dbFiles = ['patients.db', 'appointments.db', 'visits.db', 'settings.db', 'invites.db'];
    
    let dbBackupCount = 0;
    dbFiles.forEach(file => {
      const srcPath = path.join(dataDir, file);
      if (fs.existsSync(srcPath)) {
        const destFileName = `${path.basename(file, '.db')}_backup_${todayStr}.db`;
        const destPath = path.join(backupDir, destFileName);
        
        fs.copyFileSync(srcPath, destPath);
        dbBackupCount++;
      }
    });
    
    if (dbBackupCount > 0) {
      console.log(`[AutoBackup] Successfully created daily snapshots in:`, backupDir);
    }
    
    cleanupOldBackups(backupDir);
  } catch (err) {
    console.error("[AutoBackup] Failed running safety backup:", err);
  }
}

// Run the daily local backup immediately on server boot
runAutoBackup();

// Licensing Helper
let mid = "local-dev-id";
async function getMachineId() {
  try {
    const existing: any = await localDb.settings.findOne({ type: 'machine_id' });
    if (existing) return existing.value;
    const newId = "local-" + Math.random().toString(36).substring(7);
    await localDb.settings.insert({ type: 'machine_id', value: newId });
    return newId;
  } catch (err) {
    return "id-" + Date.now();
  }
}

const LICENSE_SALT = "AL-GANEM-SECRET-SALT-2026-MEDICAL";

function generateLicenseKey(days: number): string {
  const codePrefix = days === 7 ? "T7" : "Y1";
  const uniqueId = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 chars random string
  const rawData = `${codePrefix}-${uniqueId}`;
  const hash = crypto.createHash("md5").update(rawData + LICENSE_SALT).digest("hex").substring(0, 6).toUpperCase();
  return `CF-${codePrefix}-${uniqueId}-${hash}`;
}

function verifyLicenseKey(key: string): { valid: boolean; days: number } {
  if (!key || typeof key !== "string") return { valid: false, days: 0 };
  const parts = key.trim().toUpperCase().split("-");
  if (parts.length !== 4 || parts[0] !== "CF") return { valid: false, days: 0 };
  
  const codePrefix = parts[1]; // T7 or Y1
  const uniqueId = parts[2];
  const signature = parts[3];
  
  const expectedHash = crypto.createHash("md5").update(`${codePrefix}-${uniqueId}${LICENSE_SALT}`).digest("hex").substring(0, 6).toUpperCase();
  if (signature !== expectedHash) {
    return { valid: false, days: 0 };
  }
  
  const days = codePrefix === "T7" ? 7 : 365;
  return { valid: true, days };
}

// Helper to merge local NeDB and Cloud Firestore documents bidirectional
async function mergeAndCacheDocs(localCol: any, firestoreDocs: any[], colName: string) {
  if (!firestoreDb) return firestoreDocs;
  try {
    const localDocs = await localCol.find({});
    const mergedMap = new Map();

    for (const d of localDocs) {
      mergedMap.set(d._id, d);
    }

    const firestoreIds = new Set<string>();

    for (const fd of firestoreDocs) {
      firestoreIds.add(fd._id);
      const existing = mergedMap.get(fd._id);
      if (!existing) {
        await localCol.insert(fd).catch(() => {});
        mergedMap.set(fd._id, fd);
      } else {
        const merged = { ...existing, ...fd };
        mergedMap.set(fd._id, merged);
        await localCol.update({ _id: fd._id }, { $set: fd }).catch(() => {});
      }
    }

    // Auto backup local-only data to Firestore in background
    for (const ld of localDocs) {
      if (!firestoreIds.has(ld._id)) {
        setDoc(doc(firestoreDb, colName, ld._id), {
          ...ld,
          syncedAt: new Date().toISOString()
        }).catch((err) => console.warn(`[Auto-Upload] Failed to sync ${colName}/${ld._id} to Firestore:`, err));
      }
    }

    return Array.from(mergedMap.values());
  } catch (err) {
    console.error(`Error in mergeAndCacheDocs for ${colName}:`, err);
    return firestoreDocs;
  }
}

// Bidirectional Sync & reconciliation from Cloud (Firestore) to Local NeDB database on boot
async function syncCloudToLocalOnBoot() {
  if (!firestoreDb) {
    console.log("[BootSync] Firestore is not initialized or unavailable, skipping cloud-to-local sync.");
    return;
  }
  console.log("[BootSync] Running comprehensive bidirectional data reconciliation and local recovery...");
  try {
    // 1. Sync Patients
    const patientsCol = collection(firestoreDb, "patients");
    const patientsSnapshot = await getDocs(patientsCol);
    const cloudPatients = patientsSnapshot.docs.map(d => ({ ...d.data(), _id: d.id }));
    await mergeAndCacheDocs(localDb.patients, cloudPatients, "patients");

    // 2. Sync Appointments
    const apptsCol = collection(firestoreDb, "appointments");
    const apptsSnapshot = await getDocs(apptsCol);
    const cloudAppts = apptsSnapshot.docs.map(d => ({ ...d.data(), _id: d.id }));
    await mergeAndCacheDocs(localDb.appointments, cloudAppts, "appointments");

    // 3. Sync Visits
    const visitsCol = collection(firestoreDb, "visits");
    const visitsSnapshot = await getDocs(visitsCol);
    const cloudVisits = visitsSnapshot.docs.map(d => ({ ...d.data(), _id: d.id }));
    await mergeAndCacheDocs(localDb.visits, cloudVisits, "visits");

    // 4. Sync Settings
    const settingsCol = collection(firestoreDb, "settings");
    const settingsSnapshot = await getDocs(settingsCol);
    const cloudSettings = settingsSnapshot.docs.map(d => ({ ...d.data(), _id: d.id }));
    await mergeAndCacheDocs(localDb.settings, cloudSettings, "settings");

    console.log("[BootSync] Comprehensive bidirectional reconciliation and local recovery complete.");
  } catch (err) {
    console.error("[BootSync] Reconciliation failed:", err);
    console.log("[BootSync] Cloud sync or network is currently offline/pending (system operating safely in Offline-First Local Mode).");
  }
}

async function startServer() {
  console.log("Initializing local server...");
  const app = express();
  
  // Port must be strictly 3000 as required by the container infrastructure proxy
  const PORT = 3000;
  (global as any).serverPort = PORT;

  app.use(express.json());

  // Direct APK links handling
  app.get(["/apk", "/download-apk", "/ClinicFlow.apk"], (req, res) => {
    res.redirect("/");
  });

  // Health check - should be very fast
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "local" });
  });

  // Start listening immediately
  const serverInstance = app.listen(PORT, "0.0.0.0", () => {
    console.log(`المنصة تعمل الآن! افتح الرابط التالي في المتصفح:`);
    console.log(`http://localhost:${PORT}`);
    
    // Notify Electron main process that server is fully listening
    if (typeof (global as any).onServerListening === "function") {
      (global as any).onServerListening(PORT);
    }
  });

  serverInstance.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[SERVER WARNING] Port ${PORT} is already in use. It is highly likely that another instance of the application or a ghost Node process is running on this port. We will proceed under the assumption that the server is already active.`);
    } else {
      console.error("Server socket error occurred:", err);
    }
  });

  // Background initialization tasks
  getMachineId().then(id => { mid = id; });
  syncCloudToLocalOnBoot().catch(err => console.error("Sync on boot failed:", err));

  // Helper to check, initialize or migrate 30-day countdown license
  async function checkOrInitializeLicense() {
    let active: any = null;
    
    // 1. Try to read from Firestore
    try {
      if (firestoreDb) {
        const docRef = doc(firestoreDb, "settings", "active_license");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          active = docSnap.data();
        }
      }
    } catch (err) {
      console.warn("[LicenseCheck] Failed to get doc from Firestore:", err);
    }

    // 2. Try to read from local NeDB
    if (!active) {
      try {
        active = await localDb.settings.findOne({ type: "active_license" });
      } catch (err) {
        console.warn("[LicenseCheck] Failed to find in NeDB:", err);
      }
    }

    // 3. Determine if we must migrate/initialize a fresh 30-day license
    const isOldLicense = active?.days === 3650 || active?.key === "GHANM-2026" || active?.key === "DEVELOPER-BYPASS";
    
    if (!active || isOldLicense) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      active = {
        _id: "active_license",
        type: "active_license",
        key: "ACTIVE-30-DAY-TRIAL",
        days: 30,
        licenseType: "trial",
        activatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        forceDisabled: false
      };

      // Save to NeDB
      try {
        await localDb.settings.update(
          { type: "active_license" },
          { $set: active },
          { upsert: true }
        );
      } catch (err) {
        console.error("[LicenseCheck] Error saving to local NeDB:", err);
      }

      // Save to Firestore
      try {
        if (firestoreDb) {
          const docRef = doc(firestoreDb, "settings", "active_license");
          await setDoc(docRef, active);
        }
      } catch (err) {
        console.warn("[LicenseCheck] Error saving to Firestore:", err);
      }
      
      console.log("[LicenseCheck] Initialized 30-day subscription from today.");
    }

    return active;
  }

  // Status
  app.get("/api/license/status", async (req, res) => {
    try {
      const active = await checkOrInitializeLicense();
      const machineId = await getMachineId();

      if (active.forceDisabled === true) {
        return res.json({ 
          activated: false, 
          machineId, 
          key: active.key,
          error: "تم إيقاف تشغيل البرنامج بأمر من المطور. يرجى التواصل مع الدعم الفني لإعادة تفعيله." 
        });
      }

      const now = new Date();
      const expires = new Date(active.expiresAt);

      if (now > expires) {
        return res.json({ 
          activated: false, 
          machineId, 
          key: active.key,
          error: "انتهت فترة التجربة والاشتراك (30 يوم). يرجى التواصل مع مطور النظام لتجديد التفعيل." 
        });
      }

      const daysRemaining = Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      res.json({ 
        activated: true, 
        machineId, 
        key: active.key,
        type: active.licenseType || 'trial',
        daysRemaining,
        daysLeft: daysRemaining,
        expiresAt: active.expiresAt
      });
    } catch (err) {
      console.error("Error in license/status:", err);
      res.status(500).json({ error: "فشل التحقق من حالة الاشتراك" });
    }
  });

  app.post("/api/license/activate", async (req, res) => {
    try {
      const { key } = req.body;
      if (!key) {
        return res.json({ success: false, error: "كود التنشيط مطلوب" });
      }

      const norm = key.trim();
      let validation;
      if (norm === "GHANM-2026" || norm === "2026" || norm === "1234" || norm === "مجتبى عواد" || norm === "مجتبى") {
        validation = { valid: true, days: 30 };
      } else {
        validation = verifyLicenseKey(key);
      }

      if (!validation.valid) {
        return res.json({ success: false, error: "كود التنشيط غير صحيح أو منتهي الصلاحية!" });
      }

      const days = validation.days;
      const type = "trial";
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      const licenseRecord = {
        _id: 'active_license',
        type: 'active_license',
        key: key.trim().toUpperCase(),
        days,
        licenseType: type,
        activatedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        forceDisabled: false
      };

      await localDb.settings.update(
        { type: 'active_license' },
        { $set: licenseRecord },
        { upsert: true }
      );

      try {
        if (firestoreDb) {
          const docRef = doc(firestoreDb, "settings", "active_license");
          await setDoc(docRef, licenseRecord);
        }
      } catch (fErr) {
        console.warn("Could not sync license status to Firestore setting:", fErr);
      }

      res.json({ 
        success: true, 
        activated: true, 
        key, 
        type, 
        expiresAt,
        user: (norm === "مجتبى عواد" || norm === "مجتبى" || norm === "GHANM-2026") ? {
          displayName: "مجتبى عواد", 
          email: "ghanmdahmd@gmail.com", 
          photoURL: "https://ui-avatars.com/api/?name=Mujtaba+Awad&background=3B82F6&color=fff",
          uid: "doctor-mujtaba-access"
        } : null
      });
    } catch (err) {
      console.error("Error activating license:", err);
      res.status(500).json({ success: false, error: "حدث خطأ غير متوقع أثناء تفعيل الرخصة" });
    }
  });

  const DEVELOPER_PIN = process.env.DEVELOPER_PIN || "AL_GANEM_BOSS_2026";

  // Support developer direct command to modify/recreate subscription
  app.post("/api/license/developer/control", async (req, res) => {
    try {
      const { pin, action, customDays } = req.body;
      if (pin !== DEVELOPER_PIN) {
        return res.status(403).json({ success: false, error: "رمز المطور غير صحيح!" });
      }

      const current = await checkOrInitializeLicense();
      const now = new Date();
      let updatedLicense = { ...current };

      if (action === "reset") {
        // Reset countdown to a new 30 days or custom days from now
        const days = customDays ? Number(customDays) : 30;
        updatedLicense.days = days;
        updatedLicense.activatedAt = now.toISOString();
        updatedLicense.expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
        updatedLicense.forceDisabled = false;
        updatedLicense.key = customDays ? `ACTIVE-${days}-DAY-LICENSE` : "ACTIVE-30-DAY-TRIAL";
      } else if (action === "disable") {
        // Remotely stop/disable the application
        updatedLicense.forceDisabled = true;
      } else if (action === "activate") {
        // Remotely activate again/remove stop command
        updatedLicense.forceDisabled = false;
        if (new Date(updatedLicense.expiresAt) < now) {
          updatedLicense.days = 30;
          updatedLicense.activatedAt = now.toISOString();
          updatedLicense.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      // Update in NeDB
      await localDb.settings.update(
        { type: "active_license" },
        { $set: updatedLicense },
        { upsert: true }
      );

      // Update in Firestore
      try {
        if (firestoreDb) {
          const docRef = doc(firestoreDb, "settings", "active_license");
          await setDoc(docRef, updatedLicense);
        }
      } catch (fErr) {
        console.warn("[DeveloperControl] Cloud sync failed, saved locally:", fErr);
      }

      res.json({ success: true, license: updatedLicense });
    } catch (err) {
      console.error("Error in developer control:", err);
      res.status(500).json({ error: "فشل تحديث حالة الترخيص والاشتراك" });
    }
  });

  // Verify Developer PIN
  app.post("/api/license/developer/verify", async (req, res) => {
    try {
      const { pin } = req.body;
      if (pin === DEVELOPER_PIN) {
        res.json({ success: true, message: "تم التحقق بنجاح" });
      } else {
        res.status(401).json({ success: false, error: "رمز المطور PIN غير صحيح!" });
      }
    } catch (err) {
      res.status(500).json({ error: "فشل التحقق" });
    }
  });

  // Generate License Codes (For Developer Client UI)
  app.post("/api/license/developer/generate", async (req, res) => {
    try {
      const { pin, days } = req.body;
      if (pin !== DEVELOPER_PIN) {
        return res.status(403).json({ success: false, error: "غير مصرح لك بتوليد الرخص" });
      }
      
      const daysNum = Number(days) || 7;
      const key = generateLicenseKey(daysNum);
      
      // Store in generated keys log in Firestore
      try {
        if (!firestoreDb) throw new Error("Firestore not initialized");
        const docRef = doc(firestoreDb, "settings", "developer_generated_keys");
        const docSnap = await getDoc(docRef);
        const logs = docSnap.exists() ? docSnap.data() : null;
        const currentKeys = logs?.keys || [];
        
        const newKeyObj = {
          key,
          days: daysNum,
          type: daysNum === 7 ? "trial" : "yearly",
          createdAt: new Date().toISOString(),
        };
        
        const updatedKeys = [newKeyObj, ...currentKeys].slice(0, 50); // Keep last 50 generated logs
        await setDoc(docRef, { type: 'developer_generated_keys', keys: updatedKeys });
      } catch (fErr) {
        console.warn("Could not log generated keys to Firestore:", fErr);
      }
      
      const newKeyObj = {
        key,
        days: daysNum,
        type: daysNum === 7 ? "trial" : "yearly",
        createdAt: new Date().toISOString(),
      };
      
      res.json({ success: true, key: newKeyObj });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "فشل توليد المفتاح" });
    }
  });
 
  // Get list of generated keys
  app.get("/api/license/developer/keys", async (req, res) => {
    try {
      const { pin } = req.query;
      if (pin !== DEVELOPER_PIN) {
        return res.status(403).json({ error: "Access Denied" });
      }
      if (!firestoreDb) throw new Error("Firestore not initialized");
      const docRef = doc(firestoreDb, "settings", "developer_generated_keys");
      const docSnap = await getDoc(docRef);
      const logs = docSnap.exists() ? docSnap.data() : null;
      res.json({ keys: logs?.keys || [] });
    } catch (err) {
      res.status(500).json({ error: "فشل استرداد المفاتيح" });
    }
  });

  // Gemini Setup
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

  // Patients
  app.get("/api/patients", async (req, res) => {
    let patients: any[] = [];
    try {
      if (firestoreDb) {
        const patientsCol = collection(firestoreDb, "patients");
        const patientsSnapshot = await getDocs(patientsCol);
        const cloudPatients = patientsSnapshot.docs.map(docSnap => ({
          ...docSnap.data(),
          _id: docSnap.id
        }));
        patients = await mergeAndCacheDocs(localDb.patients, cloudPatients, "patients");
      } else {
        patients = await localDb.patients.find({});
      }
    } catch (err) {
      console.warn("Firestore error in GET /api/patients inside server, checking local NeDB fallback:", err);
      try {
        patients = await localDb.patients.find({});
      } catch (localErr) {
        patients = [];
      }
    }

    // Sort patients by createdAt descending to match expectations
    patients.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dbVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dbVal - da;
    });

    res.json(patients);
  });

  app.get("/api/patients/:id", async (req, res) => {
    let patient: any = null;
    try {
      if (firestoreDb) {
        const docRef = doc(firestoreDb, "patients", req.params.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          patient = { ...docSnap.data(), _id: docSnap.id };
          // Keep local NeDB in sync
          await localDb.patients.update({ _id: req.params.id }, { $set: patient }, { upsert: true });
        }
      }
    } catch (err) {
      console.warn(`Firestore error in GET /api/patients/${req.params.id}, checking local NeDB fallback:`, err);
    }

    if (!patient) {
      try {
        patient = await localDb.patients.findOne({ _id: req.params.id });
      } catch (localErr) {
        patient = null;
      }
    }

    if (!patient) {
      res.status(404).json({ error: "المريض غير موجود" });
    } else {
      res.json(patient);
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      // Ensure we preserve the phone number and fields exactly
      const patientData = { ...req.body, createdAt: new Date().toISOString() };
      const newDoc = await localDb.patients.insert(patientData);
      
      // Sync to cloud Firestore in the background so we return the result instantly without blocking on network/internet latency
      if (firestoreDb) {
        setDoc(doc(firestoreDb, "patients", newDoc._id), { ...newDoc, syncedAt: new Date().toISOString() })
          .catch(fErr => console.warn("[Cloud Sync Error] Failed to write new patient to Firestore in background:", fErr));
      }
      res.json(newDoc);
    } catch (err) { res.status(500).json(err); }
  });

  app.delete("/api/patients/:id", async (req, res) => {
    return res.status(403).json({ error: "تم إلغاء ميزة حذف ملفات وحسابات المرضى لحماية البيانات من الحذف العرضي." });
  });

  app.patch("/api/patients/:id", async (req, res) => {
    try {
      await localDb.patients.update({ _id: req.params.id }, { $set: req.body });
      
      // Update cloud Firestore in the background
      if (firestoreDb) {
        setDoc(doc(firestoreDb, "patients", req.params.id), { ...req.body, id: req.params.id, syncedAt: new Date().toISOString() }, { merge: true })
          .catch(fErr => console.warn("[Cloud Sync Error] Failed to update patient in Firestore in background:", fErr));
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json(err); }
  });

  // Appointments
  app.get("/api/appointments", async (req, res) => {
    let appointments: any[] = [];
    try {
      if (firestoreDb) {
        const apptsCol = collection(firestoreDb, "appointments");
        const snapshot = await getDocs(apptsCol);
        const cloudAppts = snapshot.docs.map(docSnap => ({
          ...docSnap.data(),
          _id: docSnap.id
        }));
        appointments = await mergeAndCacheDocs(localDb.appointments, cloudAppts, "appointments");
      } else {
        appointments = await localDb.appointments.find({});
      }
    } catch (err) {
      console.warn("Firestore error in GET /api/appointments, checking local NeDB fallback:", err);
      try {
        appointments = await localDb.appointments.find({});
      } catch (localErr) {
        appointments = [];
      }
    }

    appointments.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const dbVal = b.date ? new Date(b.date).getTime() : 0;
      return da - dbVal;
    });

    res.json(appointments);
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const apptData = { ...req.body, createdAt: new Date().toISOString() };
      const newDoc = await localDb.appointments.insert(apptData);
      
      // Update cloud in background
      if (firestoreDb) {
        setDoc(doc(firestoreDb, "appointments", newDoc._id), { ...newDoc, syncedAt: new Date().toISOString() })
          .catch(fErr => console.warn("[Cloud Sync Error] Failed to write appointment to Firestore in background:", fErr));
      }
      res.json(newDoc);
    } catch (err) { res.status(500).json(err); }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      await localDb.appointments.remove({ _id: req.params.id }, {});
      
      // Update cloud in background
      if (firestoreDb) {
        deleteDoc(doc(firestoreDb, "appointments", req.params.id))
          .catch(fErr => console.warn("[Cloud Sync Error] Failed to delete appointment from Firestore in background:", fErr));
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json(err); }
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    try {
      const { status } = req.body;
      await localDb.appointments.update({ _id: req.params.id }, { $set: { status } });
      
      // Update cloud in background
      if (firestoreDb) {
        setDoc(doc(firestoreDb, "appointments", req.params.id), { status, syncedAt: new Date().toISOString() }, { merge: true })
          .catch(fErr => console.warn("[Cloud Sync Error] Failed to update appointment status in Firestore in background:", fErr));
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json(err); }
  });

  // Visits
  app.get("/api/visits/:patientId", async (req, res) => {
    let visits: any[] = [];
    try {
      if (firestoreDb) {
        const visitsCol = collection(firestoreDb, "visits");
        const snapshot = await getDocs(visitsCol);
        const cloudVisits = snapshot.docs.map(docSnap => ({
          ...docSnap.data(),
          _id: docSnap.id
        }));
        await mergeAndCacheDocs(localDb.visits, cloudVisits, "visits");
      }
      visits = await localDb.visits.find({ patientId: req.params.patientId });
    } catch (err) {
      console.warn(`Firestore error in GET /api/visits/${req.params.patientId}, checking local NeDB fallback:`, err);
      try {
        visits = await localDb.visits.find({ patientId: req.params.patientId });
      } catch (localErr) {
        visits = [];
      }
    }

    visits.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const dbVal = b.date ? new Date(b.date).getTime() : 0;
      return dbVal - da;
    });

    res.json(visits);
  });

  app.post("/api/visits", async (req, res) => {
    try {
      const visitData = { ...req.body, date: new Date().toISOString() };
      const newDoc = await localDb.visits.insert(visitData);
      
      // Update cloud in background
      if (firestoreDb) {
        setDoc(doc(firestoreDb, "visits", newDoc._id), { ...newDoc, syncedAt: new Date().toISOString() })
          .catch(fErr => console.warn("[Cloud Sync Error] Failed to write visit to Firestore in background:", fErr));
      }
      res.json(newDoc);
    } catch (err) { res.status(500).json(err); }
  });

  app.delete("/api/visits/:id", async (req, res) => {
    return res.status(403).json({ error: "تم إيقاف تفعيل حذف المعاينات والزيارات الطبية לחماية السجلات من التغيير كلياً." });
  });

  // Manual Trigger for Cloud-to-Local synchronization and backups
  app.post("/api/database/sync", async (req, res) => {
    try {
      if (!firestoreDb) {
        return res.status(400).json({ success: false, error: "السيرفر السحابي غير متصل، جاري العمل على السيرفر المحلي فقط حالياً" });
      }
      await syncCloudToLocalOnBoot();
      res.json({ success: true, message: "تمت مزامنة البيانات من السيرفر السحابي إلى السيرفر المحلي بنجاح" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "فشل مزامنة البيانات مع السحاب" });
    }
  });

  // Settings
  app.get("/api/settings/slots", async (req, res) => {
    let slots: string[] | null = null;
    const defaultSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "13:00", "13:30", "14:00", "14:30", "15:00", "16:00"];
    try {
      if (!firestoreDb) throw new Error("Firestore not initialized");
      const docRef = doc(firestoreDb, "settings", "time_slots");
      const docSnap = await getDoc(docRef);
      const settings = docSnap.exists() ? docSnap.data() : null;
      if (settings?.slots) {
        slots = settings.slots;
      }
    } catch (err) {
      console.warn("Firestore error in GET /slots inside server, checking local NeDB fallback:", err);
    }

    if (!slots) {
      try {
        const settingObj = await localDb.settings.findOne({ type: 'time_slots' }) as any;
        slots = settingObj ? settingObj.slots : defaultSlots;
      } catch (localErr) {
        slots = defaultSlots;
      }
    }

    res.json({ slots });
  });

  app.post("/api/settings/slots", async (req, res) => {
    const { slots } = req.body;
    try {
      if (!firestoreDb) throw new Error("Firestore not initialized");
      const docRef = doc(firestoreDb, "settings", "time_slots");
      await setDoc(docRef, { type: 'time_slots', slots });
    } catch (err) {
      console.warn("Firestore error in POST /slots inside server, non-blocking fallback:", err);
    }

    try {
      await localDb.settings.update({ type: 'time_slots' }, { $set: { slots } }, { upsert: true });
      res.json({ success: true });
    } catch (localErr) {
      res.status(500).json({ error: "Local datastore update failed" });
    }
  });

  // Access Code for Staff/Doctor
  app.get("/api/settings/access-code", async (req, res) => {
    let code: string | null = null;
    try {
      if (!firestoreDb) throw new Error("Firestore not initialized");
      const docRef = doc(firestoreDb, "settings", "access_code");
      const docSnap = await getDoc(docRef);
      const setting = docSnap.exists() ? docSnap.data() : null;
      if (setting?.value !== undefined) {
        code = setting.value;
      }
    } catch (err) {
      console.warn("Firestore error in GET /access-code inside server, checking local NeDB fallback:", err);
    }

    if (code === null) {
      try {
        const settingObj = await localDb.settings.findOne({ type: 'access_code' }) as any;
        code = settingObj ? settingObj.value : "";
      } catch (localErr) {
        code = "";
      }
    }

    res.json({ code });
  });

  app.post("/api/settings/access-code", async (req, res) => {
    const { code } = req.body;
    try {
      if (!firestoreDb) throw new Error("Firestore not initialized");
      const docRef = doc(firestoreDb, "settings", "access_code");
      await setDoc(docRef, { type: 'access_code', value: code });
    } catch (err) {
      console.warn("Firestore error in POST /access-code inside server, non-blocking fallback:", err);
    }

    try {
      await localDb.settings.update({ type: 'access_code' }, { $set: { value: code } }, { upsert: true });
      res.json({ success: true });
    } catch (localErr) {
      res.status(500).json({ error: "Local datastore update failed" });
    }
  });

  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const { code } = req.body;
      let configuredCode: string | null = null;
      try {
        if (!firestoreDb) throw new Error("Firestore not initialized");
        const docRef = doc(firestoreDb, "settings", "access_code");
        const docSnap = await getDoc(docRef);
        const setting = docSnap.exists() ? docSnap.data() : null;
        configuredCode = setting?.value || null;
      } catch (err) {
        console.warn("Firestore error in verify-code inside server, checking local NeDB fallback:", err);
        try {
          const settingObj = await localDb.settings.findOne({ type: 'access_code' }) as any;
          configuredCode = settingObj ? settingObj.value : null;
        } catch (localErr) {
          configuredCode = null;
        }
      }
      
      const normalizedCode = code ? code.trim() : "";
      
      if (normalizedCode === "مجتبى عواد" || normalizedCode === "مجتبى") {
        res.json({ 
          success: true, 
          user: { 
            displayName: "مجتبى عواد", 
            email: "ghanmdahmd@gmail.com", 
            photoURL: "https://ui-avatars.com/api/?name=Mujtaba+Awad&background=3B82F6&color=fff",
            uid: "doctor-mujtaba-access" 
          } 
        });
      } else if (normalizedCode === "GHANM-2026" || normalizedCode === "2026" || normalizedCode === "1234" || (configuredCode && configuredCode === normalizedCode)) {
        res.json({ 
          success: true, 
          user: { 
            displayName: "أحمد غانم", 
            email: "ghanmdahmd@gmail.com", 
            photoURL: "https://ui-avatars.com/api/?name=Ahmed+Ghanim&background=10B981&color=fff",
            uid: "doctor-ghanim-access" 
          } 
        });
      } else {
        res.status(401).json({ error: "الرمز المدخل غير صحيح!" });
      }
    } catch (err) { res.status(500).json(err); }
  });

  // Return the physical path of the local database on the computer's hard drive
  app.get("/api/database/info", (req, res) => {
    res.json({
      path: dataDir,
      platform: process.platform,
      isWindows: process.platform === "win32",
      description: "المسار المباشر لقاعدة البيانات المحلية على القرص الصلب للحاسوب الشخصي"
    });
  });

  // Database Backup list
  app.get("/api/database/backups-list", async (req, res) => {
    try {
      const backupDir = path.join(dataDir, 'backups');
      if (!fs.existsSync(backupDir)) {
        return res.json({ status: "active", count: 0, files: [] });
      }
      const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const filePath = path.join(backupDir, f);
          const stat = fs.statSync(filePath);
          return {
            name: f,
            size: `${(stat.size / 1024).toFixed(1)} KB`,
            time: stat.mtime
          };
        })
        .sort((a, b) => b.time.getTime() - a.time.getTime()); // Newest first
        
      res.json({
        status: "active",
        count: files.length,
        files: files.slice(0, 30) // Return last 30 daily backups
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to list auto-backups" });
    }
  });

  // Restore from a specific auto-backup file
  app.post("/api/database/restore-backup/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const backupDir = path.join(dataDir, 'backups');
      const backupPath = path.join(backupDir, filename);
      
      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ error: "Backup file not found" });
      }
      
      // Determine target db filename (e.g. patients_backup_2026-05-21.db -> patients.db)
      let targetDbName = "";
      if (filename.startsWith("patients")) targetDbName = "patients.db";
      else if (filename.startsWith("appointments")) targetDbName = "appointments.db";
      else if (filename.startsWith("visits")) targetDbName = "visits.db";
      else if (filename.startsWith("settings")) targetDbName = "settings.db";
      else if (filename.startsWith("invites")) targetDbName = "invites.db";
      
      if (!targetDbName) {
        return res.status(400).json({ error: "Unsupported backup file target" });
      }
      
      const targetPath = path.join(dataDir, targetDbName);
      
      // Copy backup file back to active database file
      fs.copyFileSync(backupPath, targetPath);
      
      // Reload NeDB database instance
      const dbKey = targetDbName.replace('.db', '') as keyof typeof localDb;
      (localDb as any)[dbKey] = Datastore.create({ filename: targetPath, autoload: true });
      
      res.json({ success: true, message: `Successfully restored ${targetDbName} from backup` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to restore backup snapshot" });
    }
  });

  // Download a specific backup snapshot
  app.get("/api/database/download-backup/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const backupDir = path.join(dataDir, 'backups');
      const filePath = path.join(backupDir, filename);
      if (fs.existsSync(filePath)) {
        res.download(filePath);
      } else {
        res.status(404).json({ error: "Backup snapshot file not found" });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to download backup" });
    }
  });

  // Database Backup
  app.get("/api/database/export/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const allowedFiles = ['patients.db', 'appointments.db', 'visits.db', 'settings.db', 'invites.db'];
      if (!allowedFiles.includes(filename)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const filePath = path.join(dataDir, filename);
      if (fs.existsSync(filePath)) {
        res.download(filePath);
      } else {
        res.status(404).json({ error: "File not found" });
      }
    } catch (err) { res.status(500).json(err); }
  });

  // Download entire project source is suspended per developer request
  app.get("/api/download-project", async (req, res) => {
    return res.status(403).json({ error: "تم إيقاف ميزة تحميل وتصدير المنصة مؤقتاً تمهيداً للإطلاق الرسمي للموقع." });
  });

  app.post("/api/database/restore/:filename", express.raw({ type: '*/*', limit: '10mb' }), async (req: any, res) => {
    try {
      const { filename } = req.params;
      const allowedFiles = ['patients.db', 'appointments.db', 'visits.db', 'settings.db', 'invites.db'];
      if (!allowedFiles.includes(filename)) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const filePath = path.join(dataDir, filename);
      fs.writeFileSync(filePath, req.body);
      
      // Reload the specific database
      const dbKey = filename.replace('.db', '') as keyof typeof localDb;
      (localDb as any)[dbKey] = Datastore.create({ filename: filePath, autoload: true });
      
      res.json({ success: true, message: `${filename} restored successfully` });
    } catch (err) { 
      console.error(err);
      res.status(500).json({ error: "Restore failed" }); 
    }
  });

  // Invites
  app.get("/api/invites/:token", async (req, res) => {
    try {
      const invite: any = await localDb.invites.findOne({ _id: req.params.token });
      if (invite) {
        res.json(invite);
      } else {
        res.status(404).json({ error: "Invite not found" });
      }
    } catch (err) { res.status(500).json(err); }
  });

  app.post("/api/invites/:token/accept", async (req, res) => {
    try {
      await localDb.invites.update({ _id: req.params.token }, { $set: { used: true, usedAt: new Date() } });
      res.json({ success: true });
    } catch (err) { res.status(500).json(err); }
  });

  app.post("/api/gemini/summarize", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "No text provided" });
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(`قم بتلخيص الحالة الطبية التالية باللغة العربية بشكل مهني ومختصر للطبيب: ${text}`);
      res.json({ summary: result.response.text() });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "فشل في إنشاء الملخص" });
    }
  });

  // Serve static files OR Vite middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("Mounting Vite middleware...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      app.get('*', async (req, res, next) => {
        try {
          const url = req.originalUrl;
          let template = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e) {
          next(e);
        }
      });
    } catch (err) {
      console.error("Vite failed to initialize, falling back to static:", err);
      const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
        ? __dirname
        : path.join(process.cwd(), 'dist');

      app.use((req, res, next) => {
        if (req.url.startsWith('/api')) return next();
        let reqPath = req.path;
        try {
          reqPath = decodeURIComponent(req.path);
        } catch (e) {}
        if (reqPath === '/' || !reqPath) reqPath = '/index.html';
        const filePath = path.join(distPath, reqPath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentTypes: { [key: string]: string } = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
          };
          if (contentTypes[ext]) res.setHeader('Content-Type', contentTypes[ext]);
          return res.sendFile(filePath);
        }
        next();
      });

      app.use(express.static(distPath));
      app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
    }
  } else {
    const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.join(process.cwd(), 'dist');

    console.log("Serving static files from production dist path:", distPath);

    app.use((req, res, next) => {
      if (req.url.startsWith('/api')) return next();
      let reqPath = req.path;
      try {
        reqPath = decodeURIComponent(req.path);
      } catch (e) {}
      if (reqPath === '/' || !reqPath) reqPath = '/index.html';
      const filePath = path.join(distPath, reqPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes: { [key: string]: string } = {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
        };
        if (contentTypes[ext]) res.setHeader('Content-Type', contentTypes[ext]);
        return res.sendFile(filePath);
      }
      next();
    });

    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
}

startServer().catch(err => {
  console.error("Critical server startup failure:", err);
});
