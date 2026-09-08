const WEEKDAYS = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
];

export default function ScheduleDaysEditor({ days, onChange }) {
  const selectedWeekdays = days.map((d) => d.weekday);

  function toggleDay(weekday) {
    if (selectedWeekdays.includes(weekday)) {
      onChange(days.filter((d) => d.weekday !== weekday));
    } else {
      onChange([...days, { weekday, start_time: "08:00", end_time: "14:00" }]);
    }
  }

  function updateTime(weekday, field, value) {
    onChange(days.map((d) => (d.weekday === weekday ? { ...d, [field]: value } : d)));
  }

  return (
    <div>
      <div className="weekday-picker">
        {WEEKDAYS.map((w) => (
          <button
            type="button"
            key={w.value}
            className={`weekday-chip ${selectedWeekdays.includes(w.value) ? "selected" : ""}`}
            onClick={() => toggleDay(w.value)}
          >
            {w.label}
          </button>
        ))}
      </div>

      {days
        .slice()
        .sort((a, b) => a.weekday - b.weekday)
        .map((d) => (
          <div key={d.weekday} style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
            <span style={{ width: 70, fontSize: 13, color: "var(--ink-muted)" }}>
              {WEEKDAYS.find((w) => w.value === d.weekday).label}
            </span>
            <input
              type="time"
              value={d.start_time}
              onChange={(e) => updateTime(d.weekday, "start_time", e.target.value)}
            />
            <span>إلى</span>
            <input
              type="time"
              value={d.end_time}
              onChange={(e) => updateTime(d.weekday, "end_time", e.target.value)}
            />
          </div>
        ))}
    </div>
  );
}
