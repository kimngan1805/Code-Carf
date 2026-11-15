import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  tx: {
    $queryRaw: vi.fn(),
    contest: { findUnique: vi.fn() },
    contestParticipant: { findUnique: vi.fn() },
    proctoringEvent: { groupBy: vi.fn() },
    submission: { findMany: vi.fn() },
  },
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: (run: (tx: typeof mocks.tx) => unknown) => run(mocks.tx),
  },
}));
import { getAttemptReview } from "./review";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ id: "viewer" });
  mocks.tx.contest.findUnique.mockResolvedValue({
    id: "contest",
    status: "PUBLISHED",
    violationThreshold: 3,
    examEndsAt: new Date("2099-01-01"),
  });
  mocks.tx.contestParticipant.findUnique.mockResolvedValue({
    startedAt: new Date(0),
    deadlineAt: new Date("2099-01-01"),
    finishedAt: new Date(),
    flaggedAt: null,
  });
  mocks.tx.proctoringEvent.groupBy.mockResolvedValue([
    { type: "PASTE", _count: { _all: 2 } },
    { type: "TAB_SWITCH", _count: { _all: 1 } },
    { type: "FULLSCREEN_EXIT", _count: { _all: 1 } },
  ]);
  mocks.tx.submission.findMany.mockResolvedValue([]);
});
describe("attempt review statistics", () => {
  it("returns separate counts scoped to the signed-in student's completed attempt", async () => {
    expect(await getAttemptReview("sample")).toEqual({
      submissions: [],
      pasteCount: 2,
      tabSwitchCount: 1,
      fullscreenExitCount: 1,
      threshold: 3,
      flagged: false,
    });
    expect(mocks.tx.proctoringEvent.groupBy).toHaveBeenCalledWith({
      by: ["type"],
      where: { contestId: "contest", userId: "viewer" },
      _count: { _all: true },
    });
    expect(mocks.tx.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { contestId: "contest", userId: "viewer" },
      }),
    );
  });
  it("does not expose review data during an active attempt", async () => {
    mocks.tx.contestParticipant.findUnique.mockResolvedValue({
      startedAt: new Date(),
      deadlineAt: new Date("2099-01-01"),
      finishedAt: null,
    });
    await expect(getAttemptReview("sample")).rejects.toMatchObject({
      code: "RESULTS_NOT_AVAILABLE",
    });
    expect(mocks.tx.proctoringEvent.groupBy).not.toHaveBeenCalled();
    expect(mocks.tx.submission.findMany).not.toHaveBeenCalled();
  });
  it("does not expose another student's data to an unregistered viewer", async () => {
    mocks.tx.contestParticipant.findUnique.mockResolvedValue(null);
    await expect(getAttemptReview("sample")).rejects.toMatchObject({
      status: 403,
    });
  });
  it("allows recovery after expiry and represents missing event types as zero", async () => {
    mocks.tx.contestParticipant.findUnique.mockResolvedValue({
      startedAt: new Date(0),
      deadlineAt: new Date(1),
      finishedAt: null,
      flaggedAt: new Date(2),
    });
    mocks.tx.proctoringEvent.groupBy.mockResolvedValue([]);
    expect(await getAttemptReview("sample")).toMatchObject({
      pasteCount: 0,
      tabSwitchCount: 0,
      fullscreenExitCount: 0,
      flagged: true,
    });
  });
});
