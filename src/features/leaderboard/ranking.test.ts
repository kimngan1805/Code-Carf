import { SubmissionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  aggregateContestScores,
  computeContestLeaderboard,
  rankContestParticipants,
  type ParticipantScoreSummary,
  type RankableSubmission,
} from "./ranking";

const t = (minute: number, second = 0) =>
  new Date(Date.UTC(2026, 10, 15, 10, minute, second));

describe("aggregateContestScores", () => {
  it("takes the highest score per exercise and the earliest time for repeated best scores", () => {
    const submissions: RankableSubmission[] = [
      {
        userId: "u1",
        exerciseId: "ex-1",
        contestId: "c1",
        status: SubmissionStatus.REJECTED,
        score: 40,
        createdAt: t(5),
      },
      {
        userId: "u1",
        exerciseId: "ex-1",
        contestId: "c1",
        status: SubmissionStatus.ACCEPTED,
        score: 100,
        createdAt: t(12),
      },
      // Later lower score must not overwrite best score
      {
        userId: "u1",
        exerciseId: "ex-1",
        contestId: "c1",
        status: SubmissionStatus.REJECTED,
        score: 20,
        createdAt: t(15),
      },
      // Earlier tie for best score (unsorted input order) must win
      {
        userId: "u1",
        exerciseId: "ex-1",
        contestId: "c1",
        status: SubmissionStatus.ACCEPTED,
        score: 100,
        createdAt: t(9),
      },
    ];

    const result = aggregateContestScores(submissions, { contestId: "c1" });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      userId: "u1",
      totalScore: 100,
      achievedAt: t(9),
      exerciseBests: {
        "ex-1": {
          exerciseId: "ex-1",
          score: 100,
          achievedAt: t(9),
        },
      },
    });
  });

  it("sums best scores across exercises and sets achievedAt to the latest positive exercise time", () => {
    const submissions: RankableSubmission[] = [
      {
        userId: "u1",
        exerciseId: "ex-1",
        status: SubmissionStatus.ACCEPTED,
        score: 100,
        createdAt: t(10),
      },
      {
        userId: "u1",
        exerciseId: "ex-2",
        status: SubmissionStatus.REJECTED,
        score: 60,
        createdAt: t(25),
      },
      // A later 0-score attempt on ex-3 must not push achievedAt past t(25)
      {
        userId: "u1",
        exerciseId: "ex-3",
        status: SubmissionStatus.REJECTED,
        score: 0,
        createdAt: t(40),
      },
    ];

    const [summary] = aggregateContestScores(submissions);

    expect(summary?.totalScore).toBe(160);
    expect(summary?.achievedAt).toEqual(t(25));
  });

  it("ignores PENDING, RUNNING, NEEDS_REVIEW, ERROR, and null-score submissions", () => {
    const submissions: RankableSubmission[] = [
      {
        userId: "u1",
        exerciseId: "ex-1",
        status: SubmissionStatus.PENDING,
        score: 100,
        createdAt: t(1),
      },
      {
        userId: "u1",
        exerciseId: "ex-1",
        status: SubmissionStatus.RUNNING,
        score: 100,
        createdAt: t(2),
      },
      {
        userId: "u1",
        exerciseId: "ex-1",
        status: SubmissionStatus.NEEDS_REVIEW,
        score: 90,
        createdAt: t(3),
      },
      {
        userId: "u1",
        exerciseId: "ex-1",
        status: SubmissionStatus.ERROR,
        score: 100,
        createdAt: t(4),
      },
      {
        userId: "u1",
        exerciseId: "ex-1",
        status: SubmissionStatus.ACCEPTED,
        score: null,
        createdAt: t(5),
      },
      {
        userId: "u1",
        exerciseId: "ex-1",
        status: SubmissionStatus.REJECTED,
        score: 50,
        createdAt: t(8),
      },
    ];

    const [summary] = aggregateContestScores(submissions);

    expect(summary?.totalScore).toBe(50);
    expect(summary?.achievedAt).toEqual(t(8));
  });

  it("sets achievedAt to null when totalScore is 0 or participant has no valid submissions", () => {
    const submissions: RankableSubmission[] = [
      {
        userId: "u-zero",
        exerciseId: "ex-1",
        status: SubmissionStatus.REJECTED,
        score: 0,
        createdAt: t(5),
      },
      {
        userId: "u-error",
        exerciseId: "ex-1",
        status: SubmissionStatus.ERROR,
        score: 0,
        createdAt: t(6),
      },
    ];

    const result = aggregateContestScores(submissions, {
      participantIds: ["u-zero", "u-error", "u-nosub", "u-nosub"],
    });

    expect(result).toHaveLength(3);
    for (const entry of result) {
      expect(entry.totalScore).toBe(0);
      expect(entry.achievedAt).toBeNull();
    }
    expect(
      result.find((entry) => entry.userId === "u-nosub")?.exerciseBests,
    ).toEqual({});
  });

  it("enforces single-contest input and rejects practice or mixed contest submissions", () => {
    expect(() =>
      aggregateContestScores([
        {
          userId: "u1",
          exerciseId: "ex-1",
          contestId: null,
          status: SubmissionStatus.ACCEPTED,
          score: 100,
          createdAt: t(1),
        },
      ]),
    ).toThrow(/contestId=null/);

    expect(() =>
      aggregateContestScores([
        {
          userId: "u1",
          exerciseId: "ex-1",
          contestId: "c1",
          status: SubmissionStatus.ACCEPTED,
          score: 100,
          createdAt: t(1),
        },
        {
          userId: "u2",
          exerciseId: "ex-1",
          contestId: "c2",
          status: SubmissionStatus.ACCEPTED,
          score: 100,
          createdAt: t(2),
        },
      ]),
    ).toThrow(/single contest/);

    expect(() =>
      aggregateContestScores(
        [
          {
            userId: "u1",
            exerciseId: "ex-1",
            contestId: "c2",
            status: SubmissionStatus.ACCEPTED,
            score: 100,
            createdAt: t(1),
          },
        ],
        { contestId: "c1" },
      ),
    ).toThrow(/single contest/);
  });

  it("rejects invalid createdAt timestamps", () => {
    expect(() =>
      aggregateContestScores([
        {
          userId: "u1",
          exerciseId: "ex-1",
          status: SubmissionStatus.ACCEPTED,
          score: 100,
          createdAt: new Date("invalid"),
        },
      ]),
    ).toThrow(/Invalid submission createdAt/);
  });
});

describe("rankContestParticipants and computeContestLeaderboard", () => {
  it("breaks score ties by earlier achievedAt across multiple exercises", () => {
    const submissions: RankableSubmission[] = [
      // u1: 100 on ex-1 at 05m, 100 on ex-2 at 20m -> 200 at 20m
      {
        userId: "u1",
        exerciseId: "ex-1",
        status: SubmissionStatus.ACCEPTED,
        score: 100,
        createdAt: t(5),
      },
      {
        userId: "u1",
        exerciseId: "ex-2",
        status: SubmissionStatus.ACCEPTED,
        score: 100,
        createdAt: t(20),
      },
      // u2: 100 on ex-2 at 15m, 100 on ex-1 at 18m -> 200 at 18m (earlier total achievement!)
      {
        userId: "u2",
        exerciseId: "ex-2",
        status: SubmissionStatus.ACCEPTED,
        score: 100,
        createdAt: t(15),
      },
      {
        userId: "u2",
        exerciseId: "ex-1",
        status: SubmissionStatus.ACCEPTED,
        score: 100,
        createdAt: t(18),
      },
    ];

    const ranked = computeContestLeaderboard(submissions);

    expect(
      ranked.map((r) => ({
        userId: r.userId,
        rank: r.rank,
        totalScore: r.totalScore,
      })),
    ).toEqual([
      { userId: "u2", rank: 1, totalScore: 200 },
      { userId: "u1", rank: 2, totalScore: 200 },
    ]);
  });

  it("assigns shared competition ranks (1, 1, 3) when tied on both score and time, ordered stably by userId", () => {
    const submissions: RankableSubmission[] = [
      // Deliberately insert u-charlie before u-alpha
      {
        userId: "u-charlie",
        exerciseId: "ex-1",
        status: SubmissionStatus.ACCEPTED,
        score: 150,
        createdAt: t(10, 30),
      },
      {
        userId: "u-bravo",
        exerciseId: "ex-1",
        status: SubmissionStatus.REJECTED,
        score: 100,
        createdAt: t(4),
      },
      {
        userId: "u-alpha",
        exerciseId: "ex-1",
        status: SubmissionStatus.ACCEPTED,
        score: 150,
        createdAt: t(10, 30),
      },
      {
        userId: "u-delta",
        exerciseId: "ex-1",
        status: SubmissionStatus.REJECTED,
        score: 100,
        createdAt: t(4),
      },
    ];

    const ranked = computeContestLeaderboard(submissions);

    expect(
      ranked.map((r) => ({
        rank: r.rank,
        userId: r.userId,
        totalScore: r.totalScore,
        achievedAt: r.achievedAt,
      })),
    ).toEqual([
      { rank: 1, userId: "u-alpha", totalScore: 150, achievedAt: t(10, 30) },
      { rank: 1, userId: "u-charlie", totalScore: 150, achievedAt: t(10, 30) },
      { rank: 3, userId: "u-bravo", totalScore: 100, achievedAt: t(4) },
      { rank: 3, userId: "u-delta", totalScore: 100, achievedAt: t(4) },
    ]);
  });

  it("places zero-point participants last and ties them together regardless of submission time", () => {
    const ranked = computeContestLeaderboard(
      [
        {
          userId: "u-zero-early",
          exerciseId: "ex-1",
          status: SubmissionStatus.REJECTED,
          score: 0,
          createdAt: t(1),
        },
        {
          userId: "u-zero-late",
          exerciseId: "ex-1",
          status: SubmissionStatus.REJECTED,
          score: 0,
          createdAt: t(30),
        },
        {
          userId: "u-scorer",
          exerciseId: "ex-1",
          status: SubmissionStatus.REJECTED,
          score: 25,
          createdAt: t(20),
        },
      ],
      { participantIds: ["u-absent"] },
    );

    expect(
      ranked.map((r) => ({
        rank: r.rank,
        userId: r.userId,
        totalScore: r.totalScore,
        achievedAt: r.achievedAt,
      })),
    ).toEqual([
      { rank: 1, userId: "u-scorer", totalScore: 25, achievedAt: t(20) },
      { rank: 2, userId: "u-absent", totalScore: 0, achievedAt: null },
      { rank: 2, userId: "u-zero-early", totalScore: 0, achievedAt: null },
      { rank: 2, userId: "u-zero-late", totalScore: 0, achievedAt: null },
    ]);
  });

  it("accepts numeric epoch timestamps identically to Date instances", () => {
    const ranked = computeContestLeaderboard([
      {
        userId: "u1",
        exerciseId: "ex-1",
        status: SubmissionStatus.ACCEPTED,
        score: 100,
        createdAt: t(15).getTime(),
      },
      {
        userId: "u2",
        exerciseId: "ex-1",
        status: SubmissionStatus.ACCEPTED,
        score: 100,
        createdAt: t(10).getTime(),
      },
    ]);

    expect(ranked.map((r) => r.userId)).toEqual(["u2", "u1"]);
    expect(ranked[0]?.achievedAt).toEqual(t(10));
  });

  it("returns empty output for empty inputs and initializes participantIds with zero points", () => {
    expect(computeContestLeaderboard([])).toEqual([]);
    expect(
      computeContestLeaderboard([], { participantIds: ["u2", "u1"] }),
    ).toEqual([
      {
        rank: 1,
        userId: "u1",
        totalScore: 0,
        achievedAt: null,
        exerciseBests: {},
      },
      {
        rank: 1,
        userId: "u2",
        totalScore: 0,
        achievedAt: null,
        exerciseBests: {},
      },
    ]);
  });

  it("does not mutate input arrays or nested objects", () => {
    const submissionDate = t(12);
    const submissions: RankableSubmission[] = [
      {
        userId: "u2",
        exerciseId: "ex-1",
        status: SubmissionStatus.ACCEPTED,
        score: 50,
        createdAt: submissionDate,
      },
      {
        userId: "u1",
        exerciseId: "ex-1",
        status: SubmissionStatus.ACCEPTED,
        score: 100,
        createdAt: t(15),
      },
    ];
    const submissionsSnapshot = JSON.stringify(submissions);

    const summaries: ParticipantScoreSummary[] = [
      {
        userId: "u2",
        totalScore: 50,
        achievedAt: t(12),
        exerciseBests: {
          "ex-1": { exerciseId: "ex-1", score: 50, achievedAt: t(12) },
        },
      },
      {
        userId: "u1",
        totalScore: 100,
        achievedAt: t(15),
        exerciseBests: {
          "ex-1": { exerciseId: "ex-1", score: 100, achievedAt: t(15) },
        },
      },
    ];
    const originalOrder = summaries.map((s) => s.userId);

    const ranked = rankContestParticipants(summaries);
    ranked[0]!.achievedAt?.setUTCFullYear(2099);
    ranked[0]!.exerciseBests["ex-1"]!.score = 999;

    expect(JSON.stringify(submissions)).toBe(submissionsSnapshot);
    expect(summaries.map((s) => s.userId)).toEqual(originalOrder);
    expect(summaries[1]?.achievedAt).toEqual(t(15));
    expect(summaries[1]?.exerciseBests["ex-1"]?.score).toBe(100);
  });
});
