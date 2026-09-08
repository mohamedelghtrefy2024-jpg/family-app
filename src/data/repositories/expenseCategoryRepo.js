// expenseCategoryRepo.js
// التصنيفات الافتراضية (بند 21) — تُزرع مرة واحدة عند أول استخدام، وهي بيانات مرجعية حقيقية
// وليست DEMO DATA (بند 68) لأنها تصنيفات ثابتة يقترحها البرومبت نفسه، قابلة للحذف/التعديل يدويًا.
import { createBaseRepo } from "./baseRepo";
import { db, newId } from "../firestoreDb";

const base = createBaseRepo("expenseCategories");

const DEFAULT_CATEGORIES = [
  "🏫 المدرسة",
  "📚 الدروس",
  "🚌 المواصلات",
  "📖 الكتب",
  "👕 الزي",
  "🎒 الأدوات",
  "🎯 الأنشطة",
  "🏆 الرياضة",
  "📝 الامتحانات",
  "💻 التعليم الإلكتروني",
  "📦 أخرى",
];

export const expenseCategoryRepo = {
  ...base,

  async ensureDefaults() {
    const existing = await db.expenseCategories.count();
    if (existing > 0) return;
    await db.expenseCategories.bulkAdd(
      DEFAULT_CATEGORIES.map((name) => ({ id: newId(), name }))
    );
  },
};
