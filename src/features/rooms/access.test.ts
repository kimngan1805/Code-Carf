import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), findFirst: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { room: mocks } }));
import { canAccessRoom } from "./access";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findUnique.mockResolvedValue({
    pathId: "path-1",
    position: 5,
    path: {
      published: true,
      sequentialUnlock: true,
      enrollments: [{ userId: "user-1" }],
    },
  });
});

describe("canAccessRoom", () => {
  it("opens the first room even when its position is not 1", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(canAccessRoom("user-1", "room-1")).resolves.toBe(true);
  });
  it("locks a room until its preceding room is completed by the same learner", async () => {
    mocks.findFirst.mockResolvedValue({ progress: [] });
    await expect(canAccessRoom("user-1", "room-1")).resolves.toBe(false);
    const query = mocks.findFirst.mock.calls[0][0];
    expect(query.where).toEqual({ pathId: "path-1", position: { lt: 5 } });
    expect(query.orderBy).toEqual({ position: "desc" });
    expect(query.select.progress.where).toEqual({ userId: "user-1" });
    expect(
      mocks.findUnique.mock.calls[0][0].select.path.select.enrollments.where,
    ).toEqual({ userId: "user-1" });
  });
  it("unlocks immediately on the next call after completion without caching", async () => {
    mocks.findFirst
      .mockResolvedValueOnce({ progress: [] })
      .mockResolvedValueOnce({ progress: [{ roomId: "previous" }] });
    await expect(canAccessRoom("user-1", "room-1")).resolves.toBe(false);
    await expect(canAccessRoom("user-1", "room-1")).resolves.toBe(true);
  });
  it("opens all rooms when sequential unlock is disabled", async () => {
    mocks.findUnique.mockResolvedValue({
      pathId: "path-1",
      position: 5,
      path: { published: true, sequentialUnlock: false, enrollments: [{}] },
    });
    await expect(canAccessRoom("user-1", "room-1")).resolves.toBe(true);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
  it.each([
    { label: "missing room", room: null },
    {
      label: "draft path",
      room: { path: { published: false, enrollments: [{}] } },
    },
    {
      label: "unenrolled learner",
      room: {
        path: { published: true, sequentialUnlock: false, enrollments: [] },
      },
    },
  ])("denies $label", async ({ room }) => {
    mocks.findUnique.mockResolvedValue(room);
    await expect(canAccessRoom("user-1", "room-1")).resolves.toBe(false);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
});
