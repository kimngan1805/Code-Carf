import { beforeEach, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/db", () => ({
  db: { path: { findUnique: mocks.find, create: mocks.create } },
}));
import { createManagedPath } from "./creation";
import { pathSlug } from "./slug";

const input = {
  title: "  Đường dẫn C++ cơ bản  ",
  requestId: "a6932f74-856d-41a1-8182-a3f4d6dccae0",
};
const collision = () =>
  new Prisma.PrismaClientKnownRequestError("Unique constraint", {
    code: "P2002",
    clientVersion: "6.19.3",
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.role.mockResolvedValue({ id: "teacher-1" });
  mocks.find.mockResolvedValue(null);
  mocks.create.mockImplementation(async ({ data }) => data);
});

it("creates an owned draft with normalized fields and sequential lessons by default", async () => {
  await expect(createManagedPath(input)).resolves.toMatchObject({
    title: "Đường dẫn C++ cơ bản",
    slug: "duong-dan-c-co-ban",
    description: "",
    creatorId: "teacher-1",
    published: false,
    sequentialUnlock: true,
  });
  expect(mocks.role).toHaveBeenCalledWith(["TEACHER", "ADMIN"]);
  expect(mocks.create.mock.calls[0][0].data).not.toHaveProperty("rooms");
});
it("saves the unchecked sequential option and trimmed description", async () => {
  await expect(
    createManagedPath({
      ...input,
      description: " Intro ",
      sequentialUnlock: false,
    }),
  ).resolves.toMatchObject({ description: "Intro", sequentialUnlock: false });
});
it.each([
  { title: " " },
  { title: "x".repeat(101) },
  { description: "x".repeat(5001) },
  { creatorId: "foreign" },
  { published: true },
  { slug: "forged" },
  { requestId: "bad" },
  { sequentialUnlock: "false" },
])("rejects invalid or forged fields: %j", async (change) => {
  await expect(
    createManagedPath({ ...input, ...change }),
  ).rejects.toMatchObject({ status: 400 });
  expect(mocks.create).not.toHaveBeenCalled();
});
it("denies unauthorized callers before accessing the database", async () => {
  mocks.role.mockRejectedValue(new AppError(403, "FORBIDDEN", "Forbidden"));
  await expect(createManagedPath(input)).rejects.toMatchObject({ status: 403 });
  expect(mocks.find).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});
it("returns the same record on retry without creating a duplicate", async () => {
  const first = await createManagedPath(input);
  mocks.find.mockResolvedValue(first);
  await expect(createManagedPath(input)).resolves.toEqual(first);
  expect(mocks.create).toHaveBeenCalledTimes(1);
  await expect(
    createManagedPath({ ...input, title: "Changed" }),
  ).rejects.toMatchObject({ status: 409, code: "CREATION_REQUEST_REUSED" });
});
it("handles concurrent retries won by another request", async () => {
  const saved = await createManagedPath(input);
  mocks.create.mockClear().mockRejectedValueOnce(collision());
  mocks.find.mockResolvedValueOnce(null).mockResolvedValueOnce(saved);
  await expect(createManagedPath(input)).resolves.toEqual(saved);
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
it("adds a suffix when a different path already has the same slug", async () => {
  mocks.create.mockRejectedValueOnce(collision());
  await expect(createManagedPath(input)).resolves.toMatchObject({
    slug: expect.stringMatching(/^duong-dan-c-co-ban-[a-f0-9]{8}$/),
  });
  expect(mocks.create).toHaveBeenCalledTimes(2);
});
it("bounds collision retries and propagates unexpected database failures", async () => {
  mocks.create.mockRejectedValue(collision());
  await expect(createManagedPath(input)).rejects.toMatchObject({
    code: "PATH_SLUG_CONFLICT",
  });
  expect(mocks.create).toHaveBeenCalledTimes(5);
  mocks.create.mockRejectedValue(new Error("database offline"));
  await expect(createManagedPath(input)).rejects.toThrow("database offline");
});
it("scopes retry identifiers to each authenticated creator", async () => {
  const first = await createManagedPath(input);
  mocks.role.mockResolvedValue({ id: "teacher-2" });
  const second = await createManagedPath(input);
  expect(second.id).not.toBe(first.id);
});
it("handles Vietnamese, punctuation, empty slugs and reserved routes", () => {
  expect(pathSlug("ĐƯỜNG dẫn: cơ bản!")).toBe("duong-dan-co-ban");
  expect(pathSlug("🎓")).toBe("lo-trinh");
  expect(pathSlug("New")).toBe("lo-trinh-new");
  expect(pathSlug("a".repeat(100))).toHaveLength(80);
});
