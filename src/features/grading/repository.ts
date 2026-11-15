import type { SubmissionStatus } from "@prisma/client";
import { db } from "../../lib/db";

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
) {
  return db.submission.update({
    where: { id },
    data: result,
    select: { id: true },
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
