// src/auth/AuthContext.jsx
//
// المصدر الوحيد للحقيقة عن هوية المستخدم الحالي: مين هو (Firebase Auth)،
// دوره (Parent/Child)، أسرته (familyId)، وسجل الابن المرتبط بيه لو Child.
//
// نسخة Spark (مجانية بالكامل — بدون Blaze/Cloud Functions): الدور/الأسرة
// مش جايين من Custom Claims (كانوا محتاجين Cloud Function trigger)، لكن من
// مستند Firestore عادي في userProfiles/{uid} — راجع firestore.rules. بيتقرا
// بـ onSnapshot عشان أي تحديث (ربط عضو جديد) يوصل فورًا بدون Reload يدوي.

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, onSnapshot, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase/config";
import { setCurrentFamilyId, clearCurrentFamilyId } from "../lib/firebase/familyContext";

const AuthContext = createContext(null);

// أنواع حالة الجلسة (بند 8.3 — الربط اليدوي):
//   "loading"    → لسه بيتحقق من حالة تسجيل الدخول
//   "signedOut"  → مفيش مستخدم مسجّل دخول
//   "pendingLink"→ مسجّل دخول لكن معندوش userProfiles/{uid} بعد (لسه محدش ربطه)
//   "ready"      → مسجّل دخول وله role + familyId (وربما linkedChildId لو Child)
export function AuthProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState(null); // { role, familyId, linkedChildId }

  // يسجّل طلب الربط بشكل idempotent (safe لو اتكرر) — راجع pendingLinkRequests
  // في firestore.rules. مش خطأ فادح لو فشلت الكتابة دي (مثلًا أوفلاين).
  const registerPendingLink = useCallback(async (firebaseUser) => {
    try {
      if (firebaseUser.email) {
        await setDoc(doc(db, "pendingLinkRequests", firebaseUser.uid), {
          identifier: firebaseUser.email,
          identifierType: "email",
          displayName: firebaseUser.displayName || null,
          requestedAt: Date.now(),
        });
      }
    } catch {
      // تُعرض للمستخدم كخيار "أعد المحاولة" في الواجهة، مش خطأ يوقف التطبيق
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setClaims(null);
        clearCurrentFamilyId();
        setStatus("signedOut");
      }
    });
    return unsubscribeAuth;
  }, []);

  // بيتابع مستند userProfiles/{uid} لحظيًا — أي ربط جديد من الأب/الأم يوصل
  // فورًا للمستخدم المرتبط من غير ما يحتاج يعمل Refresh يدوي.
  useEffect(() => {
    if (!user) return undefined;

    const ref = doc(db, "userProfiles", user.uid);
    const unsubscribeProfile = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          const { role, familyId, linkedChildId } = snap.data();
          setClaims({ role, familyId, linkedChildId: linkedChildId || null });
          setCurrentFamilyId(familyId);
          setStatus("ready");
        } else {
          setClaims(null);
          clearCurrentFamilyId();
          setStatus("pendingLink");
          await registerPendingLink(user);
        }
      },
      () => {
        // فشل القراءة (نادر — أوفلاين مثلًا) — يفضل في pendingLink بدل ما يعلّق
        setStatus("pendingLink");
      }
    );
    return unsubscribeProfile;
  }, [user, registerPendingLink]);

  // "أعد المحاولة" في PendingLinkScreen — onSnapshot فوق أصلًا بيحدّث لحظيًا،
  // ده مجرد قراءة يدوية إضافية تطمين للمستخدم إنه ضغط وحصل حاجة.
  const retryLinkCheck = useCallback(async () => {
    if (!user) return;
    await getDoc(doc(db, "userProfiles", user.uid));
  }, [user]);

  // -------------------- تسجيل الدخول: إيميل + باسورد (للأب/الأم وللابن) --------------------
  // نسخة Spark: تسجيل الدخول بالإيميل بس لكل الأدوار (الأب/الأم والابن) —
  // Phone Auth اتشال لأنه محتاج Blaze Plan (تكلفة SMS فعلية). الدور نفسه
  // (Parent/Child) بيتحدد بعدين من الأب/الأم في شاشة "أعضاء الأسرة"، مش من
  // طريقة تسجيل الدخول.
  async function signInWithEmail(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUpWithEmail(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      cred.user.displayName = displayName;
    }
    return cred.user;
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  const value = {
    status, // "loading" | "signedOut" | "pendingLink" | "ready"
    user,
    role: claims?.role || null,
    familyId: claims?.familyId || null,
    linkedChildId: claims?.linkedChildId || null,
    isParent: claims?.role === "Parent",
    isChild: claims?.role === "Child",
    retryLinkCheck,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() لازم يُستخدم جوه <AuthProvider>");
  return ctx;
}
