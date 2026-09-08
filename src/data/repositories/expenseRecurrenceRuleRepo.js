// expenseRecurrenceRuleRepo.js
import { createBaseRepo } from "./baseRepo";
import { db, newId } from "../firestoreDb";
import { generateMissingExpenses } from "../../domain/finance/expenseRecurrenceEngine";
import { parseLocalDate } from "../../domain/shared/dateUtils";

const base = createBaseRepo("expenseRecurrenceRules");

export const expenseRecurrenceRuleRepo = {
  ...base,

  async getActive() {
    return db.expenseRecurrenceRules.where("status").equals("Active").toArray();
  },

  async pause(id) {
    return base.update(id, { status: "Paused" });
  },

  async activate(id) {
    return base.update(id, { status: "Active" });
  },

  async hasGeneratedExpenses(id) {
    const count = await db.expenses.filter((e) => e.recurrence_rule_id === id).count();
    return count > 0;
  },

  /**
   * حذف فعلي مسموح به فقط لو القاعدة لسه ماولدتش أي مصروف فعلي —
   * غير كده تُوقَف (Paused) بدلًا من الحذف، حفاظًا على ربط المصروفات القديمة بأصلها.
   */
  async safeDelete(id) {
    const hasGenerated = await this.hasGeneratedExpenses(id);
    if (hasGenerated) {
      throw new Error(
        "لا يمكن حذف قاعدة التكرار دي لوجود مصروفات مولّدة منها بالفعل — استخدم الإيقاف بدلًا من الحذف"
      );
    }
    return base.remove(id);
  },

  /**
   * يولّد كل المصروفات المستحقة من كل القواعد النشطة حتى تاريخ معيّن (شامل)،
   * بدون تكرار أي مصروف اتولّد قبل كده لنفس القاعدة ونفس تاريخ الاستحقاق.
   * @param {Date} horizonDate - آخر تاريخ استحقاق يُسمح بتوليده
   * @returns {{ createdCount: number, created: Array }}
   */
  async generateDueNow(horizonDate) {
    return db.transaction("rw", db.expenseRecurrenceRules, db.expenses, async () => {
      const activeRules = await db.expenseRecurrenceRules.where("status").equals("Active").toArray();
      const allExpenses = await db.expenses.toArray();

      const created = [];
      for (const rule of activeRules) {
        const rangeStart = parseLocalDate(rule.start_date);
        const missing = generateMissingExpenses(rule, allExpenses, rangeStart, horizonDate);
        for (const expense of missing) {
          const record = { id: newId(), ...expense };
          await db.expenses.add(record);
          created.push(record);
        }
      }
      return { createdCount: created.length, created };
    });
  },
};
