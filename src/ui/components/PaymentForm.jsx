import { useState } from "react";
import { todayLocalDateString } from "../../domain/shared/dateUtils";

export default function PaymentForm({ outstanding, onSave, onCancel }) {
  const [amount, setAmount] = useState(String(outstanding));
  const [date, setDate] = useState(todayLocalDateString());
  const [method, setMethod] = useState("cash");
  const [error, setError] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || isNaN(value) || value <= 0) {
      return setError("قيمة الدفعة يجب أن تكون رقمًا موجبًا");
    }
    if (value > outstanding + 0.001) {
      return setError(`الدفعة أكبر من المتبقي (${outstanding})`);
    }
    setError(null);
    onSave({ amount: value, payment_date: date, payment_method: method });
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit} style={{ marginTop: 10 }}>
      {error && <div className="error-banner">{error}</div>}
      <div className="form-row">
        <label>قيمة الدفعة (المتبقي: {outstanding})</label>
        <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
      </div>
      <div className="form-row">
        <label>تاريخ الدفع</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="form-row">
        <label>طريقة الدفع</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="cash">كاش</option>
          <option value="transfer">تحويل</option>
          <option value="card">بطاقة</option>
          <option value="other">أخرى</option>
        </select>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">تسجيل الدفعة</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
      </div>
    </form>
  );
}
