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
  mocks.find.mockResolvedValue({ slug: "cpp" });
  mocks.update.mockResolvedValue({ count: 1 });
});

it("updates only the owner's path and never touches slug or publication", async () => {
  await expect(updateManagedPathDetails(input)).resolves.toEqual({
    slug: "cpp",
  });
  expect(mocks.update).toHaveBeenCalledWith({
    where: { id: "path-1", creatorId: "teacher-1" },
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

it("lets an admin edit any path", async () => {
  mocks.role.mockResolvedValue({ id: "admin-1", role: { name: "ADMIN" } });
  await updateManagedPathDetails(input);
  expect(mocks.update.mock.calls[0][0].where).toEqual({ id: "path-1" });
});

it("refuses a path the teacher does not own", async () => {
  mocks.find.mockResolvedValue(null);
  await expect(updateManagedPathDetails(input)).rejects.toMatchObject({
    status: 404,
  });
  expect(mocks.update).not.toHaveBeenCalled();
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
