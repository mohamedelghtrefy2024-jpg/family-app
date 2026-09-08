import { useEffect, useMemo, useState } from "react";
import { loadCalendarContext } from "../../data/loadCalendarContext";
import { buildCalendarEvents } from "../../domain/calendar/calendarBuilder";
import EmptyState from "../components/EmptyState";

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

export default function FamilySchedulePage() {
  const [ctx, setCtx] = useState(null);
  const [dateStr, setDateStr] = useState(() => isoDate(new Date()));

  useEffect(() => {
    loadCalendarContext().then(setCtx);
  }, []);

  const dayEvents = useMemo(() => {
    if (!ctx) return [];
    const day = new Date(dateStr);
    day.setHours(0, 0, 0, 0);
    return buildCalendarEvents(ctx, day, day);
  }, [ctx, dateStr]);

  if (!ctx) return null;

  const timedEvents = dayEvents.filter((e) => e.type === "school" || e.type === "lesson");
  const paymentEvents = dayEvents.filter((e) => e.type === "payment");
  const transitWarnings = dayEvents.filter((e) => e.type === "transit" && !e.sufficient);

  const times = [...new Set(timedEvents.map((e) => e.start_time))].sort();
  const children = ctx.children;

  function nameOf(list, id) {
    return list.find((x) => x.id === id)?.name || "—";
  }

  function cellFor(time, childId) {
    const matches = timedEvents.filter((e) => e.start_time === time && e.child_id === childId);
    if (matches.length === 0) return "—";
    return matches.map((e) => e.label).join(" / ");
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">الجدول العائلي</h1>
          <p className="page-subtitle">يوم الأسرة بالكامل في شاشة واحدة</p>
        </div>
        <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
      </div>

      {children.length === 0 && (
        <EmptyState title="لسه مفيش أبناء مُضافين" hint="أضف أبناء الأول عشان يظهر جدولهم هنا" />
      )}

      {children.length > 0 && (
        <>
          {times.length === 0 ? (
            <div className="dashboard-empty">مفيش مواعيد مسجّلة في هذا اليوم</div>
          ) : (
            <div className="family-schedule-wrap">
              <table className="family-schedule-table">
                <thead>
                  <tr>
                    <th>الوقت</th>
                    {children.map((c) => <th key={c.id}>{c.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {times.map((time) => (
                    <tr key={time}>
                      <td className="family-schedule-time">{time}</td>
                      {children.map((c) => (
                        <td key={c.id}>{cellFor(time, c.id)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {transitWarnings.length > 0 && (
            <div className="error-banner" style={{ marginTop: 16 }}>
              {transitWarnings.map((t) => (
                <div key={t.id}>⚠️ وقت انتقال غير كافٍ — {nameOf(children, t.child_id)} ({t.start_time}–{t.end_time})</div>
              ))}
            </div>
          )}

          {paymentEvents.length > 0 && (
            <div className="dashboard-card" style={{ marginTop: 16 }}>
              <div className="dashboard-card-title">💰 استحقاقات اليوم</div>
              {paymentEvents.map((p) => (
                <div className="agenda-item" key={p.id}>
                  <span className="agenda-label">{nameOf(children, p.child_id)} — {p.label}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
