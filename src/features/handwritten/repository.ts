import { ContestStatus, SubmissionStatus } from "@prisma/client";
import { assertParticipantCanEnter } from "@/features/contests/access";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { isFinalStatus } from "./rules";

export function findExerciseForUpload(exerciseId: string) {
  return db.exercise.findUnique({
    where: { id: exerciseId },
    select: {
      id: true,
      kind: true,
      room: {
        select: {
          id: true,
          published: true,
          path: { select: { published: true, deletedAt: true } },
        },
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

/** What the learner may know about their own upload; never the storage key. */
export function findOwnUpload(
  userId: string,
  exerciseId: string,
  contestId: string | null,
) {
  return db.submission.findFirst({
    where: { userId, exerciseId, contestId, imageUrl: { not: null } },
    select: { id: true, status: true, createdAt: true },
  });
}

/** `imageUrl` holds a private storage key, not a link; it is only read here, to stream the file to its owner. */
export function findSubmissionImage(id: string) {
  return db.submission.findUnique({
    where: { id },
    select: {
      userId: true,
      imageUrl: true,
      contestId: true,
      exercise: {
        select: {
          room: {
            select: { path: { select: { creatorId: true, deletedAt: true } } },
          },
        },
      },
    },
  });
}

/**
 * Creates the learner's handwritten submission, or swaps its image while it
 * is still open. Returns the replaced storage key so the caller can delete the
 * old file once this commit succeeded.
 *
 * Everything runs under a lock per learner and exercise, so two parallel
 * uploads cannot create two submissions. In a contest the participant row is
 * locked too (like deadline finalization) and the deadline is checked again
 * with the time read after the lock, so an upload cannot slip in after the
 * attempt ended.
 */
export function saveHandwrittenImage(input: {
  userId: string;
  exerciseId: string;
  contestId: string | null;
  storageKey: string;
}) {
  const { userId, exerciseId, contestId, storageKey } = input;
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`handwritten:${userId}:${exerciseId}:${contestId ?? ""}`}))`;

    let flaggedForReview = false;
    if (contestId) {
      await tx.$queryRaw`SELECT "userId" FROM "ContestParticipant" WHERE "contestId" = ${contestId} AND "userId" = ${userId} FOR UPDATE`;
      const [participant, contest] = await Promise.all([
        tx.contestParticipant.findUnique({
          where: { contestId_userId: { contestId, userId } },
        }),
        tx.contest.findUnique({ where: { id: contestId } }),
      ]);
      if (!contest || contest.status !== ContestStatus.PUBLISHED)
        throw new AppError(403, "CONTEST_NOT_OPEN", "Cuộc thi đã đóng.");
      assertParticipantCanEnter(contest, participant, Date.now());
      flaggedForReview = !!participant?.flaggedAt;
    }

    const existing = await tx.submission.findFirst({
      where: { userId, exerciseId, contestId, imageUrl: { not: null } },
      select: { id: true, status: true, imageUrl: true },
    });
    if (existing && isFinalStatus(existing.status))
      throw new AppError(
        409,
        "SUBMISSION_FINALIZED",
        "Bài làm này đã được chấm, không thể nộp lại.",
      );

    if (!existing) {
      const created = await tx.submission.create({
        data: {
          userId,
          exerciseId,
          contestId,
          imageUrl: storageKey,
          status: SubmissionStatus.PENDING,
          flaggedForReview,
        },
        select: { id: true, createdAt: true },
      });
      return { ...created, replacedKey: null };
    }

    // A new image restarts grading: AI output for the old image no longer applies.
    const updated = await tx.submission.update({
      where: { id: existing.id },
      data: {
        imageUrl: storageKey,
        status: SubmissionStatus.PENDING,
        score: null,
        feedback: null,
        aiScore: null,
        aiFeedback: null,
        reviewerId: null,
        reviewedAt: null,
        createdAt: new Date(),
        ...(flaggedForReview ? { flaggedForReview: true } : {}),
      },
      select: { id: true, createdAt: true },
    });
    return { ...updated, replacedKey: existing.imageUrl };
  });
}
