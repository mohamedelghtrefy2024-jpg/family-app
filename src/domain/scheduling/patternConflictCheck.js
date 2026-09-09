import { timesOverlap } from "./conflictDetector.js";

/**
 * checkPatternConflicts — فحص تعارض على مستوى النمط الأسبوعي المتكرر (وليس تاريخ بعينه)،
 * يُستخدم عند إضافة/تعديل درس لإعطاء تحذير فوري قبل الحفظ.
 *
 * @param {string} childId
 * @param {Array<number>} weekdays
 * @param {string} startTime
 * @param {string} endTime
 * @param {Array} otherLessonPatterns - [{ lesson_id, child_id, weekdays, start_time, end_time, label }]
 * @param {Array} schoolDaysForChild - [{ weekday, start_time, end_time, label }]
 * @returns {Array} تعارضات مكتشفة [{ weekday, with }]
 */
export function checkPatternConflicts(childId, weekdays, startTime, endTime, otherLessonPatterns, schoolDaysForChild) {
  const conflicts = [];

  for (const weekday of weekdays) {
    for (const other of otherLessonPatterns) {
      if (other.child_id !== childId) continue;
      if (!other.weekdays.includes(weekday)) continue;
      if (timesOverlap(startTime, endTime, other.start_time, other.end_time)) {
        conflicts.push({ weekday, with: other.label });
      }
    }

    for (const schoolDay of schoolDaysForChild) {
      if (schoolDay.weekday !== weekday) continue;
      if (timesOverlap(startTime, endTime, schoolDay.start_time, schoolDay.end_time)) {
        conflicts.push({ weekday, with: schoolDay.label });
      }
    }
  }

  return conflicts;
}
