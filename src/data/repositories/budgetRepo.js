// budgetRepo.js
import { createBaseRepo } from "./baseRepo";
import { db } from "../firestoreDb";

const base = createBaseRepo("budgets");

export const budgetRepo = {
  ...base,

  async getAllExpensesForCompare() {
    // الميزانية تُقارَن دائمًا بالمصروفات الفعلية غير الملغاة فقط (بند 45/46).
    return db.expenses.filter((e) => !e.cancelled).toArray();
  },
};
