import { useEffect, useState } from "react";
import { childRepo } from "../../data/repositories/childRepo";
import { subjectRepo } from "../../data/repositories/subjectRepo";
import { teacherRepo } from "../../data/repositories/teacherRepo";
import { locationRepo } from "../../data/repositories/locationRepo";
import { lessonRepo } from "../../data/repositories/lessonRepo";
import { priceRepo } from "../../data/repositories/priceRepo";
import { enrollmentRepo } from "../../data/repositories/enrollmentRepo";
import { schoolRepo } from "../../data/repositories/schoolRepo";
import { academicYearRepo } from "../../data/repositories/academicYearRepo";
import { checkPatternConflicts } from "../../domain/scheduling/patternConflictCheck";
import LessonForm from "../components/LessonForm";
import EmptyState from "../components/EmptyState";

const WEEKDAY_LABELS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export default function LessonsPage() {
  const [children, setChildren] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [lessons, setLessons] = useState(null);
  const [patterns, setPatterns] = useState({});
  const [activePrices, setActivePrices] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [pendingConflicts, setPendingConflicts] = useState(null); // تأكيد قبل الحفظ عند وجود تعارض

  async function loadLookups() {
    setChildren(await childRepo.getActive());
    setSubjects(await subjectRepo.getAll());
    setTeachers(await teacherRepo.getAll());
    setLocations(await locationRepo.getAll());
  }

  async function loadLessons() {
    const all = await lessonRepo.getAll();
    const patternMap = {};
    const priceMap = {};
    for (const lesson of all) {
      patternMap[lesson.id] = await lessonRepo.getPattern(lesson.id);
      priceMap[lesson.id] = await priceRepo.getActivePrice(lesson.id);
    }
    setPatterns(patternMap);
    setActivePrices(priceMap);
    setLessons(all);
  }

  useEffect(() => {
    loadLookups();
    loadLessons();
  }, []);

  function nameOf(list, id) {
    return list.find((x) => x.id === id)?.name || "—";
  }

  async function buildConflictContext(childId) {
    const allLessons = await lessonRepo.getAll();
    const otherLessonPatterns = [];
    for (const lesson of allLessons) {
      const pattern = await lessonRepo.getPattern(lesson.id);
      if (!pattern) continue;
      otherLessonPatterns.push({
        lesson_id: lesson.id,
        child_id: lesson.child_id,
        weekdays: pattern.weekdays,
        start_time: pattern.start_time,
        end_time: pattern.end_time,
        label: `درس ${nameOf(subjects, lesson.subject_id)}`,
      });
    }

    // جدول مدرسة الابن في السنة الدراسية النشطة، إن وُجدت
    let schoolDaysForChild = [];
    const activeYear = await academicYearRepo.getActive();
    if (activeYear) {
      const enrollment = await enrollmentRepo.getForChildAndYear(childId, activeYear.id);
      if (enrollment) {
        const school = await schoolRepo.getById(enrollment.school_id);
        const days = await schoolRepo.getScheduleDays(enrollment.school_id);
        schoolDaysForChild = days.map((d) => ({ ...d, label: `مدرسة ${school?.name || ""}` }));
      }
    }

    return { otherLessonPatterns, schoolDaysForChild };
  }

  async function performSave({ lesson, pattern, price }) {
    const created = await lessonRepo.add(lesson);
    await lessonRepo.setPattern(created.id, pattern);
    await priceRepo.addPrice(created.id, price);
    setShowForm(false);
    setPendingConflicts(null);
    await loadLessons();
  }

  async function handleSave(data) {
    setError(null);
    try {
      const { otherLessonPatterns, schoolDaysForChild } = await buildConflictContext(data.lesson.child_id);
      const conflicts = checkPatternConflicts(
        data.lesson.child_id,
        data.pattern.weekdays,
        data.pattern.start_time,
        data.pattern.end_time,
        otherLessonPatterns,
        schoolDaysForChild
      );

      if (conflicts.length > 0) {
        setPendingConflicts({ data, conflicts });
        return;
      }

      await performSave(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(lesson) {
    setError(null);
    try {
      await lessonRepo.update(lesson.id, { status: "Ended" });
      await loadLessons();
    } catch (err) {
      setError(err.message);
    }
  }

  if (lessons === null) return null;

  const canAddLesson = children.length > 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">الدروس والجدول</h1>
          <p className="page-subtitle">كل درس بيومه وميعاده وسعره — والتعارضات بتتحدد أول ما تحفظ</p>
        </div>
        {!showForm && canAddLesson && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ إضافة درس</button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!canAddLesson && (
        <div className="error-banner">لازم تضيف ابن واحد على الأقل من صفحة "الأبناء" الأول</div>
      )}

      {pendingConflicts && (
        <div className="form-panel">
          <div className="error-banner" style={{ marginBottom: 12 }}>
            فيه تعارض في الميعاد:
            <ul style={{ margin: "8px 0 0", paddingInlineStart: 18 }}>
              {pendingConflicts.conflicts.map((c, i) => (
                <li key={i}>يوم {WEEKDAY_LABELS[c.weekday]} — مع {c.with}</li>
              ))}
            </ul>
          </div>
          <div className="form-actions">
            <button className="btn btn-danger" onClick={() => performSave(pendingConflicts.data)}>
              احفظ برغم التعارض
            </button>
            <button className="btn btn-ghost" onClick={() => setPendingConflicts(null)}>
              رجوع للتعديل
            </button>
          </div>
        </div>
      )}

      {showForm && !pendingConflicts && (
        <LessonForm
          children={children}
          subjects={subjects}
          teachers={teachers}
          locations={locations}
          onRefreshLookups={loadLookups}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {lessons.filter((l) => l.status === "Active").length === 0 && !showForm && (
        <EmptyState
          title="لسه مفيش دروس مُضافة"
          hint={canAddLesson ? "أضف أول درس وحدد يومه وسعره" : "أضف ابن الأول عشان تقدر تضيفله درس"}
          actionLabel={canAddLesson ? "+ إضافة درس" : null}
          onAction={() => setShowForm(true)}
        />
      )}

      {lessons
        .filter((l) => l.status === "Active")
        .map((lesson) => {
          const pattern = patterns[lesson.id];
          const price = activePrices[lesson.id];
          return (
            <div className="list-row" key={lesson.id}>
              <div>
                <div className="list-row-name">
                  {nameOf(children, lesson.child_id)} — {nameOf(subjects, lesson.subject_id)}
                </div>
                <div className="list-row-meta">
                  {nameOf(teachers, lesson.teacher_id)} · {nameOf(locations, lesson.location_id)}
                  {pattern && (
                    <> · {pattern.weekdays.map((w) => WEEKDAY_LABELS[w]).join("، ")} ({pattern.start_time}–{pattern.end_time})</>
                  )}
                  {price && <> · {price.amount} {price.currency}</>}
                </div>
              </div>
              <div className="list-row-actions">
                <button className="btn btn-danger" onClick={() => handleDelete(lesson)}>إنهاء الدرس</button>
              </div>
            </div>
          );
        })}
    </div>
  );
}
