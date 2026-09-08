import { useEffect, useState } from "react";
import { childRepo } from "../../data/repositories/childRepo";
import { expenseCategoryRepo } from "../../data/repositories/expenseCategoryRepo";
import { academicYearRepo } from "../../data/repositories/academicYearRepo";
import { expenseRecurrenceRuleRepo } from "../../data/repositories/expenseRecurrenceRuleRepo";
import RecurrenceRuleForm from "../components/RecurrenceRuleForm";
import EmptyState from "../components/EmptyState";
import { todayLocalDateString, parseLocalDate } from "../../domain/shared/dateUtils";

const FREQUENCY_LABELS = {
  Daily: "يومي",
  Weekly: "أسبوعي",
  Monthly: "شهري",
  Term: "فصل دراسي (تقريبي)",
  Annual: "سنوي",
  Custom: "مخصص",
};

const WEEKDAY_LABELS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

function describeRule(rule) {
  if (rule.frequency === "Weekly") {
    const days = (rule.weekdays || []).map((w) => WEEKDAY_LABELS[w]).join("، ");
    return `أسبوعي (${days}) كل ${rule.interval} أسبوع`;
  }
  if (rule.frequency === "Monthly") {
    return `شهري يوم ${rule.day_of_month} من الشهر${rule.interval > 1 ? ` (كل ${rule.interval} شهور)` : ""}`;
  }
  if (rule.frequency === "Custom") {
    return `كل ${rule.custom_interval_days} يوم`;
  }
  if (rule.frequency === "Daily") {
    return rule.interval > 1 ? `يومي (كل ${rule.interval} أيام)` : "يومي";
  }
  return `${FREQUENCY_LABELS[rule.frequency] || rule.frequency}${rule.interval > 1 ? ` (كل ${rule.interval})` : ""}`;
}

export default function RecurrenceRulesPage() {
  const [children, setChildren] = useState([]);
  const [categories, setCategories] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [rules, setRules] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [horizonDate, setHorizonDate] = useState(todayLocalDateString());

  async function loadLookups() {
    setChildren(await childRepo.getActive());
    setCategories(await expenseCategoryRepo.getAll());
    setAcademicYears(await academicYearRepo.getAll());
  }

  async function loadRules() {
    setRules(await expenseRecurrenceRuleRepo.getAll());
  }

  useEffect(() => {
    loadLookups();
    loadRules();
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
    const created = await academicYearRepo.add({ name, status: "Archived", start_date: "", end_date: "" });
    setAcademicYears(await academicYearRepo.getAll());
    return created;
  }

  async function handleSaveRule(data) {
    setError(null);
    try {
      await expenseRecurrenceRuleRepo.add(data);
      setShowForm(false);
      await loadRules();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleStatus(rule) {
    setError(null);
    try {
      if (rule.status === "Active") await expenseRecurrenceRuleRepo.pause(rule.id);
      else await expenseRecurrenceRuleRepo.activate(rule.id);
      await loadRules();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(rule) {
    setError(null);
    try {
      await expenseRecurrenceRuleRepo.safeDelete(rule.id);
      await loadRules();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerate() {
    setError(null);
    setMessage(null);
    try {
      const horizon = parseLocalDate(horizonDate);
      horizon.setHours(23, 59, 59, 999);
      const result = await expenseRecurrenceRuleRepo.generateDueNow(horizon);
      setMessage(
        result.createdCount > 0
          ? `تم توليد ${result.createdCount} مصروف جديد من قواعد التكرار النشطة`
          : "مفيش مصروفات جديدة تستحق التوليد حتى هذا التاريخ"
      );
      await loadRules();
    } catch (err) {
      setError(err.message);
    }
  }

  if (rules === null) return null;

  const canAdd = children.length > 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">تكرار المصروفات</h1>
          <p className="page-subtitle">قواعد تكرار تُولّد مصروفات فعلية تلقائيًا — بدون تكرار يدوي كل مرة</p>
        </div>
        {!showForm && canAdd && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ قاعدة تكرار جديدة</button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {message && <div className="error-banner" style={{ background: "var(--success-soft)", color: "var(--success)" }}>{message}</div>}

      {!canAdd && (
        <div className="error-banner">لازم تضيف ابن واحد على الأقل من صفحة "الأبناء" الأول</div>
      )}

      {showForm && (
        <RecurrenceRuleForm
          childrenList={children}
          categories={categories}
          academicYears={academicYears}
          onRefreshCategories={handleCreateCategory}
          onRefreshAcademicYears={handleCreateAcademicYear}
          onSave={handleSaveRule}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="fin-filter-row">
        <label>توليد المصروفات المستحقة حتى تاريخ</label>
        <input type="date" value={horizonDate} onChange={(e) => setHorizonDate(e.target.value)} />
        <button className="btn btn-primary" onClick={handleGenerate}>توليد الآن</button>
      </div>

      {rules.length === 0 && !showForm && (
        <EmptyState
          title="لسه مفيش قواعد تكرار"
          hint="أضف قاعدة لمصروف بيتكرر (زي القسط الشهري أو اشتراك) عشان يتولّد تلقائيًا"
          actionLabel={canAdd ? "+ قاعدة تكرار جديدة" : null}
          onAction={() => setShowForm(true)}
        />
      )}

      {rules.map((rule) => (
        <div className="list-row" key={rule.id}>
          <div>
            <div className="list-row-name">
              {rule.description || nameOf(categories, rule.category_id)} — {nameOf(children, rule.child_id)}
            </div>
            <div className="list-row-meta">
              {nameOf(categories, rule.category_id)} · {describeRule(rule)} · القيمة {rule.amount}
              {" · "}من {rule.start_date}{rule.end_date ? ` إلى ${rule.end_date}` : ""}
              {rule.occurrences_count ? ` · حد أقصى ${rule.occurrences_count} مرة` : ""}
            </div>
          </div>
          <div className="list-row-actions">
            <span className={`tag ${rule.status === "Active" ? "tag-paid" : "tag-inactive"}`}>
              {rule.status === "Active" ? "نشطة" : "متوقفة"}
            </span>
            <button className="btn btn-ghost" onClick={() => handleToggleStatus(rule)}>
              {rule.status === "Active" ? "إيقاف" : "تفعيل"}
            </button>
            <button className="btn btn-danger" onClick={() => handleDelete(rule)}>حذف</button>
          </div>
        </div>
      ))}
    </div>
  );
}
