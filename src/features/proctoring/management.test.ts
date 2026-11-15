import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  tx: {
    $queryRaw: vi.fn(),
    contest: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    contestParticipant: { updateMany: vi.fn() },
    submission: { updateMany: vi.fn() },
  },
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    contest: mocks.tx.contest,
    $transaction: (run: (client: typeof mocks.tx) => unknown) => run(mocks.tx),
  },
}));
import {
  changeViolationThreshold,
  getManagedContestWarnings,
} from "./management";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ id: "teacher", role: { name: "TEACHER" } });
  mocks.tx.contest.findUnique.mockResolvedValue({
    id: "contest",
    creatorId: "teacher",
  });
  mocks.tx.contest.findMany.mockResolvedValue([]);
});
describe("contest warning configuration", () => {
  it.each([0, -1, 101, 1.5, "3", null])(
    "rejects an invalid threshold (%s)",
    async (threshold) => {
      await expect(
        changeViolationThreshold("sample", { threshold }),
      ).rejects.toMatchObject({ code: "INVALID_THRESHOLD" });
      expect(mocks.tx.contest.update).not.toHaveBeenCalled();
    },
  );
  it("rejects a teacher trying to edit another teacher's contest", async () => {
    mocks.tx.contest.findUnique.mockResolvedValue({
      id: "contest",
      creatorId: "other",
    });
    await expect(
      changeViolationThreshold("sample", { threshold: 4 }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.tx.contest.update).not.toHaveBeenCalled();
  });
  it("allows the owner and recalculates only review flags, without canceling attempts", async () => {
    expect(await changeViolationThreshold("sample", { threshold: 2 })).toEqual({
      threshold: 2,
    });
    expect(mocks.tx.contestParticipant.updateMany).toHaveBeenCalledWith({
      where: {
        contestId: "contest",
        violationCount: { gt: 2 },
        flaggedAt: null,
      },
      data: { flaggedAt: expect.any(Date) },
    });
    expect(mocks.tx.submission.updateMany.mock.calls[0][0].data).toEqual({
      flaggedForReview: true,
    });
  });
  it("allows admins to manage contests owned by other teachers", async () => {
    mocks.auth.mockResolvedValue({ id: "admin", role: { name: "ADMIN" } });
    await changeViolationThreshold("sample", { threshold: 5 });
    expect(mocks.tx.contest.update).toHaveBeenCalled();
  });
  it("filters the teacher list by ownership", async () => {
    await getManagedContestWarnings();
    expect(mocks.tx.contest.findMany.mock.calls[0][0].where).toEqual({
      creatorId: "teacher",
    });
  });
  it("requires a management role", async () => {
    mocks.auth.mockRejectedValue(new Error("forbidden"));
    await expect(
      changeViolationThreshold("sample", { threshold: 2 }),
    ).rejects.toThrow("forbidden");
    expect(mocks.tx.$queryRaw).not.toHaveBeenCalled();
  });
});
