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

export async function getContestWorkspace(slug: string) {
  const entry = await getContestEntry(slug);
  const [exercises, progress] = await Promise.all([
    listContestExercises(entry.contest.id),
    getContestSubmissionProgress(entry.contest.id, entry.userId),
  ]);
  const serverNow = Date.now();
  assertParticipantCanEnter(entry.contest, entry.participant, serverNow);
  return {
    userId: entry.userId,
    progress,
    proctoring: {
      violationCount: entry.participant.violationCount ?? 0,
      threshold: entry.contest.violationThreshold ?? 3,
      flagged: !!entry.participant.flaggedAt,
    },
    contest: {
      id: entry.contest.id,
      slug: entry.contest.slug,
      title: entry.contest.title,
      deadlineAt: getAttemptDeadline(
        entry.contest,
        entry.participant,
      )!.toISOString(),
      examEndsAt: entry.contest.examEndsAt!.toISOString(),
    },
    serverNow,
    maxSourceLength: MAX_SOURCE_LENGTH,
    exercises: exercises.map(({ exercise, points, position }) => ({
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
  return {
    ...result,
    progress: await getContestSubmissionProgress(
      entry.contest.id,
      entry.userId,
    ),
    id: result.submissionId,
    exerciseId: parsed.data.exerciseId,
    createdAt: saved.createdAt.toISOString(),
  };
}

export type ContestSubmissionResult = Awaited<
  ReturnType<typeof submitContestSolution>
>;
