import { useState } from "react";
import DashboardPage from "./pages/DashboardPage";
import ChildrenPage from "./pages/ChildrenPage";
import AcademicYearsPage from "./pages/AcademicYearsPage";
import SchoolsPage from "./pages/SchoolsPage";
import LessonsPage from "./pages/LessonsPage";
import CalendarPage from "./pages/CalendarPage";
import FamilySchedulePage from "./pages/FamilySchedulePage";
import ExpensesPage from "./pages/ExpensesPage";
import BudgetPage from "./pages/BudgetPage";
import FinancialReportsPage from "./pages/FinancialReportsPage";
import RecurrenceRulesPage from "./pages/RecurrenceRulesPage";
import NotificationsPage from "./pages/NotificationsPage";
import AttentionCenterPage from "./pages/AttentionCenterPage";
import ReportsPage from "./pages/ReportsPage";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/SettingsPage";
import EventsPage from "./pages/EventsPage";

const PAGES = [
  { id: "dashboard", label: "الرئيسية" },
  { id: "children", label: "الأبناء" },
  { id: "academicYears", label: "السنوات الدراسية" },
  { id: "schools", label: "المدارس" },
  { id: "lessons", label: "الدروس والجدول" },
  { id: "calendar", label: "Calendar" },
  { id: "events", label: "📌 الأحداث" },
  { id: "familySchedule", label: "الجدول العائلي" },
  { id: "expenses", label: "المصروفات والمدفوعات" },
  { id: "recurrence", label: "تكرار المصروفات" },
  { id: "budget", label: "الميزانية" },
  { id: "financialReports", label: "التقارير المالية" },
  { id: "reports", label: "التقارير" },
  { id: "search", label: "🔍 البحث" },
  { id: "notifications", label: "التنبيهات" },
  { id: "attentionCenter", label: "⚠️ مركز الانتباه" },
  { id: "settings", label: "الإعدادات" },
];

export default function ParentApp() {
  const [page, setPage] = useState("dashboard");

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-nav-brand">مدرستي وأولادي</div>
        {PAGES.map((p) => (
          <button
            key={p.id}
            className={`app-nav-item ${page === p.id ? "active" : ""}`}
            onClick={() => setPage(p.id)}
          >
            {p.label}
          </button>
        ))}
      </nav>
      <main className="app-main">
        {page === "dashboard" && <DashboardPage />}
        {page === "children" && <ChildrenPage />}
        {page === "academicYears" && <AcademicYearsPage />}
        {page === "schools" && <SchoolsPage />}
        {page === "lessons" && <LessonsPage />}
        {page === "calendar" && <CalendarPage />}
        {page === "events" && <EventsPage />}
        {page === "familySchedule" && <FamilySchedulePage />}
        {page === "expenses" && <ExpensesPage />}
        {page === "recurrence" && <RecurrenceRulesPage />}
        {page === "budget" && <BudgetPage />}
        {page === "financialReports" && <FinancialReportsPage />}
        {page === "reports" && <ReportsPage />}
        {page === "search" && <SearchPage />}
        {page === "notifications" && <NotificationsPage />}
        {page === "attentionCenter" && <AttentionCenterPage />}
        {page === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}
