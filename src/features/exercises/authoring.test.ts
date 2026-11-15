import { beforeEach, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  transaction: vi.fn(),
  room: vi.fn(),
  find: vi.fn(),
  findExisting: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  deleteTests: vi.fn(),
  createTests: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));
import { deleteManagedExercise, saveManagedExercise } from "./authoring";

const input = {
  pathSlug: "cpp",
  roomId: "room-1",
  title: " Tổng ",
  prompt: "In tổng.",
  difficulty: "MEDIUM",
  points: 50,
  timeLimitMs: 2000,
  memoryMb: 128,
  testCases: [
    { input: "1 2", expected: "3", isHidden: false, weight: 1 },
    { input: "5 5", expected: "10", isHidden: true, weight: 2 },
  ],
  requestId: "ade5dba9-9cfb-42d8-9c73-38dc227883cd",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.role.mockResolvedValue({ id: "teacher-1", role: { name: "TEACHER" } });
  mocks.room.mockResolvedValue({ id: "room-1", path: { slug: "cpp" } });
  mocks.findExisting.mockResolvedValue(null);
  mocks.update.mockResolvedValue({ count: 1 });
  mocks.transaction.mockImplementation(async (run) =>
    run({
      room: { findFirst: mocks.room },
      exercise: {
        findUnique: mocks.findExisting,
        findFirst: mocks.find,
        create: mocks.create,
        updateMany: mocks.update,
        delete: mocks.remove,
      },
      testCase: {
        deleteMany: mocks.deleteTests,
        createMany: mocks.createTests,
      },
    }),
  );
});

it("creates a CODE exercise with its tests inside an owned room", async () => {
  await expect(saveManagedExercise(input)).resolves.toMatchObject({
    roomId: "room-1",
    slug: "cpp",
  });
  expect(mocks.role).toHaveBeenCalledWith(["TEACHER", "ADMIN"]);
  expect(mocks.room.mock.calls[0][0].where).toEqual({
    id: "room-1",
    path: { slug: "cpp", creatorId: "teacher-1" },
  });
  const data = mocks.create.mock.calls[0][0].data;
  expect(data).toMatchObject({
    roomId: "room-1",
    title: "Tổng",
    kind: "CODE",
    difficulty: "MEDIUM",
    points: 50,
    timeLimitMs: 2000,
    memoryLimitKb: 128 * 1024,
  });
  expect(data.testCases.create).toEqual([
    { input: "1 2", expected: "3", isHidden: false, weight: 1 },
    { input: "5 5", expected: "10", isHidden: true, weight: 2 },
  ]);
});

it("lets an admin save in any teacher's room", async () => {
  mocks.role.mockResolvedValue({ id: "admin-1", role: { name: "ADMIN" } });
  await saveManagedExercise(input);
  expect(mocks.room.mock.calls[0][0].where.path).toEqual({ slug: "cpp" });
});

it("is idempotent for a repeated request id", async () => {
  mocks.findExisting.mockResolvedValue({
    roomId: "room-1",
    title: "Tổng",
    prompt: "In tổng.",
  });
  await saveManagedExercise(input);
  expect(mocks.create).not.toHaveBeenCalled();
});

it("rejects a reused request id with different content", async () => {
  mocks.findExisting.mockResolvedValue({
    roomId: "room-1",
    title: "Khác",
    prompt: "In tổng.",
  });
  await expect(saveManagedExercise(input)).rejects.toMatchObject({
    status: 409,
    code: "EXERCISE_REQUEST_REUSED",
  });
});

it("replaces the test cases when updating", async () => {
  const rest: Partial<typeof input> = { ...input };
  delete rest.requestId;
  await saveManagedExercise({ ...rest, exerciseId: "ex-1" });
  expect(mocks.update.mock.calls[0][0].where).toEqual({
    id: "ex-1",
    roomId: "room-1",
  });
  expect(mocks.deleteTests).toHaveBeenCalledWith({
    where: { exerciseId: "ex-1" },
  });
  expect(mocks.createTests.mock.calls[0][0].data).toHaveLength(2);
  expect(mocks.createTests.mock.calls[0][0].data[0]).toMatchObject({
    exerciseId: "ex-1",
  });
});

it("does not touch tests when the exercise is not in the room", async () => {
  mocks.update.mockResolvedValue({ count: 0 });
  const rest: Partial<typeof input> = { ...input };
  delete rest.requestId;
  await expect(
    saveManagedExercise({ ...rest, exerciseId: "other" }),
  ).rejects.toMatchObject({ status: 404 });
  expect(mocks.deleteTests).not.toHaveBeenCalled();
});

it("refuses a room the teacher does not own", async () => {
  mocks.room.mockResolvedValue(null);
  await expect(saveManagedExercise(input)).rejects.toMatchObject({
    status: 404,
    code: "ROOM_NOT_FOUND",
  });
  expect(mocks.create).not.toHaveBeenCalled();
});

it("refuses an exercise without test cases", async () => {
  await expect(
    saveManagedExercise({ ...input, testCases: [] }),
  ).rejects.toBeInstanceOf(AppError);
  expect(mocks.transaction).not.toHaveBeenCalled();
});

it("deletes an unused exercise", async () => {
  mocks.find.mockResolvedValue({
    id: "ex-1",
    _count: { submissions: 0, contests: 0 },
  });
  await deleteManagedExercise({
    pathSlug: "cpp",
    roomId: "room-1",
    exerciseId: "ex-1",
  });
  expect(mocks.remove).toHaveBeenCalledWith({ where: { id: "ex-1" } });
});

it("refuses to delete an exercise that has submissions", async () => {
  mocks.find.mockResolvedValue({
    id: "ex-1",
    _count: { submissions: 3, contests: 0 },
  });
  await expect(
    deleteManagedExercise({
      pathSlug: "cpp",
      roomId: "room-1",
      exerciseId: "ex-1",
    }),
  ).rejects.toMatchObject({ status: 409, code: "EXERCISE_IN_USE" });
  expect(mocks.remove).not.toHaveBeenCalled();
});
