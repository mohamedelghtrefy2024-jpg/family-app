// eventRepo.js
import { createBaseRepo } from "./baseRepo";
import { db } from "../db";
import { parseLocalDate } from "../../domain/shared/dateUtils";

const base = createBaseRepo("events");

export const eventRepo = {
  ...base,

  async getInRange(startDate, endDate) {
    const all = await db.events.toArray();
    return all.filter((e) => {
      // BUG-fix (بند 17): e.date/e.end_date قيم Date-Only — new Date(str) كانت UTC.
      const start = parseLocalDate(e.date);
      const end = e.end_date ? parseLocalDate(e.end_date) : start;
      return end >= startDate && start <= endDate;
    });
  },
};
