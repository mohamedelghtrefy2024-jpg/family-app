import { useState } from "react";

const EMPTY = { name: "", start_date: "", end_date: "" };

/**
 * AcademicYearForm — إنشاء/تعديل سنة دراسية.
 * إذا كانت السنة (وقت التعديل) مرتبطة ببيانات فعلية (تسجيل/مصروفات)، تواريخها تُقفل
 * ولا يُسمح إلا بتعديل الاسم — بند: لا تعديل تاريخ رجعي.
 */
export default function AcademicYearForm({ initial, datesLocked, onSave, onCancel }) {
  const [values, setValues] = useState(initial || EMPTY);
  const [error, setError] = useState(null);

  function update(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!values.name.trim()) return setError("اسم السنة الدراسية مطلوب (مثال: 2026/2027)");
    if (!values.start_date) return setError("تاريخ البداية مطلوب");
    if (!values.end_date) return setError("تاريخ النهاية مطلوب");
    if (values.end_date <= values.start_date) {
      return setError("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");
    }
    setError(null);
    onSave({
      name: values.name.trim(),
      start_date: values.start_date,
      end_date: values.end_date,
    });
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}

      {datesLocked && (
        <div className="error-banner" style={{ background: "var(--accent-money-soft)", color: "var(--accent-money)" }}>
          فيه بيانات مرتبطة بهذه السنة (تسجيل مدرسي/مصروفات) — التواريخ مقفولة، ويمكن تعديل الاسم فقط
        </div>
      )}

      <div className="form-row">
        <label>السنة الدراسية</label>
        <input
          placeholder="مثال: 2026/2027"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          autoFocus
        />
      </div>

      <div className="form-row">
        <label>تاريخ البداية</label>
        <input
          type="date"
          value={values.start_date}
          onChange={(e) => update("start_date", e.target.value)}
          disabled={datesLocked}
        />
      </div>

      <div className="form-row">
        <label>تاريخ النهاية</label>
        <input
          type="date"
          value={values.end_date}
          onChange={(e) => update("end_date", e.target.value)}
          disabled={datesLocked}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">حفظ</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
      </div>
    </form>
  );
}
