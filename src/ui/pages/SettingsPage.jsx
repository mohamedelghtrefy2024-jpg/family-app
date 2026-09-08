import { useEffect, useRef, useState } from "react";
import { settingsRepo } from "../../data/repositories/settingsRepo";
import { academicYearRepo } from "../../data/repositories/academicYearRepo";
import { downloadBackup, restoreAll } from "../../data/backupRepo";

const CURRENCY_KEY = "currency";
const WEEK_START_KEY = "week_start";
const DEFAULT_YEAR_KEY = "default_academic_year_id";

const WEEK_START_OPTIONS = [
  { value: "0", label: "الأحد" },
  { value: "1", label: "الإثنين" },
  { value: "6", label: "السبت" },
];

export default function SettingsPage() {
  const [currency, setCurrency] = useState("EGP");
  const [weekStart, setWeekStart] = useState("6");
  const [defaultYearId, setDefaultYearId] = useState("");
  const [academicYears, setAcademicYears] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [savedCurrency, savedWeekStart, savedDefaultYear, years] = await Promise.all([
        settingsRepo.get(CURRENCY_KEY, "EGP"),
        settingsRepo.get(WEEK_START_KEY, "6"),
        settingsRepo.get(DEFAULT_YEAR_KEY, ""),
        academicYearRepo.getAll(),
      ]);
      setCurrency(savedCurrency);
      setWeekStart(savedWeekStart);
      setDefaultYearId(savedDefaultYear);
      setAcademicYears(years);
      setLoaded(true);
    })();
  }, []);

  async function updateCurrency(value) {
    setCurrency(value);
    await settingsRepo.set(CURRENCY_KEY, value);
  }

  async function updateWeekStart(value) {
    setWeekStart(value);
    await settingsRepo.set(WEEK_START_KEY, value);
  }

  async function updateDefaultYear(value) {
    setDefaultYearId(value);
    await settingsRepo.set(DEFAULT_YEAR_KEY, value);
  }

  async function handleBackup() {
    setError(null);
    setMessage(null);
    try {
      await downloadBackup();
      setMessage("تم تنزيل ملف النسخة الاحتياطية");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setMessage(null);

    const confirmed = window.confirm(
      "استعادة النسخة الاحتياطية هتستبدل كل بيانات التطبيق الحالية بالكامل. متأكد إنك عايز تكمل؟"
    );
    if (!confirmed) {
      e.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await restoreAll(payload);
      setMessage("تمت الاستعادة بنجاح — أعد تحميل الصفحة لرؤية البيانات المستعادة");
    } catch (err) {
      setError(err.message);
    } finally {
      e.target.value = "";
    }
  }

  if (!loaded) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">الإعدادات</h1>
          <p className="page-subtitle">إعدادات عامة، نسخ احتياطي واستعادة</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {message && (
        <div className="error-banner" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
          {message}
        </div>
      )}

      <div className="dashboard-card" style={{ marginBottom: 18 }}>
        <div className="dashboard-card-title">⚙️ عام</div>

        <div className="form-row">
          <label>العملة</label>
          <input value={currency} onChange={(e) => updateCurrency(e.target.value)} placeholder="EGP" />
        </div>

        <div className="form-row">
          <label>بداية الأسبوع</label>
          <select value={weekStart} onChange={(e) => updateWeekStart(e.target.value)}>
            {WEEK_START_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>السنة الدراسية الافتراضية</label>
          <select value={defaultYearId} onChange={(e) => updateDefaultYear(e.target.value)}>
            <option value="">بدون</option>
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginBottom: 18 }}>
        <div className="dashboard-card-title">💾 النسخ الاحتياطي والاستعادة</div>
        <p className="list-row-meta" style={{ marginBottom: 12 }}>
          النسخ الاحتياطي بيصدّر كل بيانات التطبيق كملف JSON واحد. الاستعادة بتستبدل كل البيانات الحالية بالكامل —
          يُنصح بعمل نسخة احتياطية قبل أي استعادة.
        </p>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleBackup}>⬇️ تنزيل نسخة احتياطية</button>
          <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>⬆️ استعادة من ملف</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={handleRestoreFile}
          />
        </div>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-card-title">ℹ️ ملاحظات</div>
        <p className="list-row-meta">
          التطبيق شغال دلوقتي كـ PWA — تقدر "تضيفه للشاشة الرئيسية" من متصفح الموبايل ويشتغل بدون نت
          (بند 47). أي تحديث جديد للتطبيق ممكن يحتاج غلق كل التابات وفتحها تاني عشان يظهر، وده سلوك
          طبيعي للـ Service Workers. تمت مراجعة الكود للتأكد من عدم وجود بيانات حساسة مُثبّتة بداخله
          (بند 78) — لا توجد مفاتيح API ولا console.log لبيانات حساسة.
        </p>
      </div>
    </div>
  );
}
