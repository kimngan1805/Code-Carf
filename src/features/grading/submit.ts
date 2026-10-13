import { ExerciseKind, type SubmissionStatus } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import type { GradeResult } from "./adapter";
import {
  getJudge0LanguageId,
  submissionLanguages,
  type SubmissionLanguage,
} from "./languages";
import {
  createPendingSubmission,
  findCodeExerciseWithTests,
  finishSubmission,
  isExerciseInContest,
  markSubmissionRunning,
} from "./repository";
import { getGradingAdapter } from "./service";

export const MAX_SOURCE_LENGTH = 64 * 1024;

const submitInputSchema = z.object({
  userId: z.string().trim().min(1, "userId không được để trống"),
  exerciseId: z.string().trim().min(1, "exerciseId không được để trống"),
  source: z
    .string()
    .refine((value) => value.trim().length > 0, "Mã nguồn không được để trống")
    .refine(
      (value) => value.length <= MAX_SOURCE_LENGTH,
      "Mã nguồn vượt quá 64 KB",
    ),
  language: z.enum(submissionLanguages, "Ngôn ngữ không được hỗ trợ"),
  contestId: z.string().trim().min(1).nullable().optional(),
});

export interface SubmitSolutionInput {
  userId: string;
  exerciseId: string;
  source: string;
  language: SubmissionLanguage | (string & {});
  /** Set when submitting inside a contest; omitted for practice. */
  contestId?: string | null;
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  status: GradeResult["status"];
  feedback: string;
  /** Only present for visible test cases; hidden ones never expose data. */
  input?: string;
  expected?: string;
}

export interface SubmissionResult {
  submissionId: string;
  status: Extract<SubmissionStatus, "ACCEPTED" | "REJECTED" | "ERROR">;
  score: number;
  maxScore: number;
  feedback: string;
  tests: TestResult[];
}

const PASSING_STATUSES: ReadonlySet<GradeResult["status"]> = new Set([
  "ACCEPTED",
  // Mock mode never runs code; treat it as a pass so dev flows can complete.
  "MOCKED",
]);

/**
 * Saves a code submission and grades it against every test case of the
 * exercise with the configured grading adapter.
 *
 * Contract owned by stream B (#62). Callers: the exercise page (#72) and
 * the contest flow (stream C). Contest timing and registration checks are
 * the caller's responsibility.
 */
export async function submitSolution(
  input: SubmitSolutionInput,
): Promise<SubmissionResult> {
  const parsed = submitInputSchema.safeParse(input);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Dữ liệu nộp bài không hợp lệ";
    throw new AppError(400, "INVALID_SUBMISSION", message);
  }
  const { userId, exerciseId, source, language } = parsed.data;
  const contestId = parsed.data.contestId ?? null;

  const exercise = await findCodeExerciseWithTests(exerciseId);
  if (!exercise) {
    throw new AppError(404, "EXERCISE_NOT_FOUND", "Không tìm thấy bài tập");
  }
  if (exercise.kind !== ExerciseKind.CODE) {
    throw new AppError(
      400,
      "EXERCISE_NOT_CODE",
      "Bài tập này không nhận nộp mã nguồn",
    );
  }
  if (contestId && !(await isExerciseInContest(contestId, exerciseId))) {
    throw new AppError(
      404,
      "EXERCISE_NOT_IN_CONTEST",
      "Bài tập không thuộc cuộc thi này",
    );
  }
  // TODO(#70): check canAccessRoom(userId, exercise.roomId) once stream A
  // merges src/features/rooms/access.ts.

  const { id: submissionId } = await createPendingSubmission({
    userId,
    exerciseId,
    contestId,
    source,
    language,
  });
  await markSubmissionRunning(submissionId);

  const maxScore = exercise.points;
  let outcome: Omit<SubmissionResult, "submissionId" | "maxScore">;

  try {
    if (exercise.testCases.length === 0) {
      outcome = {
        status: "ERROR",
        score: 0,
        feedback: "Bài tập chưa có test case để chấm",
        tests: [],
      };
    } else {
      const adapter = getGradingAdapter();
      const languageId = getJudge0LanguageId(language);
      const tests: TestResult[] = [];
      for (const testCase of exercise.testCases) {
        const result = await adapter.grade({
          source,
          languageId,
          input: testCase.input,
          expected: testCase.expected,
        });
        tests.push({
          testCaseId: testCase.id,
          passed: PASSING_STATUSES.has(result.status),
          status: result.status,
          feedback: result.feedback,
          ...(testCase.isHidden
            ? {}
            : { input: testCase.input, expected: testCase.expected }),
        });
      }
      const passedCount = tests.filter((test) => test.passed).length;
      const accepted = passedCount === tests.length;
      const mocked = tests.some((test) => test.status === "MOCKED");
      outcome = {
        status: accepted ? "ACCEPTED" : "REJECTED",
        score: accepted ? maxScore : 0,
        feedback:
          `Đạt ${passedCount}/${tests.length} test case.` +
          (mocked ? " Chế độ mock: mã nguồn không được chạy thật." : ""),
        tests,
      };
    }
  } catch (error) {
    logger.error("submission.grading_failed", {
      submissionId,
      message: error instanceof Error ? error.message : String(error),
    });
    outcome = {
      status: "ERROR",
      score: 0,
      feedback: "Hệ thống chấm gặp lỗi, vui lòng thử lại sau",
      tests: [],
    };
  }

  await finishSubmission(submissionId, {
    status: outcome.status,
    score: outcome.score,
    feedback: outcome.feedback,
  });
  logger.info("submission.graded", {
    submissionId,
    exerciseId,
    contestId,
    status: outcome.status,
  });

  return { submissionId, maxScore, ...outcome };
}
