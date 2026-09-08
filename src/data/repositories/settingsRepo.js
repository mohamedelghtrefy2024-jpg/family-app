// settingsRepo.js
// غلاف بسيط فوق جدول settings (key/value) — كان موجود في الـ schema بدون استخدام (بند 77).
import { db } from "../db";

export const settingsRepo = {
  async get(key, defaultValue = null) {
    const row = await db.settings.get(key);
    return row ? row.value : defaultValue;
  },

  async set(key, value) {
    await db.settings.put({ key, value });
    return value;
  },
};
