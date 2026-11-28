import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  participants: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/db", () => ({
  db: {
    contest: { findMany: mocks.findMany, findFirst: mocks.findFirst },
    contestParticipant: { findMany: mocks.participants },
  },
}));
import { getContest, getContests } from "./service";

beforeEach(() => vi.resetAllMocks());
describe("contest catalog", () => {
  it("only queries published contests and excludes exercise statements", async () => {
    mocks.requireRole.mockResolvedValue({ id: "u1" });
    mocks.findMany.mockResolvedValue([]);
    mocks.participants.mockResolvedValue([]);
    await getContests();
    const query = mocks.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ status: "PUBLISHED" });
    expect(query.select.exercises).toBeUndefined();
    expect(query.select._count.select.exercises).toBe(true);
  });
  it("returns 404 for unknown or unpublished slugs", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(getContest("draft")).rejects.toMatchObject({ status: 404 });
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({
      slug: "draft",
      status: "PUBLISHED",
    });
  });
  it("checks authentication before reading the catalog", async () => {
    mocks.requireRole.mockRejectedValue(new Error("Unauthorized"));
    await expect(getContests()).rejects.toThrow("Unauthorized");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it("marks only the contests the signed-in user registered for", async () => {
    mocks.requireRole.mockResolvedValue({ id: "u1" });
    mocks.findMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    mocks.participants.mockResolvedValue([{ contestId: "c2" }]);
    const { contests } = await getContests();
    expect(mocks.participants.mock.calls[0][0].where).toEqual({
      userId: "u1",
    });
    expect(contests.map((contest) => contest.registered)).toEqual([
      false,
      true,
    ]);
  });
});
