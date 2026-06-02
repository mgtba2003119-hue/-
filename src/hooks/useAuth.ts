import { useState, useEffect } from "react";
import { auth } from "../lib/firebase";
import { signInAnonymously } from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const localUser = localStorage.getItem('clinic_local_user');
    if (localUser) {
      setUser(JSON.parse(localUser));
    } else {
      loginLocally();
    }
    setLoading(false); // Stop blocking the UI immediately for instant load!
    
    let isInitialized = false;

    // Listen to Firebase Auth state initialization in the background
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (isInitialized) return;

      if (!firebaseUser) {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.warn("Could not sign in anonymously to Firebase Auth:", err);
          isInitialized = true;
        }
      } else {
        console.log("Firebase Auth established with user:", firebaseUser.email || "Anonymous");
        isInitialized = true;
      }
    });

    return () => unsubscribe();
  }, []);

  const loginLocally = () => {
    const mockUser = {
      displayName: "أحمد غانم",
      email: "ahmed@clinic.com",
      photoURL: "https://ui-avatars.com/api/?name=Ahmed+Ghanim&background=0D8ABC&color=fff",
      uid: "local-doctor-main"
    };
    setUser(mockUser);
    localStorage.setItem('clinic_local_user', JSON.stringify(mockUser));
  };

  const logout = async () => {
    localStorage.removeItem('clinic_local_user');
    setUser(null);
  };

  return { 
    user, 
    loading, 
    loginWithGoogle: async () => {
       setError("تسجيل دخول جوجل معطل في النسخة المحلية. يرجى استخدام الكود.");
    }, 
    loginLocally, 
    loginWithCode: async (code: string) => {
      setError(null);
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const res = await fetch((origin || "") + "/api/auth/verify-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setUser(data.user);
          localStorage.setItem('clinic_local_user', JSON.stringify(data.user));
          return true;
        } else {
          setError(data.error || "كود خاطئ");
          return false;
        }
      } catch (err) {
        setError("فشل الاتصال بالخادم");
        return false;
      }
    },
    logout, 
    error 
  };
}
