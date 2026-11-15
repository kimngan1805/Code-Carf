import { beforeEach, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  find: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/db", () => ({
  db: { path: { findFirst: mocks.find, updateMany: mocks.update } },
}));
import { setPathPublication } from "./publication";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.role.mockResolvedValue({ id: "teacher-1", role: { name: "TEACHER" } });
  mocks.find.mockResolvedValue({
    slug: "my-path",
    rooms: [{ content: "## Theory" }],
  });
  mocks.update.mockResolvedValue({ count: 1 });
});
it("publishes only owned paths containing lesson content", async () => {
  await expect(setPathPublication("path-1", true)).resolves.toBe("my-path");
  expect(mocks.role).toHaveBeenCalledWith(["TEACHER", "ADMIN"]);
  expect(mocks.find.mock.calls[0][0].where).toEqual({
    id: "path-1",
    creatorId: "teacher-1",
  });
  expect(mocks.update).toHaveBeenCalledWith({
    where: {
      id: "path-1",
      creatorId: "teacher-1",
      rooms: { some: {}, none: { content: "" } },
    },
    data: { published: true },
  });
});
it.each([
  { rooms: [] },
  { rooms: [{ content: "" }] },
  { rooms: [{ content: " \n " }] },
  { rooms: [{ content: "Theory" }, { content: "" }] },
])("rejects incomplete paths: %j", async ({ rooms }) => {
  mocks.find.mockResolvedValue({ slug: "my-path", rooms });
  await expect(setPathPublication("path-1", true)).rejects.toMatchObject({
    code: "PATH_NOT_READY",
  });
  expect(mocks.update).not.toHaveBeenCalled();
});
it("allows hiding a path even if its content is incomplete", async () => {
  mocks.find.mockResolvedValue({ slug: "my-path", rooms: [] });
  await setPathPublication("path-1", false);
  expect(mocks.update).toHaveBeenCalledWith({
    where: { id: "path-1", creatorId: "teacher-1" },
    data: { published: false },
  });
});
it("denies foreign or missing paths", async () => {
  mocks.find.mockResolvedValue(null);
  await expect(setPathPublication("foreign", true)).rejects.toMatchObject({
    status: 404,
  });
  expect(mocks.update).not.toHaveBeenCalled();
});
it("allows admins to publish another creator's path", async () => {
  mocks.role.mockResolvedValue({ id: "admin-1", role: { name: "ADMIN" } });
  await setPathPublication("path-1", true);
  expect(mocks.find.mock.calls[0][0].where).toEqual({ id: "path-1" });
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
});
