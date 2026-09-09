import { useState } from "react";
import EntityPicker from "./EntityPicker";
import WeekdayMultiPicker from "./WeekdayMultiPicker";
import { todayLocalDateString } from "../../domain/shared/dateUtils";

const FREQUENCIES = [
  { value: "Daily", label: "يومي" },
  { value: "Weekly", label: "أسبوعي" },
  { value: "Monthly", label: "شهري" },
  { value: "Term", label: "فصل دراسي (تقريبي)" },
  { value: "Annual", label: "سنوي" },
  { value: "Custom", label: "مخصص (كل عدد أيام)" },
];

const TERMS = [
  { value: "", label: "غير محدد" },
  { value: "Term1", label: "الفصل الأول" },
  { value: "Term2", label: "الفصل الثاني" },
  { value: "Summer", label: "الصيف" },
];

const EMPTY = {
  child_id: "",
  category_id: "",
  description: "",
  amount: "",
  is_fixed: true,
  frequency: "Monthly",
  interval: 1,
  weekdays: [],
  day_of_month: 1,
  custom_interval_days: 30,
  start_date: todayLocalDateString(),
  end_date: "",
  occurrences_count: "",
  academic_year_id: "",
  term: "",
  notes: "",
};

export default function RecurrenceRuleForm({
  childrenList,
  categories,
  academicYears,
  onRefreshCategories,
  onRefreshAcademicYears,
  onSave,
  onCancel,
}) {
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
    if (!values.start_date) return setError("تاريخ البداية مطلوب");
    if (values.frequency === "Weekly" && values.weekdays.length === 0) {
      return setError("اختر يوم واحد على الأقل للتكرار الأسبوعي");
    }
    if (values.end_date && values.end_date < values.start_date) {
      return setError("تاريخ النهاية لازم يكون بعد تاريخ البداية");
    }

    setError(null);
    onSave({
      child_id: values.child_id,
      category_id: values.category_id,
      description: values.description.trim(),
      amount,
      is_fixed: values.is_fixed,
      status: "Active",
      frequency: values.frequency,
      interval: Number(values.interval) || 1,
      weekdays: values.frequency === "Weekly" ? values.weekdays : [],
      day_of_month: values.frequency === "Monthly" ? Number(values.day_of_month) || 1 : null,
      custom_interval_days:
        values.frequency === "Custom" ? Number(values.custom_interval_days) || 1 : null,
      start_date: values.start_date,
      end_date: values.end_date || null,
      occurrences_count: values.occurrences_count ? Number(values.occurrences_count) : null,
      academic_year_id: values.academic_year_id || null,
      term: values.term || null,
      notes: values.notes.trim() || null,
    });
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-row">
        <label>الابن</label>
        <select value={values.child_id} onChange={(e) => update("child_id", e.target.value)}>
          <option value="" disabled>اختر...</option>
          {childrenList.map((c) => (
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
          onCreate={onRefreshCategories}
          placeholder="اسم تصنيف جديد"
        />
      </div>

      <div className="form-row">
        <label>الوصف</label>
        <input value={values.description} onChange={(e) => update("description", e.target.value)} autoFocus />
      </div>

      <div className="form-row">
        <label>القيمة (لكل مرة)</label>
        <input type="number" min="0" step="0.01" value={values.amount} onChange={(e) => update("amount", e.target.value)} />
      </div>

      <div className="form-row">
        <label>النوع</label>
        <div className="weekday-picker">
          <button type="button" className={`weekday-chip ${!values.is_fixed ? "selected" : ""}`} onClick={() => update("is_fixed", false)}>متغيّر</button>
          <button type="button" className={`weekday-chip ${values.is_fixed ? "selected" : ""}`} onClick={() => update("is_fixed", true)}>ثابت</button>
        </div>
      </div>

      <div className="form-row">
        <label>التكرار</label>
        <select value={values.frequency} onChange={(e) => update("frequency", e.target.value)}>
          {FREQUENCIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {values.frequency !== "Custom" && values.frequency !== "Weekly" && (
        <div className="form-row">
          <label>كل كام وحدة</label>
          <input type="number" min="1" value={values.interval} onChange={(e) => update("interval", e.target.value)} />
        </div>
      )}

      {values.frequency === "Weekly" && (
        <>
          <div className="form-row">
            <label>أيام الأسبوع</label>
            <WeekdayMultiPicker selected={values.weekdays} onChange={(w) => update("weekdays", w)} />
          </div>
          <div className="form-row">
            <label>كل كام أسبوع</label>
            <input type="number" min="1" value={values.interval} onChange={(e) => update("interval", e.target.value)} />
          </div>
        </>
      )}

      {values.frequency === "Monthly" && (
        <div className="form-row">
          <label>يوم الشهر</label>
          <input type="number" min="1" max="31" value={values.day_of_month} onChange={(e) => update("day_of_month", e.target.value)} />
        </div>
      )}

      {values.frequency === "Custom" && (
        <div className="form-row">
          <label>كل كام يوم</label>
          <input type="number" min="1" value={values.custom_interval_days} onChange={(e) => update("custom_interval_days", e.target.value)} />
        </div>
      )}

      <div className="form-row">
        <label>تاريخ البداية</label>
        <input type="date" value={values.start_date} onChange={(e) => update("start_date", e.target.value)} />
      </div>

      <div className="form-row">
        <label>تاريخ النهاية (اختياري)</label>
        <input type="date" value={values.end_date} onChange={(e) => update("end_date", e.target.value)} />
      </div>

      <div className="form-row">
        <label>عدد مرات التكرار الأقصى (اختياري)</label>
        <input type="number" min="1" value={values.occurrences_count} onChange={(e) => update("occurrences_count", e.target.value)} />
      </div>

      <div className="form-row">
        <label>السنة الدراسية (اختياري)</label>
        <EntityPicker
          items={academicYears}
          value={values.academic_year_id}
          onChange={(id) => update("academic_year_id", id)}
          onCreate={onRefreshAcademicYears}
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
        <label>ملاحظات</label>
        <input value={values.notes} onChange={(e) => update("notes", e.target.value)} />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">حفظ القاعدة</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
      </div>
    </form>
  );
}
