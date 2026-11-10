import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  submitSolution: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.requireRole }));
vi.mock("./submit", () => ({ submitSolution: mocks.submitSolution }));
import { submitPractice } from "./practice-submit";

const graded = {
  submissionId: "sub-1",
  status: "REJECTED",
  score: 50,
  maxScore: 100,
  feedback: "Đạt 1/2 test case.",
  runtimeMs: 30,
  memoryKb: 1024,
  tests: [
    {
      testCaseId: "visible-id",
      passed: true,
      status: "ACCEPTED",
      feedback: "ok",
      weight: 1,
      runtimeMs: 10,
      input: "1 2",
      expected: "3",
    },
    {
      testCaseId: "hidden-id",
      passed: false,
      status: "WRONG_ANSWER",
      feedback: "Sai kết quả",
      weight: 1,
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({ id: "user-1" });
  mocks.submitSolution.mockResolvedValue(graded);
});

describe("submitPractice", () => {
  it("submits as the signed-in student and never as a client-supplied user or contest", async () => {
    await submitPractice("ex-1", {
      source: "print(1)",
      language: "python",
      userId: "someone-else",
      contestId: "contest-1",
    });
    expect(mocks.submitSolution).toHaveBeenCalledTimes(1);
    expect(mocks.submitSolution).toHaveBeenCalledWith({
      userId: "user-1",
      exerciseId: "ex-1",
      source: "print(1)",
      language: "python",
    });
  });

  it("rejects non-students before touching the grader", async () => {
    mocks.requireRole.mockRejectedValue(new AppError(403, "FORBIDDEN", "no"));
    await expect(
      submitPractice("ex-1", { source: "x", language: "python" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.submitSolution).not.toHaveBeenCalled();
  });

  it.each([null, "text", {}, { source: 1, language: "python" }])(
    "rejects malformed body %j",
    async (body) => {
      await expect(submitPractice("ex-1", body)).rejects.toMatchObject({
        status: 400,
        code: "INVALID_SUBMISSION",
      });
      expect(mocks.submitSolution).not.toHaveBeenCalled();
    },
  );

  it("lets grading errors such as the rate limit through", async () => {
    mocks.submitSolution.mockRejectedValue(
      new AppError(429, "TOO_MANY_SUBMISSIONS", "chậm lại"),
    );
    await expect(
      submitPractice("ex-1", { source: "x", language: "python" }),
    ).rejects.toMatchObject({ status: 429, code: "TOO_MANY_SUBMISSIONS" });
  });

  it("numbers tests, keeps sample data, and strips hidden data and internal ids", async () => {
    const view = await submitPractice("ex-1", {
      source: "x",
      language: "python",
    });
    expect(view.tests).toEqual([
      {
        index: 1,
        hidden: false,
        passed: true,
        status: "ACCEPTED",
        feedback: "ok",
        weight: 1,
        runtimeMs: 10,
        input: "1 2",
        expected: "3",
      },
      {
        index: 2,
        hidden: true,
        passed: false,
        status: "WRONG_ANSWER",
        feedback: "Sai kết quả",
        weight: 1,
      },
    ]);
    expect(JSON.stringify(view)).not.toContain("hidden-id");
    expect(JSON.stringify(view)).not.toContain("visible-id");
  });
});
