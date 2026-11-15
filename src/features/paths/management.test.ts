import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  room: vi.fn(),
  role: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/db", () => ({
  db: {
    path: {
      findMany: mocks.list,
      updateMany: mocks.update,
      findFirst: mocks.find,
    },
    room: { findFirst: mocks.room },
  },
}));
import {
  getManagedPath,
  getManagedRoom,
  getManagedPaths,
  setPathSequentialUnlock,
} from "./management";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.role.mockResolvedValue({ id: "teacher-1", role: { name: "TEACHER" } });
  mocks.list.mockResolvedValue([]);
  mocks.update.mockResolvedValue({ count: 1 });
});
it("only lists the authenticated teacher's real paths", async () => {
  await getManagedPaths();
  expect(mocks.list.mock.calls[0][0].where).toEqual({ creatorId: "teacher-1" });
});

it("lets teachers preview only owned paths, including drafts", async () => {
  mocks.find.mockResolvedValue({ id: "path-1", published: false });
  await expect(getManagedPath("draft")).resolves.toMatchObject({
    published: false,
  });
  expect(mocks.find.mock.calls[0][0].where).toEqual({
    slug: "draft",
    creatorId: "teacher-1",
  });
});
it("hides missing or foreign path previews", async () => {
  mocks.find.mockResolvedValue(null);
  await expect(getManagedPath("foreign")).rejects.toMatchObject({
    status: 404,
  });
});
it("checks both the room's parent path and its owner before previewing content", async () => {
  mocks.room.mockResolvedValue({ id: "room-1" });
  await getManagedRoom("owned", "room-1");
  expect(mocks.room.mock.calls[0][0].where).toEqual({
    id: "room-1",
    path: { slug: "owned", creatorId: "teacher-1" },
  });
  mocks.room.mockResolvedValue(null);
  await expect(getManagedRoom("other", "room-1")).rejects.toMatchObject({
    status: 404,
  });
});
it("atomically restricts teacher updates to owned paths", async () => {
  await setPathSequentialUnlock("path-1", false);
  expect(mocks.role).toHaveBeenCalledWith(["TEACHER", "ADMIN"]);
  expect(mocks.update).toHaveBeenCalledWith({
    where: { id: "path-1", creatorId: "teacher-1" },
    data: { sequentialUnlock: false },
  });
});
it("denies updates to another teacher's path", async () => {
  mocks.update.mockResolvedValue({ count: 0 });
  await expect(setPathSequentialUnlock("foreign", false)).rejects.toMatchObject(
    { status: 403 },
  );
});
it("allows admins to manage paths regardless of owner", async () => {
  mocks.role.mockResolvedValue({ id: "admin-1", role: { name: "ADMIN" } });
  await getManagedPaths();
  expect(mocks.list.mock.calls[0][0].where).toEqual({});
  await setPathSequentialUnlock("path-1", true);
  expect(mocks.update.mock.calls[0][0].where).toEqual({ id: "path-1" });
});
it("does not access paths when student/anonymous authorization fails", async () => {
  mocks.role.mockRejectedValue(new Error("Forbidden"));
  await expect(getManagedPaths()).rejects.toThrow("Forbidden");
  await expect(setPathSequentialUnlock("path-1", false)).rejects.toThrow(
    "Forbidden",
  );
  expect(mocks.list).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});
