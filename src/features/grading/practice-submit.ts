import { RoleName } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import type { GradeStatus } from "./adapter";
import { submitSolution, type SubmissionResult } from "./submit";

const practiceBodySchema = z.object({
  source: z.string(),
  language: z.string(),
});

/** One test as the learner's browser sees it. Hidden tests carry no input/expected. */
export interface PracticeTestView {
  index: number;
  hidden: boolean;
  passed: boolean;
  status: GradeStatus;
  feedback: string;
  weight: number;
  runtimeMs?: number;
  memoryKb?: number;
  input?: string;
  expected?: string;
}

export interface PracticeSubmissionView {
  submissionId: string;
  status: SubmissionResult["status"];
  score: number;
  maxScore: number;
  feedback: string;
  runtimeMs: number | null;
  memoryKb: number | null;
  tests: PracticeTestView[];
}

/** Maps the grading result to what the client may see; internal test case ids are dropped. */
export function toPracticeView(
  result: SubmissionResult,
): PracticeSubmissionView {
  return {
    submissionId: result.submissionId,
    status: result.status,
    score: result.score,
    maxScore: result.maxScore,
    feedback: result.feedback,
    runtimeMs: result.runtimeMs,
    memoryKb: result.memoryKb,
    tests: result.tests.map((test, index) => {
      // submitSolution only attaches input/expected to visible tests.
      const hidden = test.input === undefined || test.expected === undefined;
      return {
        index: index + 1,
        hidden,
        passed: test.passed,
        status: test.status,
        feedback: test.feedback,
        weight: test.weight,
        ...(test.runtimeMs !== undefined ? { runtimeMs: test.runtimeMs } : {}),
        ...(test.memoryKb !== undefined ? { memoryKb: test.memoryKb } : {}),
        ...(hidden ? {} : { input: test.input, expected: test.expected }),
      };
    }),
  };
}

/**
 * Practice submission from the exercise page (#72). The user always comes
 * from the session; the body can only carry source and language, so a client
 * cannot submit as someone else or pretend to be inside a contest.
 */
export async function submitPractice(
  exerciseId: string,
  body: unknown,
): Promise<PracticeSubmissionView> {
  const user = await requireRole([RoleName.STUDENT]);
  const parsed = practiceBodySchema.safeParse(body);
  if (!parsed.success || !exerciseId)
    throw new AppError(
      400,
      "INVALID_SUBMISSION",
      "Dữ liệu nộp bài không hợp lệ",
    );
  const result = await submitSolution({
    userId: user.id,
    exerciseId,
    source: parsed.data.source,
    language: parsed.data.language,
  });
  return toPracticeView(result);
}
