// src/App.jsx
// البوابة الرئيسية: حالة تسجيل الدخول + الدور -> أي شل يُعرض (§8 و§Phase C/E
// من برومبت الترحيل). راجع firestore.rules دائمًا كحماية حقيقية — الفصل هنا
// طبقة إضافية فوقها للـ UX بس، مش بديل عنها.
import { useAuth } from "./auth/AuthContext";
import LoginScreen from "./auth/LoginScreen";
import PendingLinkScreen from "./auth/PendingLinkScreen";
import ParentApp from "./ui/ParentApp";
import ChildApp from "./ui/child/ChildApp";

export default function App() {
  const { status, isParent, isChild } = useAuth();

  if (status === "loading") {
    return (
      <div className="auth-screen" dir="rtl">
        <div className="auth-brand">...</div>
      </div>
    );
  }

  if (status === "signedOut") return <LoginScreen />;
  if (status === "pendingLink") return <PendingLinkScreen />;

  // status === "ready"
  if (isParent) return <ParentApp />;
  if (isChild) return <ChildApp />;

  // حالة غير متوقعة (role غريب مثلًا) — رجوع آمن لشاشة الدخول بدل شاشة بيضاء.
  return <LoginScreen />;
}
