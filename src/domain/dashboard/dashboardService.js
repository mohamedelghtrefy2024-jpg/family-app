/**
 * dashboardService.js
 * تجميع بيانات Smart Dashboard (بند 72) — بدون عرض كل شيء مرة واحدة:
 * اليوم / ماليًا / المشاكل / الشهر. يعيد استخدام calendarBuilder وconflictDetector
 * وexpenseService وbudgetService بدل إعادة كتابة أي منطق (بند 76).
 */
import { buildCalendarEvents } from "../calendar/calendarBuilder";
import { detectConflicts } from "../scheduling/conflictDetector";
import { computeStatus, computeOutstanding } from "../finance/expenseService";
import { compareBudget } from "../finance/budgetService";

function round2(n) {
  return Math.round(n * 100) / 100;
}

function buildTodayAgenda(ctx, todayDate) {
  return buildCalendarEvents(ctx, todayDate, todayDate).filter(
    (e) => e.type === "school" || e.type === "lesson" || e.type === "transit"
  );
}

function buildFinancialSummary(ctx, todayDate) {
  const monthPrefix = todayDate.toISOString().slice(0, 7);
  const activeExpenses = (ctx.expenses || []).filter((e) => !e.cancelled);

  const dueThisMonth = activeExpenses
    .filter((e) => e.due_date.slice(0, 7) === monthPrefix)
    .reduce((sum, e) => sum + e.amount, 0);

  const outstandingTotal = activeExpenses.reduce(
    (sum, e) => sum + computeOutstanding(e, ctx.payments || []),
    0
  );

  const upcomingDue = activeExpenses
    .filter(
      (e) =>
        computeOutstanding(e, ctx.payments || []) > 0 && new Date(e.due_date) >= todayDate
    )
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5)
    .map((e) => ({
      expense_id: e.id,
      child_id: e.child_id,
      description: e.description,
      due_date: e.due_date,
      outstanding: computeOutstanding(e, ctx.payments || []),
    }));

  return {
    dueThisMonth: round2(dueThisMonth),
    outstandingTotal: round2(outstandingTotal),
    upcomingDue,
  };
}

function buildProblems(ctx, todayDate) {
  const rangeEnd = new Date(todayDate);
  rangeEnd.setDate(rangeEnd.getDate() + 13); // نافذة أسبوعين قادمين لاكتشاف التعارضات

  const upcomingEvents = buildCalendarEvents(ctx, todayDate, rangeEnd);

  const activities = upcomingEvents
    .filter((e) => e.type === "school" || e.type === "lesson")
    .map((e) => ({
      id: e.id,
      child_id: e.child_id,
      date: e.date,
      start_time: e.start_time,
      end_time: e.end_time,
      label: e.label,
    }));
  const conflicts = detectConflicts(activities);

  const insufficientTransit = upcomingEvents.filter(
    (e) => e.type === "transit" && !e.sufficient
  );

  const activeExpenses = (ctx.expenses || []).filter((e) => !e.cancelled);
  const overdueExpenses = activeExpenses.filter(
    (e) => computeStatus(e, ctx.payments || [], todayDate) === "Overdue"
  );

  const exceededBudgets = [];
  for (const budget of ctx.budgets || []) {
    const comparison = compareBudget(budget, activeExpenses);
    if (comparison.exceeded) exceededBudgets.push({ budget, comparison });
  }

  return { conflicts, insufficientTransit, overdueExpenses, exceededBudgets };
}

function buildMonthOverview(ctx, todayDate) {
  const monthValue = todayDate.toISOString().slice(0, 7);
  const activeExpenses = (ctx.expenses || []).filter((e) => !e.cancelled);
  const familyMonthlyBudget = (ctx.budgets || []).find(
    (b) => b.scope === "Family" && b.period_type === "Monthly" && b.period_value === monthValue
  );
  if (!familyMonthlyBudget) return { budget: null, comparison: null };
  return {
    budget: familyMonthlyBudget,
    comparison: compareBudget(familyMonthlyBudget, activeExpenses),
  };
}

/**
 * @param {Object} ctx - نفس context الخاص بـ calendarBuilder، بالإضافة إلى budgets
 * @param {Date} todayDate
 */
function buildDashboard(ctx, todayDate = new Date()) {
  const today = new Date(todayDate);
  today.setHours(0, 0, 0, 0);

  return {
    today: buildTodayAgenda(ctx, today),
    financial: buildFinancialSummary(ctx, today),
    problems: buildProblems(ctx, today),
    month: buildMonthOverview(ctx, today),
  };
}

export { buildDashboard, buildProblems };
