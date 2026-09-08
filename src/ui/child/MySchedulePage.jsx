// src/ui/child/MySchedulePage.jsx
// صفحة "جدولي" — للابن بس. نفس منطق FamilySchedulePage.jsx (buildCalendarEvents
// من Domain، بدون تعديل) لكن فوق سياق مقيّد بابن واحد (loadChildScheduleContext)
// بدل سياق الأسرة الكامل.
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { loadChildScheduleContext } from "../../data/loadChildScheduleContext";
import { buildCalendarEvents } from "../../domain/calendar/calendarBuilder";
import { parseLocalDate, todayLocalDateString } from "../../domain/shared/dateUtils";
import EmptyState from "../components/EmptyState";

const TYPE_ICON = { school: "🏫", lesson: "📚", transit: "🚗" };

export default function MySchedulePage() {
  const { linkedChildId } = useAuth();
  const [ctx, setCtx] = useState(null);
  const [dateStr, setDateStr] = useState(() => todayLocalDateString());
  const [error, setError] = useState(null);

  useEffect(() => {
    loadChildScheduleContext(linkedChildId).then(setCtx).catch((err) => setError(err.message));
  }, [linkedChildId]);

  const dayEvents = useMemo(() => {
    if (!ctx) return [];
    const day = parseLocalDate(dateStr);
    return buildCalendarEvents(ctx, day, day)
      // بند 3: الابن ميشوفش أحداث "payment" (مالية) حتى لو الـ Domain حسبتها —
      // في حالتنا مستحيل أصلًا لأن ctx.expenses=[] دايمًا هنا، لكن الفلتر ده
      // طبقة أمان إضافية بسيطة تفاديًا لأي مفاجأة مستقبلية في الـ Domain.
      .filter((ev) => ev.type !== "payment")
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  }, [ctx, dateStr]);

  if (error) return <div className="page auth-error">{error}</div>;

  return (
    <div className="page">
      <h2>جدولي</h2>
      <input
        type="date"
        value={dateStr}
        onChange={(e) => setDateStr(e.target.value)}
        style={{ marginBottom: 16, padding: 10, fontSize: 16 }}
      />
      {dayEvents.length === 0 ? (
        <EmptyState title="مفيش مواعيد النهاردة" hint="يوم إجازة! 🎉" />
      ) : (
        <ul className="list">
          {dayEvents.map((ev) => (
            <li key={ev.id} className="card">
              <div className="list-row-name">
                {TYPE_ICON[ev.type] || "📌"} {ev.label}
              </div>
              <div className="list-row-meta">
                {ev.start_time} — {ev.end_time}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
