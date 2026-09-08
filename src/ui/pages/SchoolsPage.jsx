import { useEffect, useState } from "react";
import { schoolRepo } from "../../data/repositories/schoolRepo";
import SchoolForm from "../components/SchoolForm";
import EmptyState from "../components/EmptyState";

const WEEKDAY_LABELS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export default function SchoolsPage() {
  const [schools, setSchools] = useState(null);
  const [scheduleBysSchool, setScheduleBySchool] = useState({});
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    const all = await schoolRepo.getAll();
    const schedules = {};
    for (const s of all) {
      schedules[s.id] = await schoolRepo.getScheduleDays(s.id);
    }
    setScheduleBySchool(schedules);
    setSchools(all.sort((a, b) => a.name.localeCompare(b.name, "ar")));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(values, days) {
    setError(null);
    try {
      let schoolId;
      if (editing && editing.id) {
        schoolId = editing.id;
        await schoolRepo.update(schoolId, values);
      } else {
        const created = await schoolRepo.add(values);
        schoolId = created.id;
      }
      await schoolRepo.setScheduleDays(schoolId, days);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(school) {
    setError(null);
    try {
      await schoolRepo.safeDelete(school.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (schools === null) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">المدارس</h1>
          <p className="page-subtitle">كل مدرسة وجدولها الأسبوعي الخاص بها</p>
        </div>
        {editing === null && (
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            + إضافة مدرسة
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {editing !== null && (
        <SchoolForm
          initial={editing === "new" ? null : editing}
          initialDays={editing === "new" ? [] : scheduleBysSchool[editing.id] || []}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {schools.length === 0 && editing === null && (
        <EmptyState
          title="لسه مفيش مدارس مُضافة"
          hint="أضف أول مدرسة عشان تقدر تسجّل بيها الأبناء وتحدد جدولها"
          actionLabel="+ إضافة مدرسة"
          onAction={() => setEditing("new")}
        />
      )}

      {schools.map((school) => {
        const days = scheduleBysSchool[school.id] || [];
        return (
          <div className="list-row" key={school.id}>
            <div>
              <div className="list-row-name">{school.name}</div>
              <div className="list-row-meta">
                {school.region || school.address || "بدون عنوان بعد"}
                {days.length > 0 && (
                  <> — {days.map((d) => WEEKDAY_LABELS[d.weekday]).join("، ")}</>
                )}
              </div>
            </div>
            <div className="list-row-actions">
              <button className="btn btn-ghost" onClick={() => setEditing(school)}>تعديل</button>
              <button className="btn btn-danger" onClick={() => handleDelete(school)}>حذف</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
