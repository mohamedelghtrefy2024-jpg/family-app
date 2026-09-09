/**
 * costCalculator.js
 * يحسب تكلفة درس واحد خلال فترة زمنية، مع احترام تاريخ الأسعار (لا حساب يدوي مواز - بند 68).
 * يعتمد على occurrences فعلية من scheduleBuilder وليس تقديرًا تقريبيًا.
 */

import { getPriceAt } from "./priceHistoryService.js";
import { parseLocalDate } from "../shared/dateUtils.js";

/**
 * @param {Object} lesson
 * @param {Array} prices - كل سجلات الأسعار (تُفلتر داخليًا لهذا الدرس)
 * @param {Array} occurrences - مناسبات الدرس الفعلية داخل الفترة (من scheduleBuilder)، كل عنصر {date}
 * @param {Date} periodStart
 * @param {Date} periodEnd
 * @returns {{ total: number, breakdown: Array }}
 */
function calculateLessonCost(lesson, prices, occurrences, periodStart, periodEnd) {
  const relevantOccurrences = occurrences.filter((o) => {
    // BUG-fix (بند 17): o.date من نوع Date-Only — new Date() كانت تسبب إزاحة يوم في Africa/Cairo.
    const d = parseLocalDate(o.date);
    return d >= periodStart && d <= periodEnd;
  });

  // نجمع كل الأسعار المختلفة التي كانت سارية خلال الفترة (قد يتغير السعر في المنتصف)
  const breakdown = [];
  let total = 0;

  const priceAtMethod = (date) => getPriceAt(prices, lesson.id, date);

  const method =
    priceAtMethod(periodStart)?.pricing_method ||
    priceAtMethod(periodEnd)?.pricing_method;

  if (method === "per_session") {
    for (const occ of relevantOccurrences) {
      const price = priceAtMethod(occ.date);
      if (!price) continue;
      breakdown.push({ date: occ.date, amount: price.amount });
      total += price.amount;
    }
    return { total, breakdown };
  }

  if (method === "weekly" || method === "monthly" || method === "term" || method === "annual") {
    // نحسب عدد "الوحدات الزمنية" المغطاة (أسابيع/شهور/فصول/سنوات) داخل الفترة،
    // مع تطبيق السعر الساري وقت بداية كل وحدة.
    const unitsInPeriod = splitPeriodByPricingUnit(periodStart, periodEnd, method);
    for (const unit of unitsInPeriod) {
      const price = priceAtMethod(unit.start);
      if (!price) continue;
      breakdown.push({ unitStart: unit.start, unitEnd: unit.end, amount: price.amount });
      total += price.amount;
    }
    return { total, breakdown };
  }

  if (method === "fixed") {
    const price = priceAtMethod(periodStart);
    if (price) {
      breakdown.push({ note: "fixed", amount: price.amount });
      total = price.amount;
    }
    return { total, breakdown };
  }

  // variable: لا يوجد سعر ثابت يمكن حسابه تلقائيًا - يتطلب إدخال مصروف يدوي لكل مرة
  return { total: 0, breakdown: [], note: "variable pricing requires manual expense entries" };
}

function splitPeriodByPricingUnit(start, end, method) {
  const units = [];
  let cursor = new Date(start);

  while (cursor <= end) {
    const unitStart = new Date(cursor);
    const unitEnd = new Date(cursor);

    if (method === "weekly") unitEnd.setDate(unitEnd.getDate() + 7);
    else if (method === "monthly") unitEnd.setMonth(unitEnd.getMonth() + 1);
    else if (method === "term") unitEnd.setMonth(unitEnd.getMonth() + 4); // تقريبي، يُستبدل بتواريخ الترم الفعلية عند التكامل مع academicYears
    else if (method === "annual") unitEnd.setFullYear(unitEnd.getFullYear() + 1);
    else break;

    units.push({ start: unitStart, end: unitEnd > end ? end : unitEnd });
    cursor = unitEnd;
  }

  return units;
}

export { calculateLessonCost };
