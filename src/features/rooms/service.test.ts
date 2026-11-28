import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  canAccessRoom: vi.fn(),
  findRoomAccess: vi.fn(),
  findRoomContent: vi.fn(),
  findRoomExerciseStatuses: vi.fn(),
  findPreviousRoom: vi.fn(),
  isRoomCompleted: vi.fn(),
  findNextRoom: vi.fn(),
  completeRoomIfDone: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.requireRole }));
vi.mock("./access", () => ({ canAccessRoom: mocks.canAccessRoom }));
vi.mock("./repository", () => ({
  findRoomAccess: mocks.findRoomAccess,
  findRoomContent: mocks.findRoomContent,
  findRoomExerciseStatuses: mocks.findRoomExerciseStatuses,
  findPreviousRoom: mocks.findPreviousRoom,
  isRoomCompleted: mocks.isRoomCompleted,
  findNextRoom: mocks.findNextRoom,
}));
vi.mock("@/features/grading/room-completion", () => ({
  completeRoomIfDone: mocks.completeRoomIfDone,
}));
import { getRoom, getRoomPage, markRoomLearned } from "./service";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({ id: "user-1" });
  mocks.findRoomAccess.mockResolvedValue({
    id: "room-1",
    title: "Room",
    published: true,
    pathId: "path-1",
    position: 2,
    path: {
      published: true,
      deletedAt: null,
      title: "Path",
      slug: "path",
      enrollments: [{ userId: "user-1" }],
    },
  });
  mocks.findRoomExerciseStatuses.mockResolvedValue([]);
  mocks.isRoomCompleted.mockResolvedValue(false);
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
  it.each([
    null,
    { published: false, path: { published: true, deletedAt: null } },
    { published: true, path: { published: false, deletedAt: null } },
    {
      published: true,
      path: { published: true, deletedAt: new Date("2026-11-22T00:00:00Z") },
    },
  ])("hides missing, unpublished, and soft-deleted content", async (room) => {
    mocks.findRoomAccess.mockResolvedValue(room);
    await expect(getRoom("room-1")).rejects.toMatchObject({ status: 404 });
    await expect(getRoomPage("room-1")).rejects.toMatchObject({ status: 404 });
    expect(mocks.findRoomContent).not.toHaveBeenCalled();
  });
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
      published: true,
      path: {
        published: true,
        deletedAt: null,
        enrollments: [],
        title: "Path",
        slug: "path",
      },
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

describe("handwritten exercises and finishing content-only lessons", () => {
  it("does not look up the next lesson before this one is completed", async () => {
    mocks.canAccessRoom.mockResolvedValue(true);
    mocks.findRoomContent.mockResolvedValue({ id: "room-1", exercises: [] });
    const view = await getRoomPage("room-1");
    if (!view.accessible) throw new Error("expected an accessible room");
    expect(view.nextRoom).toBeNull();
    expect(mocks.findNextRoom).not.toHaveBeenCalled();
  });

  it("counts a submitted handwritten answer as done while grading is pending", async () => {
    mocks.canAccessRoom.mockResolvedValue(true);
    mocks.isRoomCompleted.mockResolvedValue(true);
    mocks.findNextRoom.mockResolvedValue({ id: "room-3", title: "Bài 3" });
    mocks.findRoomContent.mockResolvedValue({
      id: "room-1",
      content: "Theory",
      exercises: [
        { id: "essay", title: "Tự luận", kind: "HANDWRITTEN" },
        { id: "code", title: "Code", kind: "CODE" },
      ],
    });
    mocks.findRoomExerciseStatuses.mockResolvedValue([
      { exerciseId: "essay", status: "PENDING" },
      { exerciseId: "code", status: "REJECTED" },
    ]);
    const view = await getRoomPage("room-1");
    if (!view.accessible) throw new Error("expected an accessible room");
    // Bài tự luận đã nộp tính là làm xong; bài code bị từ chối thì chưa.
    expect(view.passedExercises).toBe(1);
    expect(view.completed).toBe(true);
    // Đã hoàn thành thì có đường sang bài kế tiếp, cả khi tải lại trang.
    expect(view.nextRoom).toEqual({ id: "room-3", title: "Bài 3" });
    expect(mocks.findNextRoom).toHaveBeenCalledWith("path-1", 2);
  });

  it("lets a learner mark a lesson without exercises as learned", async () => {
    mocks.requireRole.mockResolvedValue({ id: "user-1" });
    mocks.canAccessRoom.mockResolvedValue(true);
    mocks.findRoomContent.mockResolvedValue({ id: "room-1", exercises: [] });
    mocks.completeRoomIfDone.mockResolvedValue({
      nextRoom: { id: "room-2", title: "Bài 2" },
      xpAwarded: 50,
    });
    await expect(markRoomLearned("room-1")).resolves.toMatchObject({
      roomId: "room-1",
      completion: { nextRoom: { id: "room-2" } },
    });
    expect(mocks.requireRole).toHaveBeenCalledWith(["STUDENT"]);
    expect(mocks.completeRoomIfDone).toHaveBeenCalledWith("user-1", "room-1", {
      markRead: true,
    });
  });

  it("refuses to mark a locked lesson or one that has exercises", async () => {
    mocks.canAccessRoom.mockResolvedValue(false);
    await expect(markRoomLearned("room-1")).rejects.toMatchObject({
      status: 403,
      code: "ROOM_LOCKED",
    });
    mocks.canAccessRoom.mockResolvedValue(true);
    mocks.findRoomContent.mockResolvedValue({
      id: "room-1",
      exercises: [{ id: "ex" }],
    });
    await expect(markRoomLearned("room-1")).rejects.toMatchObject({
      status: 400,
      code: "ROOM_HAS_EXERCISES",
    });
    expect(mocks.completeRoomIfDone).not.toHaveBeenCalled();
  });
});
