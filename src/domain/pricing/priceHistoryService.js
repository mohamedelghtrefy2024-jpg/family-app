/**
 * priceHistoryService.js
 *
 * القاعدة الصارمة (Phase 1 / Phase 3):
 * - لا يُحذف أي سجل سعر قديم أبدًا.
 * - عند إضافة سعر جديد لنفس الدرس: السجل النشط الحالي يُغلق بحقل effective_to
 *   ويتحول status إلى "Superseded"، ثم يُضاف السجل الجديد كـ "Active".
 * - التسعير الساري في أي تاريخ ماضٍ يُحسب دائمًا من effective_from/effective_to
 *   الخاصين بذلك التاريخ، وليس من آخر سعر مُدخل.
 */

function assertValidPriceInput(price) {
  if (!price.lesson_id) throw new Error("price.lesson_id is required");
  if (typeof price.amount !== "number" || price.amount < 0) {
    throw new Error("price.amount must be a non-negative number");
  }
  if (!price.effective_from) throw new Error("price.effective_from is required");
  const validMethods = [
    "per_session",
    "weekly",
    "monthly",
    "term",
    "annual",
    "fixed",
    "variable",
  ];
  if (!validMethods.includes(price.pricing_method)) {
    throw new Error(`invalid pricing_method: ${price.pricing_method}`);
  }
}

/**
 * يضيف سعرًا جديدًا لدرس معيّن ويغلق السعر النشط السابق تلقائيًا.
 * لا يعدّل amount لأي سجل قديم — يعدّل فقط effective_to و status.
 *
 * @param {Array} existingPrices - كل سجلات الأسعار الحالية لكل الدروس
 * @param {Object} newPrice - { id, lesson_id, amount, currency, pricing_method, effective_from }
 * @returns {Array} نسخة جديدة كاملة من قائمة الأسعار بعد الإضافة
 */
function addPrice(existingPrices, newPrice) {
  assertValidPriceInput(newPrice);

  const newFrom = new Date(newPrice.effective_from);

  const activeForLesson = existingPrices.find(
    (p) => p.lesson_id === newPrice.lesson_id && p.status === "Active"
  );

  if (activeForLesson) {
    const activeFrom = new Date(activeForLesson.effective_from);
    if (newFrom <= activeFrom) {
      throw new Error(
        "لا يمكن إضافة سعر جديد بتاريخ سريان أقدم من أو يساوي السعر النشط الحالي — سيؤدي لتعديل تاريخ مالي بأثر رجعي"
      );
    }
  }

  const updated = existingPrices.map((p) => {
    if (p.lesson_id === newPrice.lesson_id && p.status === "Active") {
      return {
        ...p,
        effective_to: newPrice.effective_from,
        status: "Superseded",
      };
    }
    return p;
  });

  updated.push({
    id: newPrice.id,
    lesson_id: newPrice.lesson_id,
    amount: newPrice.amount,
    currency: newPrice.currency || "EGP",
    pricing_method: newPrice.pricing_method,
    effective_from: newPrice.effective_from,
    effective_to: null,
    status: "Active",
  });

  return updated;
}

/**
 * يعيد السعر الساري فعليًا لدرس معيّن في تاريخ محدد (وليس بالضرورة آخر سعر مُدخل).
 * @returns {Object|null}
 */
function getPriceAt(prices, lessonId, atDate) {
  const target = new Date(atDate);
  const candidates = prices.filter((p) => p.lesson_id === lessonId);

  return (
    candidates.find((p) => {
      const from = new Date(p.effective_from);
      const to = p.effective_to ? new Date(p.effective_to) : null;
      return from <= target && (!to || target < to);
    }) || null
  );
}

function getActivePrice(prices, lessonId) {
  return (
    prices.find((p) => p.lesson_id === lessonId && p.status === "Active") ||
    null
  );
}

function getPriceHistory(prices, lessonId) {
  return prices
    .filter((p) => p.lesson_id === lessonId)
    .sort((a, b) => new Date(a.effective_from) - new Date(b.effective_from));
}

export {
  addPrice,
  getPriceAt,
  getActivePrice,
  getPriceHistory,
};
