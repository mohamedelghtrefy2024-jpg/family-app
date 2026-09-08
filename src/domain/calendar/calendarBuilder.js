/**
 * calendarBuilder.js
 * يبني قائمة موحّدة من "الأحداث" (مدرسة/درس/انتقال/موعد دفع) لأي فترة زمنية،
 * بإعادة استخدام نفس منطق scheduleBuilder وconflictDetector وexpenseService بدل تكراره
 * (القاعدة الذهبية — بند 76).
 *
 * context المتوقع:
 * {
 *   activeYearId, enrollments, schools, scheduleDays,
 *   lessons, patterns: { [lessonId]: pattern }, exceptions,
 *   subjects, teachers, locations,
 *   transitTimes, expenses, payments,
 * }
 */
import { buildOccurrences } from "../scheduling/scheduleBuilder.js";
import { checkTransitTime } from "../scheduling/transitChecker.js";
import { computeOutstanding } from "../finance/expenseService.js";
import { parseLocalDate, formatLocalDate } from "../shared/dateUtils.js";

// BUG-04 FIX: كانت isoDate المحلية تستخدم toISOString() (UTC) فتُخرج "السبت" بدل
// "الأحد" في Africa/Cairo قرب منتصف الليل. استخدم formatLocalDate الآن.
function isoDate(d) {
  return formatLocalDate(d);
}

function buildSchoolEvents(ctx, rangeStart, rangeEnd) {
  const events = [];
  if (!ctx.activeYearId) return events;

  const enrollmentsThisYear = ctx.enrollments.filter(
    (e) => e.academic_year_id === ctx.activeYearId
  );

  for (const enrollment of enrollmentsThisYear) {
    const school = ctx.schools.find((s) => s.id === enrollment.school_id);
    if (!school) continue;
    const days = ctx.scheduleDays.filter((d) => d.school_id === enrollment.school_id);
    if (days.length === 0) continue;

    const cursor = new Date(rangeStart);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= rangeEnd) {
      const weekday = cursor.getDay();
      const day = days.find((d) => d.weekday === weekday);
      if (day) {
        const dateStr = isoDate(cursor);
        events.push({
          id: `school-${enrollment.id}-${dateStr}`,
          type: "school",
          date: dateStr,
          start_time: day.start_time,
          end_time: day.end_time,
          child_id: enrollment.child_id,
          school_id: school.id,
          subject_id: null,
          teacher_id: null,
          location_id: null,
          label: `🏫 ${school.name}`,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return events;
}

function buildLessonEvents(ctx, rangeStart, rangeEnd) {
  const events = [];
  const activeLessons = ctx.lessons.filter((l) => l.status === "Active");

  for (const lesson of activeLessons) {
    const pattern = ctx.patterns[lesson.id];
    if (!pattern) continue;
    const occurrences = buildOccurrences(lesson, pattern, ctx.exceptions, rangeStart, rangeEnd);
    const subject = ctx.subjects.find((s) => s.id === lesson.subject_id);
    const teacher = ctx.teachers.find((t) => t.id === lesson.teacher_id);

    for (const occ of occurrences) {
      events.push({
        id: `lesson-${lesson.id}-${occ.date}`,
        type: "lesson",
        date: occ.date,
        start_time: occ.start_time,
        end_time: occ.end_time,
        child_id: lesson.child_id,
        school_id: null,
        subject_id: lesson.subject_id,
        teacher_id: lesson.teacher_id,
        location_id: lesson.location_id,
        label: `📚 ${subject?.name || "درس"}${teacher ? " — " + teacher.name : ""}`,
      });
    }
  }
  return events;
}

/**
 * وقت الانتقال: بين كل نشاطين متتاليين لنفس الابن بمكانين مختلفين، فقط إذا وُجد
 * وقت انتقال مُدخل يدويًا لهذا الزوج — لا افتراض متوسط سرعة (بند 19).
 *
 * BUG-06 FIX: هذه الدالة كانت تعيد تنفيذ نفس منطق البحث عن قاعدة الانتقال وحساب
 * الوقت المتاح بشكل مستقل عن transitChecker.checkTransitTime، فأصبح هناك نسختان
 * من نفس Business Logic. الآن buildTransitEvents تستدعي checkTransitTime كمصدر
 * وحيد للحقيقة (Single Source of Truth) لمنطق الانتقال بالكامل.
 */
function buildTransitEvents(timedEvents, transitTimes) {
  const events = [];
  const byChildDate = {};
  for (const ev of timedEvents) {
    if (!ev.location_id) continue;
    const key = `${ev.child_id}__${ev.date}`;
    if (!byChildDate[key]) byChildDate[key] = [];
    byChildDate[key].push(ev);
  }

  for (const key of Object.keys(byChildDate)) {
    const dayEvents = byChildDate[key]
      .slice()
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    for (let i = 0; i < dayEvents.length - 1; i++) {
      const a = dayEvents[i];
      const b = dayEvents[i + 1];
      if (a.location_id === b.location_id) continue;

      const result = checkTransitTime(a, b, transitTimes || []);
      if (!result.checked) continue; // لا بيانات = لا حدث مخترع

      events.push({
        id: `transit-${a.id}-${b.id}`,
        type: "transit",
        date: a.date,
        start_time: a.end_time,
        end_time: b.start_time,
        child_id: a.child_id,
        school_id: null,
        subject_id: null,
        teacher_id: null,
        location_id: null,
        sufficient: result.sufficient,
        requiredMinutes: result.requiredMinutes,
        availableMinutes: result.availableMinutes,
        label: result.sufficient ? "🚗 انتقال" : "🚗 وقت انتقال غير كافٍ",
      });
    }
  }
  return events;
}

/**
 * مواعيد الدفع: كل مصروف نشط (غير ملغى) له مبلغ مستحق فعلي، تاريخ استحقاقه داخل الفترة.
 */
function buildPaymentEvents(ctx, rangeStart, rangeEnd) {
  const events = [];
  for (const expense of ctx.expenses || []) {
    if (expense.cancelled) continue;
    const due = parseLocalDate(expense.due_date);
    if (due < rangeStart || due > rangeEnd) continue;
    const outstanding = computeOutstanding(expense, ctx.payments || []);
    if (outstanding <= 0) continue;

    events.push({
      id: `payment-${expense.id}`,
      type: "payment",
      date: expense.due_date,
      start_time: null,
      end_time: null,
      child_id: expense.child_id,
      school_id: null,
      subject_id: null,
      teacher_id: null,
      location_id: null,
      category_id: expense.category_id,
      allDay: true,
      amount: outstanding,
      label: `💰 استحقاق ${outstanding}${expense.description ? " — " + expense.description : ""}`,
    });
  }
  return events;
}

/**
 * "الأحداث الأخرى" الحرة (بند 16) — امتحان/رحلة/مناسبة عائلية إلخ.
 * حدث بدون child_id يُعتبر حدثًا عامًا للأسرة كلها (بيظهر بغض النظر عن فلتر الابن).
 */
function buildFreeEvents(ctx, rangeStart, rangeEnd) {
  const events = [];
  for (const event of ctx.events || []) {
    const start = parseLocalDate(event.date);
    const end = event.end_date ? parseLocalDate(event.end_date) : start;
    if (end < rangeStart || start > rangeEnd) continue;

    events.push({
      id: `event-${event.id}`,
      type: "event",
      date: event.date,
      start_time: event.start_time || null,
      end_time: event.end_time || null,
      child_id: event.child_id || null,
      school_id: null,
      subject_id: null,
      teacher_id: null,
      location_id: null,
      allDay: !event.start_time,
      event_type: event.event_type || "أخرى",
      label: `📌 ${event.title}`,
    });
  }
  return events;
}

/**
 * @param {Object} ctx
 * @param {Date} rangeStart
 * @param {Date} rangeEnd
 * @returns {Array} أحداث مرتبة زمنيًا (اليوم ثم الوقت، الأحداث بدون وقت "طوال اليوم" آخر اليوم)
 */
function buildCalendarEvents(ctx, rangeStart, rangeEnd) {
  const school = buildSchoolEvents(ctx, rangeStart, rangeEnd);
  const lessons = buildLessonEvents(ctx, rangeStart, rangeEnd);
  const timed = [...school, ...lessons];
  const transit = buildTransitEvents(timed, ctx.transitTimes);
  const payments = buildPaymentEvents(ctx, rangeStart, rangeEnd);
  const freeEvents = buildFreeEvents(ctx, rangeStart, rangeEnd);

  return [...timed, ...transit, ...payments, ...freeEvents].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const at = a.start_time || "99:99";
    const bt = b.start_time || "99:99";
    return at.localeCompare(bt);
  });
}

function filterEvents(events, filters = {}) {
  return events.filter((ev) => {
    if (filters.childId && ev.child_id !== filters.childId) return false;
    if (filters.schoolId && ev.school_id !== filters.schoolId) return false;
    if (filters.subjectId && ev.subject_id !== filters.subjectId) return false;
    if (filters.teacherId && ev.teacher_id !== filters.teacherId) return false;
    if (filters.type && ev.type !== filters.type) return false;
    return true;
  });
}

export { buildCalendarEvents, filterEvents };
