// enrollmentRepo.js
import { createBaseRepo } from "./baseRepo";
import { db } from "../firestoreDb";

const base = createBaseRepo("childSchoolEnrollments");

export const enrollmentRepo = {
  ...base,

  async getForChild(childId) {
    return db.childSchoolEnrollments.where("child_id").equals(childId).toArray();
  },

  async getForChildAndYear(childId, academicYearId) {
    const all = await this.getForChild(childId);
    return all.find((e) => e.academic_year_id === academicYearId) || null;
  },
};
