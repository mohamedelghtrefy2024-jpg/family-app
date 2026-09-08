import { useEffect, useState } from "react";
import { loadCalendarContext } from "../../data/loadCalendarContext";
import { buildAttentionCenter } from "../../domain/dashboard/attentionCenterService";
import EmptyState from "../components/EmptyState";

const MISSING_LABELS = {
  no_location: "بدون مكان",
  no_price: "بدون سعر فعّال",
};

export default function AttentionCenterPage() {
  const [ctx, setCtx] = useState(null);
  const [center, setCenter] = useState(null);

  useEffect(() => {
    (async () => {
      const context = await loadCalendarContext();
      setCtx(context);
      setCenter(buildAttentionCenter(context, new Date()));
    })();
  }, []);

  if (!ctx || !center) return null;

  function nameOf(list, id) {
    return list.find((x) => x.id === id)?.name || "—";
  }

  function subjectNameOf(lessonId) {
    const lesson = ctx.lessons.find((l) => l.id === lessonId);
    if (!lesson) return "—";
    return ctx.subjects.find((s) => s.id === lesson.subject_id)?.name || "درس";
  }

  const totalProblems =
    center.conflicts.length +
    center.insufficientTransit.length +
    center.overdueExpenses.length +
    center.exceededBudgets.length +
    center.lessonsMissingData.length +
    center.schoolsMissingSchedule.length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚠️ مركز الانتباه</h1>
          <p className="page-subtitle">كل المشاكل والبيانات الناقصة في مكان واحد</p>
        </div>
      </div>

      {totalProblems === 0 ? (
        <EmptyState title="كل شيء تمام ✅" hint="مفيش تعارضات ولا مصروفات متأخرة ولا بيانات ناقصة حاليًا" />
      ) : (
        <>
          {center.conflicts.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: "16px 0 8px" }}>تعارضات المواعيد</h2>
              {center.conflicts.map((c, i) => (
                <div className="problem-item" key={`c-${i}`}>
                  تعارض بتاريخ {c.date} بين «{c.a.label}» و«{c.b.label}» — {nameOf(ctx.children, c.child_id)}
                </div>
              ))}
            </>
          )}

          {center.insufficientTransit.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: "16px 0 8px" }}>وقت انتقال غير كافٍ</h2>
              {center.insufficientTransit.map((t) => (
                <div className="problem-item" key={t.id}>
                  يوم {t.date} — {nameOf(ctx.children, t.child_id)} (متاح {t.availableMinutes} د، مطلوب {t.requiredMinutes} د)
                </div>
              ))}
            </>
          )}

          {center.overdueExpenses.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: "16px 0 8px" }}>مصروفات متأخرة</h2>
              {center.overdueExpenses.map((e) => (
                <div className="problem-item" key={e.id}>
                  {e.description || "بدون وصف"} — {nameOf(ctx.children, e.child_id)} (استحقاقه {e.due_date})
                </div>
              ))}
            </>
          )}

          {center.exceededBudgets.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: "16px 0 8px" }}>تجاوز الميزانية</h2>
              {center.exceededBudgets.map(({ budget, comparison }) => (
                <div className="problem-item" key={budget.id}>
                  {budget.scope === "Family" ? "ميزانية الأسرة" : budget.scope} — تجاوز بمقدار {comparison.exceededBy}
                </div>
              ))}
            </>
          )}

          {center.lessonsMissingData.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: "16px 0 8px" }}>دروس ببيانات ناقصة</h2>
              {center.lessonsMissingData.map((l) => (
                <div className="problem-item" key={l.lesson_id}>
                  {subjectNameOf(l.lesson_id)} — {nameOf(ctx.children, l.child_id)}: {l.missing.map((m) => MISSING_LABELS[m]).join("، ")}
                </div>
              ))}
            </>
          )}

          {center.schoolsMissingSchedule.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: "16px 0 8px" }}>مدارس بدون موعد</h2>
              {center.schoolsMissingSchedule.map((s, i) => (
                <div className="problem-item" key={i}>
                  {s.name} — {nameOf(ctx.children, s.child_id)}: لا يوجد أيام دراسة محددة
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
