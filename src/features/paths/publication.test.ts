import { beforeEach, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  find: vi.fn(),
  update: vi.fn(),
  notifyNewLessonPublished: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.role }));
vi.mock("@/features/notifications/writer", () => ({
  notifyNewLessonPublished: mocks.notifyNewLessonPublished,
}));
vi.mock("@/lib/db", () => ({
  db: { path: { findFirst: mocks.find, updateMany: mocks.update } },
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
      { id: "room-1", title: "Bài 1", content: "## Theory", published: false },
    ],
  });
  mocks.update.mockResolvedValue({ count: 1 });
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
      rooms: { some: {}, none: { content: "" } },
    },
    data: { published: true, publishedAt: expect.any(Date) },
  });
});
it.each([
  { rooms: [] },
  { rooms: [{ content: "" }] },
  { rooms: [{ content: " \n " }] },
  { rooms: [{ content: "Theory" }, { content: "" }] },
])("rejects incomplete paths: %j", async ({ rooms }) => {
  mocks.find.mockResolvedValue({
    slug: "my-path",
    creatorId: "teacher-1",
    rooms,
  });
  await expect(setPathPublication("path-1", true)).rejects.toMatchObject({
    code: "PATH_NOT_READY",
  });
  expect(mocks.update).not.toHaveBeenCalled();
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
});
it("returns 403 when a teacher tries to publish or unpublish another teacher's path", async () => {
  mocks.find.mockResolvedValue({
    slug: "foreign-path",
    creatorId: "teacher-2",
    rooms: [{ content: "## Theory" }],
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
  expect(mocks.notifyNewLessonPublished).not.toHaveBeenCalled();
});
it("sends NEW_LESSON only for published rooms when publishing a draft path, and never for drafts or unpublish", async () => {
  mocks.find.mockResolvedValueOnce({
    id: "path-1",
    slug: "my-path",
    title: "Lộ trình TS",
    published: false,
    creatorId: "teacher-1",
    rooms: [
      {
        id: "room-pub",
        title: "Bài đã xuất bản",
        content: "## 1",
        published: true,
      },
      {
        id: "room-draft",
        title: "Bài nháp",
        content: "## 2",
        published: false,
      },
    ],
  });

  await setPathPublication("path-1", true);

  expect(mocks.notifyNewLessonPublished).toHaveBeenCalledTimes(1);
  expect(mocks.notifyNewLessonPublished).toHaveBeenCalledWith({
    pathId: "path-1",
    pathTitle: "Lộ trình TS",
    roomId: "room-pub",
    roomTitle: "Bài đã xuất bản",
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
        id: "room-pub",
        title: "Bài đã xuất bản",
        content: "## 1",
        published: true,
      },
    ],
  });
  await setPathPublication("path-1", true);
  await setPathPublication("path-1", false);
  expect(mocks.notifyNewLessonPublished).not.toHaveBeenCalled();
});
