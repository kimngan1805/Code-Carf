import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  canAccessRoom: vi.fn(),
  findExerciseForPractice: vi.fn(),
  getOwnHandwrittenUpload: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/features/rooms/access", () => ({
  canAccessRoom: mocks.canAccessRoom,
}));
vi.mock("@/features/handwritten/service", () => ({
  getOwnHandwrittenUpload: mocks.getOwnHandwrittenUpload,
}));
vi.mock("./repository", () => ({
  findExerciseForPractice: mocks.findExerciseForPractice,
}));
import { getExercisePage } from "./exercise-page";

const exercise = {
  id: "ex-1",
  title: "Tổng hai số",
  prompt: "Cộng a và b",
  kind: "CODE",
  points: 100,
  timeLimitMs: 2000,
  memoryLimitKb: 262144,
  roomId: "room-1",
  room: {
    id: "room-1",
    title: "Room 1",
    path: { slug: "python", title: "Python", published: true, deletedAt: null },
  },
  testCases: [{ id: "t1", input: "1 2", expected: "3" }],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({ id: "user-1" });
  mocks.canAccessRoom.mockResolvedValue(true);
  mocks.findExerciseForPractice.mockResolvedValue(exercise);
});

describe("getExercisePage", () => {
  it("only allows the STUDENT role", async () => {
    mocks.requireRole.mockRejectedValue(
      Object.assign(new Error("no"), { status: 403 }),
    );
    await expect(getExercisePage("ex-1")).rejects.toMatchObject({
      status: 403,
    });
    expect(mocks.findExerciseForPractice).not.toHaveBeenCalled();
  });

  it("returns the exercise with sample tests for an unlocked room", async () => {
    const page = await getExercisePage("ex-1");
    expect(mocks.canAccessRoom).toHaveBeenCalledWith("user-1", "room-1");
    expect(page).toMatchObject({
      accessible: true,
      kind: "CODE",
      userId: "user-1",
      title: "Tổng hai số",
      room: { id: "room-1" },
      path: { slug: "python" },
      sampleTests: [{ id: "t1", input: "1 2", expected: "3" }],
    });
  });

  it("asks the repository for visible tests only and never adds extra fields", async () => {
    mocks.findExerciseForPractice.mockResolvedValue({
      ...exercise,
      testCases: [
        { id: "t1", input: "1 2", expected: "3", isHidden: false, weight: 9 },
      ],
    });
    const page = await getExercisePage("ex-1");
    if (!page.accessible || page.kind !== "CODE")
      throw new Error("expected an accessible code exercise");
    expect(Object.keys(page.sampleTests[0]).sort()).toEqual([
      "expected",
      "id",
      "input",
    ]);
  });

  it("returns a handwritten exercise with the learner's own upload and no tests", async () => {
    const upload = {
      id: "sub-1",
      status: "PENDING",
      submittedAt: new Date("2026-11-19T10:00:00Z"),
    };
    mocks.findExerciseForPractice.mockResolvedValue({
      ...exercise,
      kind: "HANDWRITTEN",
    });
    mocks.getOwnHandwrittenUpload.mockResolvedValue(upload);

    const page = await getExercisePage("ex-1");

    expect(mocks.getOwnHandwrittenUpload).toHaveBeenCalledWith(
      "user-1",
      "ex-1",
    );
    expect(page).toMatchObject({
      accessible: true,
      kind: "HANDWRITTEN",
      title: "Tổng hai số",
      upload,
    });
    expect(page).not.toHaveProperty("sampleTests");
  });

  it("does not look up an upload while the room is locked", async () => {
    mocks.findExerciseForPractice.mockResolvedValue({
      ...exercise,
      kind: "HANDWRITTEN",
    });
    mocks.canAccessRoom.mockResolvedValue(false);
    expect(await getExercisePage("ex-1")).toEqual({
      accessible: false,
      roomId: "room-1",
    });
    expect(mocks.getOwnHandwrittenUpload).not.toHaveBeenCalled();
  });

  it("returns a locked result without exposing the prompt or tests", async () => {
    mocks.canAccessRoom.mockResolvedValue(false);
    const page = await getExercisePage("ex-1");
    expect(page).toEqual({ accessible: false, roomId: "room-1" });
  });

  it.each([
    ["missing exercise", null],
    ["exercise without a room", { ...exercise, room: null, roomId: null }],
    [
      "unpublished path",
      {
        ...exercise,
        room: {
          ...exercise.room,
          path: { ...exercise.room.path, published: false },
        },
      },
    ],
    [
      "soft-deleted path",
      {
        ...exercise,
        room: {
          ...exercise.room,
          path: {
            ...exercise.room.path,
            deletedAt: new Date("2026-11-22T00:00:00Z"),
          },
        },
      },
    ],
  ])("returns 404 for %s", async (_name, value) => {
    mocks.findExerciseForPractice.mockResolvedValue(value);
    await expect(getExercisePage("ex-1")).rejects.toMatchObject({
      status: 404,
      code: "EXERCISE_NOT_FOUND",
    });
    expect(mocks.canAccessRoom).not.toHaveBeenCalled();
  });
});
