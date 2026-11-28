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

export async function getContestSubmissionProgress(
  contestId: string,
  userId: string,
  client: Prisma.TransactionClient = db,
) {
  const [exercises, submissions] = await Promise.all([
    client.contestExercise.findMany({
      where: { contestId },
      orderBy: [{ position: "asc" }, { exerciseId: "asc" }],
      select: { exerciseId: true },
    }),
    client.submission.findMany({
      where: { contestId, userId },
      distinct: ["exerciseId"],
      select: { exerciseId: true },
    }),
  ]);
  const submittedExerciseIds = submissions.map((item) => item.exerciseId);
  const nextExerciseId =
    exercises.find((item) => !submittedExerciseIds.includes(item.exerciseId))
      ?.exerciseId ?? null;
  return {
    submittedExerciseIds,
    /** Đề theo thứ tự, true khi thí sinh đã nộp bài đó. */
    submittedInOrder: exercises.map((item) =>
      submittedExerciseIds.includes(item.exerciseId),
    ),
    nextExerciseId,
    finished: exercises.length > 0 && !nextExerciseId,
  };
}

const publicSubmission = {
  id: true,
  exerciseId: true,
  exercise: { select: { title: true } },
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
    // Serialize all submissions for an exercise, including changed code and languages.
    const existing = await tx.submission.findFirst({
      where: {
        contestId,
        userId: data.userId,
        exerciseId: data.exerciseId,
      },
      select: { id: true },
    });
    if (existing)
      throw new AppError(
        409,
        "EXERCISE_ALREADY_SUBMITTED",
        "Bạn đã nộp bài này. Mỗi bài chỉ được nộp một lần.",
      );
    assertParticipantCanEnter(contest, participant, Date.now());
    const submission = await tx.submission.create({
      // Reserve grading before exposing an early-finished attempt to recovery requests.
      data: {
        ...data,
        status: "RUNNING",
        createdAt: acceptedAt,
        flaggedForReview: !!participant.flaggedAt,
      },
      select: { id: true },
    });
    const progress = await getContestSubmissionProgress(
      contestId,
      data.userId,
      tx,
    );
    if (progress.finished) {
      await tx.contestParticipant.update({
        where: { contestId_userId: { contestId, userId: data.userId } },
        data: { finishedAt: new Date() },
      });
      // Keep the last manual result recoverable after reload, just like expiry.
      await tx.contestDraft.upsert({
        where: { contestId_userId: { contestId, userId: data.userId } },
        create: { ...data, contestId, finalSubmissionId: submission.id },
        update: { finalSubmissionId: submission.id },
      });
    }
    return submission;
  });
}

export function finalizeSavedDraft(contestId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const participant = await lockParticipant(tx, contestId, userId);
    const contest = await currentContest(tx, contestId);
    const key = { contestId_userId: { contestId, userId } };
    const draft = await tx.contestDraft.findUnique({ where: key });
    if (participant.finishedAt)
      return { submissionId: draft?.finalSubmissionId ?? null };
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
    // A submitted exercise stays final even if another tab saved changed code.
    const existing = await tx.submission.findFirst({
      where: {
        contestId,
        userId,
        exerciseId: draft.exerciseId,
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
          flaggedForReview: !!participant.flaggedAt,
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
