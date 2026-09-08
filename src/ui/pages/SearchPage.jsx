import { useEffect, useMemo, useState } from "react";
import { loadCalendarContext } from "../../data/loadCalendarContext";
import { search } from "../../domain/search/searchService";

export default function SearchPage() {
  const [ctx, setCtx] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadCalendarContext().then(setCtx);
  }, []);

  const results = useMemo(() => (ctx ? search(ctx, query) : null), [ctx, query]);

  if (!ctx) return null;

  const hasAnyResult =
    results &&
    (results.children.length ||
      results.subjects.length ||
      results.teachers.length ||
      results.schools.length ||
      results.categories.length);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">البحث الذكي</h1>
          <p className="page-subtitle">اكتب اسم ابن، مادة، مدرس، مدرسة، أو تصنيف مصروف — ويطلعلك كل ما يخصه</p>
        </div>
      </div>

      <div className="fin-filter-row">
        <input
          style={{ flex: 1, padding: "10px 14px", fontSize: 15 }}
          placeholder="ابحث هنا..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {!query && <div className="dashboard-empty">اكتب أي جزء من اسم عشان تبدأ النتائج تظهر</div>}

      {query && !hasAnyResult && <div className="dashboard-empty">مفيش نتائج مطابقة لـ «{query}»</div>}

      {results?.children.map(({ child, lessons, enrollments, expenses, totalOutstanding }) => (
        <div className="dashboard-card" key={`child-${child.id}`} style={{ marginBottom: 16 }}>
          <div className="dashboard-card-title">👤 {child.name}</div>

          {enrollments.length > 0 && (
            <>
              <div className="list-row-meta" style={{ marginBottom: 6 }}>المدارس</div>
              {enrollments.map(({ enrollment, schoolName }) => (
                <div className="list-row" key={enrollment.id}>
                  <div className="list-row-name">{schoolName}</div>
                </div>
              ))}
            </>
          )}

          {lessons.length > 0 && (
            <>
              <div className="list-row-meta" style={{ margin: "10px 0 6px" }}>الدروس</div>
              {lessons.map(({ lesson, subjectName, teacherName, schedule }) => (
                <div className="list-row" key={lesson.id}>
                  <div>
                    <div className="list-row-name">{subjectName} — {teacherName}</div>
                    <div className="list-row-meta">{schedule}</div>
                  </div>
                </div>
              ))}
            </>
          )}

          {expenses.length > 0 && (
            <>
              <div className="list-row-meta" style={{ margin: "10px 0 6px" }}>
                المصروفات (متبقٍ إجمالي: {totalOutstanding})
              </div>
              {expenses.map(({ expense, categoryName: catName, status, outstanding }) => (
                <div className="list-row" key={expense.id}>
                  <div>
                    <div className="list-row-name">{expense.description || catName}</div>
                    <div className="list-row-meta">{catName} · {status} · متبقٍ {outstanding}</div>
                  </div>
                  <div className="stat-big">{expense.amount}</div>
                </div>
              ))}
            </>
          )}
        </div>
      ))}

      {results?.subjects.map(({ subject, lessons, teachers, relatedExpenses }) => (
        <div className="dashboard-card" key={`subject-${subject.id}`} style={{ marginBottom: 16 }}>
          <div className="dashboard-card-title">📚 {subject.name}</div>

          <div className="list-row-meta" style={{ marginBottom: 6 }}>
            المدرسون: {teachers.map((t) => t.name).join("، ") || "—"}
          </div>

          {lessons.map(({ lesson, childName, teacherName, schedule }) => (
            <div className="list-row" key={lesson.id}>
              <div>
                <div className="list-row-name">{childName} — {teacherName}</div>
                <div className="list-row-meta">{schedule}</div>
              </div>
            </div>
          ))}

          {relatedExpenses.length > 0 && (
            <>
              <div className="list-row-meta" style={{ margin: "10px 0 6px" }}>مصروفات دروس مرتبطة</div>
              {relatedExpenses.map(({ expense, childName, status }) => (
                <div className="list-row" key={expense.id}>
                  <div>
                    <div className="list-row-name">{expense.description || "—"} — {childName}</div>
                    <div className="list-row-meta">{status}</div>
                  </div>
                  <div className="stat-big">{expense.amount}</div>
                </div>
              ))}
            </>
          )}
        </div>
      ))}

      {results?.teachers.map(({ teacher, lessons }) => (
        <div className="dashboard-card" key={`teacher-${teacher.id}`} style={{ marginBottom: 16 }}>
          <div className="dashboard-card-title">🧑‍🏫 {teacher.name}</div>
          {lessons.map(({ lesson, childName, subjectName, schedule }) => (
            <div className="list-row" key={lesson.id}>
              <div>
                <div className="list-row-name">{subjectName} — {childName}</div>
                <div className="list-row-meta">{schedule}</div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {results?.schools.map(({ school, enrollments, scheduleDays, relatedExpenses }) => (
        <div className="dashboard-card" key={`school-${school.id}`} style={{ marginBottom: 16 }}>
          <div className="dashboard-card-title">🏫 {school.name}</div>
          <div className="list-row-meta" style={{ marginBottom: 6 }}>
            الأبناء: {enrollments.map((e) => e.childName).join("، ") || "—"} · الأيام: {scheduleDays.join("، ") || "—"}
          </div>
          {relatedExpenses.map(({ expense, childName, status }) => (
            <div className="list-row" key={expense.id}>
              <div>
                <div className="list-row-name">{expense.description || "—"} — {childName}</div>
                <div className="list-row-meta">{status}</div>
              </div>
              <div className="stat-big">{expense.amount}</div>
            </div>
          ))}
        </div>
      ))}

      {results?.categories.map(({ category, expenses }) => (
        <div className="dashboard-card" key={`cat-${category.id}`} style={{ marginBottom: 16 }}>
          <div className="dashboard-card-title">🏷️ {category.name}</div>
          {expenses.map(({ expense, childName, status }) => (
            <div className="list-row" key={expense.id}>
              <div>
                <div className="list-row-name">{expense.description || "—"} — {childName}</div>
                <div className="list-row-meta">{status}</div>
              </div>
              <div className="stat-big">{expense.amount}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
