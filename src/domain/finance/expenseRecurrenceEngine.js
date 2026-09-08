/**
 * expenseRecurrenceEngine.js — Phase 11 (بند 23)
 *
 * محرك تكرار للمصروفات، بنفس روح scheduleBuilder.buildOccurrences (مؤشر يومي + قواعد توقف)
 * بدل اختراع أسلوب توليد مختلف (بند 76). لا يلمس أي جدول DB — دوال نقية بالكامل.
 *
 * قاعدة التكرار (rule) المتوقعة:
 * {
 *   id, status: "Active"|"Paused",
 *   child_id, category_id, description, amount, is_fixed,
 *   academic_year_id, term, notes,
 *   frequency: "Daily"|"Weekly"|"Monthly"|"Term"|"Annual"|"Custom",
 *   interval: number (كل كام وحدة زمنية - افتراضي 1),
 *   weekdays: [0-6] (مطلوبة لو Weekly),
 *   day_of_month: 1-31 (مطلوبة لو Monthly),
 *   custom_interval_days: number (مطلوبة لو Custom),
 *   start_date: "YYYY-MM-DD",
 *   end_date: "YYYY-MM-DD"|null,
 *   occurrences_count: number|null (سقف عدد مرات التوليد الكلي، بدون سقف لو null),
 * }
 *
 * ملاحظة "Term/Annual": بدون تواريخ فصل دراسي فعلية في الـ schema الحالي، نستخدم نفس التقريب
 * المستخدم بالفعل في costCalculator.splitPeriodByPricingUnit (فصل ≈ 4 شهور، سنة = 12 شهر)
 * بدل اختراع تقريب مختلف.
 */

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function clampDayOfMonth(year, monthIndex, day) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(day, lastDay);
}

/**
 * يبني التسلسل الكامل لتواريخ التكرار من start_date وحتى (rangeEnd أو occurrences_count أيهما أقرب)،
 * ثم يُرجع فقط التواريخ الواقعة داخل [rangeStart, rangeEnd].
 */
function computeOccurrenceDates(rule, rangeStart, rangeEnd) {
  if (!rule || rule.status !== "Active") return [];

  const ruleStart = new Date(rule.start_date);
  const ruleEnd = rule.end_date ? new Date(rule.end_date) : null;
  const hardEnd = ruleEnd && ruleEnd < rangeEnd ? ruleEnd : rangeEnd;
  if (ruleStart > hardEnd) return [];

  const interval = rule.interval && rule.interval > 0 ? rule.interval : 1;
  const allDates = [];
  const maxCount = rule.occurrences_count || Infinity;

  if (rule.frequency === "Daily") {
    let cursor = new Date(ruleStart);
    while (cursor <= hardEnd && allDates.length < maxCount) {
      allDates.push(new Date(cursor));
      cursor = addDays(cursor, interval);
    }
  } else if (rule.frequency === "Weekly") {
    const weekdays = rule.weekdays || [];
    let cursor = new Date(ruleStart);
    cursor.setHours(0, 0, 0, 0);
    const startOfWeek0 = addDays(ruleStart, -ruleStart.getDay());
    while (cursor <= hardEnd && allDates.length < maxCount) {
      const weeksSinceStart = Math.floor((addDays(cursor, -cursor.getDay()) - startOfWeek0) / (7 * 86400000));
      if (weekdays.includes(cursor.getDay()) && weeksSinceStart % interval === 0) {
        allDates.push(new Date(cursor));
      }
      cursor = addDays(cursor, 1);
    }
  } else if (rule.frequency === "Monthly") {
    const dayOfMonth = rule.day_of_month || ruleStart.getDate();
    let monthCursor = new Date(ruleStart.getFullYear(), ruleStart.getMonth(), 1);
    while (monthCursor <= hardEnd && allDates.length < maxCount) {
      const day = clampDayOfMonth(monthCursor.getFullYear(), monthCursor.getMonth(), dayOfMonth);
      const occurrence = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
      if (occurrence >= ruleStart && occurrence <= hardEnd) {
        allDates.push(occurrence);
      }
      monthCursor = addMonths(monthCursor, interval);
    }
  } else if (rule.frequency === "Term" || rule.frequency === "Annual") {
    const stepMonths = (rule.frequency === "Term" ? 4 : 12) * interval;
    let cursor = new Date(ruleStart);
    while (cursor <= hardEnd && allDates.length < maxCount) {
      allDates.push(new Date(cursor));
      cursor = addMonths(cursor, stepMonths);
    }
  } else if (rule.frequency === "Custom") {
    const stepDays = rule.custom_interval_days && rule.custom_interval_days > 0 ? rule.custom_interval_days : 1;
    let cursor = new Date(ruleStart);
    while (cursor <= hardEnd && allDates.length < maxCount) {
      allDates.push(new Date(cursor));
      cursor = addDays(cursor, stepDays);
    }
  }

  return allDates.filter((d) => d >= rangeStart && d <= rangeEnd).map(isoDate);
}

/** يبني كائن مصروف (بدون id) من قاعدة تكرار وتاريخ استحقاق معيّن. */
function buildExpenseFromRule(rule, dueDate) {
  return {
    child_id: rule.child_id,
    category_id: rule.category_id,
    academic_year_id: rule.academic_year_id || null,
    term: rule.term || null,
    description: rule.description || "",
    amount: rule.amount,
    is_fixed: rule.is_fixed ?? true,
    expense_date: dueDate,
    due_date: dueDate,
    notes: rule.notes || null,
    cancelled: false,
    recurrence_rule_id: rule.id,
  };
}

/**
 * يولّد كائنات المصروفات الناقصة فقط (بدون تكرار مصروف اتولّد قبل كده لنفس التاريخ ونفس القاعدة).
 * @param {Object} rule
 * @param {Array} existingExpenses - كل المصروفات الحالية (لفحص التكرار عبر recurrence_rule_id + due_date)
 * @param {Date} rangeStart
 * @param {Date} rangeEnd
 * @returns {Array} كائنات مصروف جاهزة للإدخال (بدون id)
 */
function generateMissingExpenses(rule, existingExpenses, rangeStart, rangeEnd) {
  const dueDates = computeOccurrenceDates(rule, rangeStart, rangeEnd);
  const alreadyGenerated = new Set(
    existingExpenses
      .filter((e) => e.recurrence_rule_id === rule.id)
      .map((e) => e.due_date)
  );
  return dueDates
    .filter((d) => !alreadyGenerated.has(d))
    .map((d) => buildExpenseFromRule(rule, d));
}

export { computeOccurrenceDates, buildExpenseFromRule, generateMissingExpenses };
