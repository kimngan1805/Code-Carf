import { describe, expect, it } from "vitest";
import {
  computeContestParticipantStanding,
  rankContestParticipantStandings,
} from "./contest-ranking";

describe("computeContestParticipantStanding", () => {
  it("sums best scores per exercise and penalizes every REJECTED submission including partial scores", () => {
    const standing = computeContestParticipantStanding(
      [
        {
          userId: "u-1",
          exerciseId: "ex-1",
          contestId: "contest-1",
          status: "ACCEPTED",
          score: 100,
          createdAt: new Date("2026-11-15T09:00:00Z"),
        },
        {
          userId: "u-1",
          exerciseId: "ex-2",
          contestId: "contest-1",
          status: "REJECTED",
          score: 50,
          createdAt: new Date("2026-11-15T09:05:00Z"),
        },
      ],
      20,
      "contest-1",
    );

    expect(standing).toEqual({
      score: 150,
      penaltyMinutes: 20,
    });
  });

  it("does not penalize ERROR system failures or double-count multiple retries", () => {
    const standing = computeContestParticipantStanding(
      [
        {
          userId: "u-1",
          exerciseId: "ex-1",
          contestId: "contest-1",
          status: "ERROR",
          score: 0,
          createdAt: new Date("2026-11-15T09:01:00Z"),
        },
        {
          userId: "u-1",
          exerciseId: "ex-1",
          contestId: "contest-1",
          status: "REJECTED",
          score: 40,
          createdAt: new Date("2026-11-15T09:02:00Z"),
        },
        {
          userId: "u-1",
          exerciseId: "ex-1",
          contestId: "contest-1",
          status: "ACCEPTED",
          score: 100,
          createdAt: new Date("2026-11-15T09:03:00Z"),
        },
      ],
      20,
      "contest-1",
    );

    expect(standing).toEqual({
      score: 100,
      penaltyMinutes: 20,
    });
  });
});

describe("rankContestParticipantStandings", () => {
  it("applies competition ranking (1, 1, 3) with penalty tie-break and stable userId tie-break", () => {
    const result = rankContestParticipantStandings(
      [
        {
          userId: "u-b",
          name: "B",
          score: 200,
          penaltyMinutes: 20,
          finished: true,
        },
        {
          userId: "u-a",
          name: "A",
          score: 200,
          penaltyMinutes: 20,
          finished: true,
        },
        {
          userId: "u-c",
          name: "C",
          score: 200,
          penaltyMinutes: 40,
          finished: false,
        },
        {
          userId: "u-d",
          name: "D",
          score: 100,
          penaltyMinutes: 0,
          finished: false,
        },
      ],
      { currentUserId: "u-d", limit: 3 },
    );

    expect(result.entries).toEqual([
      {
        rank: 1,
        userId: "u-a",
        name: "A",
        score: 200,
        penaltyMinutes: 20,
        finished: true,
        isCurrentUser: false,
      },
      {
        rank: 1,
        userId: "u-b",
        name: "B",
        score: 200,
        penaltyMinutes: 20,
        finished: true,
        isCurrentUser: false,
      },
      {
        rank: 3,
        userId: "u-c",
        name: "C",
        score: 200,
        penaltyMinutes: 40,
        finished: false,
        isCurrentUser: false,
      },
    ]);
    expect(result.totalParticipants).toBe(4);
    expect(result.myStanding).toEqual({
      userId: "u-d",
      name: "D",
      score: 100,
      penaltyMinutes: 0,
      rank: 4,
      inTop: false,
    });
  });
});
