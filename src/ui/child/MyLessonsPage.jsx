// src/ui/child/MyLessonsPage.jsx
// صفحة "دروسي" — للابن بس. تفاصيل الدرس + سعره (مسموح صراحة §3)، بدون أي
// بيانات مالية إجمالية (لا مصروفات، لا مدفوعات، لا ميزانية).
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { loadChildScheduleContext } from "../../data/loadChildScheduleContext";
import { getActivePrice } from "../../domain/pricing/priceHistoryService";
import EmptyState from "../components/EmptyState";

function nameOf(list, id) {
  return list.find((x) => x.id === id)?.name || "—";
}

const WEEKDAY_LABELS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function MyLessonsPage() {
  const { linkedChildId } = useAuth();
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadChildScheduleContext(linkedChildId)
      .then(setCtx)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [linkedChildId]);

  if (loading) return <div className="page">...</div>;
  if (error) return <div className="page auth-error">{error}</div>;
  if (!ctx || ctx.lessons.length === 0) {
    return (
      <div className="page">
        <EmptyState title="مفيش دروس مسجلة لسه" hint="لما يضيف حد من والديك درس، هيظهر هنا." />
      </div>
    );
  }

  return (
    <div className="page">
      <h2>دروسي</h2>
      <ul className="list">
        {ctx.lessons.map((lesson) => {
          const pattern = ctx.patterns[lesson.id];
          const price = getActivePrice(ctx.prices, lesson.id);
          return (
            <li key={lesson.id} className="card">
              <div className="list-row-name">{nameOf(ctx.subjects, lesson.subject_id)}</div>
              <div className="list-row-meta">
                👨‍🏫 {nameOf(ctx.teachers, lesson.teacher_id)} · 📍 {nameOf(ctx.locations, lesson.location_id)}
              </div>
              {pattern && (
                <div className="list-row-meta">
                  🗓️ {pattern.weekdays?.map((w) => WEEKDAY_LABELS[w]).join("، ")} — {pattern.start_time} إلى{" "}
                  {pattern.end_time}
                </div>
              )}
              {price && (
                <div className="list-row-meta" style={{ fontWeight: 700 }}>
                  💰 {price.amount} جنيه / {priceUnitLabel(price.pricing_method)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function priceUnitLabel(method) {
  const labels = {
    per_session: "الحصة",
    weekly: "الأسبوع",
    monthly: "الشهر",
    term: "الترم",
    annual: "السنة",
    fixed: "مبلغ ثابت",
    variable: "متغيّر",
  };
  return labels[method] || method || "";
}
