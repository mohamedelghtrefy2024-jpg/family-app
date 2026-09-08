// locationRepo.js
import { createBaseRepo } from "./baseRepo";
import { db, newId } from "../firestoreDb";

const base = createBaseRepo("locations");

export const locationRepo = {
  ...base,
  async hasRelatedRecords(id) {
    return (await db.lessons.where("location_id").equals(id).count()) > 0;
  },
  async safeDelete(id) {
    if (await this.hasRelatedRecords(id)) {
      throw new Error("لا يمكن حذف هذا المكان لوجود دروس مرتبطة به");
    }
    await db.transitTimes
      .where("from_location_id").equals(id).delete();
    await db.transitTimes
      .where("to_location_id").equals(id).delete();
    return base.remove(id);
  },
};

/**
 * transitTimeRepo — إدخال يدوي فقط لمدة الانتقال بين زوج أماكن (القرار المعتمد في Phase 1:
 * لا يُخترع أي رقم من الإحداثيات أو متوسط سرعة).
 */
export const transitTimeRepo = {
  async getAll() {
    return db.transitTimes.toArray();
  },
  async setMinutes(fromLocationId, toLocationId, minutes) {
    const existing = await db.transitTimes
      .filter(
        (t) =>
          (t.from_location_id === fromLocationId && t.to_location_id === toLocationId) ||
          (t.from_location_id === toLocationId && t.to_location_id === fromLocationId)
      )
      .first();

    if (existing) {
      await db.transitTimes.update(existing.id, { minutes });
      return db.transitTimes.get(existing.id);
    }

    const record = { id: newId(), from_location_id: fromLocationId, to_location_id: toLocationId, minutes };
    await db.transitTimes.add(record);
    return record;
  },
};
