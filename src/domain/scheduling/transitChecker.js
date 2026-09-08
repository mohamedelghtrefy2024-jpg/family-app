/**
 * transitChecker.js
 *
 * القرار المعتمد (Phase 1): وقت الانتقال يُدخل يدويًا بين كل زوج أماكن متكرر.
 * في غياب بيانات لهذا الزوج، الفحص يُعطَّل تمامًا لهذا الزوج تحديدًا — لا يُخترع رقم
 * ولا يُفترض متوسط سرعة (بند 19).
 */

/**
 * @param {Object} activityA - {location_id, end_time, date}
 * @param {Object} activityB - {location_id, start_time, date} يلي activityA زمنيًا
 * @param {Array} transitTimes - [{ from_location_id, to_location_id, minutes }] مُدخلة يدويًا
 * @returns {{ checked: boolean, sufficient: boolean|null, requiredMinutes: number|null, availableMinutes: number }}
 */
function checkTransitTime(activityA, activityB, transitTimes) {
  if (activityA.location_id === activityB.location_id) {
    return { checked: true, sufficient: true, requiredMinutes: 0, availableMinutes: null };
  }

  const rule = transitTimes.find(
    (t) =>
      (t.from_location_id === activityA.location_id &&
        t.to_location_id === activityB.location_id) ||
      (t.from_location_id === activityB.location_id &&
        t.to_location_id === activityA.location_id)
  );

  if (!rule) {
    // لا بيانات = لا فحص. لا تحذير، لا افتراض.
    return { checked: false, sufficient: null, requiredMinutes: null, availableMinutes: null };
  }

  const [aH, aM] = activityA.end_time.split(":").map(Number);
  const [bH, bM] = activityB.start_time.split(":").map(Number);
  const availableMinutes = bH * 60 + bM - (aH * 60 + aM);

  return {
    checked: true,
    sufficient: availableMinutes >= rule.minutes,
    requiredMinutes: rule.minutes,
    availableMinutes,
  };
}

export { checkTransitTime };
