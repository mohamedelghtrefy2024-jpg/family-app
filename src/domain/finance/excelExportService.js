/**
 * excelExportService.js — Phase 13 (بند 42)
 *
 * "وظيفة أساسية وليست إضافية" — ملف Excel بعدة Sheets، بيعيد استخدام expenseService
 * (status/outstanding) وfinancialReportService (annual/monthly aggregation) بدل حساب موازٍ (بند 76).
 */
/**
 * excelExportService.js — Phase 13 (بند 42)
 *
 * "وظيفة أساسية وليست إضافية" — ملف Excel بعدة Sheets، بيعيد استخدام expenseService
 * (status/outstanding) وfinancialReportService (annual/monthly aggregation) بدل حساب موازٍ (بند 76).
 * ملاحظة أداء: مكتبة xlsx بتتحمّل ديناميكيًا (import ديناميكي) بدل تضخيم الحزمة الأساسية —
 * المستخدم مش هيدفع تكلفتها إلا لما فعلًا يضغط "تصدير".
 */
import { computeStatus, computeOutstanding, computeTotalPaid } from "./expenseService.js";
import { buildAnnualReport, monthValueOf, classifyCategoryKind, formatBudgetPeriod, KIND_ORDER } from "./financialReportService.js";
import { todayLocalDateString } from "../shared/dateUtils.js";

function nameOf(list, id) {
  return list?.find((x) => x.id === id)?.name || "";
}

function yesNo(v) {
  return v ? "نعم" : "لا";
}

function buildFamilySummarySheet(XLSX, ctx) {
  const activeExpenses = (ctx.expenses || []).filter((e) => !e.cancelled);
  const rows = [];

  for (const child of ctx.children || []) {
    const childExpenses = activeExpenses.filter((e) => e.child_id === child.id);
    const total = childExpenses.reduce((s, e) => s + e.amount, 0);
    const outstanding = childExpenses.reduce((s, e) => s + computeOutstanding(e, ctx.payments || []), 0);
    rows.push({
      "الابن": child.name,
      "إجمالي المصروفات (كل الأوقات)": Math.round(total * 100) / 100,
      "المتبقي غير المسدد": Math.round(outstanding * 100) / 100,
    });
  }

  const familyTotal = activeExpenses.reduce((s, e) => s + e.amount, 0);
  const familyOutstanding = activeExpenses.reduce((s, e) => s + computeOutstanding(e, ctx.payments || []), 0);
  rows.push({
    "الابن": "إجمالي الأسرة",
    "إجمالي المصروفات (كل الأوقات)": Math.round(familyTotal * 100) / 100,
    "المتبقي غير المسدد": Math.round(familyOutstanding * 100) / 100,
  });

  if (ctx.activeYearId) {
    const annual = buildAnnualReport(ctx, ctx.activeYearId);
    const activeYear = ctx.academicYears?.find((y) => y.id === ctx.activeYearId);
    rows.push({ "الابن": `— السنة الدراسية الحالية: ${activeYear?.name || ""} —`, "إجمالي المصروفات (كل الأوقات)": "", "المتبقي غير المسدد": "" });
    rows.push({ "الابن": "إجمالي السنة", "إجمالي المصروفات (كل الأوقات)": annual.familyTotal, "المتبقي غير المسدد": "" });
    rows.push({ "الابن": "متوسط شهري", "إجمالي المصروفات (كل الأوقات)": annual.monthlyAverage, "المتبقي غير المسدد": "" });
  }

  return XLSX.utils.json_to_sheet(rows);
}

function buildChildrenSheet(XLSX, ctx) {
  const rows = (ctx.children || []).map((c) => ({
    "الاسم": c.name,
    "تاريخ الميلاد": c.birth_date || "",
    "المرحلة التعليمية": c.education_stage || "",
    "الصف": c.grade || "",
    "الحالة": c.is_active === false ? "غير نشط" : "نشط",
    "ملاحظات": c.notes || "",
  }));
  return XLSX.utils.json_to_sheet(rows);
}

function buildExpensesSheet(XLSX, ctx) {
  const rows = (ctx.expenses || []).map((e) => ({
    "الابن": nameOf(ctx.children, e.child_id),
    "التصنيف": nameOf(ctx.expenseCategories, e.category_id),
    "الوصف": e.description || "",
    "القيمة": e.amount,
    "ثابت؟": yesNo(e.is_fixed),
    "تاريخ المصروف": e.expense_date || "",
    "تاريخ الاستحقاق": e.due_date || "",
    "الحالة": e.cancelled ? "ملغى" : computeStatus(e, ctx.payments || []),
    "المدفوع": computeTotalPaid(ctx.payments || [], e.id),
    "المتبقي": computeOutstanding(e, ctx.payments || []),
    "السنة الدراسية": nameOf(ctx.academicYears, e.academic_year_id),
    "الترم": e.term || "",
    "ملاحظات": e.notes || "",
  }));
  return XLSX.utils.json_to_sheet(rows);
}

function buildPaymentsSheet(XLSX, ctx) {
  const expenseById = new Map((ctx.expenses || []).map((e) => [e.id, e]));
  const rows = (ctx.payments || []).map((p) => {
    const expense = expenseById.get(p.expense_id);
    return {
      "الابن": expense ? nameOf(ctx.children, expense.child_id) : "",
      "المصروف": expense?.description || "",
      "القيمة": p.amount,
      "تاريخ الدفع": p.payment_date || "",
      "طريقة الدفع": p.payment_method || "",
      "ملغاة؟": yesNo(p.cancelled),
    };
  });
  return XLSX.utils.json_to_sheet(rows);
}

function buildLessonsSheet(XLSX, ctx) {
  const weekdayNames = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
  const rows = (ctx.lessons || []).map((l) => {
    const pattern = ctx.patterns?.[l.id];
    const activePrice = (ctx.prices || []).find((p) => p.lesson_id === l.id && p.status === "Active");
    return {
      "الابن": nameOf(ctx.children, l.child_id),
      "المادة": nameOf(ctx.subjects, l.subject_id),
      "المدرس": nameOf(ctx.teachers, l.teacher_id),
      "المكان": nameOf(ctx.locations, l.location_id) || "—",
      "النوع": l.lesson_type || "",
      "الحالة": l.status,
      "أيام الأسبوع": pattern ? pattern.weekdays.map((w) => weekdayNames[w]).join("، ") : "",
      "من الساعة": pattern?.start_time || "",
      "إلى الساعة": pattern?.end_time || "",
      "السعر الحالي": activePrice?.amount ?? "",
      "طريقة التسعير": activePrice?.pricing_method || "",
      "تاريخ البداية": l.start_date || "",
      "تاريخ النهاية": l.end_date || "",
    };
  });
  return XLSX.utils.json_to_sheet(rows);
}

function buildSchoolsSheet(XLSX, ctx) {
  const weekdayNames = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
  const rows = (ctx.schools || []).map((s) => {
    const days = (ctx.scheduleDays || [])
      .filter((d) => d.school_id === s.id)
      .map((d) => `${weekdayNames[d.weekday]} (${d.start_time}-${d.end_time})`)
      .join("، ");
    const enrolledChildren = (ctx.enrollments || [])
      .filter((e) => e.school_id === s.id)
      .map((e) => nameOf(ctx.children, e.child_id))
      .join("، ");
    return {
      "اسم المدرسة": s.name,
      "العنوان": s.address || "",
      "المنطقة": s.region || "",
      "الهاتف": s.phone || "",
      "أيام الدراسة": days || "—",
      "الأبناء الملتحقون": enrolledChildren || "—",
    };
  });
  return XLSX.utils.json_to_sheet(rows);
}

function buildMonthlySummarySheet(XLSX, ctx) {
  const activeExpenses = (ctx.expenses || []).filter((e) => !e.cancelled);
  const months = new Set(activeExpenses.map((e) => monthValueOf(e.due_date)));
  const rows = [...months].sort().map((month) => {
    const monthExpenses = activeExpenses.filter((e) => monthValueOf(e.due_date) === month);
    const byKind = KIND_ORDER.reduce((acc, k) => ({ ...acc, [k]: 0 }), {});
    for (const e of monthExpenses) {
      const kind = classifyCategoryKind(nameOf(ctx.expenseCategories, e.category_id));
      byKind[kind] = Math.round((byKind[kind] + e.amount) * 100) / 100;
    }
    const total = Math.round(monthExpenses.reduce((s, e) => s + e.amount, 0) * 100) / 100;
    return { "الشهر": month, ...byKind, "الإجمالي": total };
  });
  return XLSX.utils.json_to_sheet(rows);
}

function buildAnnualSummarySheet(XLSX, ctx) {
  const rows = [];
  for (const year of ctx.academicYears || []) {
    const annual = buildAnnualReport(ctx, year.id);
    for (const child of annual.perChild) {
      if (child.total === 0) continue;
      rows.push({
        "السنة الدراسية": year.name,
        "الابن": child.name,
        ...child.byKind,
        "الإجمالي": child.total,
      });
    }
    rows.push({
      "السنة الدراسية": year.name,
      "الابن": "إجمالي الأسرة",
      ...annual.byCategoryKind,
      "الإجمالي": annual.familyTotal,
    });
  }
  return XLSX.utils.json_to_sheet(rows);
}

function buildBudgetSheet(XLSX, ctx, compareBudgetFn) {
  const activeExpenses = (ctx.expenses || []).filter((e) => !e.cancelled);
  const rows = (ctx.budgets || []).map((b) => {
    const comparison = compareBudgetFn(b, activeExpenses);
    let scopeLabel = "الأسرة";
    if (b.scope === "Child") scopeLabel = nameOf(ctx.children, b.scope_ref_id);
    if (b.scope === "Category") scopeLabel = nameOf(ctx.expenseCategories, b.scope_ref_id);
    return {
      "النطاق": scopeLabel,
      "الفترة": formatBudgetPeriod(b, ctx.academicYears),
      "المخطط": b.planned_amount,
      "الفعلي": comparison.actual,
      "المتبقي": comparison.remaining,
      "متجاوز؟": yesNo(comparison.exceeded),
    };
  });
  return XLSX.utils.json_to_sheet(rows);
}

function buildPriceHistorySheet(XLSX, ctx) {
  const rows = (ctx.prices || [])
    .slice()
    .sort((a, b) => a.effective_from.localeCompare(b.effective_from))
    .map((p) => {
      const lesson = ctx.lessons?.find((l) => l.id === p.lesson_id);
      return {
        "الدرس": lesson ? `${nameOf(ctx.subjects, lesson.subject_id)} — ${nameOf(ctx.children, lesson.child_id)}` : p.lesson_id,
        "القيمة": p.amount,
        "طريقة التسعير": p.pricing_method,
        "ساري من": p.effective_from,
        "ساري حتى": p.effective_to || "—",
        "الحالة": p.status,
      };
    });
  return XLSX.utils.json_to_sheet(rows);
}

/**
 * @param {Object} ctx - context كامل (لازم يشمل budgets وacademicYears وexpenseCategories)
 * @param {Function} compareBudgetFn - budgetService.compareBudget (تُمرَّر بدل الاستيراد المباشر لتفادي أي حلقة استيراد)
 * @returns {Promise<XLSX.WorkBook>}
 */
async function buildWorkbook(ctx, compareBudgetFn) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildFamilySummarySheet(XLSX, ctx), "Family Summary");
  XLSX.utils.book_append_sheet(wb, buildChildrenSheet(XLSX, ctx), "Children");
  XLSX.utils.book_append_sheet(wb, buildExpensesSheet(XLSX, ctx), "Expenses");
  XLSX.utils.book_append_sheet(wb, buildPaymentsSheet(XLSX, ctx), "Payments");
  XLSX.utils.book_append_sheet(wb, buildLessonsSheet(XLSX, ctx), "Lessons");
  XLSX.utils.book_append_sheet(wb, buildSchoolsSheet(XLSX, ctx), "Schools");
  XLSX.utils.book_append_sheet(wb, buildMonthlySummarySheet(XLSX, ctx), "Monthly Summary");
  XLSX.utils.book_append_sheet(wb, buildAnnualSummarySheet(XLSX, ctx), "Annual Summary");
  XLSX.utils.book_append_sheet(wb, buildBudgetSheet(XLSX, ctx, compareBudgetFn), "Budget");
  XLSX.utils.book_append_sheet(wb, buildPriceHistorySheet(XLSX, ctx), "Price History");
  return { XLSX, wb };
}

/** يولّد الملف ويبدأ تنزيله في المتصفح باسم يشمل تاريخ اليوم. */
async function exportToExcel(ctx, compareBudgetFn) {
  const { XLSX, wb } = await buildWorkbook(ctx, compareBudgetFn);
  const today = todayLocalDateString();
  XLSX.writeFile(wb, `family-app-export-${today}.xlsx`);
}

export { buildWorkbook, exportToExcel };
