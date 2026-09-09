import { useEffect, useState } from "react";
import { academicYearRepo } from "../../data/repositories/academicYearRepo";
import AcademicYearForm from "../components/AcademicYearForm";
import EmptyState from "../components/EmptyState";

export default function AcademicYearsPage() {
  const [years, setYears] = useState(null); // null = يحمّل
  const [relatedMap, setRelatedMap] = useState({}); // id -> boolean (فيها بيانات مرتبطة)
  const [editing, setEditing] = useState(null); // null | "new" | year object
  const [error, setError] = useState(null);

  async function load() {
    const all = await academicYearRepo.getAll();
    const sorted = all.sort((a, b) => b.start_date.localeCompare(a.start_date));
    const related = {};
    for (const y of sorted) {
      related[y.id] = await academicYearRepo.hasRelatedRecords(y.id);
    }
    setRelatedMap(related);
    setYears(sorted);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(values) {
    setError(null);
    try {
      if (editing && editing.id) {
        await academicYearRepo.update(editing.id, values);
      } else {
        // سنة جديدة تبدأ Archived دائمًا — التفعيل خطوة صريحة منفصلة (لا نغيّر السنة النشطة الحالية ضمنيًا)
        await academicYearRepo.add({ ...values, status: "Archived" });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleActivate(year) {
    setError(null);
    try {
      await academicYearRepo.activate(year.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleArchive(year) {
    setError(null);
    try {
      await academicYearRepo.archive(year.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(year) {
    setError(null);
    try {
      await academicYearRepo.safeDelete(year.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (years === null) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">السنوات الدراسية</h1>
          <p className="page-subtitle">سنة واحدة نشطة فقط في نفس الوقت — والسنوات القديمة تُؤرشف ولا تُحذف أبدًا لو فيها بيانات</p>
        </div>
        {editing === null && (
          <button className="btn btn-primary" onClick={() => setEditing("new")}>+ إضافة سنة دراسية</button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {editing !== null && (
        <AcademicYearForm
          initial={editing === "new" ? null : editing}
          datesLocked={editing !== "new" && !!relatedMap[editing.id]}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {years.length === 0 && editing === null && (
        <EmptyState
          title="لسه مفيش سنوات دراسية مُضافة"
          hint="أضف أول سنة دراسية (مثال: 2026/2027) عشان تقدر تسجّل بيها المدارس والمصروفات"
          actionLabel="+ إضافة سنة دراسية"
          onAction={() => setEditing("new")}
        />
      )}

      {years.map((year) => (
        <div className="list-row" key={year.id}>
          <div>
            <div className="list-row-name">
              {year.name}{" "}
              {year.status === "Active" ? (
                <span className="tag tag-paid">نشطة</span>
              ) : (
                <span className="tag tag-inactive">مؤرشفة</span>
              )}
            </div>
            <div className="list-row-meta">
              {year.start_date} — {year.end_date}
              {relatedMap[year.id] && <> · بيانات مرتبطة (تسجيل مدرسي/مصروفات)</>}
            </div>
          </div>
          <div className="list-row-actions">
            {year.status !== "Active" && (
              <button className="btn btn-ghost" onClick={() => handleActivate(year)}>تفعيل</button>
            )}
            {year.status === "Active" && (
              <button className="btn btn-ghost" onClick={() => handleArchive(year)}>أرشفة</button>
            )}
            <button className="btn btn-ghost" onClick={() => setEditing(year)}>تعديل</button>
            {!relatedMap[year.id] && (
              <button className="btn btn-danger" onClick={() => handleDelete(year)}>حذف</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
