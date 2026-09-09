/**
 * expenseService.js
 *
 * القاعدة الذهبية المالية (Phase 1، بند 27-29):
 * Outstanding = Expense.amount - Σ(Payments.amount غير الملغاة)
 * status محسوب دائمًا، وليس حقلًا يُدخَل يدويًا.
 *
 * ملاحظة إصلاح (غير مذكورة في تقرير التدقيق الأصلي، اكتُشفت أثناء البحث الشامل - بند 17):
 * computeStatus كانت تقارن new Date(expense.due_date) (UTC) بـ today (Local) — نفس فئة
 * BUG-01..BUG-05 الجذرية بالضبط، فقط استُبدل new Date() بـ parseLocalDate() من dateUtils.
 * منطق Outstanding/Paid وحساب المبلغ نفسه لم يتغيّر إطلاقًا.
 */
import { parseLocalDate } from "../shared/dateUtils.js";

function getPaymentsForExpense(payments, expenseId) {
  return payments.filter((p) => p.expense_id === expenseId && !p.cancelled);
}

function computeTotalPaid(payments, expenseId) {
  return getPaymentsForExpense(payments, expenseId).reduce(
    (sum, p) => sum + p.amount,
    0
  );
}

function computeOutstanding(expense, payments) {
  if (expense.cancelled) return 0;
  const paid = computeTotalPaid(payments, expense.id);
  const outstanding = expense.amount - paid;
  return Math.round(outstanding * 100) / 100; // تفادي أخطاء الفاصلة العشرية
}

/**
 * @returns {"Paid"|"Partially Paid"|"Due"|"Overdue"|"Cancelled"}
 */
function computeStatus(expense, payments, today = new Date()) {
  if (expense.cancelled) return "Cancelled";

  const outstanding = computeOutstanding(expense, payments);
  const paid = computeTotalPaid(payments, expense.id);

  if (outstanding <= 0) return "Paid";
  if (paid > 0 && outstanding > 0) {
    if (parseLocalDate(expense.due_date) < today) return "Overdue";
    return "Partially Paid";
  }
  // لم يُدفع أي شيء بعد
  if (parseLocalDate(expense.due_date) < today) return "Overdue";
  return "Due";
}

export {
  getPaymentsForExpense,
  computeTotalPaid,
  computeOutstanding,
  computeStatus,
};
