// paymentRepo.js
import { db, newId } from "../firestoreDb";
import { addPayment, cancelPayment } from "../../domain/finance/paymentService";

export const paymentRepo = {
  async getForExpense(expenseId) {
    return db.payments.where("expense_id").equals(expenseId).toArray();
  },

  async getAll() {
    return db.payments.toArray();
  },

  /**
   * يسجل دفعة جديدة لمصروف، مع تطبيق قاعدة منع تجاوز المستحق المتبقي (paymentService).
   * يُنفَّذ داخل Transaction على expenses + payments لضمان قراءة/كتابة متسقة.
   */
  async addPayment(expense, paymentInput) {
    return db.transaction("rw", db.payments, async () => {
      const existing = await db.payments
        .where("expense_id")
        .equals(expense.id)
        .toArray();

      const updated = addPayment(expense, existing, {
        id: newId(),
        ...paymentInput,
      });

      const created = updated[updated.length - 1];
      await db.payments.add(created);
      return created;
    });
  },

  async cancelPayment(paymentId) {
    return db.transaction("rw", db.payments, async () => {
      const all = await db.payments.toArray();
      const updated = cancelPayment(all, paymentId);
      const changed = updated.find((p) => p.id === paymentId);
      await db.payments.update(paymentId, { cancelled: changed.cancelled });
      return changed;
    });
  },
};
