import { useEffect, useMemo, useState } from "react";
import { loadCalendarContext } from "../../data/loadCalendarContext";
import { buildCalendarEvents, filterEvents } from "../../domain/calendar/calendarBuilder";
import {
  parseLocalDate,
  formatLocalDate,
  addDays,
  startOfMonth,
  endOfMonth,
} from "../../domain/shared/dateUtils";

const VIEWS = [
  { id: "day", label: "يومي" },
  { id: "week", label: "أسبوعي" },
  { id: "month", label: "شهري" },
];

const TYPE_OPTIONS = [
  { value: "", label: "كل الأنشطة" },
  { value: "school", label: "🏫 مدرسة" },
  { value: "lesson", label: "📚 درس" },
  { value: "transit", label: "🚗 انتقال" },
  { value: "payment", label: "💰 دفع" },
];

const WEEKDAY_LABELS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

// BUG-fix (بند 17 — بحث شامل): isoDate/startOfMonth/endOfMonth/addDays المحليين هنا
// كانوا نسخة تانية من نفس منطق dateUtils.js (بند 29)، وisoDate تحديدًا كانت تستخدم
// toISOString() (UTC) — نفس عرض الأحد↔السبت الخاطئ الموصوف في BUG-04 لكن هنا في
// صفحة الـ Calendar نفسها.
function isoDate(d) {
  return formatLocalDate(d);
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // الأحد بداية الأسبوع
  return d;
}

export default function CalendarPage() {
  const [ctx, setCtx] = useState(null);
  const [view, setView] = useState("week");
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [filters, setFilters] = useState({ childId: "", schoolId: "", subjectId: "", teacherId: "", type: "" });

  async function load() {
    setCtx(await loadCalendarContext());
  }

  useEffect(() => {
    load();
  }, []);

  const range = useMemo(() => {
    if (view === "day") return { start: anchor, end: anchor };
    if (view === "week") {
      const start = startOfWeek(anchor);
      return { start, end: addDays(start, 6) };
    }
    return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  }, [view, anchor]);

  const events = useMemo(() => {
    if (!ctx) return [];
    const all = buildCalendarEvents(ctx, range.start, range.end);
    return filterEvents(all, filters);
  }, [ctx, range, filters]);

  function updateFilter(field, value) {
    setFilters((f) => ({ ...f, [field]: value }));
  }

  function shift(amount) {
    if (view === "day") setAnchor((a) => addDays(a, amount));
    else if (view === "week") setAnchor((a) => addDays(a, amount * 7));
    else setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + amount, 1));
  }

  function nameOf(list, id) {
    return list?.find((x) => x.id === id)?.name || "—";
  }

  function eventLine(ev) {
    const childName = nameOf(ctx.children, ev.child_id);
    return (
      <div className={`calendar-event calendar-event-${ev.type}`} key={ev.id}>
        <span className="calendar-event-time">{ev.start_time ? `${ev.start_time}${ev.end_time ? "–" + ev.end_time : ""}` : "طوال اليوم"}</span>
        <span className="calendar-event-label">{childName} — {ev.label}</span>
      </div>
    );
  }

  if (!ctx) return null;

  const rangeLabel =
    view === "day"
      ? isoDate(anchor)
      : `${isoDate(range.start)} — ${isoDate(range.end)}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">كل مواعيد الأسرة في مكان واحد — مدرسة، دروس، انتقالات، ومواعيد دفع</p>
        </div>
      </div>

      <div className="calendar-toolbar">
        <div className="view-toggle">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              className={`btn ${view === v.id ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="calendar-nav">
          <button className="btn btn-ghost" onClick={() => shift(-1)}>‹ السابق</button>
          <span className="calendar-range-label">{rangeLabel}</span>
          <button className="btn btn-ghost" onClick={() => shift(1)}>التالي ›</button>
          <button className="btn btn-ghost" onClick={() => setAnchor(new Date(new Date().setHours(0, 0, 0, 0)))}>اليوم</button>
        </div>
      </div>

      <div className="calendar-filters">
        <select value={filters.childId} onChange={(e) => updateFilter("childId", e.target.value)}>
          <option value="">كل الأبناء</option>
          {ctx.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.schoolId} onChange={(e) => updateFilter("schoolId", e.target.value)}>
          <option value="">كل المدارس</option>
          {ctx.schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filters.subjectId} onChange={(e) => updateFilter("subjectId", e.target.value)}>
          <option value="">كل المواد</option>
          {ctx.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filters.teacherId} onChange={(e) => updateFilter("teacherId", e.target.value)}>
          <option value="">كل المدرسين</option>
          {ctx.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filters.type} onChange={(e) => updateFilter("type", e.target.value)}>
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {events.length === 0 && <div className="dashboard-empty" style={{ marginTop: 16 }}>مفيش أحداث في الفترة دي</div>}

      {view === "month" ? (
        <MonthGrid
          range={range}
          events={events}
          onDayClick={(d) => { setAnchor(d); setView("day"); }}
        />
      ) : (
        <DayList range={range} events={events} eventLine={eventLine} />
      )}
    </div>
  );
}

function DayList({ range, events, eventLine }) {
  const days = [];
  let cursor = new Date(range.start);
  while (cursor <= range.end) {
    days.push(isoDate(cursor));
    cursor = addDays(cursor, 1);
  }

  return (
    <div>
      {days.map((dateStr) => {
        const dayEvents = events.filter((e) => e.date === dateStr);
        if (dayEvents.length === 0) return null;
        const weekday = WEEKDAY_LABELS[parseLocalDate(dateStr).getDay()];
        return (
          <div className="calendar-day-block" key={dateStr}>
            <div className="calendar-day-heading">{weekday} — {dateStr}</div>
            {dayEvents.map((ev) => eventLine(ev))}
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({ range, events, onDayClick }) {
  const gridStart = startOfWeek(range.start);
  const gridEnd = addDays(startOfWeek(range.end), 6);
  const days = [];
  let cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }

  return (
    <div>
      <div className="month-grid-header">
        {WEEKDAY_LABELS.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="month-grid">
        {days.map((day) => {
          const dateStr = isoDate(day);
          const inMonth = day.getMonth() === range.start.getMonth();
          const dayEvents = events.filter((e) => e.date === dateStr);
          return (
            <div
              key={dateStr}
              className={`month-cell ${inMonth ? "" : "month-cell-outside"}`}
              onClick={() => onDayClick(day)}
            >
              <div className="month-cell-date">{day.getDate()}</div>
              {dayEvents.slice(0, 3).map((ev) => (
                <div className="month-cell-chip" key={ev.id}>{ev.label}</div>
              ))}
              {dayEvents.length > 3 && <div className="month-cell-more">+{dayEvents.length - 3}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
