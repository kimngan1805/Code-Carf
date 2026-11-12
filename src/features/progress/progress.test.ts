import { describe, expect, it } from "vitest";
import { getLevel } from "./levels";
import { getWeekActivity, toDateKey } from "./week-activity";

describe("getLevel", () => {
  it("starts at level 1", () =>
    expect(getLevel(0)).toMatchObject({
      level: 1,
      title: "Người mới",
      nextXp: 500,
      progress: 0,
    }));
  it("computes progress inside a level", () =>
    expect(getLevel(1250)).toMatchObject({
      level: 3,
      title: "Lập trình viên",
      nextXp: 2000,
      progress: 0.25,
    }));
  it("caps at the highest level", () =>
    expect(getLevel(9000)).toMatchObject({
      level: 4,
      nextXp: null,
      progress: 1,
    }));
  it("treats negative XP as zero", () => expect(getLevel(-10).level).toBe(1));
});

describe("getWeekActivity", () => {
  // 2026-11-12 is a Thursday.
  const week = getWeekActivity(["2026-11-09", "2026-11-11"], "2026-11-12");

  it("returns Monday to Sunday", () => {
    expect(week.map((day) => day.label)).toEqual([
      "T2",
      "T3",
      "T4",
      "T5",
      "T6",
      "T7",
      "CN",
    ]);
    expect(week[0].dateKey).toBe("2026-11-09");
    expect(week[6].dateKey).toBe("2026-11-15");
  });

  it("marks done, missed, today and upcoming days", () =>
    expect(week.map((day) => day.status)).toEqual([
      "done",
      "missed",
      "done",
      "today",
      "upcoming",
      "upcoming",
      "upcoming",
    ]));

  it("handles Sunday as the last day of the week", () =>
    expect(getWeekActivity([], "2026-11-15")[6].status).toBe("today"));

  it("uses the Vietnam calendar date", () =>
    expect(toDateKey(new Date("2026-11-11T18:30:00Z"))).toBe("2026-11-12"));
});
