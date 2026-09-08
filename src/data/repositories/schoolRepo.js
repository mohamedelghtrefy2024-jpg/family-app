// schoolRepo.js
import { createBaseRepo } from "./baseRepo";
import { db, newId } from "../firestoreDb";

const base = createBaseRepo("schools");

export const schoolRepo = {
  ...base,

  async getScheduleDays(schoolId) {
    return db.schoolScheduleDays.where("school_id").equals(schoolId).toArray();
  },

  /**
   * يستبدل جدول أيام المدرسة بالكامل (كل مدرسة أيامها قد تختلف - بند لا نفترض توحيدًا).
   * @param {string} schoolId
   * @param {Array} days - [{ weekday, start_time, end_time }]
   */
  async setScheduleDays(schoolId, days) {
    await db.transaction("rw", db.schoolScheduleDays, async () => {
      const existing = await db.schoolScheduleDays
        .where("school_id")
        .equals(schoolId)
        .toArray();
      await db.schoolScheduleDays.bulkDelete(existing.map((d) => d.id));
      await db.schoolScheduleDays.bulkAdd(
        days.map((d) => ({ id: newId(), school_id: schoolId, ...d }))
      );
    });
    return this.getScheduleDays(schoolId);
  },

  async hasRelatedRecords(id) {
    const enrollments = await db.childSchoolEnrollments
      .where("school_id")
      .equals(id)
      .count();
    return enrollments > 0;
  },

  async safeDelete(id) {
    const related = await this.hasRelatedRecords(id);
    if (related) {
      throw new Error(
        "لا يمكن حذف هذه المدرسة لوجود أبناء مسجلين بها حاليًا أو سابقًا"
      );
    }
    await db.schoolScheduleDays.where("school_id").equals(id).delete();
    return base.remove(id);
  },
};
