import { useEffect, useState } from "react";
import { loadCalendarContext } from "../../data/loadCalendarContext";
import { settingsRepo } from "../../data/repositories/settingsRepo";
import {
  NOTIFICATION_TYPES,
  DEFAULT_ENABLED_TYPES,
  computeNotifications,
} from "../../domain/notifications/notificationService";

const SETTINGS_KEY = "notification_preferences";

export default function NotificationsPage() {
  const [ctx, setCtx] = useState(null);
  const [enabledTypes, setEnabledTypes] = useState(DEFAULT_ENABLED_TYPES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [context, saved] = await Promise.all([
        loadCalendarContext(),
        settingsRepo.get(SETTINGS_KEY, DEFAULT_ENABLED_TYPES),
      ]);
      setCtx(context);
      setEnabledTypes(saved);
      setLoaded(true);
    })();
  }, []);

  async function toggleType(typeId) {
    const next = enabledTypes.includes(typeId)
      ? enabledTypes.filter((t) => t !== typeId)
      : [...enabledTypes, typeId];
    setEnabledTypes(next);
    await settingsRepo.set(SETTINGS_KEY, next);
  }

  if (!loaded || !ctx) return null;

  const notifications = computeNotifications(ctx, new Date(), enabledTypes);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">التنبيهات</h1>
          <p className="page-subtitle">فعّل أو أوقف الأنواع اللي تهمك — والمعاينة تحت بتتحدث فورًا</p>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginBottom: 22 }}>
        <div className="dashboard-card-title">🔔 أنواع التنبيهات</div>
        {NOTIFICATION_TYPES.map((t) => (
          <label key={t.id} className="toggle-row">
            <input
              type="checkbox"
              checked={enabledTypes.includes(t.id)}
              onChange={() => toggleType(t.id)}
            />
            <span>{t.label}</span>
            {t.id === "important_event" && (
              <span className="list-row-meta"> (خلال 7 أيام قادمة)</span>
            )}
          </label>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 800, margin: "18px 0 10px" }}>
        التنبيهات الحالية ({notifications.length})
      </h2>

      {notifications.length === 0 ? (
        <div className="dashboard-empty">لا توجد تنبيهات مطابقة للأنواع المفعّلة حاليًا</div>
      ) : (
        notifications.map((n, i) => (
          <div className="list-row" key={i}>
            <div>
              <div className="list-row-name">{n.label}</div>
              <div className="list-row-meta">{n.date}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
