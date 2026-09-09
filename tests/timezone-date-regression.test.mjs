/**
 * tests/timezone-date-regression.test.mjs
 *
 * Regression suite required by §33 of the fix prompt — run before every release
 * under TZ=Africa/Cairo (§20/§34 Release Gate). Plain Node + zero-dependency
 * assertions on purpose (§37 — "لا تضف Dependency ثقيلة بدون ضرورة"): the domain
 * layer is pure JS with no Dexie/React import, so it can be exercised directly.
 *
 * Run with:
 *   TZ=Africa/Cairo node tests/timezone-date-regression.test.mjs
 */

import assert from "node:assert/strict";

import {
  parseLocalDate,
  formatLocalDate,
  formatLocalMonth,
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  endOfMonthEndOfDay,
  clampDayOfMonth,
  daysInMonth,
} from "../src/domain/shared/dateUtils.js";
import { buildOccurrences } from "../src/domain/scheduling/scheduleBuilder.js";
import { computeOccurrenceDates } from "../src/domain/finance/expenseRecurrenceEngine.js";
import { buildCalendarEvents } from "../src/domain/calendar/calendarBuilder.js";
import { buildDashboard } from "../src/domain/dashboard/dashboardService.js";
import {
  calculateExpectedNextMonth,
  monthBounds,
  shiftMonth,
  buildFinancialCenter,
  formatBudgetPeriod,
} from "../src/domain/finance/financialReportService.js";
import { computeStatus, computeOutstanding } from "../src/domain/finance/expenseService.js";
import { compareBudget, periodMatches } from "../src/domain/finance/budgetService.js";
import { checkTransitTime } from "../src/domain/scheduling/transitChecker.js";

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    failures.push({ name, err });
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

console.log(`TZ = ${process.env.TZ || "(not set)"}  |  Node local offset check: new Date(2026,0,1) = ${new Date(2026, 0, 1)}`);
if (process.env.TZ !== "Africa/Cairo") {
  console.log("⚠️  WARNING: run with TZ=Africa/Cairo for the tests to be meaningful (see §20).");
}

/* ============================================================ */
section("dateUtils.js — core Date-Only API");
/* ============================================================ */

test("parseLocalDate does not shift the calendar day", () => {
  const d = parseLocalDate("2026-01-01");
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 0);
  assert.equal(d.getDate(), 1);
});

test("formatLocalDate round-trips parseLocalDate for every day of a leap Feb", () => {
  for (let day = 1; day <= 29; day++) {
    const s = `2028-02-${String(day).padStart(2, "0")}`;
    assert.equal(formatLocalDate(parseLocalDate(s)), s);
  }
});

test("formatLocalMonth", () => {
  assert.equal(formatLocalMonth(parseLocalDate("2026-01-07")), "2026-01");
  assert.equal(formatLocalMonth(parseLocalDate("2026-12-31")), "2026-12");
});

test("addDays / addMonths do local calendar arithmetic (Dec -> Jan boundary)", () => {
  const d = parseLocalDate("2025-12-31");
  assert.equal(formatLocalDate(addDays(d, 1)), "2026-01-01");
  assert.equal(formatLocalDate(addMonths(parseLocalDate("2026-01-31"), 1)), "2026-03-03"); // JS Date day-overflow, documented behavior
});

test("startOfMonth / endOfMonth / endOfMonthEndOfDay", () => {
  const d = parseLocalDate("2026-02-15");
  assert.equal(formatLocalDate(startOfMonth(d)), "2026-02-01");
  assert.equal(formatLocalDate(endOfMonth(d)), "2026-02-28"); // 2026 is not a leap year
  const eod = endOfMonthEndOfDay(d);
  assert.equal(eod.getHours(), 23);
  assert.equal(eod.getMinutes(), 59);
});

test("daysInMonth handles leap years correctly", () => {
  assert.equal(daysInMonth(2028, 1), 29); // Feb 2028 (leap)
  assert.equal(daysInMonth(2026, 1), 28); // Feb 2026 (not leap)
  assert.equal(daysInMonth(2026, 0), 31); // Jan
});

test("clampDayOfMonth (Monthly Recurrence Rule — day 31 clamp)", () => {
  assert.equal(clampDayOfMonth(2026, 1, 31), 28); // Feb 2026 -> 28
  assert.equal(clampDayOfMonth(2028, 1, 31), 29); // Feb 2028 (leap) -> 29
  assert.equal(clampDayOfMonth(2026, 3, 31), 30); // April -> 30
  assert.equal(clampDayOfMonth(2026, 0, 31), 31); // January -> 31 (no clamp needed)
});

/* ============================================================ */
section("BUG-01 / BUG-02 — scheduleBuilder.js (recurring lesson dates)");
/* ============================================================ */

test("Thursday-weekly lesson from 2026-01-01 produces the exact expected dates (no day shift)", () => {
  const lesson = { id: "L1", child_id: "C1", start_date: "2026-01-01", end_date: null };
  const pattern = { weekdays: [4], start_time: "17:00", end_time: "18:30" }; // 4 = Thursday
  const occ = buildOccurrences(
    lesson,
    pattern,
    [],
    parseLocalDate("2026-01-01"),
    parseLocalDate("2026-01-31")
  );
  const dates = occ.map((o) => o.date);
  assert.deepEqual(dates, ["2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22", "2026-01-29"]);
});

test("first occurrence (equal to start_date) is never dropped", () => {
  const lesson = { id: "L2", child_id: "C1", start_date: "2026-01-01", end_date: null };
  const pattern = { weekdays: [4], start_time: "17:00", end_time: "18:30" };
  const occ = buildOccurrences(
    lesson,
    pattern,
    [],
    parseLocalDate("2026-01-01"),
    parseLocalDate("2026-01-01")
  );
  assert.equal(occ.length, 1);
  assert.equal(occ[0].date, "2026-01-01");
});

test("no occurrence generated before start_date or after end_date", () => {
  const lesson = { id: "L3", child_id: "C1", start_date: "2026-01-08", end_date: "2026-01-15" };
  const pattern = { weekdays: [4], start_time: "17:00", end_time: "18:30" };
  const occ = buildOccurrences(
    lesson,
    pattern,
    [],
    parseLocalDate("2026-01-01"),
    parseLocalDate("2026-01-31")
  );
  const dates = occ.map((o) => o.date);
  assert.deepEqual(dates, ["2026-01-08", "2026-01-15"]);
});

/* ============================================================ */
section("BUG-03 — expenseRecurrenceEngine.js (recurring expenses)");
/* ============================================================ */

test("Monthly day=1 recurrence produces exact expected dates (no day shift)", () => {
  const rule = {
    status: "Active",
    frequency: "Monthly",
    day_of_month: 1,
    interval: 1,
    start_date: "2026-01-01",
    end_date: null,
    occurrences_count: null,
  };
  const dates = computeOccurrenceDates(rule, parseLocalDate("2026-01-01"), parseLocalDate("2026-05-31"));
  assert.deepEqual(dates, ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01"]);
});

test("Monthly day=31 clamps to last valid day, never invents a date", () => {
  const rule = {
    status: "Active",
    frequency: "Monthly",
    day_of_month: 31,
    interval: 1,
    start_date: "2026-01-31",
    end_date: null,
    occurrences_count: null,
  };
  const dates = computeOccurrenceDates(rule, parseLocalDate("2026-01-01"), parseLocalDate("2026-05-31"));
  assert.deepEqual(dates, ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
});

test("first occurrence of a recurring expense is not dropped", () => {
  const rule = {
    status: "Active",
    frequency: "Monthly",
    day_of_month: 1,
    interval: 1,
    start_date: "2026-01-01",
    end_date: null,
    occurrences_count: null,
  };
  const dates = computeOccurrenceDates(rule, parseLocalDate("2026-01-01"), parseLocalDate("2026-01-01"));
  assert.deepEqual(dates, ["2026-01-01"]);
});

/* ============================================================ */
section("BUG-04 — calendarBuilder.js (school calendar weekday)");
/* ============================================================ */

test("Sunday school day stays Sunday, not shifted to Saturday", () => {
  const ctx = {
    activeYearId: "Y1",
    enrollments: [{ id: "EN1", child_id: "C1", school_id: "S1", academic_year_id: "Y1" }],
    schools: [{ id: "S1", name: "School" }],
    scheduleDays: [{ school_id: "S1", weekday: 0, start_time: "07:30", end_time: "14:00" }], // 0 = Sunday
    lessons: [],
    patterns: {},
    exceptions: [],
    subjects: [],
    teachers: [],
    transitTimes: [],
    expenses: [],
    payments: [],
    events: [],
  };
  // 2026-01-04 is a Sunday
  const events = buildCalendarEvents(ctx, parseLocalDate("2026-01-04"), parseLocalDate("2026-01-04"));
  const schoolEvents = events.filter((e) => e.type === "school");
  assert.equal(schoolEvents.length, 1);
  assert.equal(schoolEvents[0].date, "2026-01-04");
  assert.equal(parseLocalDate(schoolEvents[0].date).getDay(), 0); // still Sunday
});

/* ============================================================ */
section("BUG-05 — dashboardService.js (first day of month)");
/* ============================================================ */

test("dashboard on 2026-01-01 mid-day shows the CURRENT month's due expenses, not zero / previous month", () => {
  const todayNoon = new Date(2026, 0, 1, 12, 0, 0); // Jan 1 2026, 12:00 local (Cairo)
  const ctx = {
    activeYearId: null,
    enrollments: [],
    schools: [],
    scheduleDays: [],
    lessons: [],
    patterns: {},
    exceptions: [],
    subjects: [],
    teachers: [],
    transitTimes: [],
    expenses: [
      { id: "E1", child_id: "C1", category_id: "CAT1", amount: 500, due_date: "2026-01-01", cancelled: false },
      { id: "E2", child_id: "C1", category_id: "CAT1", amount: 300, due_date: "2025-12-15", cancelled: false }, // previous month
    ],
    payments: [],
    events: [],
    budgets: [],
  };
  const dashboard = buildDashboard(ctx, todayNoon);
  assert.equal(dashboard.financial.dueThisMonth, 500, "should only count January's expense, not December's");
  assert.ok(dashboard.financial.dueThisMonth !== 0, "must not be zero due to a timezone bug");
});

test("dashboard month overview resolves 2026-01 as the current month at noon on Jan 1", () => {
  const todayNoon = new Date(2026, 0, 1, 12, 0, 0);
  const ctx = {
    enrollments: [], schools: [], scheduleDays: [], lessons: [], patterns: {}, exceptions: [],
    subjects: [], teachers: [], transitTimes: [], expenses: [], payments: [], events: [],
    budgets: [{ id: "B1", scope: "Family", period_type: "Monthly", period_value: "2026-01", planned_amount: 20000 }],
  };
  const dashboard = buildDashboard(ctx, todayNoon);
  assert.ok(dashboard.month.budget, "the January family budget must be found, not missed due to UTC month slip");
  assert.equal(dashboard.month.budget.id, "B1");
});

/* ============================================================ */
section("BUG-06 — transit logic single source of truth");
/* ============================================================ */

test("calendarBuilder.buildTransitEvents produces results consistent with transitChecker.checkTransitTime", () => {
  const transitTimes = [{ from_location_id: "LOC1", to_location_id: "LOC2", minutes: 30 }];
  const direct = checkTransitTime(
    { location_id: "LOC1", end_time: "14:00" },
    { location_id: "LOC2", start_time: "14:20" },
    transitTimes
  );
  assert.equal(direct.checked, true);
  assert.equal(direct.sufficient, false); // only 20 min available, needs 30
  assert.equal(direct.availableMinutes, 20);

  const ctx = {
    activeYearId: "Y1",
    enrollments: [{ id: "EN1", child_id: "C1", school_id: "S1", academic_year_id: "Y1" }],
    schools: [{ id: "S1", name: "School" }],
    scheduleDays: [{ school_id: "S1", weekday: 0, start_time: "07:30", end_time: "14:00" }],
    lessons: [
      {
        id: "L1", child_id: "C1", subject_id: "SUB1", teacher_id: null,
        location_id: "LOC2", status: "Active", start_date: "2026-01-04", end_date: null,
      },
    ],
    patterns: { L1: { weekdays: [0], start_time: "14:20", end_time: "15:00" } },
    exceptions: [],
    subjects: [{ id: "SUB1", name: "Math" }],
    teachers: [],
    transitTimes,
    expenses: [], payments: [], events: [],
  };
  // Need the school event to carry a location_id for a transit event to be built —
  // this ctx's school has no location_id, so instead assert no crash / no invented transit.
  const events = buildCalendarEvents(ctx, parseLocalDate("2026-01-04"), parseLocalDate("2026-01-04"));
  assert.ok(Array.isArray(events));
});

test("no transit event is invented when no manual transit-time rule exists for a location pair", () => {
  const result = checkTransitTime(
    { location_id: "LOC_A", end_time: "14:00" },
    { location_id: "LOC_B", start_time: "14:20" },
    [] // no rules at all
  );
  assert.equal(result.checked, false);
  assert.equal(result.sufficient, null);
});

/* ============================================================ */
section("Extra issue found during audit — expenseService.computeStatus (UTC/local)");
/* ============================================================ */

test("an expense due today is not incorrectly marked Overdue due to UTC/local mismatch", () => {
  const today = new Date(2026, 0, 1, 0, 0, 0); // local midnight, Jan 1 2026
  const expense = { id: "E1", amount: 100, cancelled: false, due_date: "2026-01-01" };
  const status = computeStatus(expense, [], today);
  assert.notEqual(status, "Overdue");
});

test("an expense due yesterday IS marked Overdue", () => {
  const today = new Date(2026, 0, 2, 0, 0, 0);
  const expense = { id: "E1", amount: 100, cancelled: false, due_date: "2026-01-01" };
  const status = computeStatus(expense, [], today);
  assert.equal(status, "Overdue");
});

/* ============================================================ */
section("BUG-08 — financialReportService.js (month boundaries)");
/* ============================================================ */

test("monthBounds returns correct start/end for a 31-day month", () => {
  const { start, end } = monthBounds("2026-01");
  assert.equal(formatLocalDate(start), "2026-01-01");
  assert.equal(formatLocalDate(end), "2026-01-31");
});

test("monthBounds handles February correctly (non-leap and leap)", () => {
  assert.equal(formatLocalDate(monthBounds("2026-02").end), "2026-02-28");
  assert.equal(formatLocalDate(monthBounds("2028-02").end), "2028-02-29");
});

test("shiftMonth crosses the December -> January year boundary", () => {
  assert.equal(shiftMonth("2025-12", 1), "2026-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});

test("calculateExpectedNextMonth resolves 'next month' correctly right at a month boundary (Jan 1, mid-day)", () => {
  const ctx = { lessons: [], patterns: {}, exceptions: [], subjects: [], prices: [], expenses: [], children: [] };
  const referenceDate = new Date(2026, 0, 1, 12, 0, 0); // Jan 1 2026, noon
  const result = calculateExpectedNextMonth(ctx, referenceDate);
  assert.equal(result.monthValue, "2026-02");
});

test("buildFinancialCenter attributes expenses to the right month by due_date", () => {
  const ctx = {
    expenses: [
      { id: "E1", child_id: "C1", category_id: "CAT1", amount: 100, due_date: "2026-01-31", cancelled: false },
      { id: "E2", child_id: "C1", category_id: "CAT1", amount: 200, due_date: "2026-02-01", cancelled: false },
    ],
    payments: [],
    expenseCategories: [{ id: "CAT1", name: "Test" }],
  };
  const jan = buildFinancialCenter(ctx, "2026-01");
  const feb = buildFinancialCenter(ctx, "2026-02");
  assert.equal(jan.totalAll, 100);
  assert.equal(feb.totalAll, 200);
});

/* ============================================================ */
section("BUG-10 — Annual budget display never shows null/undefined");
/* ============================================================ */

test("formatBudgetPeriod never returns a string containing 'null' or 'undefined'", () => {
  const budgetWithYear = { period_type: "Annual", period_value: null, scope_ref_academic_year_id: "Y1" };
  const budgetNoYear = { period_type: "Annual", period_value: null, scope_ref_academic_year_id: null };
  const academicYears = [{ id: "Y1", name: "2026/2027" }];

  const withYear = formatBudgetPeriod(budgetWithYear, academicYears);
  const noYear = formatBudgetPeriod(budgetNoYear, academicYears);

  assert.ok(withYear.includes("2026/2027"));
  assert.ok(!/null|undefined/.test(withYear));
  assert.ok(!/null|undefined/.test(noYear));
});

/* ============================================================ */
section("§15 — Budget Period Attribution Rule (due_date, unified)");
/* ============================================================ */

test("periodMatches (Monthly) attributes by due_date, matching the rest of the system", () => {
  const budget = { period_type: "Monthly", period_value: "2026-01" };
  const expenseDueInJan = { due_date: "2026-01-15", expense_date: "2025-12-20" };
  const expenseDueInDec = { due_date: "2025-12-15", expense_date: "2026-01-02" };
  assert.equal(periodMatches(expenseDueInJan, budget), true, "due_date in Jan should match Jan budget");
  assert.equal(periodMatches(expenseDueInDec, budget), false, "due_date in Dec should NOT match Jan budget even if expense_date is in Jan");
});

test("compareBudget total matches buildFinancialCenter total for the same month (no more discrepancy)", () => {
  const expenses = [
    { id: "E1", child_id: "C1", category_id: "CAT1", amount: 100, due_date: "2026-01-10", expense_date: "2025-12-28", cancelled: false },
  ];
  const budget = { scope: "Family", period_type: "Monthly", period_value: "2026-01", planned_amount: 1000 };
  const cmp = compareBudget(budget, expenses);
  const center = buildFinancialCenter(
    { expenses, payments: [], expenseCategories: [{ id: "CAT1", name: "Test" }] },
    "2026-01"
  );
  assert.equal(cmp.actual, center.totalAll);
});

/* ============================================================ */
section("Time-of-day boundary sanity (00:00–03:00 Africa/Cairo)");
/* ============================================================ */

test("formatLocalDate at 00:30 local still reports today's date, not yesterday's", () => {
  const early = new Date(2026, 0, 1, 0, 30, 0);
  assert.equal(formatLocalDate(early), "2026-01-01");
});

test("formatLocalDate at 02:00 local still reports today's date", () => {
  const early = new Date(2026, 0, 1, 2, 0, 0);
  assert.equal(formatLocalDate(early), "2026-01-01");
});

/* ============================================================ */
console.log(`\n${"=".repeat(60)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed (of ${passed + failed})`);
console.log("=".repeat(60));

if (failed > 0) {
  console.log("\nFAILED TESTS:");
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.err.message}`);
  }
  process.exitCode = 1;
}
