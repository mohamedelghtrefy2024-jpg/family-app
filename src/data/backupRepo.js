// backupRepo.js — Phase 15 (بند 48)
import { db } from "./db";
import { CURRENT_FORMAT_VERSION, ALL_TABLES, validateBackupPayload } from "../domain/backup/backupValidator";

async function exportAll() {
  const tables = {};
  for (const name of ALL_TABLES) {
    tables[name] = await db[name].toArray();
  }
  return {
    formatVersion: CURRENT_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    app: "family-app",
    tables,
  };
}

async function downloadBackup() {
  const payload = await exportAll();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `family-app-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * يستبدل كل بيانات التطبيق ببيانات الملف — بعد التحقق الكامل من الشكل فقط.
 * أي فشل في التحقق يوقف العملية قبل لمس أي جدول (كل الجداول أو ولا واحد).
 * جداول اختيارية غير موجودة في ملف قديم (زي "events") بتتعامل كمصفوفة فاضية بدل رفض الاستعادة كلها.
 * @param {Object} payload
 * @throws {Error} لو الملف غير صالح
 */
async function restoreAll(payload) {
  const { valid, errors } = validateBackupPayload(payload);
  if (!valid) {
    throw new Error(`ملف النسخة الاحتياطية غير صالح:\n${errors.join("\n")}`);
  }

  const tableRefs = ALL_TABLES.map((name) => db[name]);
  await db.transaction("rw", tableRefs, async () => {
    for (const name of ALL_TABLES) {
      const rows = payload.tables[name] || [];
      await db[name].clear();
      if (rows.length > 0) {
        await db[name].bulkAdd(rows);
      }
    }
  });
}

export { exportAll, downloadBackup, restoreAll };
