import { useEffect, useState } from "react";
import { childRepo } from "../../data/repositories/childRepo";
import ChildForm from "../components/ChildForm";
import EmptyState from "../components/EmptyState";

export default function ChildrenPage() {
  const [children, setChildren] = useState(null); // null = يحمّل، [] = فارغ فعليًا
  const [editing, setEditing] = useState(null); // null | "new" | child object
  const [error, setError] = useState(null);

  async function load() {
    const all = await childRepo.getAll();
    setChildren(all.sort((a, b) => a.name.localeCompare(b.name, "ar")));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(values) {
    setError(null);
    try {
      if (editing && editing.id) {
        await childRepo.update(editing.id, values);
      } else {
        await childRepo.add(values);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeactivate(child) {
    await childRepo.deactivate(child.id);
    await load();
  }

  async function handleDelete(child) {
    setError(null);
    try {
      await childRepo.safeDelete(child.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (children === null) return null; // تحميل أولي صامت (لا Skeleton مصطنع لبيانات قليلة محليًا)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">الأبناء</h1>
          <p className="page-subtitle">كل ابن هنا نقطة انطلاق لمدرسته ودروسه ومصروفاته</p>
        </div>
        {editing === null && (
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            + إضافة ابن
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {editing !== null && (
        <ChildForm
          initial={editing === "new" ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {children.length === 0 && editing === null && (
        <EmptyState
          title="لسه مفيش أبناء مُضافين"
          hint="أضف أول ابن عشان تقدر تربط بيه المدرسة والدروس والمصروفات"
          actionLabel="+ إضافة ابن"
          onAction={() => setEditing("new")}
        />
      )}

      {children.map((child) => (
        <div className="list-row" key={child.id}>
          <div>
            <div className="list-row-name">
              {child.name} {!child.is_active && <span className="tag tag-inactive">غير نشط</span>}
            </div>
            <div className="list-row-meta">
              {[child.education_stage, child.grade].filter(Boolean).join(" — ") || "بدون مرحلة دراسية بعد"}
            </div>
          </div>
          <div className="list-row-actions">
            <button className="btn btn-ghost" onClick={() => setEditing(child)}>تعديل</button>
            {child.is_active && (
              <button className="btn btn-ghost" onClick={() => handleDeactivate(child)}>تعطيل</button>
            )}
            <button className="btn btn-danger" onClick={() => handleDelete(child)}>حذف</button>
          </div>
        </div>
      ))}
    </div>
  );
}
