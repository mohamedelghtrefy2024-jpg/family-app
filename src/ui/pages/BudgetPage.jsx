import { useEffect, useState } from "react";
import { childRepo } from "../../data/repositories/childRepo";
import { expenseCategoryRepo } from "../../data/repositories/expenseCategoryRepo";
import { academicYearRepo } from "../../data/repositories/academicYearRepo";
import { budgetRepo } from "../../data/repositories/budgetRepo";
import { compareBudget } from "../../domain/finance/budgetService";
import BudgetForm from "../components/BudgetForm";
import WhatIfCalculator from "../components/WhatIfCalculator";
import EmptyState from "../components/EmptyState";

const SCOPE_LABELS = { Family: "الأسرة", Child: "ابن", Category: "تصنيف" };

export default function BudgetPage() {
  const [children, setChildren] = useState([]);
  const [categories, setCategories] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [budgets, setBudgets] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  async function loadLookups() {
    setChildren(await childRepo.getActive());
    setCategories(await expenseCategoryRepo.getAll());
    setAcademicYears(await academicYearRepo.getAll());
  }

  async function loadBudgets() {
    setBudgets(await budgetRepo.getAll());
    setExpenses(await budgetRepo.getAllExpensesForCompare());
  }

  useEffect(() => {
    loadLookups();
    loadBudgets();
  }, []);

  function nameOf(list, id) {
    return list.find((x) => x.id === id)?.name || "—";
  }

  function scopeLabel(budget) {
    if (budget.scope === "Family") return "الأسرة";
    if (budget.scope === "Child") return `ابن: ${nameOf(children, budget.scope_ref_id)}`;
    if (budget.scope === "Category") return `تصنيف: ${nameOf(categories, budget.scope_ref_id)}`;
    return SCOPE_LABELS[budget.scope] || budget.scope;
  }

  function periodLabel(budget) {
    if (budget.period_type === "Monthly") return `شهر ${budget.period_value}`;
    return `سنة ${nameOf(academicYears, budget.scope_ref_academic_year_id)}`;
  }

  async function handleSaveBudget(data) {
    setError(null);
    try {
      await budgetRepo.add(data);
      setShowForm(false);
      await loadBudgets();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(budget) {
    setError(null);
    try {
      await budgetRepo.remove(budget.id);
      await loadBudgets();
    } catch (err) {
      setError(err.message);
    }
  }

  if (budgets === null) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">الميزانية</h1>
          <p className="page-subtitle">المخطط مقابل الفعلي لنفس النطاق ونفس الفترة</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ ميزانية جديدة</button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <BudgetForm
          children={children}
          categories={categories}
          academicYears={academicYears}
          onSave={handleSaveBudget}
          onCancel={() => setShowForm(false)}
        />
      )}

      {budgets.length === 0 && !showForm && (
        <EmptyState
          title="لسه مفيش ميزانيات مُحددة"
          hint="حدد ميزانية شهرية أو سنوية للأسرة أو لابن أو لتصنيف معين"
          actionLabel="+ ميزانية جديدة"
          onAction={() => setShowForm(true)}
        />
      )}

      {budgets.map((budget) => {
        const result = compareBudget(budget, expenses);
        return (
          <div className="list-row" key={budget.id}>
            <div>
              <div className="list-row-name">{scopeLabel(budget)} — {periodLabel(budget)}</div>
              <div className="list-row-meta">
                المخطط {result.planned} · الفعلي {result.actual} · المتبقي {result.remaining}
                {result.exceeded && <> · تجاوز بمقدار {result.exceededBy}</>}
              </div>
            </div>
            <div className="list-row-actions">
              {result.exceeded ? (
                <span className="tag tag-overdue">⚠️ Budget Exceeded</span>
              ) : (
                <span className="tag tag-paid">ضمن الميزانية</span>
              )}
              <button className="btn btn-danger" onClick={() => handleDelete(budget)}>حذف</button>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>ميزة "ماذا لو؟"</h2>
        <WhatIfCalculator />
      </div>
    </div>
  );
}
