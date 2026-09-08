// src/data/loadChildScheduleContext.js
//
// ⚠️ لماذا هذا الملف موجود منفصل عن loadCalendarContext.js (مش تكرار عشوائي):
//
// loadCalendarContext.js بيعمل queries عريضة على كل الـ collection كله (زي
// db.lessons.where("status").equals("Active")) — ده شغّال تمام للأب/الأم لأن
// الـ Security Rule بتاعتهم (isParentOfFamily) مبنية على claim ثابت مش على
// محتوى كل مستند. لكن Firestore عنده قاعدة مهمة: **أي query (list) لازم يكون
// "قابل للتحقق" من الـ Rules قبل التنفيذ** — لو الـ Rule بتفحص resource.data
// (زي "child_id == linkedChildId" للابن)، الـ query لازم يحتوي where() على
// نفس الحقل ده بالظبط، غير كده Firestore يرفض الـ query كله برسالة
// permission-denied (مش بيفلتر النتائج، بيرفض الطلب كله).
//
// عشان كده لازم Loader مستقل للابن، بيستخدم .where("child_id", "==", ...)
// صراحة على كل collection مقيّدة بابن، بدل الاستعلامات العريضة الموجودة في
// loadCalendarContext.js (اللي تفضل صحيحة ومطلوبة للأب/الأم فقط بدون تعديل).
//
// النتيجة: نفس شكل ctx بالضبط اللي buildCalendarEvents/computeNotifications
// (Domain layer) متوقّعينه — الفرق كله هنا في طريقة الجلب، مش في المنطق.

import { db } from "./firestoreDb";
import { getCurrentFamilyId } from "../lib/firebase/familyContext";
import { doc, getDoc } from "firebase/firestore";
import { db as firestore } from "../lib/firebase/config";

export async function loadChildScheduleContext(linkedChildId) {
  const familyId = getCurrentFamilyId();

  // سجل الابن نفسه: get() مباشر بمعرفة المستند (مش list) — مسموح دائمًا لصاحبه.
  const childDoc = await getDoc(doc(firestore, `families/${familyId}/children/${linkedChildId}`));
  const child = childDoc.exists() ? { id: childDoc.id, ...childDoc.data() } : null;

  // بيانات مرجعية — القاعدة بتاعتها isFamilyMember() بس (مش مقيّدة بـ child_id)،
  // فـ list عريض هنا مضمون يعدّي الـ Rules — مسموح صراحة للابن (§3).
  const [academicYears, schools, scheduleDays, subjects, teachers, locations, transitTimes] = await Promise.all([
    db.academicYears.toArray(),
    db.schools.toArray(),
    db.schoolScheduleDays.toArray(),
    db.subjects.toArray(),
    db.teachers.toArray(),
    db.locations.toArray(),
    db.transitTimes.toArray(),
  ]);

  // بيانات مقيّدة بـ child_id — لازم where("child_id","==", linkedChildId)
  // صراحة عشان الـ Rule تتحقق (راجع الشرح أعلى الملف).
  const [enrollments, lessons, allPatterns, exceptions, prices] = await Promise.all([
    db.childSchoolEnrollments.where("child_id").equals(linkedChildId).toArray(),
    db.lessons.where("child_id").equals(linkedChildId).toArray(),
    db.lessonSchedulePatterns.where("child_id").equals(linkedChildId).toArray(),
    db.lessonScheduleExceptions.where("child_id").equals(linkedChildId).toArray(),
    db.prices.where("child_id").equals(linkedChildId).toArray(),
  ]);

  const patterns = {};
  for (const p of allPatterns) patterns[p.lesson_id] = p;

  const activeYear = academicYears.find((y) => y.status === "Active") || null;

  return {
    children: child ? [child] : [],
    activeYearId: activeYear?.id || null,
    academicYears,
    schools,
    scheduleDays,
    enrollments,
    subjects,
    teachers,
    locations,
    transitTimes,
    lessons: lessons.filter((l) => l.status === "Active"),
    patterns,
    exceptions,
    prices,
    // بند 3 من برومبت الترحيل: الابن ممنوع منها تمامًا — مفيش أي query ليها
    // أصلًا هنا (لا حتى محاولة فاشلة)، عشان مفيش أي فرصة لمحاولة قراءة تُرفض.
    expenses: [],
    payments: [],
    budgets: [],
    expenseCategories: [],
    // events العائلية العامة (child_id == null) مش متضمنة هنا حاليًا — قرار
    // مفتوح موضّح في التقرير النهائي (استعلام OR معقّد على Firestore Rules).
    events: [],
  };
}
