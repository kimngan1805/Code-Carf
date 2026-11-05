import { describe, expect, it } from "vitest";
import {
  aggregateCompletedWeekXp,
  countDistinctAcceptedExercises,
  evaluateEligibleBadges,
  getCompletedWeekWinners,
  getLastCompletedWeekRange,
  hasCompletedFiveExercises,
  hasCompletedPath,
  hasReachedSevenDayStreak,
  isWeekCompleted,
  isWeeklyTopWinner,
  type BadgeEvaluationInput,
} from "./badges";

describe("hasCompletedPath", () => {
  it("returns false when learner has no paths or only empty paths", () => {
    expect(hasCompletedPath([])).toBe(false);
    expect(
      hasCompletedPath([
        { pathId: "p-empty", totalRooms: 0, completedRooms: 0 },
      ]),
    ).toBe(false);
  });

  it("returns false when all paths are still in progress", () => {
    expect(
      hasCompletedPath([
        { pathId: "p-1", totalRooms: 5, completedRooms: 4 },
        { pathId: "p-2", totalRooms: 1, completedRooms: 0 },
      ]),
    ).toBe(false);
  });

  it("returns true when at least one non-empty path has all rooms completed", () => {
    expect(
      hasCompletedPath([
        { pathId: "p-1", totalRooms: 5, completedRooms: 2 },
        { pathId: "p-2", totalRooms: 3, completedRooms: 3 },
      ]),
    ).toBe(true);
  });
});

describe("hasCompletedFiveExercises", () => {
  it("counts only distinct exerciseIds with ACCEPTED submissions", () => {
    const submissions = [
      { exerciseId: "ex-1", status: "ACCEPTED" },
      { exerciseId: "ex-1", status: "ACCEPTED" },
      { exerciseId: "ex-2", status: "ACCEPTED" },
      { exerciseId: "ex-3", status: "REJECTED" },
      { exerciseId: "ex-4", status: "ERROR" },
      { exerciseId: "ex-5", status: "PENDING" },
      { exerciseId: "ex-6", status: "ACCEPTED" },
    ];

    expect(countDistinctAcceptedExercises(submissions)).toBe(3);
    expect(hasCompletedFiveExercises(submissions)).toBe(false);
  });

  it("checks boundary values cleanly for count inputs", () => {
    expect(hasCompletedFiveExercises(0)).toBe(false);
    expect(hasCompletedFiveExercises(4)).toBe(false);
    expect(hasCompletedFiveExercises(Number.NaN)).toBe(false);
    expect(hasCompletedFiveExercises(5)).toBe(true);
    expect(hasCompletedFiveExercises(8)).toBe(true);
  });

  it("returns true once 5 distinct exerciseIds have ACCEPTED submissions", () => {
    const submissions = [
      { exerciseId: "ex-1", status: "ACCEPTED" },
      { exerciseId: "ex-2", status: "ACCEPTED" },
      { exerciseId: "ex-2", status: "ACCEPTED" },
      { exerciseId: "ex-3", status: "ACCEPTED" },
      { exerciseId: "ex-4", status: "ACCEPTED" },
      { exerciseId: "ex-5", status: "ACCEPTED" },
    ];

    expect(countDistinctAcceptedExercises(submissions)).toBe(5);
    expect(hasCompletedFiveExercises(submissions)).toBe(true);
  });
});

describe("hasReachedSevenDayStreak", () => {
  it("returns false when both currentStreak and longestStreak are below 7", () => {
    expect(hasReachedSevenDayStreak(0)).toBe(false);
    expect(hasReachedSevenDayStreak(6, 6)).toBe(false);
    expect(hasReachedSevenDayStreak(Number.NaN, 6)).toBe(false);
  });

  it("returns true when either currentStreak or longestStreak reaches 7", () => {
    expect(hasReachedSevenDayStreak(7, 7)).toBe(true);
    expect(hasReachedSevenDayStreak(7, 0)).toBe(true);
    expect(hasReachedSevenDayStreak(2, 7)).toBe(true);
    expect(hasReachedSevenDayStreak(10, 12)).toBe(true);
  });
});

describe("weekly leaderboard completed-week logic (Asia/Ho_Chi_Minh)", () => {
  it("computes the previous Monday-to-Sunday window around Vietnam midnight", () => {
    // Sunday 2026-11-15 23:59:59.999 +07:00 => week Nov 9..Nov 15 is NOT ended yet.
    const sundayEnd = new Date("2026-11-15T23:59:59.999+07:00");
    expect(getLastCompletedWeekRange(sundayEnd)).toEqual({
      startsAt: new Date("2026-11-02T00:00:00+07:00"),
      endsAt: new Date("2026-11-09T00:00:00+07:00"),
    });

    // Monday 2026-11-16 00:00:00.000 +07:00 => week Nov 9..Nov 15 has just ended.
    const mondayStart = new Date("2026-11-16T00:00:00.000+07:00");
    expect(getLastCompletedWeekRange(mondayStart)).toEqual({
      startsAt: new Date("2026-11-09T00:00:00+07:00"),
      endsAt: new Date("2026-11-16T00:00:00+07:00"),
    });
  });

  it("never evaluates or awards winners when the week window has not ended yet", () => {
    const ongoingWeek = {
      startsAt: new Date("2026-11-09T00:00:00+07:00"),
      endsAt: new Date("2026-11-16T00:00:00+07:00"),
    };
    const nowDuringWeek = new Date("2026-11-15T23:59:59+07:00");

    expect(isWeekCompleted(ongoingWeek, nowDuringWeek)).toBe(false);
    expect(
      aggregateCompletedWeekXp(
        [
          {
            userId: "u-1",
            amount: 200,
            createdAt: new Date("2026-11-10T10:00:00+07:00"),
          },
        ],
        ongoingWeek,
        nowDuringWeek,
      ),
    ).toEqual([]);
    expect(
      getCompletedWeekWinners(
        [{ userId: "u-1", weeklyXp: 200 }],
        ongoingWeek,
        nowDuringWeek,
      ),
    ).toEqual([]);
  });

  it("aggregates events inside [startsAt, endsAt) and awards all tied top-1 winners with XP > 0", () => {
    const closedWeek = {
      startsAt: new Date("2026-11-09T00:00:00+07:00"),
      endsAt: new Date("2026-11-16T00:00:00+07:00"),
    };
    const afterWeekClose = new Date("2026-11-16T00:00:00+07:00");

    const standings = aggregateCompletedWeekXp(
      [
        // Included: inside closed week
        {
          userId: "u-1",
          amount: 100,
          createdAt: new Date("2026-11-09T00:00:00+07:00"),
        },
        {
          userId: "u-1",
          amount: 50,
          createdAt: new Date("2026-11-15T23:59:59+07:00"),
        },
        {
          userId: "u-2",
          amount: 150,
          createdAt: new Date("2026-11-12T12:00:00+07:00"),
        },
        {
          userId: "u-3",
          amount: 80,
          createdAt: new Date("2026-11-12T12:00:00+07:00"),
        },
        // Excluded: right at exclusive endsAt (next week) and before startsAt
        {
          userId: "u-3",
          amount: 500,
          createdAt: new Date("2026-11-16T00:00:00+07:00"),
        },
        {
          userId: "u-3",
          amount: 500,
          createdAt: new Date("2026-11-08T23:59:59+07:00"),
        },
      ],
      closedWeek,
      afterWeekClose,
    );

    expect(standings).toEqual([
      { userId: "u-1", weeklyXp: 150 },
      { userId: "u-2", weeklyXp: 150 },
      { userId: "u-3", weeklyXp: 80 },
    ]);

    expect(
      getCompletedWeekWinners(standings, closedWeek, afterWeekClose),
    ).toEqual(["u-1", "u-2"]);
    expect(
      isWeeklyTopWinner("u-1", standings, closedWeek, afterWeekClose),
    ).toBe(true);
    expect(
      isWeeklyTopWinner("u-2", standings, closedWeek, afterWeekClose),
    ).toBe(true);
    expect(
      isWeeklyTopWinner("u-3", standings, closedWeek, afterWeekClose),
    ).toBe(false);
  });

  it("returns no winners when everyone has 0 XP", () => {
    const closedWeek = {
      startsAt: new Date("2026-11-09T00:00:00+07:00"),
      endsAt: new Date("2026-11-16T00:00:00+07:00"),
    };
    const afterWeekClose = new Date("2026-11-16T08:00:00+07:00");

    expect(
      getCompletedWeekWinners(
        [
          { userId: "u-1", weeklyXp: 0 },
          { userId: "u-2", weeklyXp: -10 },
        ],
        closedWeek,
        afterWeekClose,
      ),
    ).toEqual([]);
  });
});

describe("evaluateEligibleBadges", () => {
  it("evaluates all 4 milestones, excludes already-earned badges, and does not treat first-path-room as five-exercises", () => {
    const closedWeek = {
      startsAt: new Date("2026-11-09T00:00:00+07:00"),
      endsAt: new Date("2026-11-16T00:00:00+07:00"),
    };
    const input: BadgeEvaluationInput = {
      userId: "user-1",
      earnedBadgeSlugs: ["first-path-room", "streak-7"],
      paths: [{ pathId: "path-1", totalRooms: 4, completedRooms: 4 }],
      acceptedExerciseCount: 5,
      currentStreak: 7,
      longestStreak: 9,
      completedWeek: {
        week: closedWeek,
        standings: [
          { userId: "user-1", weeklyXp: 300 },
          { userId: "user-2", weeklyXp: 200 },
        ],
        referenceDate: new Date("2026-11-16T01:00:00+07:00"),
      },
    };

    const earnedBefore = [...input.earnedBadgeSlugs];
    const result = evaluateEligibleBadges(input);

    expect(result).toEqual([
      "path-completed",
      "five-exercises",
      "weekly-top-1",
    ]);
    // Input arrays remain untouched
    expect(input.earnedBadgeSlugs).toEqual(earnedBefore);
  });

  it("does not award five-exercises just because user already earned first-path-room", () => {
    const result = evaluateEligibleBadges({
      userId: "user-1",
      earnedBadgeSlugs: ["first-path-room"],
      paths: [{ pathId: "path-1", totalRooms: 10, completedRooms: 5 }],
      acceptedExerciseCount: 4,
      currentStreak: 3,
      longestStreak: 3,
    });

    expect(result).toEqual([]);
  });

  it("ignores ongoing week standings when evaluating weekly-top-1", () => {
    const result = evaluateEligibleBadges({
      userId: "user-1",
      earnedBadgeSlugs: [],
      paths: [],
      acceptedExerciseCount: 0,
      currentStreak: 0,
      completedWeek: {
        week: {
          startsAt: new Date("2026-11-09T00:00:00+07:00"),
          endsAt: new Date("2026-11-16T00:00:00+07:00"),
        },
        standings: [{ userId: "user-1", weeklyXp: 500 }],
        referenceDate: new Date("2026-11-13T12:00:00+07:00"),
      },
    });

    expect(result).toEqual([]);
  });
});
