// src/App.jsx
// النسخة المحلية (بدون تسجيل دخول/Firebase): التطبيق بيفتح مباشرة على شل
// الأب/الأم — كل البيانات محفوظة محليًا في المتصفح (راجع src/data/db.js).
import ParentApp from "./ui/ParentApp";

export default function App() {
  return <ParentApp />;
}
