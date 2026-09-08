// backupRepo.js — Phase 15 (بند 48)
import { db } from "./firestoreDb";
import { CURRENT_FORMAT_VERSION, ALL_TABLES, validateBackupPayload } from "../domain/backup/backupValidator";
import { todayLocalDateString } from "../domain/shared/dateUtils";

// حد Firestore WriteBatch = 500 عملية بالظبط. مش مشكلة موجودة أصلًا مع Dexie
// (مفيش حد شبه ده على IndexedDB)، ظهرت بسبب الترحيل لـ Firestore. الحل:
// نقسّم كل عمليات المسح/الإضافة لدفعات (Batches) ≤450 عملية (هامش أمان) بدل
// batch واحد ضخم. الأثر: الاستعادة مش Atomic بالكامل عبر آلاف السجلات (كل
// دفعة بتتأكد لوحدها) — مقبول لعملية استعادة نادرة (مش عملية يومية)، وأفضل
// بكثير من فشل صامت أو رفض كامل عند تجاوز 500 عملية.
const BATCH_CHUNK_SIZE = 450;

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

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
  // ملف اسم النسخة الاحتياطية يمثل تاريخ اليوم المحلي (Date-Only) — ليس لحظة UTC.
  a.download = `family-app-backup-${todayLocalDateString()}.json`;
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

  // 1) مسح كل الجداول أولًا (مقسّم لدفعات ≤450 عملية).
  for (const name of ALL_TABLES) {
    const existing = await db[name].toArray();
    for (const idsChunk of chunk(existing.map((r) => r.id), BATCH_CHUNK_SIZE)) {
      await db.transaction("rw", [db[name]], async () => {
        await db[name].bulkDelete(idsChunk);
      });
    }
  }

  // 2) إضافة كل صفوف الملف (مقسّمة لدفعات ≤450 عملية لكل جدول).
  for (const name of ALL_TABLES) {
    const rows = payload.tables[name] || [];
    for (const rowsChunk of chunk(rows, BATCH_CHUNK_SIZE)) {
      await db.transaction("rw", [db[name]], async () => {
        await db[name].bulkAdd(rowsChunk);
      });
    }
  }
}

export { exportAll, downloadBackup, restoreAll };
