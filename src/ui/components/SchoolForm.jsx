import { useState } from "react";
import ScheduleDaysEditor from "./ScheduleDaysEditor";

const EMPTY = { name: "", address: "", region: "", phone: "" };

export default function SchoolForm({ initial, initialDays, onSave, onCancel }) {
  const [values, setValues] = useState(initial || EMPTY);
  const [days, setDays] = useState(initialDays || []);
  const [error, setError] = useState(null);

  function update(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!values.name.trim()) {
      setError("اسم المدرسة مطلوب");
      return;
    }
    setError(null);
    onSave(values, days);
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-row">
        <label>اسم المدرسة</label>
        <input value={values.name} onChange={(e) => update("name", e.target.value)} autoFocus />
      </div>

      <div className="form-row">
        <label>العنوان</label>
        <input value={values.address} onChange={(e) => update("address", e.target.value)} />
      </div>

      <div className="form-row">
        <label>المنطقة</label>
        <input value={values.region} onChange={(e) => update("region", e.target.value)} />
      </div>

      <div className="form-row">
        <label>تليفون</label>
        <input value={values.phone} onChange={(e) => update("phone", e.target.value)} />
      </div>

      <div className="form-row">
        <label>أيام الدراسة ومواعيدها</label>
        <ScheduleDaysEditor days={days} onChange={setDays} />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">حفظ</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
      </div>
    </form>
  );
}
