import { useEffect, useMemo, useState } from "react";
import { loadCalendarContext } from "../../data/loadCalendarContext";
import { computeStatus, computeOutstanding } from "../../domain/finance/expenseService";
import { compareBudget } from "../../domain/finance/budgetService";
import { buildOccurrences } from "../../domain/scheduling/scheduleBuilder";
import { calculateLessonCost } from "../../domain/pricing/costCalculator";
import {
  monthValueOf,
  monthBounds,
  calculateChildCost,
  buildAnnualReport,
  formatBudgetPeriod,
  KIND_ORDER,
} from "../../domain/finance/financialReportService";
import { exportToExcel } from "../../domain/finance/excelExportService";
import { todayLocalDateString, formatLocalMonth, parseLocalDate } from "../../domain/shared/dateUtils";
import TrendChart from "../components/TrendChart";

const REPORT_TYPES = [
  { id: "child", label: "تقرير ابن" },
  { id: "monthly", label: "تقرير شهري" },
  { id: "annual", label: "تقرير سنوي" },
  { id: "schools", label: "تقرير مدارس" },
  { id: "lessons", label: "تقرير دروس" },
  { id: "payments", label: "تقرير مدفوعات" },
  { id: "budget", label: "تقرير ميزانية" },
];

export default function ReportsPage() {
  const [ctx, setCtx] = useState(null);
  const [reportType, setReportType] = useState("child");
  // BUG-09 FIX: كانت تعتمد على toISOString() (UTC) لتحديد شهر/تاريخ اليوم كـ default.
  const todayMonth = formatLocalMonth(new Date());
  const [monthValue, setMonthValue] = useState(todayMonth);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [selectedYearId, setSelectedYearId] = useState("");
  const [rangeStart, setRangeStart] = useState(`${todayMonth}-01`);
  const [rangeEnd, setRangeEnd] = useState(todayLocalDateString());

  useEffect(() => {
    (async () => {
      const context = await loadCalendarContext();
      setCtx(context);
      if (context.children.length > 0) setSelectedChildId(context.children[0].id);
      setSelectedYearId(context.activeYearId || context.academicYears[0]?.id || "");
    })();
  }, []);

  function nameOf(list, id) {
    return list?.find((x) => x.id === id)?.name || "—";
  }

  const childCost = useMemo(
    () =>
      ctx && selectedChildId
        ? calculateChildCost(ctx, selectedChildId, { monthValue, academicYearId: selectedYearId || null })
        : null,
    [ctx, selectedChildId, monthValue, selectedYearId]
  );

  const childExpenses = useMemo(
    () =>
      ctx && selectedChildId
        ? (ctx.expenses || []).filter((e) => e.child_id === selectedChildId && !e.cancelled)
        : [],
    [ctx, selectedChildId]
  );

  const monthExpenses = useMemo(
    () =>
      ctx
        ? (ctx.expenses || [])
            .filter((e) => !e.cancelled && monthValueOf(e.due_date) === monthValue)
            .sort((a, b) => a.due_date.localeCompare(b.due_date))
        : [],
    [ctx, monthValue]
  );

  const annualReport = useMemo(
    () => (ctx && selectedYearId ? buildAnnualReport(ctx, selectedYearId) : null),
    [ctx, selectedYearId]
  );

  const schoolsReport = useMemo(() => {
    if (!ctx) return [];
    const activeExpenses = (ctx.expenses || []).filter((e) => !e.cancelled);
    return (ctx.schools || []).map((school) => {
      const enrollments = (ctx.enrollments || []).filter((e) => e.school_id === school.id);
      const childIds = new Set(enrollments.map((e) => e.child_id));
      const schoolExpenses = activeExpenses.filter(
        (e) => childIds.has(e.child_id) && nameOf(ctx.expenseCategories, e.category_id).includes("مدرسة")
      );
      const total = schoolExpenses.reduce((s, e) => s + e.amount, 0);
      return {
        school,
        children: [...childIds].map((id) => nameOf(ctx.children, id)),
        total: Math.round(total * 100) / 100,
      };
    });
  }, [ctx]);

  const lessonsReport = useMemo(() => {
    if (!ctx) return [];
    const { start, end } = monthBounds(monthValue);
    return (ctx.lessons || []).map((lesson) => {
      const pattern = ctx.patterns?.[lesson.id];
      let monthCost = 0;
      if (pattern) {
        const occurrences = buildOccurrences(lesson, pattern, ctx.exceptions || [], start, end);
        monthCost = calculateLessonCost(lesson, ctx.prices || [], occurrences, start, end).total;
      }
      return {
        lesson,
        child: nameOf(ctx.children, lesson.child_id),
        subject: nameOf(ctx.subjects, lesson.subject_id),
        teacher: nameOf(ctx.teachers, lesson.teacher_id),
        monthCost: Math.round(monthCost * 100) / 100,
      };
    });
  }, [ctx, monthValue]);

  const paymentsReport = useMemo(() => {
    if (!ctx) return { rows: [], total: 0 };
    // BUG-09 FIX: rangeStart/rangeEnd/payment_date كلها Date-Only، كانت تُقارن عبر
    // new Date(str) (UTC) بدل parseLocalDate — يسبب إزاحة يوم في Africa/Cairo.
    const start = parseLocalDate(rangeStart);
    const end = parseLocalDate(rangeEnd);
    end.setHours(23, 59, 59, 999);
    const expenseById = new Map((ctx.expenses || []).map((e) => [e.id, e]));
    const rows = (ctx.payments || [])
      .filter((p) => !p.cancelled && parseLocalDate(p.payment_date) >= start && parseLocalDate(p.payment_date) <= end)
      .sort((a, b) => a.payment_date.localeCompare(b.payment_date))
      .map((p) => ({
        ...p,
        childName: nameOf(ctx.children, expenseById.get(p.expense_id)?.child_id),
        description: expenseById.get(p.expense_id)?.description || "",
      }));
    return { rows, total: Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100 };
  }, [ctx, rangeStart, rangeEnd]);

  const budgetReport = useMemo(() => {
    if (!ctx) return [];
    const activeExpenses = (ctx.expenses || []).filter((e) => !e.cancelled);
    return (ctx.budgets || []).map((b) => ({
      budget: b,
      comparison: compareBudget(b, activeExpenses),
      scopeLabel:
        b.scope === "Family"
          ? "الأسرة"
          : b.scope === "Child"
          ? nameOf(ctx.children, b.scope_ref_id)
          : nameOf(ctx.expenseCategories, b.scope_ref_id),
    }));
  }, [ctx]);

  if (!ctx) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">التقارير</h1>
          <p className="page-subtitle">تقارير جاهزة للطباعة/المراجعة + تصدير كل البيانات إلى Excel</p>
        </div>
        <button className="btn btn-primary" onClick={() => exportToExcel(ctx, compareBudget)}>
          📊 تصدير إلى Excel
        </button>
      </div>

      <div className="fin-tabs">
        {REPORT_TYPES.map((r) => (
          <button
            key={r.id}
            className={`fin-tab ${reportType === r.id ? "active" : ""}`}
            onClick={() => setReportType(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {reportType === "child" && (
        <div>
          <div className="fin-filter-row">
            <label>الابن</label>
            <select value={selectedChildId} onChange={(e) => setSelectedChildId(e.target.value)}>
              {ctx.children.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <label>الشهر</label>
            <input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} />
          </div>

          {childCost && (
            <div className="dashboard-grid" style={{ marginBottom: 18 }}>
              <div className="dashboard-card">
                <div className="dashboard-card-title">تكلفة الشهر</div>
                <div className="stat-row"><span>الإجمالي</span><span className="stat-big">{childCost.monthly.total}</span></div>
                {KIND_ORDER.map((k) => (
                  <div className="stat-row" key={k}><span>{k}</span><span>{childCost.monthly.byKind[k]}</span></div>
                ))}
              </div>
            </div>
          )}

          <h2 style={{ fontSize: 15, fontWeight: 800, margin: "16px 0 8px" }}>كل مصروفات الابن</h2>
          {childExpenses.map((e) => (
            <div className="list-row" key={e.id}>
              <div>
                <div className="list-row-name">{e.description || nameOf(ctx.expenseCategories, e.category_id)}</div>
                <div className="list-row-meta">{e.due_date} · {computeStatus(e, ctx.payments || [])}</div>
              </div>
              <div className="stat-big">{e.amount}</div>
            </div>
          ))}
        </div>
      )}

      {reportType === "monthly" && (
        <div>
          <div className="fin-filter-row">
            <label>الشهر</label>
            <input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} />
          </div>
          {monthExpenses.length === 0 ? (
            <div className="dashboard-empty">لا توجد مصروفات في هذا الشهر</div>
          ) : (
            monthExpenses.map((e) => (
              <div className="list-row" key={e.id}>
                <div>
                  <div className="list-row-name">{nameOf(ctx.children, e.child_id)} — {e.description || nameOf(ctx.expenseCategories, e.category_id)}</div>
                  <div className="list-row-meta">{nameOf(ctx.expenseCategories, e.category_id)} · استحقاق {e.due_date} · متبقٍ {computeOutstanding(e, ctx.payments || [])}</div>
                </div>
                <div className="stat-big">{e.amount}</div>
              </div>
            ))
          )}
        </div>
      )}

      {reportType === "annual" && (
        <div>
          <div className="fin-filter-row">
            <label>السنة الدراسية</label>
            <select value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)}>
              {ctx.academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
          {annualReport && (
            <>
              <div className="dashboard-grid" style={{ marginBottom: 18 }}>
                <div className="dashboard-card">
                  <div className="dashboard-card-title">إجمالي الأسرة</div>
                  <div className="stat-row"><span>الإجمالي</span><span className="stat-big">{annualReport.familyTotal}</span></div>
                  <div className="stat-row"><span>متوسط شهري</span><span>{annualReport.monthlyAverage}</span></div>
                </div>
              </div>
              {annualReport.perChild.map((c) => (
                <div className="list-row" key={c.child_id}>
                  <div className="list-row-name">{c.name}</div>
                  <div className="stat-big">{c.total}</div>
                </div>
              ))}
              <TrendChart data={annualReport.trend} />
            </>
          )}
        </div>
      )}

      {reportType === "schools" && (
        <div>
          {schoolsReport.map(({ school, children, total }) => (
            <div className="list-row" key={school.id}>
              <div>
                <div className="list-row-name">{school.name}</div>
                <div className="list-row-meta">{children.join("، ") || "بدون أبناء ملتحقين"}</div>
              </div>
              <div className="stat-big">{total}</div>
            </div>
          ))}
        </div>
      )}

      {reportType === "lessons" && (
        <div>
          <div className="fin-filter-row">
            <label>الشهر</label>
            <input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} />
          </div>
          {lessonsReport.map(({ lesson, child, subject, teacher, monthCost }) => (
            <div className="list-row" key={lesson.id}>
              <div>
                <div className="list-row-name">{subject} — {child}</div>
                <div className="list-row-meta">{teacher} · {lesson.status}</div>
              </div>
              <div className="stat-big">{monthCost}</div>
            </div>
          ))}
        </div>
      )}

      {reportType === "payments" && (
        <div>
          <div className="fin-filter-row">
            <label>من</label>
            <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
            <label>إلى</label>
            <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
          </div>
          {paymentsReport.rows.map((p) => (
            <div className="list-row" key={p.id}>
              <div>
                <div className="list-row-name">{p.description || "—"} — {p.childName}</div>
                <div className="list-row-meta">{p.payment_date} · {p.payment_method || ""}</div>
              </div>
              <div className="stat-big">{p.amount}</div>
            </div>
          ))}
          <div className="stat-row" style={{ marginTop: 10 }}>
            <span>الإجمالي</span><span className="stat-big">{paymentsReport.total}</span>
          </div>
        </div>
      )}

      {reportType === "budget" && (
        <div>
          {budgetReport.map(({ budget, comparison, scopeLabel }) => (
            <div className="list-row" key={budget.id}>
              <div>
                <div className="list-row-name">{scopeLabel} — {formatBudgetPeriod(budget, ctx.academicYears)}</div>
                <div className="list-row-meta">مخطط {comparison.planned} · فعلي {comparison.actual} · متبقٍ {comparison.remaining}</div>
              </div>
              <div className="stat-big" style={{ color: comparison.exceeded ? "var(--danger)" : "var(--success)" }}>
                {comparison.exceeded ? `تجاوز ${comparison.exceededBy}` : "ضمن الحد"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
