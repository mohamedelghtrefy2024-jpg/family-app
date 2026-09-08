// academicYearRepo.js
import { createBaseRepo } from "./baseRepo";
import { db } from "../db";

const base = createBaseRepo("academicYears");

export const academicYearRepo = {
  ...base,

  async getActive() {
    const all = await db.academicYears.where("status").equals("Active").toArray();
    return all[0] || null;
  },

  /**
   * أرشفة بدل الحذف - لا يُسمح بحذف سنة دراسية فيها بيانات (بند: لا تعديل تاريخ رجعي).
   */
  async archive(id) {
    return base.update(id, { status: "Archived" });
  },

  async activate(id) {
    // سنة واحدة فقط Active في نفس الوقت
    const currentActive = await this.getActive();
    if (currentActive && currentActive.id !== id) {
      await base.update(currentActive.id, { status: "Archived" });
    }
    return base.update(id, { status: "Active" });
  },

  /**
   * فحص وجود بيانات مرتبطة (تسجيل مدرسي/مصروفات) بهذه السنة الدراسية.
   * يُستخدم لمنع حذفها ولمنع تعديل تواريخها رجعيًا (بند: لا تعديل تاريخ رجعي).
   */
  async hasRelatedRecords(id) {
    const [enrollments, expenses] = await Promise.all([
      db.childSchoolEnrollments.where("academic_year_id").equals(id).count(),
      db.expenses.where("academic_year_id").equals(id).count(),
    ]);
    return enrollments > 0 || expenses > 0;
  },

  /**
   * حذف فعلي مسموح به فقط إذا لم توجد أي بيانات مرتبطة بهذه السنة (سنة أُضيفت بالخطأ مثلًا).
   * غير ذلك: تُؤرشف بدل الحذف للحفاظ على السجل التاريخي.
   */
  async safeDelete(id) {
    const related = await this.hasRelatedRecords(id);
    if (related) {
      throw new Error(
        "لا يمكن حذف هذه السنة الدراسية لوجود بيانات مرتبطة بها (تسجيل مدرسي/مصروفات) — استخدم الأرشفة بدلًا من الحذف"
      );
    }
    return base.remove(id);
  },
};
