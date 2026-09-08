// priceRepo.js
import { db, newId } from "../firestoreDb";
import { addPrice, getPriceAt, getActivePrice, getPriceHistory } from "../../domain/pricing/priceHistoryService";

export const priceRepo = {
  async getAllForLesson(lessonId) {
    return db.prices.where("lesson_id").equals(lessonId).toArray();
  },

  async getActivePrice(lessonId) {
    const all = await this.getAllForLesson(lessonId);
    return getActivePrice(all, lessonId);
  },

  async getPriceAt(lessonId, date) {
    const all = await this.getAllForLesson(lessonId);
    return getPriceAt(all, lessonId, date);
  },

  async getHistory(lessonId) {
    const all = await this.getAllForLesson(lessonId);
    return getPriceHistory(all, lessonId);
  },

  /**
   * يضيف سعرًا جديدًا مع تطبيق قواعد priceHistoryService (إغلاق القديم، رفض الرجعي).
   * يُنفَّذ داخل Transaction لضمان عدم وجود حالة وسيطة غير متسقة.
   */
  async addPrice(lessonId, priceInput) {
    return db.transaction("rw", db.prices, async () => {
      const existingAll = await db.prices.toArray();
      const updated = addPrice(existingAll, {
        id: newId(),
        lesson_id: lessonId,
        ...priceInput,
      });

      // updated = القائمة الكاملة بعد التعديل. نطبّق فقط الفروق: تحديث المُغلَق + إضافة الجديد.
      for (const p of updated) {
        const exists = existingAll.find((e) => e.id === p.id);
        if (!exists) {
          await db.prices.add(p);
        } else if (exists.status !== p.status || exists.effective_to !== p.effective_to) {
          await db.prices.update(p.id, { status: p.status, effective_to: p.effective_to });
        }
      }
      return updated.find((p) => p.lesson_id === lessonId && p.status === "Active");
    });
  },
};
