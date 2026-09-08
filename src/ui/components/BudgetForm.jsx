import { useState } from "react";

const SCOPES = [
  { value: "Family", label: "الأسرة" },
  { value: "Child", label: "ابن" },
  { value: "Category", label: "تصنيف" },
];

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

export default function BudgetForm({ children, categories, academicYears, onSave, onCancel }) {
  const [scope, setScope] = useState("Family");
  const [scopeRefId, setScopeRefId] = useState("");
  const [periodType, setPeriodType] = useState("Monthly");
  const [periodValue, setPeriodValue] = useState(currentMonthValue());
  const [academicYearId, setAcademicYearId] = useState("");
  const [plannedAmount, setPlannedAmount] = useState("");
  const [error, setError] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    if ((scope === "Child" || scope === "Category") && !scopeRefId) {
      return setError(scope === "Child" ? "اختر الابن" : "اختر التصنيف");
    }
    if (periodType === "Annual" && !academicYearId) {
      return setError("اختر السنة الدراسية");
    }
    const amount = Number(plannedAmount);
    if (!plannedAmount || isNaN(amount) || amount <= 0) {
      return setError("القيمة المخططة يجب أن تكون رقمًا موجبًا");
    }

    setError(null);
    onSave({
      scope,
      scope_ref_id: scope === "Family" ? null : scopeRefId,
      period_type: periodType,
      period_value: periodType === "Monthly" ? periodValue : null,
      scope_ref_academic_year_id: periodType === "Annual" ? academicYearId : null,
      planned_amount: amount,
    });
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-row">
        <label>النطاق</label>
        <select value={scope} onChange={(e) => { setScope(e.target.value); setScopeRefId(""); }}>
          {SCOPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {scope === "Child" && (
        <div className="form-row">
          <label>الابن</label>
          <select value={scopeRefId} onChange={(e) => setScopeRefId(e.target.value)}>
            <option value="" disabled>اختر...</option>
            {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {scope === "Category" && (
        <div className="form-row">
          <label>التصنيف</label>
          <select value={scopeRefId} onChange={(e) => setScopeRefId(e.target.value)}>
            <option value="" disabled>اختر...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="form-row">
        <label>الفترة</label>
        <div className="weekday-picker">
          <button type="button" className={`weekday-chip ${periodType === "Monthly" ? "selected" : ""}`} onClick={() => setPeriodType("Monthly")}>شهرية</button>
          <button type="button" className={`weekday-chip ${periodType === "Annual" ? "selected" : ""}`} onClick={() => setPeriodType("Annual")}>سنوية</button>
        </div>
      </div>

      {periodType === "Monthly" ? (
        <div className="form-row">
          <label>الشهر</label>
          <input type="month" value={periodValue} onChange={(e) => setPeriodValue(e.target.value)} />
        </div>
      ) : (
        <div className="form-row">
          <label>السنة الدراسية</label>
          <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
            <option value="" disabled>اختر...</option>
            {academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
      )}

      <div className="form-row">
        <label>القيمة المخططة</label>
        <input type="number" min="0" step="0.01" value={plannedAmount} onChange={(e) => setPlannedAmount(e.target.value)} />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">حفظ</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
      </div>
    </form>
  );
}
