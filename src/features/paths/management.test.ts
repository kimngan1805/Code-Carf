import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  find: vi.fn(),
  room: vi.fn(),
  exercise: vi.fn(),
  role: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  removeMany: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/db", () => ({
  db: {
    path: {
      count: mocks.count,
      findMany: mocks.list,
      updateMany: mocks.update,
      findFirst: mocks.find,
      delete: mocks.remove,
      deleteMany: mocks.removeMany,
    },
    room: { findFirst: mocks.room },
    exercise: { findFirst: mocks.exercise },
  },
}));
import {
  deleteManagedPath,
  getManagedExercise,
  getManagedPath,
  getManagedPaths,
  getManagedRoom,
  setPathSequentialUnlock,
} from "./management";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.role.mockResolvedValue({ id: "teacher-1", role: { name: "TEACHER" } });
  mocks.count.mockResolvedValue(1);
  mocks.list.mockResolvedValue([]);
  mocks.find.mockResolvedValue({
    id: "path-1",
    slug: "owned",
    creatorId: "teacher-1",
  });
  mocks.update.mockResolvedValue({ count: 1 });
});

it("only lists the authenticated teacher's active paths with pagination metadata and stable order", async () => {
  const sample = [{ id: "path-1", slug: "owned", title: "Owned" }];
  mocks.count.mockResolvedValue(15);
  mocks.list.mockResolvedValue(sample);

  const result = await getManagedPaths({ page: "2" });

  expect(mocks.count).toHaveBeenCalledWith({
    where: { deletedAt: null, creatorId: "teacher-1" },
  });
  expect(mocks.list.mock.calls[0][0]).toMatchObject({
    where: { deletedAt: null, creatorId: "teacher-1" },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: 9,
    take: 9,
  });
  expect(result).toEqual({
    items: sample,
    page: 2,
    pageSize: 9,
    totalItems: 15,
    totalPages: 2,
  });
});

it("clamps out-of-range pages, defaults invalid pages to 1, and skips findMany when empty", async () => {
  mocks.count.mockResolvedValueOnce(12);
  mocks.list.mockResolvedValueOnce([{ id: "p-last" }]);
  const clamped = await getManagedPaths({ page: "99" });
  expect(clamped).toMatchObject({
    page: 2,
    pageSize: 9,
    totalItems: 12,
    totalPages: 2,
  });
  expect(mocks.list.mock.calls[0][0]).toMatchObject({ skip: 9, take: 9 });

  mocks.count.mockResolvedValueOnce(12);
  mocks.list.mockResolvedValueOnce([{ id: "p-first" }]);
  const invalid = await getManagedPaths({ page: "abc" });
  expect(invalid).toMatchObject({
    page: 1,
    pageSize: 9,
    totalItems: 12,
    totalPages: 2,
  });
  expect(mocks.list.mock.calls[1][0]).toMatchObject({ skip: 0, take: 9 });

  mocks.count.mockResolvedValueOnce(0);
  const empty = await getManagedPaths({ page: "3" });
  expect(empty).toEqual({
    items: [],
    page: 1,
    pageSize: 9,
    totalItems: 0,
    totalPages: 1,
  });
  expect(mocks.list).toHaveBeenCalledTimes(2);
});

it("lets teachers preview only owned active paths, including drafts", async () => {
  mocks.find.mockResolvedValue({
    id: "path-1",
    published: false,
    rooms: [
      {
        id: "r1",
        content: "",
        attachments: [{ id: "f1", fileName: "a.pdf", contentType: "x" }],
        exercises: [],
        _count: { exercises: 0, attachments: 1 },
      },
      {
        id: "r2",
        content: "## Mục\n\nhttps://youtu.be/ubPxYhz1wvU\n\n_Bài 42_",
        attachments: [],
        exercises: [],
        _count: { exercises: 0, attachments: 0 },
      },
      {
        id: "r3",
        content: " ",
        attachments: [],
        exercises: [],
        _count: { exercises: 0, attachments: 0 },
      },
    ],
  });
  const path = await getManagedPath("draft");
  expect(path).toMatchObject({ published: false });
  // Không gửi cả nội dung bài xuống trang: chỉ cờ, tóm tắt và danh sách video.
  expect(path.rooms.map((room) => "content" in room)).toEqual([
    false,
    false,
    false,
  ]);
  expect(path.rooms[0]).toMatchObject({
    hasMaterial: true,
    contentSummary: null,
    videos: [],
  });
  expect(path.rooms[1]).toMatchObject({
    hasMaterial: true,
    videos: [{ id: "ubPxYhz1wvU", caption: "Bài 42" }],
  });
  expect(path.rooms[1].contentSummary).toMatch(/^1 mục · 1 video · /);
  expect(path.rooms[2]).toMatchObject({ hasMaterial: false });
  expect(mocks.find.mock.calls[0][0].where).toEqual({
    slug: "draft",
    deletedAt: null,
    creatorId: "teacher-1",
  });
});

it("hides missing, soft-deleted, or foreign path previews", async () => {
  mocks.find.mockResolvedValue(null);
  await expect(getManagedPath("foreign")).rejects.toMatchObject({
    status: 404,
  });
});

it("checks both the room's active parent path and its owner before previewing content", async () => {
  mocks.room.mockResolvedValue({ id: "room-1" });
  await getManagedRoom("owned", "room-1");
  expect(mocks.room.mock.calls[0][0].where).toEqual({
    id: "room-1",
    path: { slug: "owned", deletedAt: null, creatorId: "teacher-1" },
  });
  mocks.room.mockResolvedValue(null);
  await expect(getManagedRoom("other", "room-1")).rejects.toMatchObject({
    status: 404,
  });
});

it("checks the active parent path before loading a managed exercise", async () => {
  mocks.exercise.mockResolvedValue({
    id: "ex-1",
    room: { id: "room-1", title: "Room", path: { slug: "owned" } },
  });
  await getManagedExercise("owned", "room-1", "ex-1");
  expect(mocks.exercise.mock.calls[0][0].where).toEqual({
    id: "ex-1",
    roomId: "room-1",
    room: {
      path: { slug: "owned", deletedAt: null, creatorId: "teacher-1" },
    },
  });
});

it("atomically restricts teacher sequential unlock updates to owned active paths", async () => {
  await setPathSequentialUnlock("path-1", false);
  expect(mocks.role).toHaveBeenCalledWith(["TEACHER", "ADMIN"]);
  expect(mocks.find).toHaveBeenCalledWith({
    where: { id: "path-1", deletedAt: null },
    select: { creatorId: true },
  });
  expect(mocks.update).toHaveBeenCalledWith({
    where: { id: "path-1", deletedAt: null, creatorId: "teacher-1" },
    data: { sequentialUnlock: false },
  });
});

it("returns 403 when updating sequential unlock on another teacher's path", async () => {
  mocks.find.mockResolvedValue({ creatorId: "teacher-2" });
  await expect(setPathSequentialUnlock("foreign", false)).rejects.toMatchObject(
    { status: 403, code: "FORBIDDEN" },
  );
  expect(mocks.update).not.toHaveBeenCalled();
});

it("returns 404 when updating sequential unlock on a missing or soft-deleted path", async () => {
  mocks.find.mockResolvedValue(null);
  await expect(setPathSequentialUnlock("deleted", false)).rejects.toMatchObject(
    { status: 404, code: "PATH_NOT_FOUND" },
  );
  expect(mocks.update).not.toHaveBeenCalled();
});

it("returns 409 when sequential unlock loses a race against concurrent soft delete", async () => {
  mocks.update.mockResolvedValue({ count: 0 });
  await expect(setPathSequentialUnlock("path-1", false)).rejects.toMatchObject({
    status: 409,
    code: "PATH_CHANGED",
  });
});

it("allows admins to manage active paths regardless of owner", async () => {
  mocks.role.mockResolvedValue({ id: "admin-1", role: { name: "ADMIN" } });
  await getManagedPaths();
  expect(mocks.list.mock.calls[0][0].where).toEqual({ deletedAt: null });
  await setPathSequentialUnlock("path-1", true);
  expect(mocks.update.mock.calls[0][0].where).toEqual({
    id: "path-1",
    deletedAt: null,
  });
});

it("does not access paths when student/anonymous authorization fails", async () => {
  mocks.role.mockRejectedValue(new AppError(403, "FORBIDDEN", "Forbidden"));
  await expect(getManagedPaths()).rejects.toMatchObject({ status: 403 });
  await expect(setPathSequentialUnlock("path-1", false)).rejects.toMatchObject({
    status: 403,
  });
  await expect(deleteManagedPath("path-1")).rejects.toMatchObject({
    status: 403,
  });
  expect(mocks.count).not.toHaveBeenCalled();
  expect(mocks.list).not.toHaveBeenCalled();
  expect(mocks.find).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});

describe("deleteManagedPath", () => {
  it("soft-deletes an owned path by setting deletedAt and published = false without hard deleting", async () => {
    const result = await deleteManagedPath("path-1");

    expect(mocks.role).toHaveBeenCalledWith(["TEACHER", "ADMIN"]);
    expect(mocks.find).toHaveBeenCalledWith({
      where: { id: "path-1", deletedAt: null },
      select: { id: true, slug: true, creatorId: true },
    });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "path-1", deletedAt: null, creatorId: "teacher-1" },
      data: { deletedAt: expect.any(Date), published: false },
    });
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.removeMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: "path-1",
      slug: "owned",
      deletedAt: expect.any(Date),
    });
  });

  it("allows admins to soft-delete another teacher's active path", async () => {
    mocks.role.mockResolvedValue({ id: "admin-1", role: { name: "ADMIN" } });
    mocks.find.mockResolvedValue({
      id: "path-1",
      slug: "teacher-path",
      creatorId: "teacher-2",
    });

    await expect(deleteManagedPath("path-1")).resolves.toMatchObject({
      id: "path-1",
      slug: "teacher-path",
    });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "path-1", deletedAt: null },
      data: { deletedAt: expect.any(Date), published: false },
    });
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("returns 403 FORBIDDEN when a non-owner teacher tries to delete a path", async () => {
    mocks.find.mockResolvedValue({
      id: "path-1",
      slug: "foreign",
      creatorId: "teacher-2",
    });

    await expect(deleteManagedPath("path-1")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("returns 404 when the path does not exist or was already soft-deleted", async () => {
    mocks.find.mockResolvedValue(null);

    await expect(deleteManagedPath("deleted-path")).rejects.toMatchObject({
      status: 404,
      code: "PATH_NOT_FOUND",
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns 409 when a concurrent delete already updated the path", async () => {
    mocks.update.mockResolvedValue({ count: 0 });

    await expect(deleteManagedPath("path-1")).rejects.toMatchObject({
      status: 409,
      code: "PATH_CHANGED",
    });
  });

  it("rejects empty or oversized path ids with 400 before querying the database", async () => {
    await expect(deleteManagedPath("   ")).rejects.toMatchObject({
      status: 400,
      code: "INVALID_PATH",
    });
    await expect(deleteManagedPath("x".repeat(201))).rejects.toMatchObject({
      status: 400,
      code: "INVALID_PATH",
    });
    expect(mocks.find).not.toHaveBeenCalled();
  });
});
