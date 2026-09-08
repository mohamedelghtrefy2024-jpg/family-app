/**
 * budgetService.js
 * Planned vs Actual لنفس النطاق (Family/Child/Category) ونفس الفترة (بند 36-38).
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
  if (budget.period_type === "Monthly") {
    return expense.expense_date.slice(0, 7) === budget.period_value;
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
