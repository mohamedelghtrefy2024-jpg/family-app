// src/ui/child/ChildSettingsPage.jsx
//
// نسخة Spark (مجانية بالكامل): زرار تفعيل التنبيهات (Push) اتشال من هنا —
// كان محتاج Cloud Functions + Cloud Scheduler، والاتنين محتاجين خطة Blaze
// (فوترة مفعّلة) حتى لو الاستخدام الفعلي صفر. التنبيهات جوه التطبيق نفسه
// (لما يكون مفتوح) لسه شغالة عادي من notificationService.js.
import { useAuth } from "../../auth/AuthContext";

export default function ChildSettingsPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="page">
      <h2>الإعدادات</h2>

      <div className="card">
        <h3>الحساب</h3>
        <p className="list-row-meta">{user?.email}</p>
        <button className="btn btn-ghost" onClick={signOut}>تسجيل خروج</button>
      </div>
    </div>
  );
}
