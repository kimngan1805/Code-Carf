import { ExerciseKind, type SubmissionStatus } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import type { GradeResult, GradeStatus } from "./adapter";
import {
  getJudge0LanguageId,
  submissionLanguages,
  type SubmissionLanguage,
} from "./languages";
import {
  countRecentSubmissions,
  createPendingSubmission,
  findCodeExerciseWithTests,
  finishSubmission,
  isExerciseInContest,
  markSubmissionRunning,
  findStoredSubmission,
  claimPendingSubmission,
} from "./repository";
import { isPassing, summarizeTests } from "./scoring";
import { completeRoomIfDone, type RoomCompletion } from "./room-completion";
import { getGradingAdapter } from "./service";
import { canAccessRoom } from "../rooms/access";

export const MAX_SOURCE_LENGTH = 64 * 1024;
/** At most this many submissions per user in any rolling window (#75). */
export const SUBMISSION_RATE_LIMIT = 10;
export const SUBMISSION_RATE_WINDOW_MS = 60_000;

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
  status: GradeStatus;
  feedback: string;
  weight: number;
  runtimeMs?: number;
  memoryKb?: number;
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
  /** Highest CPU time / memory used by any test, when the grader reports it. */
  runtimeMs: number | null;
  memoryKb: number | null;
  tests: TestResult[];
  /**
   * Set only when this accepted practice submission finished the room and
   * paid its XP; absent for repeats, contests and unfinished rooms.
   */
  roomCompletion?: RoomCompletion;
}

const STATUS_LABELS: Record<GradeStatus, string> = {
  MOCKED: "Chưa chạy (mock)",
  ACCEPTED: "Đúng",
  WRONG_ANSWER: "Sai kết quả",
  TIME_LIMIT_EXCEEDED: "Quá thời gian",
  RUNTIME_ERROR: "Lỗi khi chạy",
  COMPILE_ERROR: "Lỗi biên dịch",
  ERROR: "Lỗi hệ thống chấm",
};

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
  options: {
    createSubmission?: (
      data: Parameters<typeof createPendingSubmission>[0],
    ) => Promise<{ id: string }>;
  } = {},
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
  // Contest entry is authorized by the contest flow; reusable exercises may
  // also belong to a practice room that the contestant has not unlocked.
  if (
    !contestId &&
    exercise.roomId &&
    !(await canAccessRoom(userId, exercise.roomId))
  )
    throw new AppError(403, "ROOM_LOCKED", "Bài học đang khóa.");

  // Counted in the DB so the limit holds across server instances. Parallel
  // requests can still slip one or two over; that is acceptable here.
  const recent = await countRecentSubmissions(
    userId,
    new Date(Date.now() - SUBMISSION_RATE_WINDOW_MS),
  );
  if (recent >= SUBMISSION_RATE_LIMIT) {
    throw new AppError(
      429,
      "TOO_MANY_SUBMISSIONS",
      `Bạn chỉ được nộp tối đa ${SUBMISSION_RATE_LIMIT} lần mỗi phút, vui lòng thử lại sau`,
    );
  }

  const { id: submissionId } = await (
    options.createSubmission ?? createPendingSubmission
  )({
    userId,
    exerciseId,
    contestId,
    source,
    language,
  });
  await markSubmissionRunning(submissionId);

  return gradeStoredSolution(
    submissionId,
    userId,
    exercise,
    source,
    language,
    contestId,
  );
}

/** Resume a server-created deadline submission. An atomic claim prevents duplicate grading. */
export async function gradePendingSubmission(submissionId: string) {
  const saved = await findStoredSubmission(submissionId);
  if (saved.status !== "PENDING") return;
  const parsed = submitInputSchema.safeParse(saved);
  const exercise = await findCodeExerciseWithTests(saved.exerciseId);
  if (!parsed.success || !exercise || exercise.kind !== ExerciseKind.CODE) {
    if (await claimPendingSubmission(submissionId))
      await finishSubmission(submissionId, {
        status: "ERROR",
        score: 0,
        feedback: "Không thể chấm bản nháp đã lưu.",
        runtimeMs: null,
        memoryKb: null,
      });
    return;
  }
  if (!(await claimPendingSubmission(submissionId))) return;
  await gradeStoredSolution(
    submissionId,
    saved.userId,
    exercise,
    parsed.data.source,
    parsed.data.language,
    saved.contestId,
  );
}

async function gradeStoredSolution(
  submissionId: string,
  userId: string,
  exercise: NonNullable<Awaited<ReturnType<typeof findCodeExerciseWithTests>>>,
  source: string,
  language: SubmissionLanguage,
  contestId: string | null,
): Promise<SubmissionResult> {
  const exerciseId = exercise.id;

  const maxScore = exercise.points;
  let outcome: Omit<SubmissionResult, "submissionId" | "maxScore">;

  try {
    if (exercise.testCases.length === 0) {
      outcome = {
        status: "ERROR",
        score: 0,
        feedback: "Bài tập chưa có test case để chấm",
        runtimeMs: null,
        memoryKb: null,
        tests: [],
      };
    } else {
      const adapter = getGradingAdapter();
      const languageId = getJudge0LanguageId(language);
      const tests: TestResult[] = [];
      let compileError: string | null = null;
      for (const testCase of exercise.testCases) {
        // The same source fails to compile for every test; don't rerun it.
        const result: GradeResult = compileError
          ? { status: "COMPILE_ERROR", feedback: compileError }
          : await adapter.grade({
              source,
              languageId,
              input: testCase.input,
              expected: testCase.expected,
              timeLimitMs: exercise.timeLimitMs,
              memoryLimitKb: exercise.memoryLimitKb,
            });
        if (result.status === "COMPILE_ERROR") compileError = result.feedback;
        tests.push({
          testCaseId: testCase.id,
          passed: isPassing(result.status),
          status: result.status,
          // Program output (stderr, runtime messages) can echo the hidden
          // input, so hidden tests only get a generic label. Compiler output
          // does not depend on the input and stays useful.
          feedback:
            testCase.isHidden && result.status !== "COMPILE_ERROR"
              ? STATUS_LABELS[result.status]
              : result.feedback,
          weight: testCase.weight,
          ...(result.runtimeMs !== undefined
            ? { runtimeMs: result.runtimeMs }
            : {}),
          ...(result.memoryKb !== undefined
            ? { memoryKb: result.memoryKb }
            : {}),
          ...(testCase.isHidden
            ? {}
            : { input: testCase.input, expected: testCase.expected }),
        });
      }
      const summary = summarizeTests(tests, maxScore);
      outcome = {
        status: summary.status,
        score: summary.score,
        feedback: buildFeedback(tests, summary.passedCount),
        runtimeMs: summary.runtimeMs,
        memoryKb: summary.memoryKb,
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
      runtimeMs: null,
      memoryKb: null,
      tests: [],
    };
  }

  await finishSubmission(submissionId, {
    status: outcome.status,
    score: outcome.score,
    feedback: outcome.feedback,
    runtimeMs: outcome.runtimeMs,
    memoryKb: outcome.memoryKb,
  });
  logger.info("submission.graded", {
    submissionId,
    exerciseId,
    contestId,
    status: outcome.status,
  });

  const roomCompletion = await completeRoomAfterAcceptance(
    userId,
    exercise.roomId,
    contestId,
    outcome.status,
    submissionId,
  );
  return {
    submissionId,
    maxScore,
    ...outcome,
    ...(roomCompletion ? { roomCompletion } : {}),
  };
}

/**
 * Finishing the last exercise of a room completes it (progress, XP, next room
 * unlock). Only accepted practice submissions count; contests are scored by
 * their own flow. The submission is already saved, so a failure here must not
 * lose the grading result: it is logged, and the next accepted submission
 * retries (completion is idempotent).
 */
async function completeRoomAfterAcceptance(
  userId: string,
  roomId: string | null,
  contestId: string | null,
  status: SubmissionResult["status"],
  submissionId: string,
): Promise<RoomCompletion | null> {
  if (contestId || !roomId || status !== "ACCEPTED") return null;
  try {
    return await completeRoomIfDone(userId, roomId);
  } catch (error) {
    logger.error("submission.room_completion_failed", {
      submissionId,
      roomId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** e.g. "Đạt 3/5 test case. Sai kết quả: 1, Quá thời gian: 1." */
function buildFeedback(tests: readonly TestResult[], passedCount: number) {
  const failures = new Map<GradeStatus, number>();
  for (const test of tests) {
    if (!test.passed) {
      failures.set(test.status, (failures.get(test.status) ?? 0) + 1);
    }
  }
  const failureText = [...failures]
    .map(([status, count]) => `${STATUS_LABELS[status]}: ${count}`)
    .join(", ");
  const mocked = tests.some((test) => test.status === "MOCKED");
  return [
    `Đạt ${passedCount}/${tests.length} test case.`,
    failureText ? `${failureText}.` : "",
    mocked ? "Chế độ mock: mã nguồn không được chạy thật." : "",
  ]
    .filter(Boolean)
    .join(" ");
}
