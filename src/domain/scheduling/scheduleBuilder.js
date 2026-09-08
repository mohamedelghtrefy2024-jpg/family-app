/**
 * scheduleBuilder.js
 * يحوّل نمط تكرار الدرس (أيام أسبوع + وقت) إلى مناسبات فعلية داخل فترة زمنية،
 * مع تطبيق الاستثناءات (إلغاء/حصة إضافية) بدون تعديل النمط الأساسي - بند 41.
 *
 * BUG-01 / BUG-02 FIX: lesson.start_date/end_date و ex.date كلها Date-Only
 * ("YYYY-MM-DD") ويجب معاملتها كـ Local Calendar Date — راجع dateUtils.js.
 * استخدام new Date(dateOnlyString) أو toISOString() كان يسبب إزاحة يوم كامل
 * للخلف في Africa/Cairo، وأحيانًا حذف أول مناسبة للدرس.
 */

import { parseLocalDate, formatLocalDate } from "../shared/dateUtils.js";

const WEEKDAY_INDEX = [0, 1, 2, 3, 4, 5, 6]; // 0 = الأحد

function buildOccurrences(lesson, pattern, exceptions, rangeStart, rangeEnd) {
  const occurrences = [];
  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);

  const lessonStart = parseLocalDate(lesson.start_date);
  const lessonEnd = lesson.end_date ? parseLocalDate(lesson.end_date) : null;

  while (cursor <= rangeEnd) {
    const weekday = cursor.getDay();
    const withinLessonRange =
      cursor >= lessonStart && (!lessonEnd || cursor <= lessonEnd);

    if (withinLessonRange && pattern.weekdays.includes(weekday)) {
      const dateStr = formatLocalDate(cursor);
      const exception = exceptions.find(
        (e) => e.lesson_id === lesson.id && e.date === dateStr
      );

      if (!exception || exception.type !== "cancelled") {
        occurrences.push({
          lesson_id: lesson.id,
          date: dateStr,
          start_time: pattern.start_time,
          end_time: pattern.end_time,
          source: "pattern",
        });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  // إضافة الحصص الإضافية (extra) كمناسبات مستقلة خارج النمط الأساسي
  for (const ex of exceptions) {
    if (
      ex.lesson_id === lesson.id &&
      ex.type === "extra" &&
      parseLocalDate(ex.date) >= rangeStart &&
      parseLocalDate(ex.date) <= rangeEnd
    ) {
      occurrences.push({
        lesson_id: lesson.id,
        date: ex.date,
        start_time: ex.start_time || pattern.start_time,
        end_time: ex.end_time || pattern.end_time,
        source: "exception_extra",
      });
    }
  }

  return occurrences.sort((a, b) => a.date.localeCompare(b.date));
}

export { buildOccurrences, WEEKDAY_INDEX };
