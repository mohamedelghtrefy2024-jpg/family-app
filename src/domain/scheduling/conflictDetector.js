/**
 * conflictDetector.js
 * تعارض = تداخل زمني فعلي لنفس الابن بين نشاطين (بند 15/58).
 * ملاصقة الأوقات (نهاية = بداية) لا تُعتبر تعارضًا افتراضيًا.
 */

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function timesOverlap(aStart, aEnd, bStart, bEnd) {
  const as = toMinutes(aStart);
  const ae = toMinutes(aEnd);
  const bs = toMinutes(bStart);
  const be = toMinutes(bEnd);
  // تداخل حقيقي فقط، وليس مجرد تلامس الحدود
  return as < be && bs < ae;
}

/**
 * @param {Array} activities - [{ id, child_id, date, start_time, end_time, label }]
 * @returns {Array} قائمة التعارضات المكتشفة [{ child_id, date, a, b }]
 */
function detectConflicts(activities) {
  const conflicts = [];
  const byChildAndDate = {};

  for (const act of activities) {
    const key = `${act.child_id}__${act.date}`;
    if (!byChildAndDate[key]) byChildAndDate[key] = [];
    byChildAndDate[key].push(act);
  }

  for (const key of Object.keys(byChildAndDate)) {
    const dayActivities = byChildAndDate[key];
    for (let i = 0; i < dayActivities.length; i++) {
      for (let j = i + 1; j < dayActivities.length; j++) {
        const a = dayActivities[i];
        const b = dayActivities[j];
        if (timesOverlap(a.start_time, a.end_time, b.start_time, b.end_time)) {
          conflicts.push({
            child_id: a.child_id,
            date: a.date,
            a,
            b,
          });
        }
      }
    }
  }

  return conflicts;
}

export { detectConflicts, timesOverlap };
