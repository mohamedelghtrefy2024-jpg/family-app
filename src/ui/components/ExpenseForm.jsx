import { useState } from "react";
import EntityPicker from "./EntityPicker";
import { todayLocalDateString } from "../../domain/shared/dateUtils";

const TERMS = [
  { value: "", label: "غير محدد" },
  { value: "Term1", label: "الفصل الأول" },
  { value: "Term2", label: "الفصل الثاني" },
  { value: "Summer", label: "الصيف" },
];

const EMPTY = {
  child_id: "",
  category_id: "",
  academic_year_id: "",
  term: "",
  description: "",
  amount: "",
  is_fixed: false,
  expense_date: todayLocalDateString(),
  due_date: todayLocalDateString(),
  notes: "",
};

export default function ExpenseForm({ children, categories, academicYears, onRefreshCategories, onRefreshAcademicYears, onSave, onCancel }) {
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState(null);

  function update(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!values.child_id) return setError("اختر الابن");
    if (!values.category_id) return setError("اختر التصنيف");
    const amount = Number(values.amount);
    if (!values.amount || isNaN(amount) || amount <= 0) {
      return setError("القيمة يجب أن تكون رقمًا موجبًا");
    }
    if (!values.due_date) return setError("تاريخ الاستحقاق مطلوب");

    setError(null);
    onSave({
      child_id: values.child_id,
      category_id: values.category_id,
      academic_year_id: values.academic_year_id || null,
      term: values.term || null,
      description: values.description.trim(),
      amount,
      is_fixed: values.is_fixed,
      expense_date: values.expense_date,
      due_date: values.due_date,
      notes: values.notes.trim() || null,
      cancelled: false,
    });
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-row">
        <label>الابن</label>
        <select value={values.child_id} onChange={(e) => update("child_id", e.target.value)}>
          <option value="" disabled>اختر...</option>
          {children.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>التصنيف</label>
        <EntityPicker
          items={categories}
          value={values.category_id}
          onChange={(id) => update("category_id", id)}
          onCreate={async (name) => {
            const created = await onRefreshCategories(name);
            return created;
          }}
          placeholder="اسم تصنيف جديد"
        />
      </div>

      <div className="form-row">
        <label>السنة الدراسية (اختياري)</label>
        <EntityPicker
          items={academicYears}
          value={values.academic_year_id}
          onChange={(id) => update("academic_year_id", id)}
          onCreate={async (name) => onRefreshAcademicYears(name)}
          placeholder="مثال: 2026/2027"
        />
      </div>

      <div className="form-row">
        <label>الترم</label>
        <select value={values.term} onChange={(e) => update("term", e.target.value)}>
          {TERMS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>الوصف</label>
        <input value={values.description} onChange={(e) => update("description", e.target.value)} autoFocus />
      </div>

      <div className="form-row">
        <label>القيمة</label>
        <input type="number" min="0" step="0.01" value={values.amount} onChange={(e) => update("amount", e.target.value)} />
      </div>

      <div className="form-row">
        <label>النوع</label>
        <div className="weekday-picker">
          <button
            type="button"
            className={`weekday-chip ${!values.is_fixed ? "selected" : ""}`}
            onClick={() => update("is_fixed", false)}
          >
            متغيّر
          </button>
          <button
            type="button"
            className={`weekday-chip ${values.is_fixed ? "selected" : ""}`}
            onClick={() => update("is_fixed", true)}
          >
            ثابت
          </button>
        </div>
      </div>

      <div className="form-row">
        <label>تاريخ الاستحقاق</label>
        <input type="date" value={values.due_date} onChange={(e) => update("due_date", e.target.value)} />
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
