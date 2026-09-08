// src/auth/LoginScreen.jsx
//
// نسخة Spark (مجانية بالكامل): تسجيل دخول واحد بالإيميل/الباسورد لكل الأدوار
// (أب/أم أو ابن) — الدور نفسه بيتحدد بعدين من الأب/الأم في "أعضاء الأسرة".
// Phone Auth اتشال هنا لأنه محتاج Blaze Plan (تكلفة SMS فعلية لكل رسالة).
import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function LoginScreen() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName);
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen" dir="rtl">
      <div className="auth-card">
        <div className="auth-brand">مدرستي وأولادي</div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label className="auth-field">
              الاسم
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </label>
          )}
          <label className="auth-field">
            البريد الإلكتروني
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="auth-field">
            كلمة المرور
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "..." : mode === "signin" ? "دخول" : "إنشاء حساب"}
          </button>
          <button
            type="button"
            className="auth-switch-mode"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "أول مرة؟ إنشاء حساب جديد" : "عندك حساب؟ دخول"}
          </button>
          {mode === "signup" && (
            <p className="auth-hint">
              بعد إنشاء الحساب، هتحتاج أحد الوالدين يربط حسابك من شاشة "أعضاء
              الأسرة" (سواء كنت أب/أم تاني أو ابن).
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  const map = {
    "auth/invalid-email": "البريد الإلكتروني غير صحيح",
    "auth/user-not-found": "لا يوجد حساب بهذا البريد",
    "auth/wrong-password": "كلمة المرور غير صحيحة",
    "auth/email-already-in-use": "البريد الإلكتروني مُستخدَم بالفعل",
    "auth/weak-password": "كلمة المرور ضعيفة (6 أحرف على الأقل)",
    "auth/too-many-requests": "محاولات كثيرة — حاول بعد قليل",
  };
  return map[code] || "حصل خطأ، حاول تاني";
}
