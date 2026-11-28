import { db } from "@/lib/db";
import { getContestSubmissionProgress } from "./deadline-repository";
import { listContestExercises } from "./repository";
import {
  resolveContestStages,
  stageDeadline,
  type StageAttempt,
} from "./stages";

export function listContestStages(contestId: string) {
  return db.contestStage.findMany({
    where: { contestId },
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      name: true,
      exerciseCount: true,
      durationMinutes: true,
    },
  });
}

export function listStageAttempts(contestId: string, userId: string) {
  return db.contestStageAttempt.findMany({
    where: { userId, stage: { contestId } },
    select: { stageId: true, startedAt: true, deadlineAt: true },
  });
}

/** Trạng thái các chặng của thí sinh tại thời điểm `now` (rỗng với cuộc thi thường). */
export async function loadStageState(
  contestId: string,
  userId: string,
  now = Date.now(),
) {
  const [stages, attempts, progress] = await Promise.all([
    listContestStages(contestId),
    listStageAttempts(contestId, userId),
    getContestSubmissionProgress(contestId, userId),
  ]);
  return {
    progress,
    ...resolveContestStages(stages, progress.submittedInOrder, attempts, now),
  };
}

/** Bắt đầu đồng hồ chặng khi thí sinh vào chặng lần đầu; vào lại không đặt lại giờ. */
export async function startStageAttempt(
  stage: { id: string; durationMinutes: number },
  userId: string,
  attemptDeadline: Date,
): Promise<StageAttempt> {
  const startedAt = new Date();
  return db.contestStageAttempt.upsert({
    where: { stageId_userId: { stageId: stage.id, userId } },
    update: {},
    create: {
      stageId: stage.id,
      userId,
      startedAt,
      deadlineAt: stageDeadline(
        startedAt,
        stage.durationMinutes,
        attemptDeadline,
      ),
    },
    select: { stageId: true, startedAt: true, deadlineAt: true },
  });
}

/**
 * Hết giờ chặng: tự nộp bản nháp đang làm nếu nó thuộc chặng đã hết giờ, chưa được nộp và được
 * lưu trước hạn chặng; các bài còn lại của chặng không có bài nộp (0 điểm). Khi mọi chặng đã
 * xong thì kết thúc lượt thi. Trả về id bài tự nộp (nếu có) và lượt thi đã kết thúc hay chưa.
 */
export async function closeExpiredStages(contestId: string, userId: string) {
  const now = Date.now();
  const [state, exercises] = await Promise.all([
    loadStageState(contestId, userId, now),
    listContestExercises(contestId),
  ]);
  if (state.stages.length === 0) return null;
  const key = { contestId_userId: { contestId, userId } };
  const submissionId = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "userId" FROM "ContestParticipant" WHERE "contestId" = ${contestId} AND "userId" = ${userId} FOR UPDATE`;
    const [participant, draft] = await Promise.all([
      tx.contestParticipant.findUnique({ where: key }),
      tx.contestDraft.findUnique({ where: key }),
    ]);
    if (!participant || participant.finishedAt) return null;
    let created: string | null = null;
    if (draft?.exerciseId && draft.source.trim()) {
      const position = exercises.findIndex(
        ({ exercise }) => exercise.id === draft.exerciseId,
      );
      const stage = state.stages.find(
        (item) =>
          position >= item.start &&
          position < item.end &&
          item.attempt &&
          +item.attempt.deadlineAt <= now,
      );
      const existing = await tx.submission.findFirst({
        where: { contestId, userId, exerciseId: draft.exerciseId },
        select: { id: true },
      });
      if (
        stage?.attempt &&
        !existing &&
        draft.savedAt < stage.attempt.deadlineAt
      ) {
        const submission = await tx.submission.create({
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
        });
        created = submission.id;
      }
      // Bản nháp của chặng đã hết giờ không được dùng lại ở chặng sau.
      if (stage) {
        await tx.contestDraft.update({
          where: key,
          data: { exerciseId: null, source: "", finalSubmissionId: created },
        });
      }
    }
    if (!state.current)
      await tx.contestParticipant.update({
        where: key,
        data: { finishedAt: new Date(now) },
      });
    return created;
  });
  return { submissionId, finished: !state.current };
}

/** Nộp xong bài cuối của chặng cuối thì kết thúc lượt thi dù có bài bị bỏ trống do hết giờ. */
export async function finishIfStagesDone(contestId: string, userId: string) {
  const state = await loadStageState(contestId, userId);
  if (state.stages.length === 0 || state.current) return false;
  await db.contestParticipant.updateMany({
    where: { contestId, userId, finishedAt: null },
    data: { finishedAt: new Date() },
  });
  return true;
}

/** Hạn chót của thí sinh ở chặng `number`, để đồng hồ phòng thi đếm theo chặng. */
export async function findStageDeadline(
  contestId: string,
  userId: string,
  number: number,
) {
  const attempt = await db.contestStageAttempt.findFirst({
    where: { userId, stage: { contestId, number } },
    select: { deadlineAt: true },
  });
  return attempt?.deadlineAt ?? null;
}
