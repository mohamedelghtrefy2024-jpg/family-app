import { useEffect, useState } from "react";
import { childRepo } from "../../data/repositories/childRepo";
import { academicYearRepo } from "../../data/repositories/academicYearRepo";
import { expenseCategoryRepo } from "../../data/repositories/expenseCategoryRepo";
import { expenseRepo } from "../../data/repositories/expenseRepo";
import { paymentRepo } from "../../data/repositories/paymentRepo";
import { computeOutstanding, computeStatus } from "../../domain/finance/expenseService";
import ExpenseForm from "../components/ExpenseForm";
import PaymentForm from "../components/PaymentForm";
import EmptyState from "../components/EmptyState";

const STATUS_LABELS = {
  Paid: "مدفوع بالكامل",
  "Partially Paid": "مدفوع جزئيًا",
  Due: "مستحق",
  Overdue: "متأخر",
  Cancelled: "ملغى",
};

const TERM_LABELS = { Term1: "الفصل الأول", Term2: "الفصل الثاني", Summer: "الصيف" };

const STATUS_TAG_CLASS = {
  Paid: "tag-paid",
  "Partially Paid": "tag-partial",
  Due: "tag-due",
  Overdue: "tag-overdue",
  Cancelled: "tag-inactive",
};

export default function ExpensesPage() {
  const [children, setChildren] = useState([]);
  const [categories, setCategories] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [expenses, setExpenses] = useState(null);
  const [payments, setPayments] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [error, setError] = useState(null);

  async function loadLookups() {
    await expenseCategoryRepo.ensureDefaults();
    setChildren(await childRepo.getActive());
    setCategories(await expenseCategoryRepo.getAll());
    setAcademicYears(await academicYearRepo.getAll());
  }

  async function loadExpenses() {
    const all = await expenseRepo.getAll();
    const allPayments = await paymentRepo.getAll();
    const byExpense = {};
    for (const p of allPayments) {
      if (!byExpense[p.expense_id]) byExpense[p.expense_id] = [];
      byExpense[p.expense_id].push(p);
    }
    setPayments(byExpense);
    setExpenses(all.sort((a, b) => new Date(b.due_date) - new Date(a.due_date)));
  }

  useEffect(() => {
    loadLookups();
    loadExpenses();
  }, []);

  function nameOf(list, id) {
    return list.find((x) => x.id === id)?.name || "—";
  }

  async function handleCreateCategory(name) {
    const created = await expenseCategoryRepo.add({ name });
    setCategories(await expenseCategoryRepo.getAll());
    return created;
  }

  async function handleCreateAcademicYear(name) {
    // بدون تواريخ بداية/نهاية مُخترعة (بند 45) — تُستكمل لاحقًا من شاشة "السنوات الدراسية".
    // تُنشأ Archived افتراضيًا: تفعيلها فعل صريح من تلك الشاشة (لا نغيّر السنة النشطة الحالية ضمنيًا هنا).
    const created = await academicYearRepo.add({ name, status: "Archived", start_date: "", end_date: "" });
    setAcademicYears(await academicYearRepo.getAll());
    return created;
  }

  async function handleSaveExpense(data) {
    setError(null);
    try {
      await expenseRepo.add(data);
      setShowForm(false);
      await loadExpenses();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCancelExpense(expense) {
    setError(null);
    try {
      await expenseRepo.cancel(expense.id);
      await loadExpenses();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSavePayment(expense, paymentInput) {
    setError(null);
    try {
      await paymentRepo.addPayment(expense, paymentInput);
      setPayingId(null);
      await loadExpenses();
    } catch (err) {
      setError(err.message);
    }
  }

  if (expenses === null) return null;

  const canAddExpense = children.length > 0;
  const activeExpenses = expenses.filter((e) => !e.cancelled);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">المصروفات والمدفوعات</h1>
          <p className="page-subtitle">المستحق يُحسب دائمًا من (القيمة − الدفعات) — مفيش رقم بيتكتب يدوي</p>
        </div>
        {!showForm && canAddExpense && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ مصروف جديد</button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!canAddExpense && (
        <div className="error-banner">لازم تضيف ابن واحد على الأقل من صفحة "الأبناء" الأول</div>
      )}

      {showForm && (
        <ExpenseForm
          children={children}
          categories={categories}
          academicYears={academicYears}
          onRefreshCategories={handleCreateCategory}
          onRefreshAcademicYears={handleCreateAcademicYear}
          onSave={handleSaveExpense}
          onCancel={() => setShowForm(false)}
        />
      )}

      {activeExpenses.length === 0 && !showForm && (
        <EmptyState
          title="لسه مفيش مصروفات مُضافة"
          hint={canAddExpense ? "أضف أول مصروف وحدد تاريخ استحقاقه" : "أضف ابن الأول عشان تقدر تضيفله مصروف"}
          actionLabel={canAddExpense ? "+ مصروف جديد" : null}
          onAction={() => setShowForm(true)}
        />
      )}

      {activeExpenses.map((expense) => {
        const expensePayments = (payments[expense.id] || []).filter((p) => !p.cancelled);
        const outstanding = computeOutstanding(expense, expensePayments);
        const status = computeStatus(expense, expensePayments);

        return (
          <div className="list-row" key={expense.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <div>
                <div className="list-row-name">
                  {expense.description || nameOf(categories, expense.category_id)} — {nameOf(children, expense.child_id)}
                </div>
                <div className="list-row-meta">
                  {nameOf(categories, expense.category_id)} · {expense.is_fixed ? "ثابت" : "متغيّر"} · استحقاق {expense.due_date}
                  {" · "}القيمة {expense.amount} · المتبقي {outstanding}
                  {expense.academic_year_id && <> · {nameOf(academicYears, expense.academic_year_id)}</>}
                  {expense.term && <> · {TERM_LABELS[expense.term]}</>}
                </div>
              </div>
              <div className="list-row-actions">
                <span className={`tag ${STATUS_TAG_CLASS[status] || ""}`}>{STATUS_LABELS[status]}</span>
                {outstanding > 0 && (
                  <button className="btn btn-primary" onClick={() => setPayingId(payingId === expense.id ? null : expense.id)}>
                    تسجيل دفعة
                  </button>
                )}
                <button className="btn btn-danger" onClick={() => handleCancelExpense(expense)}>إلغاء</button>
              </div>
            </div>

            {payingId === expense.id && (
              <PaymentForm
                outstanding={outstanding}
                onSave={(input) => handleSavePayment(expense, input)}
                onCancel={() => setPayingId(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
