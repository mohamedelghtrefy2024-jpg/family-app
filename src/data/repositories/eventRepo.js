// eventRepo.js
import { createBaseRepo } from "./baseRepo";
import { db } from "../db";

const base = createBaseRepo("events");

export const eventRepo = {
  ...base,

  async getInRange(startDate, endDate) {
    const all = await db.events.toArray();
    return all.filter((e) => {
      const start = new Date(e.date);
      const end = e.end_date ? new Date(e.end_date) : start;
      return end >= startDate && start <= endDate;
    });
  },
};
