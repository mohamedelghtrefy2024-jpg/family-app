/**
 * notificationService.js — Phase 12 (بند 33)
 *
 * كل نوع تنبيه بيعيد استخدام منطق موجود بالفعل (calendarBuilder/dashboardService/expenseService)
 * بدل حساب موازٍ (بند 76). النتيجة قائمة موحّدة قابلة للفلترة حسب الأنواع المفعّلة من المستخدم.
 */
import { buildCalendarEvents } from "../calendar/calendarBuilder";
import { buildProblems } from "../dashboard/dashboardService";

const NOTIFICATION_TYPES = [
  { id: "lesson_upcoming", label: "موعد درس قريب" },
  { id: "school_start", label: "بداية سنة دراسية قريبة" },
  { id: "payment_due", label: "موعد دفع قريب" },
  { id: "expense_overdue", label: "مصروف متأخر" },
  { id: "conflict", label: "تعارض مواعيد" },
  { id: "budget_exceeded", label: "تجاوز ميزانية" },
  { id: "book_purchase_due", label: "موعد شراء كتب" },
  { id: "important_event", label: "حدث مهم" },
];

const DEFAULT_ENABLED_TYPES = NOTIFICATION_TYPES.map((t) => t.id);

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function childName(ctx, childId) {
  return ctx.children?.find((c) => c.id === childId)?.name || "—";
}

function categoryName(ctx, categoryId) {
  return ctx.expenseCategories?.find((c) => c.id === categoryId)?.name || "";
}

/**
 * @param {Object} ctx
 * @param {Date} todayDate
 * @param {Array<string>} enabledTypes - IDs من NOTIFICATION_TYPES، افتراضيًا كلها مفعّلة
 */
function computeNotifications(ctx, todayDate = new Date(), enabledTypes = DEFAULT_ENABLED_TYPES) {
  const notifications = [];
  const today = new Date(todayDate);
  today.setHours(0, 0, 0, 0);

  const needsPaymentEvents = enabledTypes.includes("payment_due") || enabledTypes.includes("book_purchase_due");
  const paymentEvents = needsPaymentEvents
    ? buildCalendarEvents(ctx, today, addDays(today, 14)).filter((e) => e.type === "payment")
    : [];

  if (enabledTypes.includes("lesson_upcoming")) {
    const events = buildCalendarEvents(ctx, today, addDays(today, 1)).filter(
      (e) => e.type === "lesson"
    );
    for (const ev of events) {
      notifications.push({
        type: "lesson_upcoming",
        date: ev.date,
        label: `درس ${ev.label} — ${childName(ctx, ev.child_id)} الساعة ${ev.start_time || "—"}`,
      });
    }
  }

  if (enabledTypes.includes("school_start")) {
    for (const year of ctx.academicYears || []) {
      if (!year.start_date) continue;
      const start = new Date(year.start_date);
      if (start >= today && start <= addDays(today, 14)) {
        notifications.push({
          type: "school_start",
          date: year.start_date,
          label: `بداية السنة الدراسية "${year.name}" يوم ${year.start_date}`,
        });
      }
    }
  }

  if (enabledTypes.includes("payment_due")) {
    for (const ev of paymentEvents) {
      if (new Date(ev.date) > addDays(today, 3)) continue;
      notifications.push({
        type: "payment_due",
        date: ev.date,
        label: `موعد دفع قريب — ${childName(ctx, ev.child_id)}: ${ev.label}`,
      });
    }
  }

  if (enabledTypes.includes("book_purchase_due")) {
    for (const ev of paymentEvents) {
      if (!categoryName(ctx, ev.category_id).includes("كتب")) continue;
      notifications.push({
        type: "book_purchase_due",
        date: ev.date,
        label: `موعد شراء كتب — ${childName(ctx, ev.child_id)}: ${ev.label}`,
      });
    }
  }

  const problems = buildProblems(ctx, today);

  if (enabledTypes.includes("expense_overdue")) {
    for (const e of problems.overdueExpenses) {
      notifications.push({
        type: "expense_overdue",
        date: e.due_date,
        label: `مصروف متأخر: ${e.description || "بدون وصف"} — ${childName(ctx, e.child_id)}`,
      });
    }
  }

  if (enabledTypes.includes("conflict")) {
    for (const c of problems.conflicts) {
      notifications.push({
        type: "conflict",
        date: c.date,
        label: `تعارض بتاريخ ${c.date} بين «${c.a.label}» و«${c.b.label}» — ${childName(ctx, c.child_id)}`,
      });
    }
  }

  if (enabledTypes.includes("budget_exceeded")) {
    for (const { budget, comparison } of problems.exceededBudgets) {
      notifications.push({
        type: "budget_exceeded",
        date: isoDate(today),
        label: `تجاوز الميزانية (${budget.scope === "Family" ? "الأسرة" : budget.scope}) بمقدار ${comparison.exceededBy}`,
      });
    }
  }

  // "important_event" (بند 16 الأحداث الأخرى) — بيعيد استخدام حدث "event" الجديد في calendarBuilder
  if (enabledTypes.includes("important_event")) {
    const events = buildCalendarEvents(ctx, today, addDays(today, 7)).filter((e) => e.type === "event");
    for (const ev of events) {
      notifications.push({
        type: "important_event",
        date: ev.date,
        label: `${ev.label}${ev.child_id ? " — " + childName(ctx, ev.child_id) : " (الأسرة كلها)"}`,
      });
    }
  }

  return notifications.sort((a, b) => a.date.localeCompare(b.date));
}

export { NOTIFICATION_TYPES, DEFAULT_ENABLED_TYPES, computeNotifications };
