// expenseRepo.js
import { createBaseRepo } from "./baseRepo";
import { db } from "../db";

const base = createBaseRepo("expenses");

export const expenseRepo = {
  ...base,

  async getForChild(childId) {
    return db.expenses.where("child_id").equals(childId).toArray();
  },

  async getActive() {
    return db.expenses.filter((e) => !e.cancelled).toArray();
  },

  /**
   * إلغاء مصروف — لا حذف فعلي، للحفاظ على السجل التاريخي (بند 45/67).
   * الدفعات المرتبطة تبقى كما هي (تاريخيًا صحيحة وقت حدوثها).
   */
  async cancel(id) {
    return base.update(id, { cancelled: true });
  },
};
