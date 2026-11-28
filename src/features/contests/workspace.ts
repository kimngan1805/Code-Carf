import { AppError } from "@/lib/errors";
import { MAX_SOURCE_LENGTH, submitSolution } from "@/features/grading/submit";
import { getContestEntry } from "./service";
import { findUserContestSubmission, listContestExercises } from "./repository";
import { contestSubmissionSchema } from "./submission-schema";
import { assertParticipantCanEnter, getAttemptDeadline } from "./access";
import {
  createTimedContestSubmission,
  getContestSubmissionProgress,
} from "./deadline-repository";
import {
  closeExpiredStages,
  finishIfStagesDone,
  loadStageState,
  startStageAttempt,
} from "./stage-repository";

export async function getContestWorkspace(slug: string) {
  const entry = await getContestEntry(slug);
  // Chặng vừa hết giờ: tự nộp bài đang làm dở trước khi mở chặng tiếp theo.
  const closed = await closeExpiredStages(entry.contest.id, entry.userId);
  if (closed?.finished)
    throw new AppError(403, "CONTEST_FINISHED", "Bạn đã hoàn thành mọi chặng.");
  const [exercises, state] = await Promise.all([
    listContestExercises(entry.contest.id),
    loadStageState(entry.contest.id, entry.userId),
  ]);
  const { progress } = state;
  const serverNow = Date.now();
  assertParticipantCanEnter(entry.contest, entry.participant, serverNow);
  const attemptDeadline = getAttemptDeadline(entry.contest, entry.participant)!;
  // Cuộc thi theo hành trình chỉ mở đề của chặng hiện tại, với đồng hồ riêng của chặng.
  const stage = state.current;
  const stageAttempt = stage
    ? (stage.attempt ??
      (await startStageAttempt(stage, entry.userId, attemptDeadline)))
    : null;
  const visible = stage ? exercises.slice(stage.start, stage.end) : exercises;
  const nextExerciseId = stage
    ? (visible.find(
        ({ exercise }) => !progress.submittedExerciseIds.includes(exercise.id),
      )?.exercise.id ?? null)
    : progress.nextExerciseId;
  return {
    userId: entry.userId,
    progress: { ...progress, nextExerciseId },
    stage:
      stage && stageAttempt
        ? {
            number: stage.number,
            name: stage.name,
            durationMinutes: stage.durationMinutes,
            deadlineAt: stageAttempt.deadlineAt.toISOString(),
          }
        : null,
    proctoring: {
      violationCount: entry.participant.violationCount ?? 0,
      threshold: entry.contest.violationThreshold ?? 3,
      flagged: !!entry.participant.flaggedAt,
    },
    contest: {
      id: entry.contest.id,
      slug: entry.contest.slug,
      title: entry.contest.title,
      deadlineAt: attemptDeadline.toISOString(),
      examEndsAt: entry.contest.examEndsAt!.toISOString(),
    },
    serverNow,
    maxSourceLength: MAX_SOURCE_LENGTH,
    exercises: visible.map(({ exercise, points, position }) => ({
      ...exercise,
      points: points ?? exercise.points,
      position,
    })),
  };
}

export type ContestWorkspaceData = Awaited<
  ReturnType<typeof getContestWorkspace>
>;

export async function submitContestSolution(slug: string, body: unknown) {
  const parsed = contestSubmissionSchema.safeParse(body);
  if (!parsed.success)
    throw new AppError(
      400,
      "INVALID_SUBMISSION",
      "Chọn bài, ngôn ngữ hợp lệ và nhập code (tối đa 64 KB).",
    );
  const entry = await getContestEntry(slug);
  const { stages, current: stage } = await loadStageState(
    entry.contest.id,
    entry.userId,
  );
  if (stages.length > 0) {
    if (!stage)
      throw new AppError(
        403,
        "CONTEST_FINISHED",
        "Bạn đã hoàn thành mọi chặng.",
      );
    const exercises = await listContestExercises(entry.contest.id);
    const allowed = exercises
      .slice(stage.start, stage.end)
      .some(({ exercise }) => exercise.id === parsed.data.exerciseId);
    if (!allowed)
      throw new AppError(
        409,
        "STAGE_LOCKED",
        `Bài này chưa mở. Hãy hoàn thành chặng ${stage.number} trước.`,
      );
    if (!stage.attempt || +stage.attempt.deadlineAt <= Date.now())
      throw new AppError(
        403,
        "STAGE_TIME_UP",
        `Đã hết giờ chặng ${stage.number}. Bài đang làm dở sẽ được tự nộp.`,
      );
  }
  const result = await submitSolution(
    {
      ...parsed.data,
      userId: entry.userId,
      contestId: entry.contest.id,
    },
    { createSubmission: createTimedContestSubmission },
  );
  const saved = await findUserContestSubmission(
    result.submissionId,
    entry.contest.id,
    entry.userId,
  );
  const progress = await getContestSubmissionProgress(
    entry.contest.id,
    entry.userId,
  );
  // Nộp xong bài cuối của chặng: dừng lại để thí sinh quay về bản đồ mở chặng sau.
  const stageFinished =
    !!stage &&
    progress.submittedInOrder.slice(stage.start, stage.end).every(Boolean);
  // Chặng cuối xong (kể cả khi chặng trước có bài bỏ trống do hết giờ) thì kết thúc lượt thi.
  if (stageFinished) await finishIfStagesDone(entry.contest.id, entry.userId);
  return {
    ...result,
    progress: stageFinished ? { ...progress, nextExerciseId: null } : progress,
    stageFinished: stageFinished ? stage.number : null,
    id: result.submissionId,
    exerciseId: parsed.data.exerciseId,
    createdAt: saved.createdAt.toISOString(),
  };
}

export type ContestSubmissionResult = Awaited<
  ReturnType<typeof submitContestSolution>
>;
