import type { SubmissionStatus } from "@prisma/client";
import { db } from "../../lib/db";
import { computeContestParticipantStanding } from "../leaderboard/contest-ranking";

export function findCodeExerciseWithTests(exerciseId: string) {
  return db.exercise.findUnique({
    where: { id: exerciseId },
    select: {
      id: true,
      roomId: true,
      kind: true,
      points: true,
      timeLimitMs: true,
      memoryLimitKb: true,
      testCases: {
        select: {
          id: true,
          input: true,
          expected: true,
          isHidden: true,
          weight: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });
}

export async function isExerciseInContest(
  contestId: string,
  exerciseId: string,
): Promise<boolean> {
  const link = await db.contestExercise.findUnique({
    where: { contestId_exerciseId: { contestId, exerciseId } },
    select: { contestId: true },
  });
  return link !== null;
}

export async function findContestExercisePoints(
  contestId: string,
  exerciseId: string,
): Promise<number | null> {
  const link = await db.contestExercise.findUnique({
    where: { contestId_exerciseId: { contestId, exerciseId } },
    select: { points: true },
  });
  return link?.points ?? null;
}

export function countRecentSubmissions(userId: string, since: Date) {
  return db.submission.count({
    where: { userId, createdAt: { gte: since } },
  });
}

export function createPendingSubmission(data: {
  userId: string;
  exerciseId: string;
  contestId: string | null;
  source: string;
  language: string;
}) {
  return db.submission.create({
    data: { ...data, status: "PENDING" },
    select: { id: true },
  });
}

export function markSubmissionRunning(id: string) {
  return db.submission.update({
    where: { id },
    data: { status: "RUNNING" },
    select: { id: true },
  });
}

export function finishSubmission(
  id: string,
  result: {
    status: SubmissionStatus;
    score: number;
    feedback: string;
    runtimeMs: number | null;
    memoryKb: number | null;
  },
  contestContext?: { contestId: string; userId: string } | null,
) {
  if (!contestContext) {
    return db.submission.update({
      where: { id },
      data: result,
      select: { id: true },
    });
  }

  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "userId" FROM "ContestParticipant" WHERE "contestId" = ${contestContext.contestId} AND "userId" = ${contestContext.userId} FOR UPDATE`;

    const updated = await tx.submission.update({
      where: { id },
      data: result,
      select: { id: true },
    });

    const [contest, participant, submissions] = await Promise.all([
      tx.contest.findUnique({
        where: { id: contestContext.contestId },
        select: { penaltyMinutes: true },
      }),
      tx.contestParticipant.findUnique({
        where: {
          contestId_userId: {
            contestId: contestContext.contestId,
            userId: contestContext.userId,
          },
        },
        select: { userId: true },
      }),
      tx.submission.findMany({
        where: {
          contestId: contestContext.contestId,
          userId: contestContext.userId,
        },
        select: {
          exerciseId: true,
          contestId: true,
          status: true,
          score: true,
          createdAt: true,
        },
      }),
    ]);

    if (contest && participant) {
      const standing = computeContestParticipantStanding(
        submissions.map((item) => ({
          userId: contestContext.userId,
          exerciseId: item.exerciseId,
          contestId: item.contestId,
          status: item.status,
          score: item.score,
          createdAt: item.createdAt,
        })),
        contest.penaltyMinutes,
        contestContext.contestId,
      );

      await tx.contestParticipant.update({
        where: {
          contestId_userId: {
            contestId: contestContext.contestId,
            userId: contestContext.userId,
          },
        },
        data: {
          score: standing.score,
          penaltyMinutes: standing.penaltyMinutes,
        },
      });
    }

    return updated;
  });
}

export function findStoredSubmission(id: string) {
  return db.submission.findUniqueOrThrow({ where: { id } });
}

export async function claimPendingSubmission(id: string) {
  const result = await db.submission.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "RUNNING" },
  });
  return result.count === 1;
}

/**
 * Exercise data for the practice editor page. Only visible test cases are
 * selected, so hidden input/expected never leave the database layer.
 */
export function findExerciseForPractice(exerciseId: string) {
  return db.exercise.findUnique({
    where: { id: exerciseId },
    select: {
      id: true,
      title: true,
      prompt: true,
      kind: true,
      points: true,
      timeLimitMs: true,
      memoryLimitKb: true,
      roomId: true,
      room: {
        select: {
          id: true,
          title: true,
          published: true,
          path: { select: { slug: true, title: true, published: true } },
        },
      },
      testCases: {
        where: { isHidden: false },
        orderBy: { id: "asc" },
        select: { id: true, input: true, expected: true },
      },
    },
  });
}

/** Practice submissions only: contest submissions have their own history in the contest flow. */
const practiceOf = (userId: string) => ({ userId, contestId: null });

export function countPracticeSubmissions(userId: string) {
  return db.submission.count({ where: practiceOf(userId) });
}

export function findPracticeSubmissions(
  userId: string,
  skip: number,
  take: number,
) {
  return db.submission.findMany({
    where: practiceOf(userId),
    // id breaks ties so a page never repeats or skips rows with equal timestamps
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip,
    take,
    select: {
      id: true,
      status: true,
      score: true,
      language: true,
      createdAt: true,
      exercise: { select: { id: true, title: true, points: true } },
    },
  });
}

/** Includes `userId` and `contestId` so the service can check ownership; it never returns them. */
export function findSubmissionForHistory(id: string) {
  return db.submission.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      contestId: true,
      status: true,
      score: true,
      feedback: true,
      runtimeMs: true,
      memoryKb: true,
      language: true,
      source: true,
      createdAt: true,
      exercise: {
        select: {
          id: true,
          title: true,
          points: true,
          room: { select: { id: true, title: true } },
        },
      },
    },
  });
}
