/**
 * budgetService.js
 * Planned vs Actual لنفس النطاق (Family/Child/Category) ونفس الفترة (بند 36-38).
 *
 * ============================================================================
 * BUDGET PERIOD ATTRIBUTION RULE (قرار موحد — بند 15 من طلب الإصلاح):
 *
 *   السؤال: لأي شهر ينتمي المصروف عند حساب الميزانية؟
 *   القرار: expense.due_date — وليس expense.expense_date.
 *
 *   السبب: expense.due_date هو الحقل المستخدم بالفعل ومن غير استثناء في كل باقي
 *   النظام لتحديد "شهر" المصروف — Dashboard (dueThisMonth)، Financial Center
 *   (buildFinancialCenter)، Reports (monthly/annual)، Monthly Summary، Excel
 *   Export. periodMatches هنا كانت الاستثناء الوحيد المعتمد على expense_date،
 *   ما يعني أن ميزانية شهر معيّن كانت أحيانًا لا تُطابق نفس مصروفات ذلك الشهر
 *   في باقي الشاشات. تم توحيدها الآن على due_date.
 *
 *   Due Date = "متى يجب أن يُدفع" وهو المعنى العملي الأنسب لتخطيط ميزانية
 *   الشهر (بيسأل الأسرة: كام مستحق عليّا الشهر ده؟) — بعكس Expense Date اللي
 *   بيمثل وقت تسجيل البند وقد لا يطابق شهر الاستحقاق الفعلي.
 * ============================================================================
 */

function scopeMatches(expense, budget) {
  if (budget.scope === "Family") return true;
  if (budget.scope === "Child") return expense.child_id === budget.scope_ref_id;
  if (budget.scope === "Category")
    return expense.category_id === budget.scope_ref_id;
  return false;
}

function periodMatches(expense, budget) {
  // period_value بصيغة "YYYY-MM" للشهري أو "YYYY/YYYY" للسنوي
  // Budget Period Attribution Rule (أعلى الملف): يُستخدم due_date دائمًا، وليس expense_date.
  if (budget.period_type === "Monthly") {
    return expense.due_date.slice(0, 7) === budget.period_value;
  }
  if (budget.period_type === "Annual") {
    return expense.academic_year_id === budget.scope_ref_academic_year_id;
  }
  return false;
}

/**
 * @returns {{ planned: number, actual: number, remaining: number, exceeded: boolean, exceededBy: number }}
 */
function compareBudget(budget, expenses) {
  const matching = expenses.filter(
    (e) => !e.cancelled && scopeMatches(e, budget) && periodMatches(e, budget)
  );

  const actual = matching.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget.planned_amount - actual;
  const exceeded = actual > budget.planned_amount;

  return {
    planned: budget.planned_amount,
    actual,
    remaining,
    exceeded,
    exceededBy: exceeded ? Math.round((actual - budget.planned_amount) * 100) / 100 : 0,
  };
}

export { compareBudget, scopeMatches, periodMatches };
