import { ExerciseKind } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../lib/errors";
import type { GradeRequest, GradeResult } from "./adapter";
import { mockGradingAdapter } from "./mock-adapter";

const { repo, adapter } = vi.hoisted(() => ({
  repo: {
    findCodeExerciseWithTests: vi.fn(),
    isExerciseInContest: vi.fn(),
    createPendingSubmission: vi.fn(),
    markSubmissionRunning: vi.fn(),
    finishSubmission: vi.fn(),
  },
  adapter: {
    grade: vi.fn<(request: GradeRequest) => Promise<GradeResult>>(),
  },
}));

vi.mock("./repository", () => repo);
vi.mock("./service", () => ({ getGradingAdapter: () => adapter }));
vi.mock("../../lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import { MAX_SOURCE_LENGTH, submitSolution } from "./submit";

const exercise = {
  id: "ex-1",
  kind: ExerciseKind.CODE,
  points: 100,
  timeLimitMs: 2000,
  memoryLimitKb: 262144,
  testCases: [
    { id: "tc-1", input: "1 2", expected: "3", isHidden: false, weight: 1 },
    { id: "tc-2", input: "-5 10", expected: "5", isHidden: true, weight: 3 },
  ],
};

const validInput = {
  userId: "user-1",
  exerciseId: "ex-1",
  source: "print(sum(map(int, input().split())))",
  language: "python",
};

describe("submitSolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.findCodeExerciseWithTests.mockResolvedValue(exercise);
    repo.isExerciseInContest.mockResolvedValue(true);
    repo.createPendingSubmission.mockResolvedValue({ id: "sub-1" });
    repo.markSubmissionRunning.mockResolvedValue({ id: "sub-1" });
    repo.finishSubmission.mockResolvedValue({ id: "sub-1" });
    adapter.grade.mockImplementation((request) =>
      mockGradingAdapter.grade(request),
    );
  });

  it("stores PENDING, then RUNNING, then ACCEPTED with the mock adapter", async () => {
    const result = await submitSolution(validInput);

    expect(repo.createPendingSubmission).toHaveBeenCalledWith({
      userId: "user-1",
      exerciseId: "ex-1",
      contestId: null,
      source: validInput.source,
      language: "python",
    });
    expect(repo.markSubmissionRunning).toHaveBeenCalledWith("sub-1");
    expect(repo.finishSubmission).toHaveBeenCalledWith("sub-1", {
      status: "ACCEPTED",
      score: 100,
      feedback: expect.stringContaining("mock"),
      runtimeMs: null,
      memoryKb: null,
    });
    const order = [
      repo.createPendingSubmission.mock.invocationCallOrder[0],
      repo.markSubmissionRunning.mock.invocationCallOrder[0],
      repo.finishSubmission.mock.invocationCallOrder[0],
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));

    expect(result).toMatchObject({
      submissionId: "sub-1",
      status: "ACCEPTED",
      score: 100,
      maxScore: 100,
    });
    expect(result.tests).toHaveLength(2);
    expect(result.tests.every((test) => test.passed)).toBe(true);
  });

  it("passes source, Judge0 language id, test data and limits to the adapter", async () => {
    await submitSolution(validInput);

    expect(adapter.grade).toHaveBeenNthCalledWith(1, {
      source: validInput.source,
      languageId: 71,
      input: "1 2",
      expected: "3",
      timeLimitMs: 2000,
      memoryLimitKb: 262144,
    });
    expect(adapter.grade).toHaveBeenCalledTimes(2);
  });

  it("rejects with a weighted partial score when a test fails", async () => {
    adapter.grade
      .mockResolvedValueOnce({ status: "ACCEPTED", feedback: "Accepted" })
      .mockResolvedValueOnce({ status: "WRONG_ANSWER", feedback: "Wrong" });

    const result = await submitSolution(validInput);

    // tc-1 (weight 1) passed, tc-2 (weight 3) failed: 100 * 1/4.
    expect(result.status).toBe("REJECTED");
    expect(result.score).toBe(25);
    expect(result.tests.map((test) => test.passed)).toEqual([true, false]);
    expect(result.feedback).toBe("Đạt 1/2 test case. Sai kết quả: 1.");
    expect(repo.finishSubmission).toHaveBeenCalledWith(
      "sub-1",
      expect.objectContaining({ status: "REJECTED", score: 25 }),
    );
  });

  it("never exposes input or expected output of hidden test cases", async () => {
    const result = await submitSolution(validInput);

    const [visible, hidden] = result.tests;
    expect(visible).toMatchObject({ input: "1 2", expected: "3" });
    expect(hidden).not.toHaveProperty("input");
    expect(hidden).not.toHaveProperty("expected");
    expect(JSON.stringify(result)).not.toContain("-5 10");
  });

  it("finishes as ERROR instead of staying RUNNING when the adapter throws", async () => {
    adapter.grade.mockRejectedValue(new Error("Judge0 unreachable"));

    const result = await submitSolution(validInput);

    expect(result).toMatchObject({ status: "ERROR", score: 0, tests: [] });
    expect(repo.finishSubmission).toHaveBeenCalledWith(
      "sub-1",
      expect.objectContaining({ status: "ERROR" }),
    );
  });

  it("finishes as ERROR when the exercise has no test cases", async () => {
    repo.findCodeExerciseWithTests.mockResolvedValue({
      ...exercise,
      testCases: [],
    });

    const result = await submitSolution(validInput);

    expect(result.status).toBe("ERROR");
    expect(adapter.grade).not.toHaveBeenCalled();
  });

  it("stores contestId when the exercise belongs to the contest", async () => {
    await submitSolution({ ...validInput, contestId: " contest-1 " });

    expect(repo.isExerciseInContest).toHaveBeenCalledWith("contest-1", "ex-1");
    expect(repo.createPendingSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ contestId: "contest-1" }),
    );
  });

  it("reports each test's own status, time and memory, storing the maximum", async () => {
    adapter.grade
      .mockResolvedValueOnce({
        status: "TIME_LIMIT_EXCEEDED",
        feedback: "Time Limit Exceeded",
        runtimeMs: 2004,
        memoryKb: 3000,
      })
      .mockResolvedValueOnce({
        status: "RUNTIME_ERROR",
        feedback: "Runtime Error (NZEC): boom",
        runtimeMs: 12,
        memoryKb: 9000,
      });

    const result = await submitSolution(validInput);

    expect(result.tests).toMatchObject([
      { status: "TIME_LIMIT_EXCEEDED", passed: false, runtimeMs: 2004 },
      { status: "RUNTIME_ERROR", passed: false, memoryKb: 9000 },
    ]);
    expect(result).toMatchObject({
      status: "REJECTED",
      score: 0,
      runtimeMs: 2004,
      memoryKb: 9000,
    });
    expect(result.feedback).toBe(
      "Đạt 0/2 test case. Quá thời gian: 1, Lỗi khi chạy: 1.",
    );
    expect(repo.finishSubmission).toHaveBeenCalledWith(
      "sub-1",
      expect.objectContaining({ runtimeMs: 2004, memoryKb: 9000 }),
    );
  });

  it("stops calling the grader after a compile error", async () => {
    adapter.grade.mockResolvedValue({
      status: "COMPILE_ERROR",
      feedback: "Compilation Error: missing ;",
    });

    const result = await submitSolution(validInput);

    expect(adapter.grade).toHaveBeenCalledTimes(1);
    expect(result.tests.map((test) => test.status)).toEqual([
      "COMPILE_ERROR",
      "COMPILE_ERROR",
    ]);
    expect(result.tests[1]?.feedback).toBe("Compilation Error: missing ;");
    expect(result).toMatchObject({ status: "REJECTED", score: 0 });
  });

  it("finishes as ERROR when the grader reports its own failure", async () => {
    adapter.grade
      .mockResolvedValueOnce({ status: "ACCEPTED", feedback: "Accepted" })
      .mockResolvedValueOnce({ status: "ERROR", feedback: "Judge0 HTTP 503" });

    const result = await submitSolution(validInput);

    expect(result).toMatchObject({ status: "ERROR", score: 0 });
  });

  it("does not check contest membership for practice submissions", async () => {
    await submitSolution(validInput);
    expect(repo.isExerciseInContest).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "exercise not in contest",
      setup: () => repo.isExerciseInContest.mockResolvedValue(false),
      input: { ...validInput, contestId: "contest-1" },
      expected: { status: 404, code: "EXERCISE_NOT_IN_CONTEST" },
    },
    {
      label: "missing exercise",
      setup: () => repo.findCodeExerciseWithTests.mockResolvedValue(null),
      input: validInput,
      expected: { status: 404, code: "EXERCISE_NOT_FOUND" },
    },
    {
      label: "handwritten exercise",
      setup: () =>
        repo.findCodeExerciseWithTests.mockResolvedValue({
          ...exercise,
          kind: ExerciseKind.HANDWRITTEN,
        }),
      input: validInput,
      expected: { status: 400, code: "EXERCISE_NOT_CODE" },
    },
  ])("throws for $label without saving", async ({ setup, input, expected }) => {
    setup();
    await expect(submitSolution(input)).rejects.toMatchObject(expected);
    expect(repo.createPendingSubmission).not.toHaveBeenCalled();
  });

  it.each([
    { label: "empty userId", input: { ...validInput, userId: "  " } },
    { label: "empty exerciseId", input: { ...validInput, exerciseId: "" } },
    { label: "blank source", input: { ...validInput, source: "  \n " } },
    {
      label: "oversized source",
      input: { ...validInput, source: "x".repeat(MAX_SOURCE_LENGTH + 1) },
    },
    { label: "unknown language", input: { ...validInput, language: "rust" } },
    { label: "empty contestId", input: { ...validInput, contestId: "" } },
  ])("rejects invalid input ($label) without DB access", async ({ input }) => {
    const promise = submitSolution(input);
    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      status: 400,
      code: "INVALID_SUBMISSION",
    });
    expect(repo.findCodeExerciseWithTests).not.toHaveBeenCalled();
    expect(repo.createPendingSubmission).not.toHaveBeenCalled();
  });
});
