// childRepo.js
import { createBaseRepo } from "./baseRepo";
import { db } from "../db";

const base = createBaseRepo("children");

export const childRepo = {
  ...base,

  async getActive() {
    return db.children.filter((c) => c.is_active).toArray();
  },

  /**
   * تعطيل بدل الحذف الفعلي إذا كان للابن سجلات مرتبطة (دروس/مصروفات) — يحافظ على السجل التاريخي.
   */
  async deactivate(id) {
    return base.update(id, { is_active: false });
  },

  async hasRelatedRecords(id) {
    const [lessons, expenses, enrollments] = await Promise.all([
      db.lessons.where("child_id").equals(id).count(),
      db.expenses.where("child_id").equals(id).count(),
      db.childSchoolEnrollments.where("child_id").equals(id).count(),
    ]);
    return lessons > 0 || expenses > 0 || enrollments > 0;
  },

  /**
   * حذف فعلي مسموح به فقط إذا لم توجد أي سجلات مرتبطة إطلاقًا (طفل أُضيف بالخطأ مثلًا).
   */
  async safeDelete(id) {
    const related = await this.hasRelatedRecords(id);
    if (related) {
      throw new Error(
        "لا يمكن حذف هذا الابن نهائيًا لوجود سجلات مرتبطة (دروس/مصروفات/تسجيل مدرسي) — استخدم التعطيل بدلًا من الحذف"
      );
    }
    return base.remove(id);
  },
};
