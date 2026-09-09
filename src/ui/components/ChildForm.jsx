import { useState } from "react";

const EMPTY = { name: "", birth_date: "", education_stage: "", grade: "", notes: "" };

export default function ChildForm({ initial, onSave, onCancel }) {
  const [values, setValues] = useState(initial || EMPTY);
  const [error, setError] = useState(null);

  function update(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!values.name.trim()) {
      setError("اسم الابن مطلوب");
      return;
    }
    setError(null);
    onSave({ ...values, is_active: true });
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-row">
        <label>الاسم</label>
        <input value={values.name} onChange={(e) => update("name", e.target.value)} autoFocus />
      </div>

      <div className="form-row">
        <label>تاريخ الميلاد</label>
        <input
          type="date"
          value={values.birth_date}
          onChange={(e) => update("birth_date", e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>المرحلة الدراسية</label>
        <input
          placeholder="مثال: ابتدائي"
          value={values.education_stage}
          onChange={(e) => update("education_stage", e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>الصف</label>
        <input
          placeholder="مثال: الصف الرابع"
          value={values.grade}
          onChange={(e) => update("grade", e.target.value)}
        />
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
