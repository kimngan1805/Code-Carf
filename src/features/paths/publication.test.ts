import { beforeEach, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  find: vi.fn(),
  update: vi.fn(),
  updateRooms: vi.fn(),
  countEmpty: vi.fn(),
  transaction: vi.fn(),
  notifyNewLessonPublished: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.role }));
vi.mock("@/features/notifications/writer", () => ({
  notifyNewLessonPublished: mocks.notifyNewLessonPublished,
}));
vi.mock("@/lib/db", () => ({
  db: {
    path: { findFirst: mocks.find },
    $transaction: mocks.transaction,
  },
}));
import { setPathPublication } from "./publication";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.role.mockResolvedValue({ id: "teacher-1", role: { name: "TEACHER" } });
  mocks.find.mockResolvedValue({
    id: "path-1",
    slug: "my-path",
    title: "Lộ trình TS",
    published: false,
    creatorId: "teacher-1",
    rooms: [
      {
        id: "room-1",
        title: "Bài 1",
        content: "## Theory",
        published: false,
        _count: { attachments: 0, exercises: 0 },
      },
    ],
  });
  mocks.update.mockResolvedValue({ count: 1 });
  mocks.updateRooms.mockResolvedValue({ count: 1 });
  mocks.countEmpty.mockResolvedValue(0);
  mocks.transaction.mockImplementation(async (run) =>
    run({
      path: { updateMany: mocks.update },
      room: { updateMany: mocks.updateRooms, count: mocks.countEmpty },
    }),
  );
  mocks.notifyNewLessonPublished.mockResolvedValue(1);
});
it("publishes only owned active paths containing lesson content", async () => {
  await expect(setPathPublication("path-1", true)).resolves.toBe("my-path");
  expect(mocks.role).toHaveBeenCalledWith(["TEACHER", "ADMIN"]);
  expect(mocks.find.mock.calls[0][0].where).toEqual({
    id: "path-1",
    deletedAt: null,
  });
  expect(mocks.update).toHaveBeenCalledWith({
    where: {
      id: "path-1",
      deletedAt: null,
      creatorId: "teacher-1",
      rooms: { some: {} },
    },
    data: { published: true, publishedAt: expect.any(Date) },
  });
  // Bài học không có nháp riêng: xuất bản lộ trình mở luôn mọi bài trong cùng transaction.
  expect(mocks.updateRooms).toHaveBeenCalledWith({
    where: { pathId: "path-1", published: false },
    data: { published: true },
  });
  expect(mocks.transaction.mock.calls[0][1]).toEqual({
    isolationLevel: "Serializable",
  });
});
const none = { attachments: 0, exercises: 0 };
it.each([
  { rooms: [] },
  { rooms: [{ content: "", _count: none }] },
  { rooms: [{ content: " \n ", _count: none }] },
  {
    rooms: [
      { content: "Theory", _count: none },
      { content: "", _count: none },
    ],
  },
])(
  "rejects paths with no lessons or an empty lesson: %j",
  async ({ rooms }) => {
    mocks.find.mockResolvedValue({
      slug: "my-path",
      creatorId: "teacher-1",
      rooms,
    });
    await expect(setPathPublication("path-1", true)).rejects.toMatchObject({
      code: "PATH_NOT_READY",
    });
    expect(mocks.update).not.toHaveBeenCalled();
  },
);
it.each([
  { name: "only an attachment", _count: { attachments: 1, exercises: 0 } },
  { name: "only an exercise", _count: { attachments: 0, exercises: 2 } },
])("publishes a lesson with no text but $name", async ({ _count }) => {
  mocks.find.mockResolvedValue({
    id: "path-1",
    slug: "my-path",
    title: "Lộ trình",
    published: false,
    creatorId: "teacher-1",
    rooms: [{ id: "r", title: "Bài", content: "", published: false, _count }],
  });
  await expect(setPathPublication("path-1", true)).resolves.toBe("my-path");
  expect(mocks.update).toHaveBeenCalled();
});
it("re-checks inside the transaction for a lesson emptied meanwhile", async () => {
  mocks.countEmpty.mockResolvedValue(1);
  await expect(setPathPublication("path-1", true)).rejects.toMatchObject({
    code: "PATH_NOT_READY",
  });
  expect(mocks.countEmpty).toHaveBeenCalledWith({
    where: {
      pathId: "path-1",
      content: "",
      attachments: { none: {} },
      exercises: { none: {} },
    },
  });
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.notifyNewLessonPublished).not.toHaveBeenCalled();
});
it("allows hiding an owned active path even if its content is incomplete", async () => {
  mocks.find.mockResolvedValue({
    slug: "my-path",
    creatorId: "teacher-1",
    rooms: [],
  });
  await setPathPublication("path-1", false);
  expect(mocks.update).toHaveBeenCalledWith({
    where: { id: "path-1", deletedAt: null, creatorId: "teacher-1" },
    data: { published: false },
  });
  // Ẩn lộ trình là đủ để ẩn mọi bài; không cần đổi từng bài.
  expect(mocks.updateRooms).not.toHaveBeenCalled();
});
it("returns 403 when a teacher tries to publish or unpublish another teacher's path", async () => {
  mocks.find.mockResolvedValue({
    slug: "foreign-path",
    creatorId: "teacher-2",
    rooms: [{ content: "## Theory", _count: { attachments: 0, exercises: 0 } }],
  });
  await expect(setPathPublication("foreign", true)).rejects.toMatchObject({
    status: 403,
    code: "FORBIDDEN",
  });
  await expect(setPathPublication("foreign", false)).rejects.toMatchObject({
    status: 403,
    code: "FORBIDDEN",
  });
  expect(mocks.update).not.toHaveBeenCalled();
});
it("returns 404 for missing or soft-deleted paths", async () => {
  mocks.find.mockResolvedValue(null);
  await expect(setPathPublication("deleted", true)).rejects.toMatchObject({
    status: 404,
    code: "PATH_NOT_FOUND",
  });
  await expect(setPathPublication("deleted", false)).rejects.toMatchObject({
    status: 404,
    code: "PATH_NOT_FOUND",
  });
  expect(mocks.update).not.toHaveBeenCalled();
});
it("allows admins to publish another creator's active path", async () => {
  mocks.role.mockResolvedValue({ id: "admin-1", role: { name: "ADMIN" } });
  await setPathPublication("path-1", true);
  expect(mocks.find.mock.calls[0][0].where).toEqual({
    id: "path-1",
    deletedAt: null,
  });
  expect(mocks.update.mock.calls[0][0].where).toMatchObject({
    id: "path-1",
    deletedAt: null,
  });
  expect(mocks.update.mock.calls[0][0].where).not.toHaveProperty("creatorId");
});
it("stops unauthorized callers before reading or changing a path", async () => {
  mocks.role.mockRejectedValue(new AppError(403, "FORBIDDEN", "Forbidden"));
  await expect(setPathPublication("path-1", true)).rejects.toMatchObject({
    status: 403,
  });
  expect(mocks.find).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});
it("reports a path changed concurrently instead of claiming success", async () => {
  mocks.update.mockResolvedValue({ count: 0 });
  await expect(setPathPublication("path-1", true)).rejects.toMatchObject({
    code: "PATH_CHANGED",
  });
  expect(mocks.updateRooms).not.toHaveBeenCalled();
  expect(mocks.notifyNewLessonPublished).not.toHaveBeenCalled();
});
it("asks to retry when publishing collides with a lesson being added", async () => {
  const { Prisma } = await import("@prisma/client");
  mocks.transaction.mockRejectedValue(
    new Prisma.PrismaClientKnownRequestError("conflict", {
      code: "P2034",
      clientVersion: "test",
    }),
  );
  await expect(setPathPublication("path-1", true)).rejects.toMatchObject({
    status: 409,
    code: "PATH_BUSY",
  });
  expect(mocks.notifyNewLessonPublished).not.toHaveBeenCalled();
});
it("sends NEW_LESSON for every lesson when a draft path is published, and never on unpublish or re-publish", async () => {
  mocks.find.mockResolvedValueOnce({
    id: "path-1",
    slug: "my-path",
    title: "Lộ trình TS",
    published: false,
    creatorId: "teacher-1",
    rooms: [
      {
        id: "room-1",
        title: "Bài 1",
        content: "## 1",
        published: false,
        _count: { attachments: 0, exercises: 0 },
      },
      {
        id: "room-2",
        title: "Bài 2",
        content: "## 2",
        published: false,
        _count: { attachments: 0, exercises: 0 },
      },
    ],
  });

  await setPathPublication("path-1", true);

  expect(mocks.notifyNewLessonPublished).toHaveBeenCalledTimes(2);
  expect(mocks.notifyNewLessonPublished).toHaveBeenNthCalledWith(1, {
    pathId: "path-1",
    pathTitle: "Lộ trình TS",
    roomId: "room-1",
    roomTitle: "Bài 1",
    actorUserId: "teacher-1",
  });
  expect(mocks.notifyNewLessonPublished).toHaveBeenNthCalledWith(2, {
    pathId: "path-1",
    pathTitle: "Lộ trình TS",
    roomId: "room-2",
    roomTitle: "Bài 2",
    actorUserId: "teacher-1",
  });

  // Unpublishing or re-publishing an already published path does not notify.
  mocks.notifyNewLessonPublished.mockClear();
  mocks.find.mockResolvedValueOnce({
    id: "path-1",
    slug: "my-path",
    title: "Lộ trình TS",
    published: true,
    creatorId: "teacher-1",
    rooms: [
      {
        id: "room-1",
        title: "Bài 1",
        content: "## 1",
        published: true,
        _count: { attachments: 0, exercises: 0 },
      },
    ],
  });
  await setPathPublication("path-1", true);
  await setPathPublication("path-1", false);
  expect(mocks.notifyNewLessonPublished).not.toHaveBeenCalled();
});
