/**
 * searchService.js — Phase 14 (بند 74-75)
 *
 * بحث موحّد: كتابة اسم مادة تجيب كل الدروس المرتبطة + المدرسين + المواعيد + المصروفات المرتبطة.
 * كتابة اسم ابن تجيب كل بياناته المرتبطة. كله عمليات join/filter فوق نفس الـ ctx المُحمَّل بالفعل —
 * بدون أي استعلام DB إضافي (بند 76).
 */
import { computeOutstanding, computeStatus } from "../finance/expenseService.js";
import { classifyCategoryKind } from "../finance/financialReportService.js";

const WEEKDAY_NAMES = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

function norm(s) {
  return (s || "").toLocaleLowerCase("ar");
}

function nameOf(list, id) {
  return list?.find((x) => x.id === id)?.name || "—";
}

function categoryName(ctx, categoryId) {
  return ctx.expenseCategories?.find((c) => c.id === categoryId)?.name || "";
}

function describePattern(pattern) {
  if (!pattern) return "—";
  const days = (pattern.weekdays || []).map((w) => WEEKDAY_NAMES[w]).join("، ");
  return `${days} — ${pattern.start_time}-${pattern.end_time}`;
}

function enrichLesson(ctx, lesson) {
  return {
    lesson,
    childName: nameOf(ctx.children, lesson.child_id),
    subjectName: nameOf(ctx.subjects, lesson.subject_id),
    teacherName: nameOf(ctx.teachers, lesson.teacher_id),
    schedule: describePattern(ctx.patterns?.[lesson.id]),
  };
}

function enrichExpense(ctx, expense) {
  return {
    expense,
    childName: nameOf(ctx.children, expense.child_id),
    categoryName: categoryName(ctx, expense.category_id),
    status: expense.cancelled ? "Cancelled" : computeStatus(expense, ctx.payments || []),
    outstanding: computeOutstanding(expense, ctx.payments || []),
  };
}

function buildChildProfile(ctx, child) {
  const lessons = (ctx.lessons || [])
    .filter((l) => l.child_id === child.id)
    .map((l) => enrichLesson(ctx, l));
  const enrollments = (ctx.enrollments || [])
    .filter((e) => e.child_id === child.id)
    .map((e) => ({ enrollment: e, schoolName: nameOf(ctx.schools, e.school_id) }));
  const expenses = (ctx.expenses || [])
    .filter((e) => e.child_id === child.id)
    .map((e) => enrichExpense(ctx, e));
  const totalOutstanding = expenses.reduce((s, e) => s + e.outstanding, 0);

  return { child, lessons, enrollments, expenses, totalOutstanding: Math.round(totalOutstanding * 100) / 100 };
}

function buildSubjectProfile(ctx, subject) {
  const relatedLessons = (ctx.lessons || [])
    .filter((l) => l.subject_id === subject.id)
    .map((l) => enrichLesson(ctx, l));
  const childIds = new Set(relatedLessons.map((r) => r.lesson.child_id));
  const teacherIds = new Set(relatedLessons.map((r) => r.lesson.teacher_id));
  const teachers = (ctx.teachers || []).filter((t) => teacherIds.has(t.id));
  const relatedExpenses = (ctx.expenses || [])
    .filter(
      (e) =>
        !e.cancelled &&
        childIds.has(e.child_id) &&
        classifyCategoryKind(categoryName(ctx, e.category_id)) === "دروس"
    )
    .map((e) => enrichExpense(ctx, e));

  return { subject, lessons: relatedLessons, teachers, relatedExpenses };
}

function buildTeacherProfile(ctx, teacher) {
  const lessons = (ctx.lessons || [])
    .filter((l) => l.teacher_id === teacher.id)
    .map((l) => enrichLesson(ctx, l));
  return { teacher, lessons };
}

function buildSchoolProfile(ctx, school) {
  const enrollments = (ctx.enrollments || [])
    .filter((e) => e.school_id === school.id)
    .map((e) => ({ enrollment: e, childName: nameOf(ctx.children, e.child_id) }));
  const childIds = new Set(enrollments.map((e) => e.enrollment.child_id));
  const scheduleDays = (ctx.scheduleDays || [])
    .filter((d) => d.school_id === school.id)
    .map((d) => `${WEEKDAY_NAMES[d.weekday]} (${d.start_time}-${d.end_time})`);
  const relatedExpenses = (ctx.expenses || [])
    .filter(
      (e) =>
        !e.cancelled &&
        childIds.has(e.child_id) &&
        classifyCategoryKind(categoryName(ctx, e.category_id)) === "مدرسة"
    )
    .map((e) => enrichExpense(ctx, e));

  return { school, enrollments, scheduleDays, relatedExpenses };
}

function buildCategoryProfile(ctx, category) {
  const expenses = (ctx.expenses || [])
    .filter((e) => e.category_id === category.id)
    .map((e) => enrichExpense(ctx, e));
  return { category, expenses };
}

/**
 * @param {Object} ctx
 * @param {string} queryRaw
 */
function search(ctx, queryRaw) {
  const query = norm((queryRaw || "").trim());
  if (!query) {
    return { query: "", children: [], subjects: [], teachers: [], schools: [], categories: [] };
  }
  const matches = (name) => norm(name).includes(query);

  return {
    query,
    children: (ctx.children || []).filter((c) => matches(c.name)).map((c) => buildChildProfile(ctx, c)),
    subjects: (ctx.subjects || []).filter((s) => matches(s.name)).map((s) => buildSubjectProfile(ctx, s)),
    teachers: (ctx.teachers || []).filter((t) => matches(t.name)).map((t) => buildTeacherProfile(ctx, t)),
    schools: (ctx.schools || []).filter((s) => matches(s.name)).map((s) => buildSchoolProfile(ctx, s)),
    categories: (ctx.expenseCategories || [])
      .filter((c) => matches(c.name))
      .map((c) => buildCategoryProfile(ctx, c)),
  };
}

export { search };
