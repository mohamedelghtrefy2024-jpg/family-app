// baseRepo.js — CRUD عام فوق collection واحد في Firestore (كان Dexie قبل ترحيل Firebase — راجع firestoreDb.js).
// الخدمات الخاصة تُبنى فوقه لإضافة استعلامات محددة.
import { db, newId } from "../firestoreDb";

export function createBaseRepo(tableName) {
  const table = db[tableName];

  return {
    async getAll() {
      return table.toArray();
    },
    async getById(id) {
      return table.get(id);
    },
    async add(record) {
      const withId = { id: record.id || newId(), ...record };
      await table.add(withId);
      return withId;
    },
    async update(id, changes) {
      await table.update(id, changes);
      return table.get(id);
    },
    async remove(id) {
      await table.delete(id);
    },
    async where(field, value) {
      return table.where(field).equals(value).toArray();
    },
  };
}
