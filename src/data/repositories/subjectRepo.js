// subjectRepo.js
import { createBaseRepo } from "./baseRepo";
import { db } from "../firestoreDb";

const base = createBaseRepo("subjects");

export const subjectRepo = {
  ...base,
  async hasRelatedRecords(id) {
    return (await db.lessons.where("subject_id").equals(id).count()) > 0;
  },
  async safeDelete(id) {
    if (await this.hasRelatedRecords(id)) {
      throw new Error("لا يمكن حذف هذه المادة لوجود دروس مرتبطة بها");
    }
    return base.remove(id);
  },
};
