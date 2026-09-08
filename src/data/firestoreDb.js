// src/data/firestoreDb.js
//
// ============================================================================
// Shim: نفس شكل استخدام Dexie (`db.<table>.where(...).equals(...).toArray()`,
// `.filter(fn)`, `.add()`, `.update()`, `.bulkAdd()`, `.transaction()`...)
// لكن التنفيذ الفعلي هنا Firestore. الهدف: كل ملفات src/data/repositories/*.js
// (16 ملف، فيها منطق عمل مُختبر: safeDelete, hasRelatedRecords, cascading
// deletes...) تفضل شغالة **بدون أي تعديل حرف واحد فيها** — بس تستورد من هنا
// بدل db.js القديم (سطر import واحد بس اتغيّر في كل ملف — راجع Phase D).
//
// كل الجداول محصورة تحت families/{familyId}/{tableName} — familyId بييجي من
// familyContext.js (بيتحدد مرة واحدة عند تسجيل الدخول).
//
// ⚠️ حدود معروفة ومقصودة لهذا الـ Shim (موثّقة عمدًا، مش أخطاء):
//   - transaction(): بيوفّر atomic WRITE فقط (عن طريق Firestore WriteBatch)،
//     مش atomic READ+WRITE الكامل زي Dexie أو Firestore runTransaction().
//     مقبول لأن التطبيق ده لأسرة واحدة بيستخدمها أفراد قليلين في نفس الوقت
//     (تضارب كتابة متزامنة على نفس السجل نادر جدًا عمليًا). لو التطبيق
//     اتوسّع لسيناريو Concurrent Writes أعلى، رقّي لـ runTransaction() في
//     نقاط الكتابة الحرجة (paymentRepo.addPayment أساسًا).
//   - filter(fn): بيسحب كل مستندات الـ collection ويطبّق الفلتر في المتصفح
//     (client-side) — تمام لحجم بيانات أسرة واحدة (عشرات/مئات السجلات)، غير
//     مناسب لو اتحول التطبيق لآلاف السجلات لكل أسرة.
// ============================================================================

import { db as firestore } from "../lib/firebase/config";
import { getCurrentFamilyId } from "../lib/firebase/familyContext";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where as fsWhere,
  writeBatch,
} from "firebase/firestore";

export function newId() {
  return crypto.randomUUID();
}

function familyCollectionRef(tableName) {
  const familyId = getCurrentFamilyId();
  if (!familyId) {
    throw new Error(
      `firestoreDb: لا يوجد familyId محدد — تأكد إن المستخدم مسجّل دخول ومربوط بأسرة قبل الوصول لـ "${tableName}"`
    );
  }
  return collection(firestore, `families/${familyId}/${tableName}`);
}

// ------------------------------------------------------------------
// Batch context — يسمح لـ transaction() تجمّع كل كتابات الأعمليات (add/
// update/delete/bulkAdd/bulkDelete) اللي تحصل جواه في WriteBatch واحد
// Atomic، بدون ما تحتاج الدوال دي تعرف إنها جوه transaction أصلًا.
// ------------------------------------------------------------------
let activeBatch = null;

function getBatch() {
  return activeBatch || writeBatch(firestore);
}

async function commitIfOwnBatch(batch) {
  if (batch !== activeBatch) {
    await batch.commit();
  }
}

function stripId(record) {
  const { id: _id, ...rest } = record;
  return rest;
}

function createTable(tableName) {
  const table = {
    async toArray() {
      const snap = await getDocs(familyCollectionRef(tableName));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async count() {
      return (await table.toArray()).length;
    },

    async get(id) {
      const snap = await getDoc(doc(familyCollectionRef(tableName), id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : undefined;
    },

    async add(record) {
      const id = record.id || newId();
      const batch = getBatch();
      batch.set(doc(familyCollectionRef(tableName), id), stripId({ ...record, id }));
      await commitIfOwnBatch(batch);
      return id;
    },

    // Dexie put() = إضافة أو استبدال كامل بمفتاح صريح (مُستخدَم في settingsRepo
    // بمفتاح "key" بدل "id" — نفس الفكرة، بس اسم الحقل مختلف).
    async put(record) {
      const id = record.id || record.key || newId();
      const batch = getBatch();
      batch.set(doc(familyCollectionRef(tableName), id), stripId({ ...record, id }));
      await commitIfOwnBatch(batch);
      return id;
    },

    async update(id, changes) {
      const batch = getBatch();
      batch.update(doc(familyCollectionRef(tableName), id), changes);
      await commitIfOwnBatch(batch);
      return 1;
    },

    async delete(id) {
      const batch = getBatch();
      batch.delete(doc(familyCollectionRef(tableName), id));
      await commitIfOwnBatch(batch);
    },

    async bulkAdd(records) {
      const batch = getBatch();
      for (const record of records) {
        const id = record.id || newId();
        batch.set(doc(familyCollectionRef(tableName), id), stripId({ ...record, id }));
      }
      await commitIfOwnBatch(batch);
    },

    async bulkDelete(ids) {
      const batch = getBatch();
      for (const id of ids) {
        batch.delete(doc(familyCollectionRef(tableName), id));
      }
      await commitIfOwnBatch(batch);
    },

    // Dexie table.clear() — يمسح كل مستندات الـ collection (مُستخدَم في
    // backupRepo.restoreAll قبل استيراد نسخة احتياطية بالكامل).
    async clear() {
      const rows = await table.toArray();
      const batch = getBatch();
      for (const row of rows) batch.delete(doc(familyCollectionRef(tableName), row.id));
      await commitIfOwnBatch(batch);
    },

    where(field) {
      return {
        equals(value) {
          return {
            async toArray() {
              const snap = await getDocs(query(familyCollectionRef(tableName), fsWhere(field, "==", value)));
              return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            },
            async count() {
              return (await this.toArray()).length;
            },
            async first() {
              return (await this.toArray())[0];
            },
            async delete() {
              const rows = await this.toArray();
              const batch = getBatch();
              for (const row of rows) batch.delete(doc(familyCollectionRef(tableName), row.id));
              await commitIfOwnBatch(batch);
              return rows.length;
            },
          };
        },
      };
    },

    // client-side filter — راجع تنبيه الحدود المعروفة أعلى الملف
    filter(predicate) {
      return {
        async toArray() {
          return (await table.toArray()).filter(predicate);
        },
        async count() {
          return (await this.toArray()).length;
        },
        async first() {
          return (await this.toArray())[0];
        },
        async delete() {
          const rows = await this.toArray();
          const batch = getBatch();
          for (const row of rows) batch.delete(doc(familyCollectionRef(tableName), row.id));
          await commitIfOwnBatch(batch);
          return rows.length;
        },
      };
    },
  };

  return table;
}

const TABLE_NAMES = [
  "academicYears",
  "children",
  "schools",
  "schoolScheduleDays",
  "childSchoolEnrollments",
  "subjects",
  "teachers",
  "locations",
  "transitTimes",
  "lessons",
  "lessonSchedulePatterns",
  "lessonScheduleExceptions",
  "expenseCategories",
  "expenses",
  "expenseRecurrenceRules",
  "payments",
  "budgets",
  "events",
  "settings",
];

const tables = {};
for (const name of TABLE_NAMES) tables[name] = createTable(name);

/**
 * transaction(mode, ...tables, callback) — تجميع كل الكتابات اللي تحصل جوه
 * callback في WriteBatch واحد Atomic (راجع تنبيه الحدود أعلى الملف بخصوص
 * القراءة). التوقيع مطابق لـ Dexie transaction() عمدًا عشان paymentRepo.js /
 * priceRepo.js / schoolRepo.js / expenseRecurrenceRuleRepo.js يفضلوا بدون تعديل.
 */
async function transaction(_mode, ...args) {
  const callback = args[args.length - 1];
  const batch = writeBatch(firestore);
  const previousBatch = activeBatch;
  activeBatch = batch;
  try {
    const result = await callback();
    await batch.commit();
    return result;
  } finally {
    activeBatch = previousBatch;
  }
}

export const db = { ...tables, transaction };
