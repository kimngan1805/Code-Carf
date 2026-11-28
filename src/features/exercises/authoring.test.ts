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
  deleteQuestions: vi.fn(),
  createQuestions: vi.fn(),
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
  mocks.room.mockResolvedValue({
    id: "room-1",
    path: { slug: "cpp", title: "Lập trình C++" },
  });
  mocks.findExisting.mockResolvedValue(null);
  mocks.update.mockResolvedValue({ count: 1 });
  mocks.create.mockResolvedValue({ id: "library-copy" });
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
      quizQuestion: {
        deleteMany: mocks.deleteQuestions,
        createMany: mocks.createQuestions,
      },
      libraryCategory: {
        upsert: vi.fn().mockResolvedValue({ id: "category-1" }),
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
    path: { slug: "cpp", deletedAt: null, creatorId: "teacher-1" },
  });
  // The first row is the teacher's library copy, the second the lesson's own exercise.
  const library = mocks.create.mock.calls[0][0].data;
  expect(library).toMatchObject({
    creatorId: "teacher-1",
    libraryCategoryId: "category-1",
    title: "Tổng",
  });
  expect(library.roomId).toBeUndefined();
  const data = mocks.create.mock.calls[1][0].data;
  expect(data).toMatchObject({
    creatorId: "teacher-1",
    sourceId: "library-copy",
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

it("lets an admin save in any teacher's active room", async () => {
  mocks.role.mockResolvedValue({ id: "admin-1", role: { name: "ADMIN" } });
  await saveManagedExercise(input);
  expect(mocks.room.mock.calls[0][0].where.path).toEqual({
    slug: "cpp",
    deletedAt: null,
  });
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

it("refuses creating, editing, or deleting exercises in a soft-deleted or unowned path", async () => {
  mocks.room.mockResolvedValue(null);
  await expect(saveManagedExercise(input)).rejects.toMatchObject({
    status: 404,
    code: "ROOM_NOT_FOUND",
  });
  const rest: Partial<typeof input> = { ...input };
  delete rest.requestId;
  await expect(
    saveManagedExercise({ ...rest, exerciseId: "ex-1" }),
  ).rejects.toMatchObject({
    status: 404,
    code: "ROOM_NOT_FOUND",
  });
  await expect(
    deleteManagedExercise({
      pathSlug: "cpp",
      roomId: "room-1",
      exerciseId: "ex-1",
    }),
  ).rejects.toMatchObject({
    status: 404,
    code: "ROOM_NOT_FOUND",
  });
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
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

it("creates a QUIZ exercise with ordered questions and no test cases", async () => {
  const { timeLimitMs: _t, memoryMb: _m, testCases: _c, ...rest } = input;
  void _t;
  void _m;
  void _c;
  await saveManagedExercise({
    ...rest,
    kind: "QUIZ",
    questions: [
      { prompt: "1 + 1?", options: ["1", "2"], answer: 1 },
      { prompt: "Kiểu của 1.5?", options: ["int", "float", "str"], answer: 1 },
    ],
  });
  const data = mocks.create.mock.calls[1][0].data;
  expect(data).toMatchObject({ kind: "QUIZ", rubric: null });
  expect(data.testCases.create).toEqual([]);
  expect(data.quizQuestions.create).toEqual([
    {
      position: 0,
      prompt: "1 + 1?",
      options: ["1", "2"],
      answer: 1,
      explanation: "",
    },
    {
      position: 1,
      prompt: "Kiểu của 1.5?",
      options: ["int", "float", "str"],
      answer: 1,
      explanation: "",
    },
  ]);
});

it("refuses a quiz question whose answer is out of range", async () => {
  const { timeLimitMs: _t, memoryMb: _m, testCases: _c, ...rest } = input;
  void _t;
  void _m;
  void _c;
  await expect(
    saveManagedExercise({
      ...rest,
      kind: "QUIZ",
      questions: [{ prompt: "?", options: ["a", "b"], answer: 3 }],
    }),
  ).rejects.toMatchObject({ message: "Vui lòng chọn đáp án đúng." });
});

it("requires a rubric for a handwritten exercise", async () => {
  const { timeLimitMs: _t, memoryMb: _m, testCases: _c, ...rest } = input;
  void _t;
  void _m;
  void _c;
  await expect(
    saveManagedExercise({ ...rest, kind: "HANDWRITTEN", rubric: " " }),
  ).rejects.toMatchObject({
    message: "Vui lòng nhập đáp án mẫu hoặc tiêu chí chấm.",
  });
});
