import { useState } from "react";

/**
 * WhatIfCalculator — بند 32: أثر إضافة/إلغاء درس أو مصروف شهري على الميزانية الشهرية والسنوية.
 * حساب مباشر وواضح (شهري × 12 = سنوي) بدون أي بيانات مُخترعة أو حسابات مبنية على افتراضات.
 */
export default function WhatIfCalculator() {
  const [mode, setMode] = useState("add");
  const [monthlyAmount, setMonthlyAmount] = useState("");

  const amount = Number(monthlyAmount) || 0;
  const monthlyImpact = mode === "add" ? amount : -amount;
  const annualImpact = monthlyImpact * 12;

  return (
    <div className="form-panel">
      <div className="form-row">
        <label>ماذا لو...</label>
        <div className="weekday-picker">
          <button type="button" className={`weekday-chip ${mode === "add" ? "selected" : ""}`} onClick={() => setMode("add")}>
            أضفت درسًا/مصروفًا شهريًا
          </button>
          <button type="button" className={`weekday-chip ${mode === "remove" ? "selected" : ""}`} onClick={() => setMode("remove")}>
            ألغيت درسًا/مصروفًا شهريًا
          </button>
        </div>
      </div>

      <div className="form-row">
        <label>القيمة الشهرية</label>
        <input type="number" min="0" step="0.01" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} />
      </div>

      {amount > 0 && (
        <div className="list-row-meta" style={{ fontSize: 15 }}>
          {mode === "add" ? (
            <>الزيادة الشهرية: <b>{monthlyImpact}</b> — الزيادة السنوية: <b>{annualImpact}</b></>
          ) : (
            <>التوفير الشهري: <b>{amount}</b> — التوفير السنوي: <b>{amount * 12}</b></>
          )}
        </div>
      )}
    </div>
  );
}
