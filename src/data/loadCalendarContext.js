// loadCalendarContext.js
// يجمع كل البيانات الخام التي يحتاجها calendarBuilder / dashboardService في مكان واحد،
// بدل تكرار نفس سلسلة الاستدعاءات في كل شاشة (الرئيسية/الجدول/الجدول العائلي) — بند 76.
import { db } from "./db";
import { childRepo } from "./repositories/childRepo";
import { academicYearRepo } from "./repositories/academicYearRepo";
import { schoolRepo } from "./repositories/schoolRepo";
import { enrollmentRepo } from "./repositories/enrollmentRepo";
import { subjectRepo } from "./repositories/subjectRepo";
import { teacherRepo } from "./repositories/teacherRepo";
import { locationRepo, transitTimeRepo } from "./repositories/locationRepo";
import { lessonRepo } from "./repositories/lessonRepo";
import { expenseRepo } from "./repositories/expenseRepo";
import { paymentRepo } from "./repositories/paymentRepo";
import { budgetRepo } from "./repositories/budgetRepo";
import { expenseCategoryRepo } from "./repositories/expenseCategoryRepo";
import { eventRepo } from "./repositories/eventRepo";

export async function loadCalendarContext() {
  const [
    children,
    activeYear,
    academicYears,
    schools,
    scheduleDays,
    enrollments,
    subjects,
    teachers,
    locations,
    transitTimes,
    lessons,
    allPatterns,
    exceptions,
    prices,
    expenses,
    payments,
    budgets,
    expenseCategories,
    events,
  ] = await Promise.all([
    childRepo.getActive(),
    academicYearRepo.getActive(),
    academicYearRepo.getAll(),
    schoolRepo.getAll(),
    db.schoolScheduleDays.toArray(),
    enrollmentRepo.getAll(),
    subjectRepo.getAll(),
    teacherRepo.getAll(),
    locationRepo.getAll(),
    transitTimeRepo.getAll(),
    lessonRepo.getActive(),
    lessonRepo.getAllPatterns(),
    lessonRepo.getAllExceptions(),
    db.prices.toArray(),
    expenseRepo.getActive(),
    paymentRepo.getAll(),
    budgetRepo.getAll(),
    expenseCategoryRepo.getAll(),
    eventRepo.getAll(),
  ]);

  const patterns = {};
  for (const p of allPatterns) patterns[p.lesson_id] = p;

  return {
    children,
    activeYearId: activeYear?.id || null,
    academicYears,
    schools,
    scheduleDays,
    enrollments,
    subjects,
    teachers,
    locations,
    transitTimes,
    lessons,
    patterns,
    exceptions,
    prices,
    expenses,
    payments,
    budgets,
    expenseCategories,
    events,
  };
}
