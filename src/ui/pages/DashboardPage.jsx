import { useEffect, useState } from "react";
import { loadCalendarContext } from "../../data/loadCalendarContext";
import { buildDashboard } from "../../domain/dashboard/dashboardService";
import EmptyState from "../components/EmptyState";

export default function DashboardPage() {
  const [ctx, setCtx] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  async function load() {
    const context = await loadCalendarContext();
    setCtx(context);
    setDashboard(buildDashboard(context, new Date()));
  }

  useEffect(() => {
    load();
  }, []);

  function nameOf(list, id) {
    return list.find((x) => x.id === id)?.name || "—";
  }

  if (!dashboard || !ctx) return null;

  const { today, financial, problems, month } = dashboard;
  const hasAnyProblem =
    problems.conflicts.length > 0 ||
    problems.insufficientTransit.length > 0 ||
    problems.overdueExpenses.length > 0 ||
    problems.exceededBudgets.length > 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">الرئيسية</h1>
          <p className="page-subtitle">أهم المعلومات فقط — اليوم، الموقف المالي، المشاكل، والشهر</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* اليوم */}
        <div className="dashboard-card">
          <div className="dashboard-card-title">📅 اليوم</div>
          {today.length === 0 && <div className="dashboard-empty">مفيش مواعيد النهارده</div>}
          {today.map((ev) => (
            <div className="agenda-item" key={ev.id}>
              <span className="agenda-time">{ev.start_time || "—"}</span>
              <span className="agenda-label">
                {nameOf(ctx.children, ev.child_id)} — {ev.label}
              </span>
              {ev.type === "transit" && !ev.sufficient && <span className="tag tag-overdue">غير كافٍ</span>}
            </div>
          ))}
        </div>

        {/* ماليًا */}
        <div className="dashboard-card">
          <div className="dashboard-card-title">💰 ماليًا</div>
          <div className="stat-row">
            <span>مستحقات الشهر</span>
            <span className="stat-big">{financial.dueThisMonth}</span>
          </div>
          <div className="stat-row">
            <span>إجمالي غير مسدد</span>
            <span className="stat-big" style={{ color: "var(--danger)" }}>{financial.outstandingTotal}</span>
          </div>
          {financial.upcomingDue.length > 0 && (
            <>
              <div className="dashboard-subtitle">أقرب استحقاقات</div>
              {financial.upcomingDue.map((u) => (
                <div className="agenda-item" key={u.expense_id}>
                  <span className="agenda-time">{u.due_date}</span>
                  <span className="agenda-label">
                    {nameOf(ctx.children, u.child_id)} — {u.description || "مصروف"} ({u.outstanding})
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* المشاكل */}
        <div className="dashboard-card">
          <div className="dashboard-card-title">⚠️ المشاكل</div>
          {!hasAnyProblem && <div className="dashboard-empty">مفيش مشاكل ظاهرة دلوقتي 👍</div>}

          {problems.conflicts.map((c, i) => (
            <div className="problem-item" key={`c-${i}`}>
              تعارض بتاريخ {c.date} بين «{c.a.label}» و«{c.b.label}» — {nameOf(ctx.children, c.child_id)}
            </div>
          ))}
          {problems.insufficientTransit.map((t) => (
            <div className="problem-item" key={t.id}>
              وقت انتقال غير كافٍ يوم {t.date} — {nameOf(ctx.children, t.child_id)} (متاح {t.availableMinutes} د، مطلوب {t.requiredMinutes} د)
            </div>
          ))}
          {problems.overdueExpenses.map((e) => (
            <div className="problem-item" key={e.id}>
              مصروف متأخر: {e.description || "بدون وصف"} — {nameOf(ctx.children, e.child_id)} (استحقاقه {e.due_date})
            </div>
          ))}
          {problems.exceededBudgets.map(({ budget, comparison }) => (
            <div className="problem-item" key={budget.id}>
              تجاوز الميزانية ({budget.scope === "Family" ? "الأسرة" : budget.scope}) بمقدار {comparison.exceededBy}
            </div>
          ))}
        </div>

        {/* الشهر */}
        <div className="dashboard-card">
          <div className="dashboard-card-title">📊 الشهر</div>
          {!month.budget && (
            <div className="dashboard-empty">لا توجد ميزانية شهرية للأسرة محددة لهذا الشهر</div>
          )}
          {month.budget && (
            <>
              <div className="stat-row">
                <span>المخطط</span>
                <span className="stat-big">{month.comparison.planned}</span>
              </div>
              <div className="stat-row">
                <span>الفعلي</span>
                <span className="stat-big" style={{ color: month.comparison.exceeded ? "var(--danger)" : "var(--success)" }}>
                  {month.comparison.actual}
                </span>
              </div>
              <div className="stat-row">
                <span>{month.comparison.exceeded ? "تجاوز بمقدار" : "المتبقي"}</span>
                <span className="stat-big">
                  {month.comparison.exceeded ? month.comparison.exceededBy : month.comparison.remaining}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {ctx.children.length === 0 && (
        <EmptyState
          title="ابدأ بإضافة ابن"
          hint="الرئيسية بتتفعّل تلقائيًا أول ما تضيف أبناء ومدارس ودروس ومصروفات"
        />
      )}
    </div>
  );
}
