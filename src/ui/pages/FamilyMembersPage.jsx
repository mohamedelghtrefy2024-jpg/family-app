// src/ui/pages/FamilyMembersPage.jsx
// شاشة "أعضاء الأسرة" — للأب/الأم بس (مُخفاة تمامًا عن الابن في الـ Navigation،
// ومحمية أيضًا بـ Security Rules — راجع firestore.rules: members write يحتاج
// isParentOfFamily). هنا يتم الربط اليدوي بالكامل (§8.3): إضافة أب/أم تاني
// أو ابن، الاتنين بالإيميل (نسخة Spark المجانية — بلا Phone Auth)، لسجل
// موجود بالفعل في children. كل ربط بيكتب مستندين: members (للعرض في الشاشة
// دي) و userProfiles (مصدر الصلاحية الحقيقي اللي بتقرأه Security Rules).
import { useEffect, useState } from "react";
import { doc, collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase/config";
import { useAuth } from "../../auth/AuthContext";
import { childRepo } from "../../data/repositories/childRepo";
import EmptyState from "../components/EmptyState";

export default function FamilyMembersPage() {
  const { familyId, user } = useAuth();
  const [members, setMembers] = useState([]);
  const [children, setChildren] = useState([]);
  const [identifier, setIdentifier] = useState("");
  const [foundRequest, setFoundRequest] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [selectedRole, setSelectedRole] = useState("Parent");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function loadMembers() {
    const snap = await getDocs(collection(db, "families", familyId, "members"));
    setMembers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
  }

  useEffect(() => {
    loadMembers();
    childRepo.getAll().then(setChildren);
  }, [familyId]);

  async function handleSearch(e) {
    e.preventDefault();
    setSearchError(null);
    setFoundRequest(null);
    setMessage(null);
    setBusy(true);
    try {
      // البحث بمعرفة الـ uid مباشرة غير ممكن (احنا عندنا identifier بس)، فبنعتمد
      // إن المستخدم (ابن/أب-أم تاني) دخل مرة واحدة الأول فسجّل نفسه في
      // pendingLinkRequests بمفتاح uid — هنا بنبحث بمسح كل الطلبات (عددها صغير
      // عمليًا لأسرة واحدة) ومطابقة identifier. لو الحجم كبر مستقبلًا، يتحول
      // لـ query بـ where("identifier","==",...) مع index مناسب.
      const snap = await getDocs(collection(db, "pendingLinkRequests"));
      const normalized = identifier.trim();
      const match = snap.docs.find((d) => d.data().identifier === normalized);
      if (!match) {
        setSearchError("مفيش طلب ربط بهذا الإيميل/الرقم — لازم الشخص يدخل التطبيق مرة واحدة الأول");
        return;
      }
      setFoundRequest({ uid: match.id, ...match.data() });
      // نسخة Spark: الكل بيدخل بالإيميل، فمفيش تخمين تلقائي للدور — الأب/الأم
      // يختار يدويًا (أب/أم تاني ولا ابن) من القائمة تحت.
      setSelectedRole("Parent");
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmLink() {
    if (!foundRequest) return;
    if (selectedRole === "Child" && !selectedChildId) {
      setMessage("اختار سجل الابن اللي هتربطه أولًا");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const memberData =
        selectedRole === "Parent"
          ? { role: "Parent", displayName: foundRequest.displayName || foundRequest.identifier }
          : {
              role: "Child",
              linkedChildId: selectedChildId,
              displayName: foundRequest.displayName || foundRequest.identifier,
            };
      const profileData =
        selectedRole === "Parent"
          ? { role: "Parent", familyId }
          : { role: "Child", familyId, linkedChildId: selectedChildId };
      // نسخة Spark (مجانية): userProfiles/{uid} هي اللي بتفعّل الصلاحية فعليًا
      // (بدل Custom Claims عبر Cloud Function) — members يفضل للعرض بس.
      // الثلاث كتابات دي لازم تنجح مع بعض أو تفشل مع بعض (Atomic) — لو حصل
      // قطع نت بعد كتابة members بس قبل userProfiles مثلًا، هيفضل العضو
      // "ظاهر" في القايمة بس بدون أي صلاحية فعلية أبدًا (Bug حقيقي كان هنا
      // قبل التحويل لـ writeBatch).
      const batch = writeBatch(db);
      batch.set(doc(db, "families", familyId, "members", foundRequest.uid), memberData);
      batch.set(doc(db, "userProfiles", foundRequest.uid), profileData);
      batch.delete(doc(db, "pendingLinkRequests", foundRequest.uid));
      await batch.commit();
      setMessage("تم الربط بنجاح ✅");
      setFoundRequest(null);
      setIdentifier("");
      setSelectedChildId("");
      await loadMembers();
    } catch (err) {
      setMessage(`حصل خطأ: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page" dir="rtl">
      <h2>أعضاء الأسرة</h2>

      <section className="card">
        <h3>الأعضاء الحاليين</h3>
        {members.length === 0 ? (
          <EmptyState title="مفيش أعضاء مسجلين لسه غيرك" />
        ) : (
          <ul className="list">
            {members.map((m) => (
              <li key={m.uid} className="list-row">
                <div>
                  <div className="list-row-name">{m.displayName || m.uid}</div>
                  <div className="list-row-meta">
                    {m.role === "Parent" ? "أب/أم" : "ابن"}
                    {m.linkedChildId && ` — مرتبط بـ ${nameOf(children, m.linkedChildId)}`}
                    {m.uid === user.uid && " (أنت)"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3>ربط عضو جديد</h3>
        <p className="list-row-meta">
          لازم الشخص (ابنك أو أب/أم تاني) يفتح التطبيق ويسجّل دخول مرة واحدة
          الأول بإيميله، وبعدين هنا تقدر تربطه.
        </p>
        <form className="auth-form" onSubmit={handleSearch}>
          <label className="auth-field">
            الإيميل بتاعه (بالصيغة اللي دخل بيها بالظبط)
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            بحث
          </button>
        </form>
        {searchError && <div className="auth-error">{searchError}</div>}

        {foundRequest && (
          <div style={{ marginTop: 12 }}>
            <p>لقينا طلب ربط من: <strong>{foundRequest.identifier}</strong></p>
            <label className="auth-field">
              الدور
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                <option value="Parent">أب/أم (صلاحية كاملة)</option>
                <option value="Child">ابن (جدوله بس)</option>
              </select>
            </label>
            {selectedRole === "Child" && (
              <label className="auth-field">
                ربط بسجل الابن
                <select value={selectedChildId} onChange={(e) => setSelectedChildId(e.target.value)}>
                  <option value="">اختر...</option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}
            <button className="btn btn-primary" onClick={handleConfirmLink} disabled={busy}>
              تأكيد الربط
            </button>
          </div>
        )}
        {message && <p className="auth-hint">{message}</p>}
      </section>
    </div>
  );
}

function nameOf(list, id) {
  return list.find((x) => x.id === id)?.name || id;
}
