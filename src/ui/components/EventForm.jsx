import { useState } from "react";
import { todayLocalDateString } from "../../domain/shared/dateUtils";

const EVENT_TYPES = [
  { value: "exam", label: "امتحان" },
  { value: "trip", label: "رحلة مدرسية" },
  { value: "family", label: "مناسبة عائلية" },
  { value: "other", label: "أخرى" },
];

const EMPTY = {
  title: "",
  event_type: "other",
  date: todayLocalDateString(),
  end_date: "",
  start_time: "",
  end_time: "",
  child_id: "",
  notes: "",
};

export default function EventForm({ children, initial, onSave, onCancel }) {
  const [values, setValues] = useState(initial || EMPTY);
  const [error, setError] = useState(null);

  function update(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!values.title.trim()) return setError("عنوان الحدث مطلوب");
    if (!values.date) return setError("تاريخ الحدث مطلوب");
    if (values.end_date && values.end_date < values.date) {
      return setError("تاريخ النهاية لازم يكون بعد تاريخ البداية");
    }
    setError(null);
    onSave({
      title: values.title.trim(),
      event_type: values.event_type,
      date: values.date,
      end_date: values.end_date || null,
      start_time: values.start_time || null,
      end_time: values.end_time || null,
      child_id: values.child_id || null,
      notes: values.notes.trim() || null,
    });
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-row">
        <label>العنوان</label>
        <input value={values.title} onChange={(e) => update("title", e.target.value)} autoFocus />
      </div>

      <div className="form-row">
        <label>النوع</label>
        <select value={values.event_type} onChange={(e) => update("event_type", e.target.value)}>
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>التاريخ</label>
        <input type="date" value={values.date} onChange={(e) => update("date", e.target.value)} />
      </div>

      <div className="form-row">
        <label>تاريخ النهاية (اختياري، لو حدث ممتد)</label>
        <input type="date" value={values.end_date} onChange={(e) => update("end_date", e.target.value)} />
      </div>

      <div className="form-row">
        <label>وقت البداية (اختياري)</label>
        <input type="time" value={values.start_time} onChange={(e) => update("start_time", e.target.value)} />
      </div>

      <div className="form-row">
        <label>وقت النهاية (اختياري)</label>
        <input type="time" value={values.end_time} onChange={(e) => update("end_time", e.target.value)} />
      </div>

      <div className="form-row">
        <label>خاص بابن معيّن (اختياري)</label>
        <select value={values.child_id} onChange={(e) => update("child_id", e.target.value)}>
          <option value="">الأسرة كلها</option>
          {children.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>ملاحظات</label>
        <input value={values.notes} onChange={(e) => update("notes", e.target.value)} />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">حفظ</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
      </div>
    </form>
  );
}
