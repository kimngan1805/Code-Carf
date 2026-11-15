import { ContestStatus, ExerciseKind, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  assertCanStart,
  assertExamOpen,
  assertParticipantCanEnter,
  getAttemptDeadline,
} from "./access";
import type { ContestDraftInput } from "./draft-schema";

const publicSubmission = {
  id: true,
  exerciseId: true,
  language: true,
  status: true,
  score: true,
  feedback: true,
  createdAt: true,
  autoSubmitted: true,
} as const;

async function lockParticipant(
  tx: Prisma.TransactionClient,
  contestId: string,
  userId: string,
) {
  await tx.$queryRaw`SELECT "userId" FROM "ContestParticipant" WHERE "contestId" = ${contestId} AND "userId" = ${userId} FOR UPDATE`;
  const participant = await tx.contestParticipant.findUnique({
    where: { contestId_userId: { contestId, userId } },
  });
  if (!participant)
    throw new AppError(403, "NOT_REGISTERED", "Bạn chưa đăng ký cuộc thi.");
  return participant;
}

async function currentContest(tx: Prisma.TransactionClient, contestId: string) {
  const contest = await tx.contest.findUnique({ where: { id: contestId } });
  if (
    !contest ||
    (contest.status !== ContestStatus.PUBLISHED &&
      contest.status !== ContestStatus.FINISHED)
  ) {
    throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
  }
  return contest;
}

async function assertCodeExercise(
  tx: Prisma.TransactionClient,
  contestId: string,
  exerciseId: string,
) {
  const link = await tx.contestExercise.findUnique({
    where: { contestId_exerciseId: { contestId, exerciseId } },
    select: { exercise: { select: { kind: true } } },
  });
  if (!link || link.exercise.kind !== ExerciseKind.CODE)
    throw new AppError(
      400,
      "INVALID_CONTEST_EXERCISE",
      "Bài lập trình không thuộc cuộc thi này.",
    );
}

export function saveActiveDraft(
  contestId: string,
  userId: string,
  input: ContestDraftInput,
) {
  return db.$transaction(async (tx) => {
    const participant = await lockParticipant(tx, contestId, userId);
    const contest = await currentContest(tx, contestId);
    if (input.exerciseId)
      await assertCodeExercise(tx, contestId, input.exerciseId);
    // Read time only after acquiring the lock and finishing validation.
    const acceptedAt = new Date();
    assertParticipantCanEnter(contest, participant, +acceptedAt);
    if (contest.status !== ContestStatus.PUBLISHED)
      throw new AppError(403, "CONTEST_NOT_OPEN", "Cuộc thi đã đóng.");
    const data = {
      exerciseId: input.exerciseId,
      source: input.exerciseId ? input.source : "",
      language: input.language,
      savedAt: acceptedAt,
    };
    return tx.contestDraft.upsert({
      where: { contestId_userId: { contestId, userId } },
      create: { contestId, userId, ...data },
      update: data,
      select: { savedAt: true },
    });
  });
}

export function createTimedContestSubmission(data: {
  userId: string;
  exerciseId: string;
  contestId: string | null;
  source: string;
  language: string;
}) {
  if (!data.contestId)
    throw new AppError(400, "CONTEST_REQUIRED", "Thiếu cuộc thi.");
  const contestId = data.contestId;
  return db.$transaction(async (tx) => {
    const participant = await lockParticipant(tx, contestId, data.userId);
    const contest = await currentContest(tx, contestId);
    await assertCodeExercise(tx, contestId, data.exerciseId);
    const acceptedAt = new Date();
    assertParticipantCanEnter(contest, participant, +acceptedAt);
    if (contest.status !== ContestStatus.PUBLISHED)
      throw new AppError(403, "CONTEST_NOT_OPEN", "Cuộc thi đã đóng.");
    return tx.submission.create({
      data: { ...data, status: "PENDING", createdAt: acceptedAt },
      select: { id: true },
    });
  });
}

export function finalizeSavedDraft(contestId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const participant = await lockParticipant(tx, contestId, userId);
    const contest = await currentContest(tx, contestId);
    const deadlineAt = getAttemptDeadline(contest, participant);
    if (!participant.startedAt || !deadlineAt || Date.now() < +deadlineAt) {
      throw new AppError(
        409,
        "CONTEST_NOT_ENDED",
        "Lượt làm bài của bạn chưa hết giờ hoặc chưa bắt đầu.",
      );
    }
    if (contest.requireFaceCheck && !participant.faceVerifiedAt)
      throw new AppError(
        403,
        "FACE_CHECK_REQUIRED",
        "Bạn chưa xác minh khuôn mặt.",
      );
    const key = { contestId_userId: { contestId, userId } };
    const draft = await tx.contestDraft.findUnique({ where: key });
    // The participant lock serializes all tabs, retries, draft writes, and manual submissions.
    if (participant.finishedAt)
      return { submissionId: draft?.finalSubmissionId ?? null };
    await tx.contestParticipant.update({
      where: key,
      data: { finishedAt: deadlineAt },
    });
    if (
      !draft?.exerciseId ||
      !draft.source.trim() ||
      draft.savedAt >= deadlineAt
    )
      return { submissionId: null };
    await assertCodeExercise(tx, contestId, draft.exerciseId);
    // Reuse an identical manual submission rather than storing the same answer twice.
    const existing = await tx.submission.findFirst({
      where: {
        contestId,
        userId,
        exerciseId: draft.exerciseId,
        source: draft.source,
        language: draft.language,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const submission =
      existing ??
      (await tx.submission.create({
        data: {
          contestId,
          userId,
          exerciseId: draft.exerciseId,
          source: draft.source,
          language: draft.language,
          autoSubmitted: true,
          status: "PENDING",
        },
        select: { id: true },
      }));
    await tx.contestDraft.update({
      where: key,
      data: { finalSubmissionId: submission.id },
    });
    return { submissionId: submission.id };
  });
}

export function findFinalSubmission(
  id: string,
  contestId: string,
  userId: string,
) {
  return db.submission.findFirstOrThrow({
    where: { id, contestId, userId },
    select: publicSubmission,
  });
}

export function findDeadlineContest(slug: string) {
  return db.contest.findFirst({
    where: {
      slug,
      status: { in: [ContestStatus.PUBLISHED, ContestStatus.FINISHED] },
    },
    select: { id: true, title: true, examEndsAt: true },
  });
}

export function startContestAttempt(contestId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const participant = await lockParticipant(tx, contestId, userId);
    const contest = await currentContest(tx, contestId);
    if (contest.status !== ContestStatus.PUBLISHED)
      throw new AppError(403, "CONTEST_NOT_OPEN", "Cuộc thi đã đóng.");
    assertCanStart(contest, participant);
    assertExamOpen(contest, Date.now());
    // Registration dates never shorten, reset, or start a participant's attempt.
    if (participant.startedAt && participant.deadlineAt)
      return {
        startedAt: participant.startedAt,
        deadlineAt: getAttemptDeadline(contest, participant),
      };
    if (
      !Number.isInteger(contest.durationMinutes) ||
      contest.durationMinutes <= 0
    )
      throw new AppError(
        409,
        "INVALID_DURATION",
        "Cuộc thi chưa có thời lượng làm bài hợp lệ.",
      );
    const startedAt = new Date();
    assertExamOpen(contest, +startedAt);
    const deadlineAt = new Date(
      Math.min(
        +startedAt + contest.durationMinutes * 60000,
        +contest.examEndsAt!,
      ),
    );
    return tx.contestParticipant.update({
      where: { contestId_userId: { contestId, userId } },
      data: { startedAt, deadlineAt },
      select: { startedAt: true, deadlineAt: true },
    });
  });
}
