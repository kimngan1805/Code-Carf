import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  entry: vi.fn(),
  exercises: vi.fn(),
  submissions: vi.fn(),
  submit: vi.fn(),
}));
vi.mock("./service", () => ({ getContestEntry: mocks.entry }));
vi.mock("./repository", () => ({
  listContestExercises: mocks.exercises,
  listUserContestSubmissions: mocks.submissions,
}));
vi.mock("@/features/grading/submit", () => ({ submitSolution: mocks.submit }));
import { getContestWorkspace, submitContestSolution } from "./workspace";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.entry.mockResolvedValue({
    userId: "signed-in",
    contest: {
      id: "contest",
      slug: "sample",
      title: "Contest",
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
    expect(mocks.submit).toHaveBeenCalledWith({
      userId: "signed-in",
      contestId: "contest",
      exerciseId: "exercise",
      language: "python",
      source: "print(1)",
    });
  });
  it.each([
    { source: "   ", language: "python" },
    { source: "x", language: "shell" },
    { source: "x".repeat(100001), language: "cpp" },
  ])("rejects invalid or oversized source before submitting", async (body) => {
    await expect(
      submitContestSolution("sample", { exerciseId: "exercise", ...body }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("loads only the current participant's submission history", async () => {
    mocks.exercises.mockResolvedValue([
      { position: 1, points: 200, exercise: { id: "exercise", points: 100 } },
    ]);
    mocks.submissions.mockResolvedValue([]);
    const result = await getContestWorkspace("sample");
    expect(mocks.submissions).toHaveBeenCalledWith("contest", "signed-in");
    expect(result.exercises[0].points).toBe(200);
  });
  it("does not fetch statements when entry is denied", async () => {
    mocks.entry.mockRejectedValue(new Error("Not open"));
    await expect(getContestWorkspace("sample")).rejects.toThrow("Not open");
    expect(mocks.exercises).not.toHaveBeenCalled();
  });
});
