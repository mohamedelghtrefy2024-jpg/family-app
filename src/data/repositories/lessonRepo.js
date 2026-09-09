// lessonRepo.js
import { createBaseRepo } from "./baseRepo";
import { db, newId } from "../db";

const base = createBaseRepo("lessons");

export const lessonRepo = {
  ...base,

  async getForChild(childId) {
    return db.lessons.where("child_id").equals(childId).toArray();
  },

  async getActive() {
    return db.lessons.where("status").equals("Active").toArray();
  },

  async getPattern(lessonId) {
    const patterns = await db.lessonSchedulePatterns
      .where("lesson_id")
      .equals(lessonId)
      .toArray();
    return patterns[0] || null;
  },

  async setPattern(lessonId, pattern) {
    const existing = await this.getPattern(lessonId);
    if (existing) {
      await db.lessonSchedulePatterns.update(existing.id, pattern);
    } else {
      await db.lessonSchedulePatterns.add({ id: newId(), lesson_id: lessonId, ...pattern });
    }
    return this.getPattern(lessonId);
  },

  async getExceptions(lessonId) {
    return db.lessonScheduleExceptions.where("lesson_id").equals(lessonId).toArray();
  },

  async addException(lessonId, exception) {
    const record = { id: newId(), lesson_id: lessonId, ...exception };
    await db.lessonScheduleExceptions.add(record);
    return record;
  },

  async getAllPatterns() {
    return db.lessonSchedulePatterns.toArray();
  },

  async getAllExceptions() {
    return db.lessonScheduleExceptions.toArray();
  },
};
