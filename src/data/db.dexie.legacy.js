// db.dexie.legacy.js — النسخة القديمة (Dexie/IndexedDB) من قبل ترحيل Firebase.
//
// ⚠️ مش مُستخدَمة في التطبيق الحالي — الـ repositories كلها بقت تستورد من
// firestoreDb.js بدل هنا. الملف ده باقٍ عمدًا (مش محذوف) لسببين:
//   1. مرجع لأي مستخدم عنده بيانات محفوظة محليًا من نسخة التطبيق القديمة،
//      محتاج سكريبت "استيراد من النسخة المحلية القديمة" (Phase D من برومبت
//      الترحيل) يقرا منها مرة واحدة وينقلها لـ Firestore.
//   2. Rollback مرجعي لو احتاج الأمر يرجع للنسخة المحلية وقت الطوارئ.
//
// لا تستورد من الملف ده في أي كود تطبيق جديد — استورد من firestoreDb.js.
//
// db.js — Dexie schema (Phase 3). نسخة واحدة v1. أي تعديل مستقبلي = version(n) جديدة + upgrade().
import Dexie from "dexie";

export const db = new Dexie("FamilyEducationManagerDB");

db.version(1).stores({
  academicYears: "id, status",
  children: "id, is_active",
  schools: "id, name",
  schoolScheduleDays: "id, school_id, weekday",
  childSchoolEnrollments: "id, child_id, school_id, academic_year_id",
  subjects: "id, name",
  teachers: "id, subject_id",
  locations: "id, name, type",
  lessons: "id, child_id, subject_id, teacher_id, location_id, status",
  lessonSchedulePatterns: "id, lesson_id",
  lessonScheduleExceptions: "id, lesson_id, date",
  prices: "id, lesson_id, status, effective_from",
  expenseCategories: "id, name",
  expenses: "id, child_id, category_id, due_date, academic_year_id, cancelled",
  expenseRecurrenceRules: "id, status",
  payments: "id, expense_id, payment_date, cancelled",
  budgets: "id, scope, scope_ref_id, period_value",
  transitTimes: "id, from_location_id, to_location_id",
  settings: "key",
});

// v2 (Phase 15، بند 16): إضافة كيان "events" العام (أحداث حرة زي امتحان/رحلة/مناسبة عائلية)
// اللي كان مؤجّل بانتظار تأكيد صريح — تمت الموافقة عليه. إضافة جدول جديد فقط، بدون تعديل
// أي جدول قائم ولا نقل بيانات، فمفيش داعي لدالة upgrade().
db.version(2).stores({
  academicYears: "id, status",
  children: "id, is_active",
  schools: "id, name",
  schoolScheduleDays: "id, school_id, weekday",
  childSchoolEnrollments: "id, child_id, school_id, academic_year_id",
  subjects: "id, name",
  teachers: "id, subject_id",
  locations: "id, name, type",
  lessons: "id, child_id, subject_id, teacher_id, location_id, status",
  lessonSchedulePatterns: "id, lesson_id",
  lessonScheduleExceptions: "id, lesson_id, date",
  prices: "id, lesson_id, status, effective_from",
  expenseCategories: "id, name",
  expenses: "id, child_id, category_id, due_date, academic_year_id, cancelled",
  expenseRecurrenceRules: "id, status",
  payments: "id, expense_id, payment_date, cancelled",
  budgets: "id, scope, scope_ref_id, period_value",
  transitTimes: "id, from_location_id, to_location_id",
  settings: "key",
  events: "id, date, end_date, child_id",
});

export function newId() {
  return crypto.randomUUID();
}
