import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/db", () => ({
  db: {
    path: { findMany: mocks.findMany, findFirst: mocks.findFirst },
    enrollment: { upsert: mocks.upsert },
  },
}));
import { getPath, getPaths, registerForPath } from "./service";

function pathRecord(completed = 1, total = 3) {
  return {
    id: "path-1",
    slug: "basics",
    title: "Basics",
    description: "Learn",
    sequentialUnlock: true,
    enrollments: [{ userId: "student-1" }],
    rooms: Array.from({ length: total }, (_, index) => ({
      id: `room-${index}`,
      title: `Room ${index}`,
      description: "",
      position: index + 1,
      progress: index < completed ? [{ roomId: `room-${index}` }] : [],
      _count: { exercises: 2 },
    })),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({
    id: "student-1",
    role: { name: "STUDENT" },
  });
});

describe("learner path catalog", () => {
  it("uses the preceding room completion for links and honors disabled sequential unlock", async () => {
    const path = pathRecord();
    mocks.findFirst.mockResolvedValue(path);
    expect(
      (await getPath("basics")).rooms.map((room) => room.accessible),
    ).toEqual([true, true, false]);
    mocks.findFirst.mockResolvedValue({ ...path, sequentialUnlock: false });
    expect(
      (await getPath("basics")).rooms.every((room) => room.accessible),
    ).toBe(true);
    mocks.findFirst.mockResolvedValue({ ...path, enrollments: [] });
    expect(
      (await getPath("basics")).rooms.some((room) => room.accessible),
    ).toBe(false);
  });
  it("only queries published paths and scopes enrollment and room progress to the current user", async () => {
    mocks.findMany.mockResolvedValue([]);
    await expect(getPaths()).resolves.toEqual([]);
    const query = mocks.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ published: true });
    expect(query.select.rooms.select.progress.where).toEqual({
      userId: "student-1",
    });
    expect(query.select.enrollments.where).toEqual({ userId: "student-1" });
    expect(query.select.rooms.select.content).toBeUndefined();
  });
  it.each([
    [0, 0, 0],
    [0, 3, 0],
    [1, 3, 33],
    [2, 3, 67],
    [3, 3, 100],
  ])(
    "computes %i/%i completed rooms as %i percent",
    async (completed, total, percent) => {
      mocks.findMany.mockResolvedValue([pathRecord(completed, total)]);
      expect((await getPaths())[0]).toMatchObject({
        completed,
        total,
        percent,
        enrolled: true,
      });
    },
  );
  it("returns room completion without exposing raw enrollment records", async () => {
    mocks.findFirst.mockResolvedValue(pathRecord());
    const path = await getPath("basics");
    expect(path.rooms.map((room) => room.completed)).toEqual([
      true,
      false,
      false,
    ]);
    expect(path).not.toHaveProperty("enrollments");
  });
  it("returns 404 for missing or unpublished detail pages", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(getPath("draft")).rejects.toMatchObject({ status: 404 });
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({
      slug: "draft",
      published: true,
    });
  });
  it("checks authentication before loading paths", async () => {
    mocks.requireRole.mockRejectedValue(new Error("Unauthorized"));
    await expect(getPaths()).rejects.toThrow("Unauthorized");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});

describe("path enrollment", () => {
  it("uses the authenticated student and unique enrollment key for repeat requests", async () => {
    mocks.findFirst.mockResolvedValue(pathRecord());
    mocks.upsert.mockResolvedValue({ pathId: "path-1" });
    await registerForPath("basics");
    await registerForPath("basics");
    expect(mocks.requireRole).toHaveBeenCalledWith(["STUDENT"]);
    expect(mocks.upsert).toHaveBeenLastCalledWith({
      where: { userId_pathId: { userId: "student-1", pathId: "path-1" } },
      create: { userId: "student-1", pathId: "path-1" },
      update: {},
      select: { pathId: true, enrolledAt: true },
    });
  });
  it("does not enroll in an unpublished or missing path", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(registerForPath("draft")).rejects.toMatchObject({
      status: 404,
    });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("does not write when authorization fails", async () => {
    mocks.requireRole.mockRejectedValue(new Error("Forbidden"));
    await expect(registerForPath("basics")).rejects.toThrow("Forbidden");
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
