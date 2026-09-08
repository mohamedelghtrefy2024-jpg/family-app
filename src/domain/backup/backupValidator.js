/**
 * backupValidator.js — Phase 15 (بند 48)
 * فحص شكل ملف النسخة الاحتياطية قبل لمس أي جدول فعلي — منع ملف تالف من تدمير بيانات موجودة.
 */

const CURRENT_FORMAT_VERSION = 1;

// الجداول الأساسية من أول نسخة نسخ احتياطي (v1) — لازم تكون موجودة في أي ملف نسخة احتياطية صالح.
const CORE_TABLES = [
  "academicYears",
  "children",
  "schools",
  "schoolScheduleDays",
  "childSchoolEnrollments",
  "subjects",
  "teachers",
  "locations",
  "lessons",
  "lessonSchedulePatterns",
  "lessonScheduleExceptions",
  "prices",
  "expenseCategories",
  "expenses",
  "expenseRecurrenceRules",
  "payments",
  "budgets",
  "transitTimes",
  "settings",
];

// جداول اتضافت بعد كده (زي "events" — بند 16) — لو ملف قديم متضمّنهاش، بنكمل عادي بمصفوفة فاضية
// بدل ما نرفض الاستعادة كلها بسبب جدول إضافي جديد.
const OPTIONAL_TABLES = ["events"];

const ALL_TABLES = [...CORE_TABLES, ...OPTIONAL_TABLES];

/**
 * @param {*} payload - محتوى JSON بعد parse
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateBackupPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["الملف ليس بصيغة JSON صالحة"] };
  }

  if (typeof payload.formatVersion !== "number") {
    errors.push("لا يحتوي الملف على رقم إصدار (formatVersion)");
  } else if (payload.formatVersion > CURRENT_FORMAT_VERSION) {
    errors.push(
      `إصدار الملف (${payload.formatVersion}) أحدث من الإصدار المدعوم (${CURRENT_FORMAT_VERSION}) — حدّث التطبيق أولًا`
    );
  }

  if (!payload.tables || typeof payload.tables !== "object") {
    errors.push("لا يحتوي الملف على بيانات جداول (tables)");
    return { valid: errors.length === 0, errors };
  }

  for (const table of CORE_TABLES) {
    if (!Array.isArray(payload.tables[table])) {
      errors.push(`الجدول "${table}" مفقود أو ليس مصفوفة`);
    }
  }

  for (const table of OPTIONAL_TABLES) {
    const value = payload.tables[table];
    if (value !== undefined && !Array.isArray(value)) {
      errors.push(`الجدول "${table}" موجود لكنه ليس مصفوفة`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export { CURRENT_FORMAT_VERSION, CORE_TABLES, OPTIONAL_TABLES, ALL_TABLES, validateBackupPayload };
