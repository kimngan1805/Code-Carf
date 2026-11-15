import { describe, expect, it } from "vitest";
import {
  computeNextStreak,
  dateKeyToDbDate,
  dbDateToDateKey,
  resolveEffectiveStreak,
  toActivityDateKey,
} from "./streak";

describe("streak date conversion helpers", () => {
  it("converts UTC instants near midnight into Asia/Ho_Chi_Minh calendar dates", () => {
    // 2026-11-11 23:59:59 +07:00 is still 2026-11-11 in UTC (16:59:59Z)
    expect(toActivityDateKey(new Date("2026-11-11T16:59:59.999Z"))).toBe(
      "2026-11-11",
    );
    // 2026-11-12 00:00:00 +07:00 is STILL 2026-11-11 in UTC (17:00:00Z),
    // but must resolve to 2026-11-12 in Vietnam time.
    expect(toActivityDateKey(new Date("2026-11-11T17:00:00.000Z"))).toBe(
      "2026-11-12",
    );
  });

  it("stores and reads Vietnam date keys as UTC midnight for PostgreSQL @db.Date without UTC+7 shift", () => {
    const activityAtVnMidnight = new Date("2026-11-12T00:00:00+07:00");
    const vnKey = toActivityDateKey(activityAtVnMidnight);
    expect(vnKey).toBe("2026-11-12");

    const dbDate = dateKeyToDbDate(vnKey);
    expect(dbDate.toISOString()).toBe("2026-11-12T00:00:00.000Z");
    expect(dbDateToDateKey(dbDate)).toBe("2026-11-12");
  });
});

describe("computeNextStreak", () => {
  it("starts streak at 1 on a learner's first activity", () => {
    const result = computeNextStreak(
      { currentStreak: 0, longestStreak: 0, lastActiveOn: null },
      new Date("2026-11-12T09:00:00+07:00"),
    );

    expect(result).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastActiveOn: new Date("2026-11-12T00:00:00.000Z"),
      changed: true,
    });
  });

  it("keeps streak unchanged across multiple activities on the same Vietnam calendar day even across UTC midnight", () => {
    // Morning 00:05+07:00 = 2026-11-11T17:05:00Z (UTC Nov 11)
    const first = computeNextStreak(
      { currentStreak: 0, longestStreak: 0, lastActiveOn: null },
      new Date("2026-11-12T00:05:00+07:00"),
    );
    expect(first.currentStreak).toBe(1);
    expect(first.lastActiveOn.toISOString()).toBe("2026-11-12T00:00:00.000Z");

    // Late night 23:55+07:00 = 2026-11-12T16:55:00Z (UTC Nov 12, still VN Nov 12)
    const second = computeNextStreak(
      {
        currentStreak: first.currentStreak,
        longestStreak: first.longestStreak,
        lastActiveOn: first.lastActiveOn,
      },
      new Date("2026-11-12T23:55:00+07:00"),
    );

    expect(second).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastActiveOn: new Date("2026-11-12T00:00:00.000Z"),
      changed: false,
    });
  });

  it("increments streak on consecutive Vietnam days including 23:59:59 -> 00:00:00 across midnight", () => {
    // 23:59:59 +07:00 on 2026-11-11 (UTC 16:59:59Z)
    const day1 = computeNextStreak(
      { currentStreak: 0, longestStreak: 3, lastActiveOn: null },
      new Date("2026-11-11T23:59:59+07:00"),
    );
    expect(day1.currentStreak).toBe(1);
    expect(day1.longestStreak).toBe(3);
    expect(day1.lastActiveOn.toISOString()).toBe("2026-11-11T00:00:00.000Z");

    // 1 second later: 00:00:00 +07:00 on 2026-11-12 (UTC 17:00:00Z, still Nov 11 UTC!)
    const day2 = computeNextStreak(
      {
        currentStreak: day1.currentStreak,
        longestStreak: day1.longestStreak,
        lastActiveOn: day1.lastActiveOn,
      },
      new Date("2026-11-12T00:00:00+07:00"),
    );

    expect(day2).toEqual({
      currentStreak: 2,
      longestStreak: 3,
      lastActiveOn: new Date("2026-11-12T00:00:00.000Z"),
      changed: true,
    });
  });

  it("updates longestStreak when currentStreak surpasses the previous record", () => {
    const result = computeNextStreak(
      {
        currentStreak: 6,
        longestStreak: 6,
        lastActiveOn: new Date("2026-11-11T00:00:00.000Z"),
      },
      new Date("2026-11-12T08:00:00+07:00"),
    );

    expect(result).toEqual({
      currentStreak: 7,
      longestStreak: 7,
      lastActiveOn: new Date("2026-11-12T00:00:00.000Z"),
      changed: true,
    });
  });

  it("resets currentStreak to 1 after missing at least one full Vietnam day while keeping longestStreak", () => {
    // Active on Nov 11 -> skipped all of Nov 12 -> active on Nov 13 00:01+07:00
    const result = computeNextStreak(
      {
        currentStreak: 5,
        longestStreak: 12,
        lastActiveOn: new Date("2026-11-11T00:00:00.000Z"),
      },
      new Date("2026-11-13T00:01:00+07:00"),
    );

    expect(result).toEqual({
      currentStreak: 1,
      longestStreak: 12,
      lastActiveOn: new Date("2026-11-13T00:00:00.000Z"),
      changed: true,
    });
  });
});

describe("resolveEffectiveStreak", () => {
  it("preserves current streak when last active today or yesterday in Vietnam time", () => {
    const snapshot = {
      currentStreak: 7,
      longestStreak: 12,
      lastActiveOn: new Date("2026-11-11T00:00:00.000Z"),
    };

    // Same day
    expect(
      resolveEffectiveStreak(snapshot, new Date("2026-11-11T23:59:59+07:00")),
    ).toEqual({ current: 7, longest: 12 });

    // Still valid until the very last second of the next day
    expect(
      resolveEffectiveStreak(snapshot, new Date("2026-11-12T23:59:59+07:00")),
    ).toEqual({ current: 7, longest: 12 });
  });

  it("returns current = 0 immediately at 00:00:00 VN after a full missed day while preserving longestStreak", () => {
    const snapshot = {
      currentStreak: 7,
      longestStreak: 12,
      lastActiveOn: new Date("2026-11-11T00:00:00.000Z"),
    };

    expect(
      resolveEffectiveStreak(snapshot, new Date("2026-11-13T00:00:00+07:00")),
    ).toEqual({ current: 0, longest: 12 });
  });

  it("returns current = 0 when lastActiveOn is null", () => {
    expect(
      resolveEffectiveStreak(
        { currentStreak: 4, longestStreak: 9, lastActiveOn: null },
        new Date("2026-11-12T10:00:00+07:00"),
      ),
    ).toEqual({ current: 0, longest: 9 });
  });
});
