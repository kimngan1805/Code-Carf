import { AppError } from "@/lib/errors";
import { MAX_SOURCE_LENGTH, submitSolution } from "@/features/grading/submit";
import { getContestEntry } from "./service";
import {
  findUserContestSubmission,
  listContestExercises,
  listUserContestSubmissions,
} from "./repository";
import { contestSubmissionSchema } from "./submission-schema";
import { assertContestOpen } from "./access";

export async function getContestWorkspace(slug: string) {
  const entry = await getContestEntry(slug);
  const [exercises, submissions] = await Promise.all([
    listContestExercises(entry.contest.id),
    listUserContestSubmissions(entry.contest.id, entry.userId),
  ]);
  const serverNow = Date.now();
  assertContestOpen(entry.contest, serverNow);
  return {
    userId: entry.userId,
    contest: {
      id: entry.contest.id,
      slug: entry.contest.slug,
      title: entry.contest.title,
      endsAt: entry.contest.endsAt!.toISOString(),
    },
    serverNow,
    maxSourceLength: MAX_SOURCE_LENGTH,
    exercises: exercises.map(({ exercise, points, position }) => ({
      ...exercise,
      points: points ?? exercise.points,
      position,
    })),
    submissions: submissions.map((submission) => ({
      ...submission,
      createdAt: submission.createdAt.toISOString(),
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
  const result = await submitSolution({
    ...parsed.data,
    userId: entry.userId,
    contestId: entry.contest.id,
  });
  const saved = await findUserContestSubmission(
    result.submissionId,
    entry.contest.id,
    entry.userId,
  );
  return {
    ...result,
    id: result.submissionId,
    exerciseId: parsed.data.exerciseId,
    createdAt: saved.createdAt.toISOString(),
  };
}

export type ContestSubmissionResult = Awaited<
  ReturnType<typeof submitContestSolution>
>;
