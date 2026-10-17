import { AppError } from "@/lib/errors";
import { submitSolution } from "@/features/grading/submit";
import { getContestEntry } from "./service";
import { listContestExercises, listUserContestSubmissions } from "./repository";
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
      "Chọn bài, ngôn ngữ hợp lệ và nhập code (tối đa 100.000 ký tự).",
    );
  const entry = await getContestEntry(slug);
  return submitSolution({
    ...parsed.data,
    userId: entry.userId,
    contestId: entry.contest.id,
  });
}
