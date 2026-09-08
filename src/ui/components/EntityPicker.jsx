import { useState } from "react";

/**
 * EntityPicker — قائمة اختيار + إمكانية إضافة عنصر جديد فورًا بدون مغادرة النموذج.
 * @param {Array} items - [{id, name}]
 * @param {string} value - selected id
 * @param {Function} onChange - (id) => void
 * @param {Function} onCreate - async (name) => newItem
 */
export default function EntityPicker({ items, value, onChange, onCreate, placeholder }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  async function handleCreate() {
    if (!newName.trim()) return;
    const created = await onCreate(newName.trim());
    onChange(created.id);
    setNewName("");
    setAdding(false);
  }

  if (adding) {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
        <button type="button" className="btn btn-primary" onClick={handleCreate}>إضافة</button>
        <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>إلغاء</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>اختر...</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
      <button type="button" className="btn btn-ghost" onClick={() => setAdding(true)}>+ جديد</button>
    </div>
  );
}
