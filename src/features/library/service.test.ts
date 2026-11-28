import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  room: vi.fn(),
  findExercise: vi.fn(),
  createExercise: vi.fn(),
  findFile: vi.fn(),
  deleteFile: vi.fn(),
  storageDelete: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/storage", () => ({
  getStorage: () => ({ delete: mocks.storageDelete }),
}));
vi.mock("@/features/rooms/authoring", () => ({ addLessonVideo: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    room: { findFirst: mocks.room },
    exercise: {
      findFirst: mocks.findExercise,
      create: mocks.createExercise,
      findUnique: vi.fn().mockResolvedValue(null),
    },
    libraryLecture: { findFirst: mocks.findFile, delete: mocks.deleteFile },
  },
}));
import {
  cleanTags,
  copyExerciseToRoom,
  deleteLibraryLecture,
  saveLibraryExercise,
} from "./service";

const source = {
  title: "Tổng hai số",
  prompt: "In a + b.",
  kind: "CODE",
  difficulty: "EASY",
  points: 50,
  timeLimitMs: 1000,
  memoryLimitKb: 262144,
  rubric: null,
  testCases: [{ input: "1 2", expected: "3", isHidden: false, weight: 1 }],
  quizQuestions: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.role.mockResolvedValue({ id: "teacher-1", role: { name: "TEACHER" } });
  mocks.room.mockResolvedValue({
    id: "room-1",
    title: "Bài 1",
    path: { slug: "python" },
  });
  mocks.createExercise.mockResolvedValue({ id: "copy-1" });
});

it("copies a library exercise into a lesson the teacher manages", async () => {
  mocks.findExercise.mockResolvedValue(source);
  await expect(
    copyExerciseToRoom({ exerciseId: "lib-1", roomId: "room-1" }),
  ).resolves.toEqual({ id: "copy-1", roomId: "room-1", slug: "python" });
  // Lấy được bài của mình (chưa lưu trữ) hoặc bài người khác chia sẻ, đã sẵn sàng.
  expect(mocks.findExercise.mock.calls[0][0].where).toEqual({
    id: "lib-1",
    roomId: null,
    OR: [
      { creatorId: "teacher-1", libraryStatus: { not: "ARCHIVED" } },
      { libraryVisibility: "SHARED", libraryStatus: "READY" },
    ],
  });
  expect(mocks.createExercise.mock.calls[0][0].data).toMatchObject({
    roomId: "room-1",
    creatorId: "teacher-1",
    sourceId: "lib-1",
    title: "Tổng hai số",
    testCases: { create: source.testCases },
  });
});

it("refuses to copy another teacher's exercise or into an unmanaged lesson", async () => {
  mocks.findExercise.mockResolvedValue(null);
  await expect(
    copyExerciseToRoom({ exerciseId: "x", roomId: "room-1" }),
  ).rejects.toMatchObject({ status: 404 });
  mocks.room.mockResolvedValue(null);
  await expect(
    copyExerciseToRoom({ exerciseId: "lib-1", roomId: "room-9" }),
  ).rejects.toMatchObject({ code: "ROOM_NOT_FOUND" });
  expect(mocks.createExercise).not.toHaveBeenCalled();
});

it("creates a library exercise that belongs to no lesson", async () => {
  await saveLibraryExercise({
    requestId: "ade5dba9-9cfb-42d8-9c73-38dc227883cd",
    kind: "QUIZ",
    title: "Ôn tập",
    prompt: "Chọn đáp án đúng.",
    difficulty: "EASY",
    points: 20,
    questions: [{ prompt: "1 + 1?", options: ["1", "2"], answer: 1 }],
  });
  const data = mocks.createExercise.mock.calls[0][0].data;
  expect(data).toMatchObject({
    creatorId: "teacher-1",
    kind: "QUIZ",
    libraryStatus: "READY",
    libraryVisibility: "PRIVATE",
    libraryCategoryId: null,
  });
  expect(data.roomId).toBeUndefined();
  expect(data.quizQuestions.create).toHaveLength(1);
});

it("only deletes the owner's own lecture", async () => {
  mocks.findFile.mockResolvedValue(null);
  await expect(deleteLibraryLecture("f-1")).rejects.toMatchObject({
    code: "FILE_NOT_FOUND",
  });
  expect(mocks.findFile.mock.calls[0][0].where).toEqual({
    id: "f-1",
    ownerId: "teacher-1",
  });
  expect(mocks.deleteFile).not.toHaveBeenCalled();
});

it("cleans tags: trims, drops # and duplicates, caps the count", () => {
  expect(cleanTags([" #Python ", "python", "", "vòng lặp"])).toEqual([
    "Python",
    "vòng lặp",
  ]);
  expect(cleanTags(Array.from({ length: 12 }, (_, i) => `t${i}`))).toHaveLength(
    8,
  );
});
