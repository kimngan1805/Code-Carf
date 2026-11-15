import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  countPracticeSubmissions: vi.fn(),
  findPracticeSubmissions: vi.fn(),
  findSubmissionForHistory: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.requireRole }));
vi.mock("./repository", () => ({
  countPracticeSubmissions: mocks.countPracticeSubmissions,
  findPracticeSubmissions: mocks.findPracticeSubmissions,
  findSubmissionForHistory: mocks.findSubmissionForHistory,
}));
import { getSubmissionDetail, getSubmissionHistory } from "./history";

const row = (id: string) => ({
  id,
  status: "ACCEPTED",
  score: 100,
  language: "python",
  createdAt: new Date("2026-11-15T10:00:00Z"),
  exercise: { id: "ex-1", title: "Hello world", points: 100 },
});

const stored = {
  id: "sub-1",
  userId: "user-1",
  contestId: null,
  status: "ACCEPTED",
  score: 100,
  feedback: "Đạt 1/1 test case.",
  runtimeMs: 12,
  memoryKb: 2048,
  language: "python",
  source: "print('hi')",
  createdAt: new Date("2026-11-15T10:00:00Z"),
  exercise: {
    id: "ex-1",
    title: "Hello world",
    points: 100,
    room: { id: "room-1", title: "Room 1" },
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({ id: "user-1" });
});

describe("getSubmissionHistory", () => {
  it("lists only the signed-in student's submissions", async () => {
    mocks.countPracticeSubmissions.mockResolvedValue(1);
    mocks.findPracticeSubmissions.mockResolvedValue([row("s1")]);

    const history = await getSubmissionHistory("1");

    expect(mocks.countPracticeSubmissions).toHaveBeenCalledWith("user-1");
    expect(mocks.findPracticeSubmissions).toHaveBeenCalledWith("user-1", 0, 10);
    expect(history.items).toEqual([
      expect.objectContaining({ id: "s1", maxScore: 100 }),
    ]);
    expect(history).toMatchObject({ page: 1, totalPages: 1, total: 1 });
  });

  it("only allows the STUDENT role", async () => {
    mocks.requireRole.mockRejectedValue(new AppError(403, "FORBIDDEN", "no"));
    await expect(getSubmissionHistory()).rejects.toMatchObject({ status: 403 });
    expect(mocks.findPracticeSubmissions).not.toHaveBeenCalled();
  });

  it("pages through the history and clamps a page past the end", async () => {
    mocks.countPracticeSubmissions.mockResolvedValue(25);
    mocks.findPracticeSubmissions.mockResolvedValue([]);

    await getSubmissionHistory("2");
    expect(mocks.findPracticeSubmissions).toHaveBeenLastCalledWith(
      "user-1",
      10,
      10,
    );

    const last = await getSubmissionHistory("99");
    expect(mocks.findPracticeSubmissions).toHaveBeenLastCalledWith(
      "user-1",
      20,
      10,
    );
    expect(last).toMatchObject({ page: 3, totalPages: 3 });
  });

  it("treats a junk page value as page 1", async () => {
    mocks.countPracticeSubmissions.mockResolvedValue(25);
    mocks.findPracticeSubmissions.mockResolvedValue([]);
    await getSubmissionHistory("-4");
    expect(mocks.findPracticeSubmissions).toHaveBeenCalledWith("user-1", 0, 10);
  });
});

describe("getSubmissionDetail", () => {
  it("returns the learner's own submission with code and result", async () => {
    mocks.findSubmissionForHistory.mockResolvedValue(stored);

    const detail = await getSubmissionDetail("sub-1");

    expect(detail).toMatchObject({
      id: "sub-1",
      source: "print('hi')",
      maxScore: 100,
      room: { id: "room-1" },
    });
    expect(detail).not.toHaveProperty("userId");
    expect(detail).not.toHaveProperty("contestId");
  });

  it("answers 403 for another learner's submission and returns no code", async () => {
    mocks.findSubmissionForHistory.mockResolvedValue({
      ...stored,
      userId: "someone-else",
    });

    await expect(getSubmissionDetail("sub-1")).rejects.toMatchObject({
      status: 403,
      code: "SUBMISSION_FORBIDDEN",
    });
  });

  it("answers 404 for a submission that does not exist", async () => {
    mocks.findSubmissionForHistory.mockResolvedValue(null);
    await expect(getSubmissionDetail("nope")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("answers 404 for the learner's own contest submission", async () => {
    mocks.findSubmissionForHistory.mockResolvedValue({
      ...stored,
      contestId: "contest-1",
    });
    await expect(getSubmissionDetail("sub-1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("checks ownership before the contest rule, so another learner's contest submission is 403", async () => {
    mocks.findSubmissionForHistory.mockResolvedValue({
      ...stored,
      userId: "someone-else",
      contestId: "contest-1",
    });
    await expect(getSubmissionDetail("sub-1")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("only allows the STUDENT role before touching the database", async () => {
    mocks.requireRole.mockRejectedValue(new AppError(403, "FORBIDDEN", "no"));
    await expect(getSubmissionDetail("sub-1")).rejects.toMatchObject({
      status: 403,
    });
    expect(mocks.findSubmissionForHistory).not.toHaveBeenCalled();
  });
});
