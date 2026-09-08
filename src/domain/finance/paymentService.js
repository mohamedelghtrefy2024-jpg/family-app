/**
 * paymentService.js
 * يسجل دفعات (كاملة أو جزئية) لمصروف معيّن، مع منع تجاوز المبلغ المستحق (بند 30/68).
 */

import { computeOutstanding } from "./expenseService.js";

/**
 * @param {Object} expense
 * @param {Array} existingPayments - كل الدفعات الحالية (لكل المصروفات)
 * @param {Object} newPayment - { id, amount, payment_date, payment_method, notes }
 * @throws إذا كانت الدفعة أكبر من المستحق المتبقي
 * @returns {Array} نسخة جديدة من قائمة الدفعات بعد الإضافة
 */
function addPayment(expense, existingPayments, newPayment) {
  if (typeof newPayment.amount !== "number" || newPayment.amount <= 0) {
    throw new Error("payment amount must be a positive number");
  }

  const outstanding = computeOutstanding(expense, existingPayments);
  if (newPayment.amount > outstanding + 0.001) {
    throw new Error(
      `الدفعة (${newPayment.amount}) أكبر من المبلغ المستحق المتبقي (${outstanding})`
    );
  }

  return [
    ...existingPayments,
    {
      id: newPayment.id,
      expense_id: expense.id,
      amount: newPayment.amount,
      payment_date: newPayment.payment_date,
      payment_method: newPayment.payment_method || "cash",
      cancelled: false,
      notes: newPayment.notes || null,
    },
  ];
}

/**
 * إلغاء دفعة (لا حذف فعلي — يحافظ على السجل التاريخي، بند 31).
 */
function cancelPayment(existingPayments, paymentId) {
  return existingPayments.map((p) =>
    p.id === paymentId ? { ...p, cancelled: true } : p
  );
}

export { addPayment, cancelPayment };
