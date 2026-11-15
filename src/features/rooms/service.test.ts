import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  canAccessRoom: vi.fn(),
  findRoomAccess: vi.fn(),
  findRoomContent: vi.fn(),
  findRoomExerciseStatuses: vi.fn(),
  findPreviousRoom: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.requireRole }));
vi.mock("./access", () => ({ canAccessRoom: mocks.canAccessRoom }));
vi.mock("./repository", () => ({
  findRoomAccess: mocks.findRoomAccess,
  findRoomContent: mocks.findRoomContent,
  findRoomExerciseStatuses: mocks.findRoomExerciseStatuses,
  findPreviousRoom: mocks.findPreviousRoom,
}));
import { getRoom, getRoomPage } from "./service";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({ id: "user-1" });
  mocks.findRoomAccess.mockResolvedValue({
    id: "room-1",
    title: "Room",
    pathId: "path-1",
    position: 2,
    path: {
      published: true,
      title: "Path",
      slug: "path",
      enrollments: [{ userId: "user-1" }],
    },
  });
  mocks.findRoomExerciseStatuses.mockResolvedValue([]);
});
describe("room content authorization", () => {
  it("returns 403 and never reads locked content", async () => {
    mocks.canAccessRoom.mockResolvedValue(false);
    await expect(getRoom("room-1")).rejects.toMatchObject({
      status: 403,
      code: "ROOM_LOCKED",
    });
    expect(mocks.findRoomContent).not.toHaveBeenCalled();
  });
  it("only loads room content after the current learner passes the contract", async () => {
    mocks.canAccessRoom.mockResolvedValue(true);
    mocks.findRoomContent.mockResolvedValue({
      id: "room-1",
      content: "Theory",
      exercises: [],
    });
    await expect(getRoom("room-1")).resolves.toMatchObject({
      content: "Theory",
    });
    expect(mocks.canAccessRoom).toHaveBeenCalledWith("user-1", "room-1");
  });
  it.each([null, { path: { published: false } }])(
    "hides missing and unpublished content",
    async (room) => {
      mocks.findRoomAccess.mockResolvedValue(room);
      await expect(getRoom("room-1")).rejects.toMatchObject({ status: 404 });
      expect(mocks.findRoomContent).not.toHaveBeenCalled();
    },
  );
  it("authenticates before querying room metadata", async () => {
    mocks.requireRole.mockRejectedValue(new Error("Unauthorized"));
    await expect(getRoom("room-1")).rejects.toThrow("Unauthorized");
    expect(mocks.findRoomAccess).not.toHaveBeenCalled();
  });

  it("shows a safe predecessor reason without loading locked theory or exercise statuses", async () => {
    mocks.canAccessRoom.mockResolvedValue(false);
    mocks.findPreviousRoom.mockResolvedValue({
      id: "previous",
      title: "Room trước",
    });
    const view = await getRoomPage("room-1");
    expect(view).toMatchObject({
      accessible: false,
      reason: "previous_room",
      message: expect.stringContaining("Room trước"),
    });
    expect(view).not.toHaveProperty("content");
    expect(view).not.toHaveProperty("exercises");
    expect(mocks.findRoomContent).not.toHaveBeenCalled();
    expect(mocks.findRoomExerciseStatuses).not.toHaveBeenCalled();
  });
  it("explains enrollment requirements without querying a previous room", async () => {
    mocks.findRoomAccess.mockResolvedValue({
      path: { published: true, enrollments: [], title: "Path", slug: "path" },
    });
    mocks.canAccessRoom.mockResolvedValue(false);
    await expect(getRoomPage("room-1")).resolves.toMatchObject({
      accessible: false,
      reason: "enrollment",
    });
    expect(mocks.findPreviousRoom).not.toHaveBeenCalled();
  });
  it("keeps an earlier accepted attempt as passed and does not infer completion from other exercises", async () => {
    mocks.canAccessRoom.mockResolvedValue(true);
    mocks.findRoomContent.mockResolvedValue({
      id: "room-1",
      content: "Theory",
      exercises: [
        { id: "new", title: "New" },
        { id: "submitted", title: "Submitted" },
        { id: "passed", title: "Passed" },
      ],
    });
    mocks.findRoomExerciseStatuses.mockResolvedValue([
      { exerciseId: "submitted", status: "REJECTED" },
      { exerciseId: "passed", status: "ACCEPTED" },
      { exerciseId: "passed", status: "REJECTED" },
    ]);
    const view = await getRoomPage("room-1");
    expect(view.accessible).toBe(true);
    if (view.accessible) {
      expect(view.exercises.map((exercise) => exercise.state)).toEqual([
        "not_started",
        "submitted",
        "passed",
      ]);
      expect(view.passedExercises).toBe(1);
    }
    expect(mocks.findRoomExerciseStatuses).toHaveBeenCalledWith(
      "room-1",
      "user-1",
    );
  });
});
