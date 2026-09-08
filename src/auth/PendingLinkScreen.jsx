// src/auth/PendingLinkScreen.jsx
// تظهر لمستخدم مسجّل دخول (بإيميله) لكن لسه محدش ربطه بأسرة (§8.3).
import { useState } from "react";
import { doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase/config";
import { useAuth } from "./AuthContext";

export default function PendingLinkScreen() {
  const { user, retryLinkCheck, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [showFounder, setShowFounder] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [founding, setFounding] = useState(false);
  const [founderMsg, setFounderMsg] = useState(null);

  async function handleRetry() {
    setChecking(true);
    try {
      await retryLinkCheck();
    } finally {
      setChecking(false);
    }
  }

  /**
   * Bootstrap لأول أب/أم في أسرة جديدة تمامًا (مفيش حد تاني يقدر يربطه).
   * راجع firestore.rules — founderUid هو الوحيد المسموح له يضيف نفسه Parent.
   * نسخة Spark (مجانية): بيكتب userProfiles/{uid} مباشرة من العميل (بدل ما
   * ينتظر Cloud Function تحط Custom Claims) — الدور بيتفعّل فورًا، onSnapshot
   * في AuthContext هيلتقطه لحظيًا من غير ما يحتاج حتى يضغط "أعد المحاولة".
   */
  async function handleFoundFamily(e) {
    e.preventDefault();
    setFounding(true);
    setFounderMsg(null);
    try {
      const familyId = crypto.randomUUID();
      const familyRef = doc(db, "families", familyId);
      // الثلاث كتابات دي (الأسرة + العضوية + userProfiles) لازم تنجح مع بعض
      // أو تفشل مع بعض — writeBatch واحد Atomic بدل 3 await منفصلة (لو قطع
      // نت في النص كان ممكن يفضل family/members بدون userProfiles، فيفضل
      // المستخدم عالق في "انتظار الربط" للأبد ومحتاج يحاول Bootstrap تاني
      // بأسرة جديدة يتيمة). get() في firestore.rules بيشوف كتابات نفس الـ
      // batch اللي قبلها بالظبط، فالتحقق من founderUid وقت كتابة userProfiles
      // بيشتغل صح حتى إن family نفسها لسه ماتكتبتش خارج الـ batch ده.
      const batch = writeBatch(db);
      batch.set(familyRef, { name: familyName || "أسرتي", founderUid: user.uid });
      batch.set(doc(db, "families", familyId, "members", user.uid), {
        role: "Parent",
        displayName: user.displayName || user.email,
      });
      batch.set(doc(db, "userProfiles", user.uid), { role: "Parent", familyId });
      await batch.commit();
      try {
        await deleteDoc(doc(db, "pendingLinkRequests", user.uid));
      } catch {
        // مش خطأ فادح لو مش موجود أصلًا
      }
      setFounderMsg("تم إنشاء الأسرة وتفعيل حسابك ✅");
    } catch (err) {
      setFounderMsg(`حصل خطأ: ${err.message}`);
    } finally {
      setFounding(false);
    }
  }

  return (
    <div className="auth-screen" dir="rtl">
      <div className="auth-card">
        <div className="auth-brand">مدرستي وأولادي</div>
        <p style={{ fontSize: 40, textAlign: "center" }}>⏳</p>
        <h3 style={{ textAlign: "center" }}>في انتظار الربط</h3>
        <p className="auth-hint" style={{ textAlign: "center" }}>
          تم تسجيل دخولك بـ <strong>{user?.email}</strong>، لكن محدش من
          الوالدين ربط حسابك بعد بسجل داخل التطبيق. اطلب من أحد الوالدين يفتح شاشة
          "أعضاء الأسرة" ويربطك، وبعد كده دوس "أعد المحاولة".
        </p>
        <button className="btn btn-primary" onClick={handleRetry} disabled={checking}>
          {checking ? "..." : "أعد المحاولة"}
        </button>

        <hr style={{ margin: "16px 0", opacity: 0.3 }} />

        {!showFounder ? (
          <button type="button" className="auth-switch-mode" onClick={() => setShowFounder(true)}>
            أنا أول مستخدم — أسّس أسرة جديدة
          </button>
        ) : (
          <form className="auth-form" onSubmit={handleFoundFamily}>
            <label className="auth-field">
              اسم الأسرة (اختياري)
              <input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="أسرة..." />
            </label>
            <button className="btn btn-primary" type="submit" disabled={founding}>
              {founding ? "..." : "إنشاء الأسرة"}
            </button>
            {founderMsg && <p className="auth-hint">{founderMsg}</p>}
          </form>
        )}

        <button type="button" className="auth-switch-mode" onClick={signOut}>
          تسجيل خروج
        </button>
      </div>
    </div>
  );
}
