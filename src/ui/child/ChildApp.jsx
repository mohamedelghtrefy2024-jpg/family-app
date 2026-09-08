// src/ui/child/ChildApp.jsx
// شل التطبيق للابن — Mobile First فعليًا (§6/Phase E): صفحتين/تلاتة بس، ولا
// أي رابط لصفحات المصروفات/التقارير/الميزانية أصلًا (مش محجوبة، غير موجودة).
import { useState } from "react";
import MySchedulePage from "./MySchedulePage";
import MyLessonsPage from "./MyLessonsPage";
import ChildSettingsPage from "./ChildSettingsPage";

const TABS = [
  { id: "schedule", label: "جدولي", icon: "📅", Component: MySchedulePage },
  { id: "lessons", label: "دروسي", icon: "📚", Component: MyLessonsPage },
  { id: "settings", label: "الإعدادات", icon: "⚙️", Component: ChildSettingsPage },
];

export default function ChildApp() {
  const [activeTab, setActiveTab] = useState("schedule");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.Component;

  return (
    <div className="child-shell" dir="rtl">
      <header className="child-header">مدرستي وأولادي</header>
      <main className="child-main">
        <ActiveComponent />
      </main>
      <nav className="child-bottom-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`child-nav-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <span className="icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
