import { useState } from "react";
import EntityPicker from "./EntityPicker";
import WeekdayMultiPicker from "./WeekdayMultiPicker";
import { subjectRepo } from "../../data/repositories/subjectRepo";
import { teacherRepo } from "../../data/repositories/teacherRepo";
import { locationRepo } from "../../data/repositories/locationRepo";

const LESSON_TYPES = [
  { value: "individual", label: "فردي" },
  { value: "group", label: "مجموعة" },
  { value: "online", label: "أونلاين" },
  { value: "at_student_home", label: "في منزل الابن" },
  { value: "at_teacher_home", label: "في منزل المدرس" },
  { value: "center", label: "سنتر" },
  { value: "other", label: "أخرى" },
];

const PRICING_METHODS = [
  { value: "per_session", label: "بالحصة" },
  { value: "weekly", label: "أسبوعي" },
  { value: "monthly", label: "شهري" },
  { value: "term", label: "بالترم" },
  { value: "annual", label: "سنوي" },
  { value: "fixed", label: "مبلغ ثابت" },
  { value: "variable", label: "متغيّر (يُدخل كمصروف يدوي كل مرة)" },
];

export default function LessonForm({ children, subjects, teachers, locations, onRefreshLookups, onSave, onCancel }) {
  const [childId, setChildId] = useState(children[0]?.id || "");
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [lessonType, setLessonType] = useState("individual");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [weekdays, setWeekdays] = useState([]);
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("18:00");
  const [priceAmount, setPriceAmount] = useState("");
  const [pricingMethod, setPricingMethod] = useState("monthly");
  const [error, setError] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (!childId || !subjectId || !teacherId || !locationId) {
      setError("لازم تختار الابن والمادة والمدرس والمكان");
      return;
    }
    if (weekdays.length === 0) {
      setError("لازم تحدد يوم واحد على الأقل للدرس");
      return;
    }
    if (!priceAmount || Number(priceAmount) <= 0) {
      setError("لازم تدخل سعر الدرس");
      return;
    }
    setError(null);
    onSave({
      lesson: {
        child_id: childId,
        subject_id: subjectId,
        teacher_id: teacherId,
        location_id: locationId,
        lesson_type: lessonType,
        start_date: startDate,
        end_date: endDate || null,
        status: "Active",
      },
      pattern: { weekdays, start_time: startTime, end_time: endTime },
      price: {
        amount: Number(priceAmount),
        pricing_method: pricingMethod,
        effective_from: startDate,
        currency: "EGP",
      },
    });
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-row">
        <label>الابن</label>
        <select value={childId} onChange={(e) => setChildId(e.target.value)}>
          {children.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>المادة</label>
        <EntityPicker
          items={subjects}
          value={subjectId}
          onChange={setSubjectId}
          placeholder="اسم المادة"
          onCreate={async (name) => {
            const created = await subjectRepo.add({ name });
            await onRefreshLookups();
            return created;
          }}
        />
      </div>

      <div className="form-row">
        <label>المدرس</label>
        <EntityPicker
          items={teachers}
          value={teacherId}
          onChange={setTeacherId}
          placeholder="اسم المدرس"
          onCreate={async (name) => {
            const created = await teacherRepo.add({ name, subject_id: subjectId || null });
            await onRefreshLookups();
            return created;
          }}
        />
      </div>

      <div className="form-row">
        <label>المكان</label>
        <EntityPicker
          items={locations}
          value={locationId}
          onChange={setLocationId}
          placeholder="اسم المكان"
          onCreate={async (name) => {
            const created = await locationRepo.add({ name, type: "other" });
            await onRefreshLookups();
            return created;
          }}
        />
      </div>

      <div className="form-row">
        <label>نوع الدرس</label>
        <select value={lessonType} onChange={(e) => setLessonType(e.target.value)}>
          {LESSON_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="form-row" style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label>تاريخ البداية</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label>تاريخ النهاية (اختياري)</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <label>أيام الأسبوع</label>
        <WeekdayMultiPicker selected={weekdays} onChange={setWeekdays} />
      </div>

      <div className="form-row" style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label>من الساعة</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label>إلى الساعة</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>

      <div className="form-row" style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label>السعر</label>
          <input type="number" min="0" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label>طريقة التسعير</label>
          <select value={pricingMethod} onChange={(e) => setPricingMethod(e.target.value)}>
            {PRICING_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">حفظ الدرس</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
      </div>
    </form>
  );
}
