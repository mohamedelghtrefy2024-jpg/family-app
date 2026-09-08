// teacherRepo.js
import { createBaseRepo } from "./baseRepo";
import { db } from "../firestoreDb";

const base = createBaseRepo("teachers");

export const teacherRepo = {
  ...base,
  async hasRelatedRecords(id) {
    return (await db.lessons.where("teacher_id").equals(id).count()) > 0;
  },
  async safeDelete(id) {
    if (await this.hasRelatedRecords(id)) {
      throw new Error("لا يمكن حذف هذا المدرس لوجود دروس مرتبطة به");
    }
    return base.remove(id);
  },
};
