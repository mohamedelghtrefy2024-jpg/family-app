const WEEKDAYS = [
  { value: 0, label: "أحد" },
  { value: 1, label: "إثنين" },
  { value: 2, label: "ثلاثاء" },
  { value: 3, label: "أربعاء" },
  { value: 4, label: "خميس" },
  { value: 5, label: "جمعة" },
  { value: 6, label: "سبت" },
];

export default function WeekdayMultiPicker({ selected, onChange }) {
  function toggle(v) {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v].sort());
  }

  return (
    <div className="weekday-picker">
      {WEEKDAYS.map((w) => (
        <button
          type="button"
          key={w.value}
          className={`weekday-chip ${selected.includes(w.value) ? "selected" : ""}`}
          onClick={() => toggle(w.value)}
        >
          {w.label}
        </button>
      ))}
    </div>
  );
}
