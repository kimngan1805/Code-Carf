import { describe, expect, it } from "vitest";
import { getCurrentWeekRange, rankXpLeaderboard } from "./xp-ranking";

describe("getCurrentWeekRange (Asia/Ho_Chi_Minh)", () => {
  it("computes [Monday 00:00+07:00, next Monday 00:00+07:00) for a mid-week VN timestamp", () => {
    // Wednesday 2026-04-08 14:30 VN (07:30 UTC)
    const range = getCurrentWeekRange(new Date("2026-04-08T14:30:00+07:00"));
    expect(range.startsAt.toISOString()).toBe(
      new Date("2026-04-06T00:00:00+07:00").toISOString(),
    );
    expect(range.endsAt.toISOString()).toBe(
      new Date("2026-04-13T00:00:00+07:00").toISOString(),
    );
  });

  it("splits week right across Sunday 23:59:59.999+07:00 and Monday 00:00:00.000+07:00", () => {
    const sundayEnd = getCurrentWeekRange(
      new Date("2026-04-12T23:59:59.999+07:00"),
    );
    const mondayStart = getCurrentWeekRange(
      new Date("2026-04-13T00:00:00.000+07:00"),
    );

    expect(sundayEnd.startsAt.toISOString()).toBe(
      new Date("2026-04-06T00:00:00+07:00").toISOString(),
    );
    expect(sundayEnd.endsAt.toISOString()).toBe(
      mondayStart.startsAt.toISOString(),
    );
    expect(mondayStart.endsAt.toISOString()).toBe(
      new Date("2026-04-20T00:00:00+07:00").toISOString(),
    );
  });

  it("respects UTC midnight vs VN +07:00 boundary (Monday 02:00 UTC is Monday 09:00 VN, Sunday 17:00 UTC is Monday 00:00 VN)", () => {
    // 2026-04-12T16:59:59.999Z is 2026-04-12T23:59:59.999+07:00 (Sunday)
    const stillSundayVn = getCurrentWeekRange(
      new Date("2026-04-12T16:59:59.999Z"),
    );
    // 2026-04-12T17:00:00.000Z is 2026-04-13T00:00:00.000+07:00 (Monday)
    const alreadyMondayVn = getCurrentWeekRange(
      new Date("2026-04-12T17:00:00.000Z"),
    );

    expect(stillSundayVn.startsAt.toISOString()).toBe(
      new Date("2026-04-06T00:00:00+07:00").toISOString(),
    );
    expect(alreadyMondayVn.startsAt.toISOString()).toBe(
      new Date("2026-04-13T00:00:00+07:00").toISOString(),
    );
  });
});

describe("rankXpLeaderboard", () => {
  it("ranks learners descending by XP, applies competition ties (1, 1, 3), and breaks ties deterministically by userId", () => {
    const input = [
      { userId: "u-charlie", name: "Charlie", xp: 150 },
      { userId: "u-alice", name: "Alice", xp: 300 },
      { userId: "u-dave", name: "Dave", xp: 300 },
      { userId: "u-bob", name: "Bob", xp: 200 },
      { userId: "u-eve", name: "Eve", xp: 150 },
    ];
    const snapshot = structuredClone(input);

    const result = rankXpLeaderboard(input, {
      currentUser: { id: "u-bob", name: "Bob" },
    });

    expect(input).toEqual(snapshot);
    expect(result.totalRankedLearners).toBe(5);
    expect(result.entries).toEqual([
      {
        rank: 1,
        userId: "u-alice",
        name: "Alice",
        xp: 300,
        isCurrentUser: false,
      },
      {
        rank: 1,
        userId: "u-dave",
        name: "Dave",
        xp: 300,
        isCurrentUser: false,
      },
      { rank: 3, userId: "u-bob", name: "Bob", xp: 200, isCurrentUser: true },
      {
        rank: 4,
        userId: "u-charlie",
        name: "Charlie",
        xp: 150,
        isCurrentUser: false,
      },
      { rank: 4, userId: "u-eve", name: "Eve", xp: 150, isCurrentUser: false },
    ]);
    expect(result.myStanding).toEqual({
      userId: "u-bob",
      name: "Bob",
      xp: 200,
      rank: 3,
      inTop: true,
    });
  });

  it("excludes learners with zero, negative, or non-finite XP", () => {
    const result = rankXpLeaderboard(
      [
        { userId: "u-1", name: "Zero", xp: 0 },
        { userId: "u-2", name: "Negative", xp: -50 },
        { userId: "u-3", name: "Broken", xp: Number.NaN },
        { userId: "u-4", name: "Positive", xp: 40 },
      ],
      { currentUser: { id: "u-1", name: "Zero" } },
    );

    expect(result.totalRankedLearners).toBe(1);
    expect(result.entries).toEqual([
      {
        rank: 1,
        userId: "u-4",
        name: "Positive",
        xp: 40,
        isCurrentUser: false,
      },
    ]);
    expect(result.myStanding).toEqual({
      userId: "u-1",
      name: "Zero",
      xp: 0,
      rank: null,
      inTop: false,
    });
  });

  it("computes accurate rank and standing when the current user falls outside the top N limit", () => {
    const result = rankXpLeaderboard(
      [
        { userId: "u-1", name: "Top 1", xp: 500 },
        { userId: "u-2", name: "Top 2", xp: 400 },
        { userId: "u-3", name: "Third", xp: 300 },
        { userId: "u-me", name: "Me", xp: 120 },
      ],
      { currentUser: { id: "u-me", name: "Me" }, limit: 2 },
    );

    expect(result.entries).toHaveLength(2);
    expect(result.totalRankedLearners).toBe(4);
    expect(result.myStanding).toEqual({
      userId: "u-me",
      name: "Me",
      xp: 120,
      rank: 4,
      inTop: false,
    });
  });

  it("returns rank null when the current user has no XP in the filtered scope", () => {
    const result = rankXpLeaderboard(
      [{ userId: "u-1", name: "Leader", xp: 100 }],
      { currentUser: { id: "u-me", name: "Me" } },
    );

    expect(result.myStanding).toEqual({
      userId: "u-me",
      name: "Me",
      xp: 0,
      rank: null,
      inTop: false,
    });
  });
});
