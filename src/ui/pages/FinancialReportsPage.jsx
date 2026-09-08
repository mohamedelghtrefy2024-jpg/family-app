import { useEffect, useMemo, useState } from "react";
import { loadCalendarContext } from "../../data/loadCalendarContext";
import {
  KIND_ORDER,
  monthValueOf,
  shiftMonth,
  calculateExpectedNextMonth,
  buildFinancialCenter,
  calculateChildCost,
  buildAnnualReport,
  compareMonths,
} from "../../domain/finance/financialReportService";
import TrendChart from "../components/TrendChart";
import EmptyState from "../components/EmptyState";

const TABS = [
  { id: "center", label: "المركز المالي" },
  { id: "expected", label: "المتوقع للشهر القادم" },
  { id: "children", label: "تكلفة الأبناء" },
  { id: "annual", label: "التحليل السنوي" },
  { id: "compare", label: "مقارنة الأشهر" },
];

export default function FinancialReportsPage() {
  const [ctx, setCtx] = useState(null);
  const [tab, setTab] = useState("center");

  const todayMonth = monthValueOf(new Date().toISOString());
  const [monthValue, setMonthValue] = useState(todayMonth);
  const [compareCurrent, setCompareCurrent] = useState(todayMonth);
  const [compareBefore, setCompareBefore] = useState(shiftMonth(todayMonth, -1));
  const [selectedChildId, setSelectedChildId] = useState("");
  const [childMonth, setChildMonth] = useState(todayMonth);
  const [selectedYearId, setSelectedYearId] = useState("");

  async function load() {
    const context = await loadCalendarContext();
    setCtx(context);
    if (!selectedChildId && context.children.length > 0) {
      setSelectedChildId(context.children[0].id);
    }
    if (!selectedYearId) {
      setSelectedYearId(context.activeYearId || context.academicYears[0]?.id || "");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const financialCenter = useMemo(
    () => (ctx ? buildFinancialCenter(ctx, monthValue) : null),
    [ctx, monthValue]
  );
  const expected = useMemo(
    () => (ctx ? calculateExpectedNextMonth(ctx, new Date()) : null),
    [ctx]
  );
  const childCost = useMemo(
    () =>
      ctx && selectedChildId
        ? calculateChildCost(ctx, selectedChildId, {
            monthValue: childMonth,
            academicYearId: selectedYearId || null,
          })
        : null,
    [ctx, selectedChildId, childMonth, selectedYearId]
  );
  const annualReport = useMemo(
    () => (ctx && selectedYearId ? buildAnnualReport(ctx, selectedYearId) : null),
    [ctx, selectedYearId]
  );
  const comparison = useMemo(
    () => (ctx ? compareMonths(ctx, compareCurrent, compareBefore) : null),
    [ctx, compareCurrent, compareBefore]
  );

  if (!ctx) return null;

  if (ctx.children.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">التقارير المالية</h1>
          </div>
        </div>
        <EmptyState
          title="لسه مفيش بيانات كافية"
          hint="أضف أبناء ومصروفات الأول عشان التقارير المالية تظهر"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">التقارير المالية</h1>
          <p className="page-subtitle">مركز مالي موحد، توقع الشهر القادم، تكلفة كل ابن، وتحليل سنوي</p>
        </div>
      </div>

      <div className="fin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`fin-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "center" && (
        <div>
          <div className="fin-filter-row">
            <label>الشهر</label>
            <input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} />
          </div>

          <div className="dashboard-grid" style={{ marginBottom: 18 }}>
            <div className="dashboard-card">
              <div className="dashboard-card-title">💰 إجمالي الشهر</div>
              <div className="stat-row"><span>الإجمالي</span><span className="stat-big">{financialCenter.totalAll}</span></div>
              <div className="stat-row"><span>المدفوع</span><span className="stat-big" style={{ color: "var(--success)" }}>{financialCenter.paidAll}</span></div>
              <div className="stat-row"><span>المتبقي</span><span className="stat-big">{financialCenter.remainingAll}</span></div>
              <div className="stat-row"><span>المتأخر</span><span className="stat-big" style={{ color: "var(--danger)" }}>{financialCenter.overdueAll}</span></div>
            </div>
          </div>

          {financialCenter.byCategory.length === 0 ? (
            <div className="dashboard-empty">لا توجد مصروفات مستحقة في هذا الشهر</div>
          ) : (
            financialCenter.byCategory.map((row) => (
              <div className="list-row" key={row.category_id}>
                <div>
                  <div className="list-row-name">{row.name}</div>
                  <div className="list-row-meta">
                    مدفوع {row.paid} · متبقٍ {row.remaining}
                    {row.overdue > 0 && <> · متأخر {row.overdue}</>}
                    {" · "}عدد البنود {row.dueCount}
                  </div>
                </div>
                <div className="stat-big">{row.total}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "expected" && (
        <div>
          <p className="page-subtitle" style={{ marginBottom: 14 }}>
            تقدير تلقائي لشهر {expected.monthValue} بناءً على الدروس النشطة والمصروفات الثابتة والبنود المتكررة —
            تقدير وليس رقمًا مؤكدًا لحين ربط قواعد التكرار الفعلية.
          </p>
          <div className="dashboard-grid" style={{ marginBottom: 18 }}>
            <div className="dashboard-card">
              <div className="dashboard-card-title">📈 إجمالي متوقع</div>
              <div className="stat-row"><span>الإجمالي</span><span className="stat-big">{expected.total}</span></div>
              {KIND_ORDER.map((kind) => (
                <div className="stat-row" key={kind}>
                  <span>{kind}</span>
                  <span>{expected.byKind[kind]}</span>
                </div>
              ))}
            </div>
          </div>

          {expected.items.length === 0 ? (
            <div className="dashboard-empty">لا توجد بيانات كافية بعد لتوليد توقع</div>
          ) : (
            expected.items.map((item, i) => (
              <div className="list-row" key={i}>
                <div>
                  <div className="list-row-name">{item.label}</div>
                  <div className="list-row-meta">
                    {item.source === "lesson" && "من جدول الدرس النشط"}
                    {item.source === "fixed" && "مصروف ثابت متكرر"}
                    {item.source === "recurring" && "نمط تكرار مُلاحَظ (شهرين+ من آخر 3 شهور)"}
                  </div>
                </div>
                <div className="stat-big">{item.amount}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "children" && (
        <div>
          <div className="fin-filter-row">
            <label>الابن</label>
            <select value={selectedChildId} onChange={(e) => setSelectedChildId(e.target.value)}>
              {ctx.children.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <label>الشهر</label>
            <input type="month" value={childMonth} onChange={(e) => setChildMonth(e.target.value)} />
            <label>السنة الدراسية</label>
            <select value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)}>
              <option value="">بدون</option>
              {ctx.academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          {childCost && (
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <div className="dashboard-card-title">🗓️ التكلفة الشهرية</div>
                <div className="stat-row"><span>الإجمالي</span><span className="stat-big">{childCost.monthly.total}</span></div>
                {KIND_ORDER.map((kind) => (
                  <div className="stat-row" key={kind}><span>{kind}</span><span>{childCost.monthly.byKind[kind]}</span></div>
                ))}
              </div>
              <div className="dashboard-card">
                <div className="dashboard-card-title">📆 التكلفة السنوية</div>
                {childCost.annual ? (
                  <>
                    <div className="stat-row"><span>الإجمالي</span><span className="stat-big">{childCost.annual.total}</span></div>
                    {KIND_ORDER.map((kind) => (
                      <div className="stat-row" key={kind}><span>{kind}</span><span>{childCost.annual.byKind[kind]}</span></div>
                    ))}
                  </>
                ) : (
                  <div className="dashboard-empty">اختر سنة دراسية لعرض التكلفة السنوية</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "annual" && (
        <div>
          <div className="fin-filter-row">
            <label>السنة الدراسية</label>
            <select value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)}>
              {ctx.academicYears.length === 0 && <option value="">لا توجد سنوات</option>}
              {ctx.academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          {!annualReport ? (
            <div className="dashboard-empty">أضف سنة دراسية من صفحة "السنوات الدراسية" أولًا</div>
          ) : (
            <>
              <div className="dashboard-grid" style={{ marginBottom: 18 }}>
                <div className="dashboard-card">
                  <div className="dashboard-card-title">👨‍👩‍👧‍👦 إجمالي الأسرة</div>
                  <div className="stat-row"><span>الإجمالي</span><span className="stat-big">{annualReport.familyTotal}</span></div>
                  <div className="stat-row"><span>متوسط شهري</span><span className="stat-big">{annualReport.monthlyAverage}</span></div>
                </div>
                <div className="dashboard-card">
                  <div className="dashboard-card-title">🏷️ حسب التصنيف</div>
                  {KIND_ORDER.map((kind) => (
                    <div className="stat-row" key={kind}><span>{kind}</span><span>{annualReport.byCategoryKind[kind]}</span></div>
                  ))}
                </div>
              </div>

              <h2 style={{ fontSize: 16, fontWeight: 800, margin: "18px 0 10px" }}>تكلفة كل ابن</h2>
              {annualReport.perChild.map((c) => (
                <div className="list-row" key={c.child_id}>
                  <div className="list-row-name">{c.name}</div>
                  <div className="stat-big">{c.total}</div>
                </div>
              ))}

              <h2 style={{ fontSize: 16, fontWeight: 800, margin: "22px 0 10px" }}>تطور المصروفات شهريًا</h2>
              <TrendChart data={annualReport.trend} />
            </>
          )}
        </div>
      )}

      {tab === "compare" && (
        <div>
          <div className="fin-filter-row">
            <label>الشهر الحالي</label>
            <input type="month" value={compareCurrent} onChange={(e) => setCompareCurrent(e.target.value)} />
            <label>مقارنة بشهر</label>
            <input type="month" value={compareBefore} onChange={(e) => setCompareBefore(e.target.value)} />
          </div>

          {comparison && (
            <>
              <div className="dashboard-grid" style={{ marginBottom: 18 }}>
                <div className="dashboard-card">
                  <div className="dashboard-card-title">📊 الفرق الإجمالي</div>
                  <div className="stat-row"><span>{comparison.currentMonthValue}</span><span className="stat-big">{comparison.current.totalAll}</span></div>
                  <div className="stat-row"><span>{comparison.previousMonthValue}</span><span className="stat-big">{comparison.previous.totalAll}</span></div>
                  <div className="stat-row">
                    <span>الفرق</span>
                    <span className="stat-big" style={{ color: comparison.diffValue > 0 ? "var(--danger)" : "var(--success)" }}>
                      {comparison.diffValue > 0 ? "+" : ""}{comparison.diffValue}
                      {comparison.diffPercent !== null && <> ({comparison.diffPercent > 0 ? "+" : ""}{comparison.diffPercent}%)</>}
                    </span>
                  </div>
                </div>
              </div>

              <h2 style={{ fontSize: 16, fontWeight: 800, margin: "18px 0 10px" }}>الفرق حسب التصنيف</h2>
              {comparison.byCategory.filter((c) => c.current > 0 || c.previous > 0).map((c) => (
                <div className="list-row" key={c.category_id}>
                  <div>
                    <div className="list-row-name">{c.name}</div>
                    <div className="list-row-meta">{comparison.previousMonthValue}: {c.previous} · {comparison.currentMonthValue}: {c.current}</div>
                  </div>
                  <div className="stat-big" style={{ color: c.diff > 0 ? "var(--danger)" : c.diff < 0 ? "var(--success)" : "var(--ink)" }}>
                    {c.diff > 0 ? "+" : ""}{c.diff}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
