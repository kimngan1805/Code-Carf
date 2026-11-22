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
import { updateManagedPathDetails } from "./details";

const input = {
  pathId: "path-1",
  title: " Lập trình C++ ",
  description: "Mô tả",
  difficulty: "MEDIUM",
  tags: ["C++", "nhập môn"],
  estimatedMinutes: 720,
  coverTheme: "green",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.role.mockResolvedValue({ id: "teacher-1", role: { name: "TEACHER" } });
  mocks.find.mockResolvedValue({ slug: "cpp", creatorId: "teacher-1" });
  mocks.update.mockResolvedValue({ count: 1 });
});

it("updates only the owner's active path and never touches slug or publication", async () => {
  await expect(updateManagedPathDetails(input)).resolves.toEqual({
    slug: "cpp",
  });
  expect(mocks.find).toHaveBeenCalledWith({
    where: { id: "path-1", deletedAt: null },
    select: { slug: true, creatorId: true },
  });
  expect(mocks.update).toHaveBeenCalledWith({
    where: { id: "path-1", deletedAt: null, creatorId: "teacher-1" },
    data: {
      title: "Lập trình C++",
      description: "Mô tả",
      difficulty: "MEDIUM",
      tags: ["C++", "nhập môn"],
      estimatedMinutes: 720,
      coverTheme: "green",
    },
  });
});

it("lets an admin edit any active path", async () => {
  mocks.role.mockResolvedValue({ id: "admin-1", role: { name: "ADMIN" } });
  await updateManagedPathDetails(input);
  expect(mocks.update.mock.calls[0][0].where).toEqual({
    id: "path-1",
    deletedAt: null,
  });
});

it("returns 403 when a teacher tries to edit another teacher's path", async () => {
  mocks.find.mockResolvedValue({ slug: "cpp", creatorId: "teacher-2" });
  await expect(updateManagedPathDetails(input)).rejects.toMatchObject({
    status: 403,
    code: "FORBIDDEN",
  });
  expect(mocks.update).not.toHaveBeenCalled();
});

it("returns 404 when the path is missing or already soft-deleted", async () => {
  mocks.find.mockResolvedValue(null);
  await expect(updateManagedPathDetails(input)).rejects.toMatchObject({
    status: 404,
    code: "PATH_NOT_FOUND",
  });
  expect(mocks.update).not.toHaveBeenCalled();
});

it("reports 409 if the path is soft-deleted or changed concurrently", async () => {
  mocks.update.mockResolvedValue({ count: 0 });
  await expect(updateManagedPathDetails(input)).rejects.toMatchObject({
    status: 409,
    code: "PATH_CHANGED",
  });
});

it.each([
  { published: true },
  { slug: "forged" },
  { creatorId: "other" },
  { publishedAt: "2020-01-01" },
  { difficulty: "EXTREME" },
])("rejects forged or invalid fields: %j", async (change) => {
  await expect(
    updateManagedPathDetails({ ...input, ...change }),
  ).rejects.toMatchObject({ status: 400 });
  expect(mocks.update).not.toHaveBeenCalled();
});

it("stops unauthorized callers before touching the database", async () => {
  mocks.role.mockRejectedValue(new AppError(403, "FORBIDDEN", "Forbidden"));
  await expect(updateManagedPathDetails(input)).rejects.toMatchObject({
    status: 403,
  });
  expect(mocks.find).not.toHaveBeenCalled();
});
