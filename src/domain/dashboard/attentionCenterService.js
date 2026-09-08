/**
 * attentionCenterService.js — Phase 12 (بند 34)
 *
 * يوسّع dashboardService.buildProblems بدل ما يعيد كتابته (بند 76):
 * نفس التعارضات/وقت الانتقال غير الكافي/المصروفات المتأخرة/تجاوز الميزانية،
 * زائد فحوصات اكتمال بيانات جديدة (درس بدون مكان/سعر، مدرسة بدون موعد).
 */
import { buildProblems } from "./dashboardService.js";

function findLessonsMissingData(ctx) {
  const issues = [];
  for (const lesson of ctx.lessons || []) {
    const missing = [];
    if (!lesson.location_id) missing.push("no_location");
    const hasActivePrice = (ctx.prices || []).some(
      (p) => p.lesson_id === lesson.id && p.status === "Active"
    );
    if (!hasActivePrice) missing.push("no_price");
    if (missing.length > 0) {
      issues.push({ lesson_id: lesson.id, child_id: lesson.child_id, missing });
    }
  }
  return issues;
}

function findSchoolsMissingSchedule(ctx) {
  if (!ctx.activeYearId) return [];
  const issues = [];
  const enrollmentsThisYear = (ctx.enrollments || []).filter(
    (e) => e.academic_year_id === ctx.activeYearId
  );
  for (const enrollment of enrollmentsThisYear) {
    const hasDays = (ctx.scheduleDays || []).some((d) => d.school_id === enrollment.school_id);
    if (!hasDays) {
      const school = ctx.schools?.find((s) => s.id === enrollment.school_id);
      issues.push({
        school_id: enrollment.school_id,
        name: school?.name || "—",
        child_id: enrollment.child_id,
      });
    }
  }
  return issues;
}

/**
 * @param {Object} ctx - نفس context الخاص بـ loadCalendarContext
 * @param {Date} todayDate
 */
function buildAttentionCenter(ctx, todayDate = new Date()) {
  const base = buildProblems(ctx, todayDate);
  return {
    ...base,
    lessonsMissingData: findLessonsMissingData(ctx),
    schoolsMissingSchedule: findSchoolsMissingSchedule(ctx),
  };
}

export { buildAttentionCenter };
