/**
 * financialReportService.js — Phase 10 (بند 27-31)
 *
 * القاعدة الذهبية: بدون تكرار منطق الحساب الموجود بالفعل —
 * outstanding/status من expenseService، المقارنة بالميزانية من budgetService،
 * تكلفة الدرس من costCalculator + scheduleBuilder (بند 76).
 *
 * كل الدوال هنا نقية (pure) — تستقبل نفس شكل الـ ctx الخاص بـ loadCalendarContext
 * (بالإضافة إلى prices وexpenseCategories وacademicYears اللي اتضافوا للـ context في هذه المرحلة).
 */
import { buildOccurrences } from "../scheduling/scheduleBuilder";
import { calculateLessonCost } from "../pricing/costCalculator";
import { computeOutstanding, computeStatus, computeTotalPaid } from "./expenseService";

const KIND_ORDER = ["مدرسة", "دروس", "مواصلات", "كتب", "أخرى"];

function round2(n) {
  return Math.round(n * 100) / 100;
}

/** بند 29/30: يصنّف تصنيف مصروف حر (اسمه نص عربي/إيموجي) إلى "نوع" ثابت لأغراض التجميع. */
function classifyCategoryKind(categoryName = "") {
  if (categoryName.includes("مدرسة")) return "مدرسة";
  if (categoryName.includes("درو")) return "دروس";
  if (categoryName.includes("مواصلات")) return "مواصلات";
  if (categoryName.includes("كتب")) return "كتب";
  return "أخرى";
}

function monthValueOf(dateStr) {
  return dateStr.slice(0, 7);
}

/** "YYYY-MM" -> { start: Date, end: Date } (نهاية الشهر شاملة) */
function monthBounds(monthValue) {
  const [y, m] = monthValue.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
}

/** يزيح "YYYY-MM" بعدد شهور (موجب/سالب) */
function shiftMonth(monthValue, delta) {
  const [y, m] = monthValue.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function categoryName(ctx, categoryId) {
  return ctx.expenseCategories?.find((c) => c.id === categoryId)?.name || "غير مصنّف";
}

function childName(ctx, childId) {
  return ctx.children?.find((c) => c.id === childId)?.name || "—";
}

function emptyKindTotals() {
  return KIND_ORDER.reduce((acc, k) => ({ ...acc, [k]: 0 }), {});
}

/* ------------------------------------------------------------------------ */
/* بند 27 — المصروف المتوقع للشهر القادم                                    */
/* ------------------------------------------------------------------------ */

/**
 * توقع مصروفات الشهر القادم = (أ) تكلفة الدروس النشطة الفعّالة + (ب) مصروفات ثابتة
 * متكررة (is_fixed) + (ج) بنود أخرى ظهرت في شهرين على الأقل من آخر 3 شهور (نمط تكرار ضمني).
 * ملاحظة: هذا تقدير heuristic لحين اكتمال محرك التكرار الفعلي (Phase 11 - بند 23)؛
 * أي مصروف مُدار عبر expenseRecurrenceRules مستقبلًا يجب أن يحل محل تخمين "البند (ج)" هنا.
 *
 * @param {Object} ctx
 * @param {Date} referenceDate - "اليوم"، والتوقع يكون للشهر اللي بعده
 */
function calculateExpectedNextMonth(ctx, referenceDate = new Date()) {
  const nextMonthValue = shiftMonth(monthValueOf(referenceDate.toISOString()), 1);
  const { start, end } = monthBounds(nextMonthValue);
  const items = [];

  // (أ) تكلفة الدروس النشطة خلال الشهر القادم
  for (const lesson of ctx.lessons || []) {
    const pattern = ctx.patterns?.[lesson.id];
    if (!pattern) continue;
    const occurrences = buildOccurrences(lesson, pattern, ctx.exceptions || [], start, end);
    if (occurrences.length === 0) continue;
    const { total } = calculateLessonCost(lesson, ctx.prices || [], occurrences, start, end);
    if (total <= 0) continue;
    const subjectName = ctx.subjects?.find((s) => s.id === lesson.subject_id)?.name || "درس";
    items.push({
      source: "lesson",
      kind: "دروس",
      child_id: lesson.child_id,
      label: `${subjectName} — ${childName(ctx, lesson.child_id)}`,
      amount: round2(total),
    });
  }

  const activeExpenses = (ctx.expenses || []).filter((e) => !e.cancelled);

  // (ب) مصروفات ثابتة: نأخذ آخر قيمة مسجلة لكل مجموعة (ابن + تصنيف + وصف) ونفترض تكرارها
  const fixedGroups = new Map();
  for (const e of activeExpenses.filter((e) => e.is_fixed)) {
    const key = `${e.child_id}|${e.category_id}|${e.description || ""}`;
    const existing = fixedGroups.get(key);
    if (!existing || existing.due_date < e.due_date) fixedGroups.set(key, e);
  }
  for (const e of fixedGroups.values()) {
    items.push({
      source: "fixed",
      kind: classifyCategoryKind(categoryName(ctx, e.category_id)),
      child_id: e.child_id,
      label: `${e.description || categoryName(ctx, e.category_id)} — ${childName(ctx, e.child_id)}`,
      amount: e.amount,
    });
  }

  // (ج) بنود متغيّرة تكررت في شهرين على الأقل من آخر 3 شهور (غير الثابتة أصلًا)
  const last3Start = shiftMonth(monthValueOf(referenceDate.toISOString()), -2);
  const { start: rangeStart } = monthBounds(last3Start);
  const recurGroups = new Map();
  for (const e of activeExpenses.filter((e) => !e.is_fixed)) {
    if (new Date(e.due_date) < rangeStart || new Date(e.due_date) > referenceDate) continue;
    const key = `${e.child_id}|${e.category_id}|${e.description || ""}`;
    if (!recurGroups.has(key)) recurGroups.set(key, []);
    recurGroups.get(key).push(e);
  }
  for (const group of recurGroups.values()) {
    const months = new Set(group.map((e) => monthValueOf(e.due_date)));
    if (months.size < 2) continue;
    const avg = group.reduce((s, e) => s + e.amount, 0) / group.length;
    const sample = group[0];
    items.push({
      source: "recurring",
      kind: classifyCategoryKind(categoryName(ctx, sample.category_id)),
      child_id: sample.child_id,
      label: `${sample.description || categoryName(ctx, sample.category_id)} — ${childName(ctx, sample.child_id)} (متكرر)`,
      amount: round2(avg),
    });
  }

  const byKind = emptyKindTotals();
  for (const item of items) byKind[item.kind] = round2((byKind[item.kind] || 0) + item.amount);
  const total = round2(items.reduce((s, i) => s + i.amount, 0));

  return { monthValue: nextMonthValue, total, byKind, items };
}

/* ------------------------------------------------------------------------ */
/* بند 28 — المركز المالي الموحد لشهر معيّن                                  */
/* ------------------------------------------------------------------------ */

function buildFinancialCenter(ctx, monthValue) {
  const activeExpenses = (ctx.expenses || []).filter((e) => !e.cancelled);
  const monthExpenses = activeExpenses.filter((e) => monthValueOf(e.due_date) === monthValue);

  const byCategory = new Map();
  for (const cat of ctx.expenseCategories || []) {
    byCategory.set(cat.id, {
      category_id: cat.id,
      name: cat.name,
      total: 0,
      paid: 0,
      remaining: 0,
      overdue: 0,
      dueCount: 0,
    });
  }

  const today = new Date();
  for (const e of monthExpenses) {
    if (!byCategory.has(e.category_id)) {
      byCategory.set(e.category_id, {
        category_id: e.category_id,
        name: categoryName(ctx, e.category_id),
        total: 0,
        paid: 0,
        remaining: 0,
        overdue: 0,
        dueCount: 0,
      });
    }
    const row = byCategory.get(e.category_id);
    const outstanding = computeOutstanding(e, ctx.payments || []);
    const status = computeStatus(e, ctx.payments || [], today);
    row.total += e.amount;
    row.paid += computeTotalPaid(ctx.payments || [], e.id);
    row.remaining += outstanding;
    if (status === "Overdue") row.overdue += outstanding;
    row.dueCount += 1;
  }

  const rows = [...byCategory.values()]
    .filter((r) => r.dueCount > 0)
    .map((r) => ({
      ...r,
      total: round2(r.total),
      paid: round2(r.paid),
      remaining: round2(r.remaining),
      overdue: round2(r.overdue),
    }))
    .sort((a, b) => b.total - a.total);

  return {
    monthValue,
    totalAll: round2(rows.reduce((s, r) => s + r.total, 0)),
    paidAll: round2(rows.reduce((s, r) => s + r.paid, 0)),
    remainingAll: round2(rows.reduce((s, r) => s + r.remaining, 0)),
    overdueAll: round2(rows.reduce((s, r) => s + r.overdue, 0)),
    byCategory: rows,
  };
}

/* ------------------------------------------------------------------------ */
/* بند 29 — تكلفة كل ابن (شهري وسنوي) مقسّمة حسب النوع                       */
/* ------------------------------------------------------------------------ */

function sumExpensesByKind(ctx, expenses) {
  const byKind = emptyKindTotals();
  for (const e of expenses) {
    const kind = classifyCategoryKind(categoryName(ctx, e.category_id));
    byKind[kind] = round2((byKind[kind] || 0) + e.amount);
  }
  const total = round2(Object.values(byKind).reduce((s, v) => s + v, 0));
  return { total, byKind };
}

/**
 * @param {Object} ctx
 * @param {string} childId
 * @param {{ monthValue?: string, academicYearId?: string }} scope
 */
function calculateChildCost(ctx, childId, { monthValue, academicYearId } = {}) {
  const activeExpenses = (ctx.expenses || []).filter(
    (e) => !e.cancelled && e.child_id === childId
  );

  const monthly = monthValue
    ? sumExpensesByKind(
        ctx,
        activeExpenses.filter((e) => monthValueOf(e.due_date) === monthValue)
      )
    : null;

  const annual = academicYearId
    ? sumExpensesByKind(
        ctx,
        activeExpenses.filter((e) => e.academic_year_id === academicYearId)
      )
    : null;

  return { childId, monthValue: monthValue || null, academicYearId: academicYearId || null, monthly, annual };
}

/* ------------------------------------------------------------------------ */
/* بند 30 — التحليل السنوي (تقرير تكلفة تعليم سنوي)                          */
/* ------------------------------------------------------------------------ */

function buildAnnualReport(ctx, academicYearId) {
  const activeExpenses = (ctx.expenses || []).filter(
    (e) => !e.cancelled && e.academic_year_id === academicYearId
  );

  const perChild = (ctx.children || []).map((child) => {
    const childExpenses = activeExpenses.filter((e) => e.child_id === child.id);
    const { total, byKind } = sumExpensesByKind(ctx, childExpenses);
    return { child_id: child.id, name: child.name, total, byKind };
  });

  const familyTotal = round2(perChild.reduce((s, c) => s + c.total, 0));

  const byCategoryKind = emptyKindTotals();
  for (const e of activeExpenses) {
    const kind = classifyCategoryKind(categoryName(ctx, e.category_id));
    byCategoryKind[kind] = round2((byCategoryKind[kind] || 0) + e.amount);
  }

  // تطور المصروفات شهريًا (لكل الشهور اللي فيها مصروف فعلي داخل السنة الدراسية)
  const monthlyTotals = new Map();
  for (const e of activeExpenses) {
    const mv = monthValueOf(e.due_date);
    monthlyTotals.set(mv, round2((monthlyTotals.get(mv) || 0) + e.amount));
  }
  const trend = [...monthlyTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthValue, total]) => ({ monthValue, total }));

  const monthsWithData = trend.length || 1;
  const monthlyAverage = round2(familyTotal / monthsWithData);

  return { academicYearId, familyTotal, perChild, byCategoryKind, monthlyAverage, trend };
}

/* ------------------------------------------------------------------------ */
/* بند 31 — مقارنة شهر بشهر                                                  */
/* ------------------------------------------------------------------------ */

function compareMonths(ctx, currentMonthValue, previousMonthValue) {
  const current = buildFinancialCenter(ctx, currentMonthValue);
  const previous = buildFinancialCenter(ctx, previousMonthValue);

  const diffValue = round2(current.totalAll - previous.totalAll);
  const diffPercent =
    previous.totalAll > 0 ? round2((diffValue / previous.totalAll) * 100) : null;

  const categoryIds = new Set([
    ...current.byCategory.map((c) => c.category_id),
    ...previous.byCategory.map((c) => c.category_id),
  ]);

  const byCategory = [...categoryIds]
    .map((id) => {
      const curr = current.byCategory.find((c) => c.category_id === id)?.total || 0;
      const prev = previous.byCategory.find((c) => c.category_id === id)?.total || 0;
      return {
        category_id: id,
        name: categoryName(ctx, id),
        current: round2(curr),
        previous: round2(prev),
        diff: round2(curr - prev),
      };
    })
    .sort((a, b) => b.diff - a.diff);

  return { currentMonthValue, previousMonthValue, current, previous, diffValue, diffPercent, byCategory };
}

export {
  KIND_ORDER,
  classifyCategoryKind,
  monthValueOf,
  monthBounds,
  shiftMonth,
  calculateExpectedNextMonth,
  buildFinancialCenter,
  calculateChildCost,
  buildAnnualReport,
  compareMonths,
};
