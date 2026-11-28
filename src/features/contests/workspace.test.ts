import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  entry: vi.fn(),
  exercises: vi.fn(),
  submissions: vi.fn(),
  saved: vi.fn(),
  submit: vi.fn(),
  progress: vi.fn(),
}));
vi.mock("./service", () => ({ getContestEntry: mocks.entry }));
vi.mock("./repository", () => ({
  listContestExercises: mocks.exercises,
  listUserContestSubmissions: mocks.submissions,
  findUserContestSubmission: mocks.saved,
}));
vi.mock("@/features/grading/submit", () => ({
  submitSolution: mocks.submit,
  MAX_SOURCE_LENGTH: 64 * 1024,
}));
import { getContestWorkspace, submitContestSolution } from "./workspace";
vi.mock("./stage-repository", () => ({
  closeExpiredStages: vi.fn(async () => null),
  finishIfStagesDone: vi.fn(async () => false),
  loadStageState: vi.fn(async () => ({
    progress: await mocks.progress(),
    stages: [],
    current: null,
  })),
  startStageAttempt: vi.fn(),
}));
vi.mock("./deadline-repository", () => ({
  createTimedContestSubmission: vi.fn(),
  getContestSubmissionProgress: mocks.progress,
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.progress.mockResolvedValue({
    submittedExerciseIds: [],
    nextExerciseId: "exercise",
    finished: false,
  });
  mocks.submit.mockResolvedValue({
    submissionId: "new-submission",
    status: "ACCEPTED",
    score: 100,
    feedback: "Passed",
  });
  mocks.saved.mockResolvedValue({
    createdAt: new Date("2026-11-15T02:00:00Z"),
  });
  mocks.entry.mockResolvedValue({
    userId: "signed-in",
    participant: {
      startedAt: new Date(0),
      deadlineAt: new Date("2099-01-01"),
      finishedAt: null,
      faceVerifiedAt: null,
    },
    contest: {
      id: "contest",
      slug: "sample",
      title: "Contest",
      examStartsAt: new Date(0),
      examEndsAt: new Date("2099-01-01"),
      startsAt: new Date(0),
      endsAt: new Date("2099-01-01"),
    },
  });
});
describe("contest workspace", () => {
  it("passes server-owned user and contest IDs to the grading contract", async () => {
    await submitContestSolution("sample", {
      userId: "other-user",
      contestId: "other-contest",
      exerciseId: "exercise",
      language: "python",
      source: "print(1)",
    });
    expect(mocks.submit).toHaveBeenCalledWith(
      {
        userId: "signed-in",
        contestId: "contest",
        exerciseId: "exercise",
        language: "python",
        source: "print(1)",
      },
      { createSubmission: expect.any(Function) },
    );
  });
  it("maps the grading result to the contest history without losing status or score", async () => {
    const result = await submitContestSolution("sample", {
      exerciseId: "exercise",
      source: "print(1)",
      language: "python",
    });
    expect(result).toMatchObject({
      id: "new-submission",
      exerciseId: "exercise",
      status: "ACCEPTED",
      score: 100,
      createdAt: "2026-11-15T02:00:00.000Z",
    });
    expect(mocks.saved).toHaveBeenCalledWith(
      "new-submission",
      "contest",
      "signed-in",
    );
  });
  it("returns the next exercise and completion state with the result", async () => {
    mocks.progress.mockResolvedValue({
      submittedExerciseIds: ["exercise"],
      nextExerciseId: "second",
      finished: false,
    });
    const result = await submitContestSolution("sample", {
      exerciseId: "exercise",
      source: "print(1)",
      language: "python",
    });
    expect(result.progress).toEqual({
      submittedExerciseIds: ["exercise"],
      nextExerciseId: "second",
      finished: false,
    });
  });
  it.each([
    { source: "   ", language: "python" },
    { source: "x", language: "shell" },
    { source: "x".repeat(64 * 1024 + 1), language: "cpp" },
    { source: "console.log(1)", language: "typescript" },
  ])("rejects invalid or oversized source before submitting", async (body) => {
    await expect(
      submitContestSolution("sample", { exerciseId: "exercise", ...body }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("loads exercises and progress without fetching submission history during the attempt", async () => {
    mocks.exercises.mockResolvedValue([
      { position: 1, points: 200, exercise: { id: "exercise", points: 100 } },
    ]);
    mocks.submissions.mockResolvedValue([]);
    const result = await getContestWorkspace("sample");
    expect(mocks.submissions).not.toHaveBeenCalled();
    expect(result.exercises[0].points).toBe(200);
  });
  it("does not fetch statements when entry is denied", async () => {
    mocks.entry.mockRejectedValue(new Error("Not open"));
    await expect(getContestWorkspace("sample")).rejects.toThrow("Not open");
    expect(mocks.exercises).not.toHaveBeenCalled();
  });
});
