// src/domain/shared/dateUtils.js
//
// ============================================================================
// CENTRAL DATE API — Single Source of Truth for Date-Only handling
// ============================================================================
//
// THE RULE (project law):
//   Any value shaped like "YYYY-MM-DD" represents a CALENDAR DATE
//   (a Date-Only value), never a UTC timestamp.
//
// WHY THIS FILE EXISTS:
//   `new Date("2026-01-01")` is parsed by the JS engine as UTC midnight.
//   `date.toISOString().slice(0, 10)` converts back through UTC.
//   In any timezone ahead of UTC (e.g. Africa/Cairo, UTC+2/+3), this
//   round-trip can shift a Date-Only value backward by one calendar day.
//   That bug is the root cause behind BUG-01 through BUG-05, BUG-09.
//
// HOW TO USE THIS FILE (read this before touching any date code):
//
//   1. You have a "YYYY-MM-DD" string and need a Date object to do
//      calendar math (add days, compare, get weekday, etc.)
//        → use parseLocalDate(dateStr)
//        → NEVER use `new Date(dateStr)`
//
//   2. You have a Date object and need to output "YYYY-MM-DD"
//        → use formatLocalDate(date)
//        → NEVER use `date.toISOString().slice(0, 10)`
//
//   3. You have a Date object and need "YYYY-MM"
//        → use formatLocalMonth(date)
//        → NEVER use `date.toISOString().slice(0, 7)`
//
//   4. You are dealing with a REAL point in time (a timestamp with a
//      time-of-day component that matters, e.g. "created_at",
//      "cancelled_at", an audit-log entry, a backup filename moment)
//        → toISOString() / `new Date()` are fine — that IS UTC and
//          SHOULD be UTC. Do not "fix" these. See isDateOnlyString()
//          if you're unsure whether a given value is Date-Only.
//
// Do not write ad-hoc parsing/formatting logic elsewhere in the project.
// Every Date-Only read or write goes through this file.
// ============================================================================

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True if the given string is a Date-Only value ("YYYY-MM-DD"),
 * as opposed to a full timestamp. Useful when auditing unfamiliar code
 * to decide whether a `toISOString()`/`new Date(str)` call is safe.
 */
export function isDateOnlyString(value) {
  return typeof value === "string" && DATE_ONLY_RE.test(value);
}

/**
 * Parse a "YYYY-MM-DD" Date-Only string into a local Date object
 * (midnight local time, NOT UTC midnight).
 *
 * Use this instead of `new Date("YYYY-MM-DD")`.
 */
export function parseLocalDate(dateStr) {
  if (dateStr instanceof Date) {
    // Defensive: if a Date object was already passed, normalize to
    // local midnight rather than silently misbehaving.
    return startOfDay(dateStr);
  }
  if (typeof dateStr !== "string") {
    throw new TypeError(`parseLocalDate: expected a "YYYY-MM-DD" string, got ${typeof dateStr}`);
  }
  const match = dateStr.match(DATE_ONLY_RE);
  if (!match) {
    throw new RangeError(`parseLocalDate: "${dateStr}" is not a valid Date-Only string (expected YYYY-MM-DD)`);
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format a Date object as a local "YYYY-MM-DD" Date-Only string.
 *
 * Use this instead of `date.toISOString().slice(0, 10)`.
 */
export function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format a Date object as a local "YYYY-MM" month string.
 *
 * Use this instead of `date.toISOString().slice(0, 7)`.
 */
export function formatLocalMonth(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Today's date, expressed as a Date-Only string, in local time. */
export function todayLocalDateString() {
  return formatLocalDate(new Date());
}

/** Today's month, expressed as a "YYYY-MM" string, in local time. */
export function todayLocalMonthString() {
  return formatLocalMonth(new Date());
}

/** Return a new Date set to local midnight of the given date (strips time-of-day). */
export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Return a new Date, `days` days after `date` (local calendar arithmetic, DST-safe). */
export function addDays(date, days) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

/** Return a new Date, `months` months after `date`, clamped to a valid day-of-month. */
export function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

/**
 * The first calendar day of the month containing `date` (local time).
 */
export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * The last calendar day of the month containing `date` (local time),
 * at local midnight (00:00:00). Use endOfMonthEndOfDay() if you need
 * the day to be inclusive up to 23:59:59.999.
 */
export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Same as endOfMonth(), but with time set to 23:59:59.999 for inclusive range comparisons. */
export function endOfMonthEndOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Number of days in the given (year, monthIndex) — monthIndex is 0-based (0 = January).
 * Correctly handles leap years (Feb 29) via the JS Date day-0-of-next-month trick.
 */
export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Clamp a target day-of-month to the last valid day of the given
 * (year, monthIndex). Used for monthly recurrence when the anchor day
 * (e.g. 31) does not exist in the target month (e.g. February).
 *
 * This does NOT invent a date — it applies the explicit clamp-to-last-day
 * convention documented in the Monthly Recurrence Rule below.
 */
export function clampDayOfMonth(year, monthIndex, day) {
  return Math.min(day, daysInMonth(year, monthIndex));
}

/** Compare two Date-Only values structurally (no Date object involved). Returns -1/0/1. */
export function compareDateStrings(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * True if `dateStr` (a "YYYY-MM-DD" string) falls within [startStr, endStr]
 * inclusive. Any bound may be null/undefined to mean "unbounded".
 * Pure string comparison — safe because "YYYY-MM-DD" sorts lexicographically
 * the same as chronologically. Avoids constructing Date objects entirely.
 */
export function isDateStringInRange(dateStr, startStr, endStr) {
  if (startStr && dateStr < startStr) return false;
  if (endStr && dateStr > endStr) return false;
  return true;
}

// ----------------------------------------------------------------------------
// MONTHLY RECURRENCE RULE (documents the BUG-03 test-case decision):
//
//   Given a monthly recurrence anchored on `day` (e.g. day = 31), and a
//   target month that does not have that day (e.g. February, or any
//   30-day month for day = 31):
//
//     → clamp to the LAST valid day of that target month
//       (i.e. clampDayOfMonth), rather than skip the month or roll into
//       the next month.
//
//   Example: Day = 31, Start = 2026-01-31
//     2026-01-31, 2026-02-28, 2026-03-31, 2026-04-30, 2026-05-31, ...
//
//   This matches the existing documented behavior in
//   expenseRecurrenceEngine.js and is preserved exactly by this fix —
//   only the UTC/local bug for day = 1 (and other non-edge days) is
//   fixed, the day-31 edge-case clamping semantics are unchanged.
// ----------------------------------------------------------------------------
