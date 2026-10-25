import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/db", () => ({
  db: { path: { findMany: mocks.list, updateMany: mocks.update } },
}));
import { getManagedPaths, setPathSequentialUnlock } from "./management";

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
