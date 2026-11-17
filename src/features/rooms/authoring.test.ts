import { beforeEach, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  transaction: vi.fn(),
  path: vi.fn(),
  find: vi.fn(),
  update: vi.fn(),
  aggregate: vi.fn(),
  create: vi.fn(),
  notifyNewLessonPublished: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.role }));
vi.mock("@/features/notifications/writer", () => ({
  notifyNewLessonPublished: mocks.notifyNewLessonPublished,
}));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));
import { saveManagedLesson } from "./authoring";

const input = {
  pathSlug: "my-path",
  title: " Lesson ",
  description: " Intro ",
  content: "## Theory\n\n```js\nconst n = 1;\n```",
  requestId: "ade5dba9-9cfb-42d8-9c73-38dc227883cd",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.role.mockResolvedValue({ id: "teacher-1", role: { name: "TEACHER" } });
  mocks.path.mockResolvedValue({ id: "path-1", slug: "my-path" });
  mocks.find.mockResolvedValue(null);
  mocks.aggregate.mockResolvedValue({ _max: { position: 3 } });
  mocks.create.mockImplementation(async ({ data }) => ({ id: data.id }));
  mocks.update.mockResolvedValue({ count: 1 });
  mocks.transaction.mockImplementation(async (run) =>
    run({
      path: { findFirst: mocks.path },
      room: {
        findUnique: mocks.find,
        updateMany: mocks.update,
        aggregate: mocks.aggregate,
        create: mocks.create,
      },
    }),
  );
});
it("creates a lesson at the end of the owned path and preserves Markdown", async () => {
  await expect(saveManagedLesson(input)).resolves.toMatchObject({
    slug: "my-path",
  });
  expect(mocks.role).toHaveBeenCalledWith(["TEACHER", "ADMIN"]);
  expect(mocks.path.mock.calls[0][0].where).toEqual({
    slug: "my-path",
    creatorId: "teacher-1",
  });
  expect(mocks.create.mock.calls[0][0].data).toMatchObject({
    title: "Lesson",
    description: "Intro",
    content: input.content,
    pathId: "path-1",
    position: 4,
  });
  expect(mocks.transaction.mock.calls[0][1]).toEqual({
    isolationLevel: "Serializable",
  });
});
it("starts the first lesson at position one", async () => {
  mocks.aggregate.mockResolvedValue({ _max: { position: null } });
  await saveManagedLesson(input);
  expect(mocks.create.mock.calls[0][0].data.position).toBe(1);
});
it.each([
  { title: " " },
  { content: " \n " },
  { title: "x".repeat(101) },
  { description: "x".repeat(5001) },
  { content: "x".repeat(100001) },
  { creatorId: "other" },
  { position: 1 },
  { pathId: "foreign" },
  { roomId: "room-1" },
])("rejects invalid fields or forged scope: %j", async (fields) => {
  await expect(
    saveManagedLesson({ ...input, ...fields }),
  ).rejects.toMatchObject({ status: 400 });
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it("does not start a transaction when authorization fails", async () => {
  mocks.role.mockRejectedValue(new AppError(403, "FORBIDDEN", "Forbidden"));
  await expect(saveManagedLesson(input)).rejects.toMatchObject({ status: 403 });
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it("denies writes to missing or foreign paths", async () => {
  mocks.path.mockResolvedValue(null);
  await expect(saveManagedLesson(input)).rejects.toMatchObject({ status: 404 });
  expect(mocks.create).not.toHaveBeenCalled();
});
it("updates only a lesson inside the authorized path", async () => {
  const fields = {
    pathSlug: input.pathSlug,
    title: input.title,
    description: input.description,
    content: input.content,
  };
  await saveManagedLesson({ ...fields, roomId: "room-1" });
  expect(mocks.update.mock.calls[0][0].where).toEqual({
    id: "room-1",
    pathId: "path-1",
  });
  expect(mocks.create).not.toHaveBeenCalled();
  mocks.update.mockResolvedValue({ count: 0 });
  await expect(
    saveManagedLesson({ ...fields, roomId: "foreign" }),
  ).rejects.toMatchObject({ code: "ROOM_NOT_FOUND" });
});
it("allows admin management without a teacher ownership filter", async () => {
  mocks.role.mockResolvedValue({ id: "admin-1", role: { name: "ADMIN" } });
  await saveManagedLesson(input);
  expect(mocks.path.mock.calls[0][0].where).toEqual({ slug: "my-path" });
});
it("returns a saved request on retry and rejects changed payloads", async () => {
  mocks.find.mockResolvedValue({
    pathId: "path-1",
    title: "Lesson",
    description: "Intro",
    content: input.content,
  });
  await expect(saveManagedLesson(input)).resolves.toMatchObject({
    slug: "my-path",
  });
  expect(mocks.create).not.toHaveBeenCalled();
  await expect(
    saveManagedLesson({ ...input, content: "Changed" }),
  ).rejects.toMatchObject({ code: "LESSON_REQUEST_REUSED" });
});
it.each(["P2034", "P2002"])(
  "retries transaction conflicts (%s)",
  async (code) => {
    mocks.transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Conflict", {
        code,
        clientVersion: "6.19.3",
      }),
    );
    await expect(saveManagedLesson(input)).resolves.toMatchObject({
      slug: "my-path",
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  },
);
it("bounds conflict retries and does not hide other database errors", async () => {
  mocks.transaction.mockRejectedValue(
    new Prisma.PrismaClientKnownRequestError("Conflict", {
      code: "P2034",
      clientVersion: "6.19.3",
    }),
  );
  await expect(saveManagedLesson(input)).rejects.toMatchObject({
    code: "LESSON_BUSY",
  });
  expect(mocks.transaction).toHaveBeenCalledTimes(3);
  mocks.transaction.mockRejectedValue(new Error("Database offline"));
  await expect(saveManagedLesson(input)).rejects.toThrow("Database offline");
});

it("notifies enrolled learners only when creating a new lesson in a published path", async () => {
  mocks.path.mockResolvedValue({
    id: "path-1",
    slug: "my-path",
    title: "Lộ trình TS",
    published: true,
  });

  const created = await saveManagedLesson(input);
  expect(mocks.notifyNewLessonPublished).toHaveBeenCalledTimes(1);
  expect(mocks.notifyNewLessonPublished).toHaveBeenCalledWith({
    pathId: "path-1",
    pathTitle: "Lộ trình TS",
    roomId: created.id,
    roomTitle: "Lesson",
    actorUserId: "teacher-1",
  });

  // Updating an existing room must not notify.
  mocks.notifyNewLessonPublished.mockClear();
  await saveManagedLesson({
    pathSlug: input.pathSlug,
    title: input.title,
    description: input.description,
    content: input.content,
    roomId: "room-1",
  });
  expect(mocks.notifyNewLessonPublished).not.toHaveBeenCalled();

  // Replaying the same requestId must not notify.
  mocks.find.mockResolvedValue({
    pathId: "path-1",
    title: "Lesson",
    description: "Intro",
    content: input.content,
  });
  await saveManagedLesson(input);
  expect(mocks.notifyNewLessonPublished).not.toHaveBeenCalled();

  // Creating a room inside an unpublished draft path must not notify.
  mocks.find.mockResolvedValue(null);
  mocks.path.mockResolvedValue({
    id: "path-1",
    slug: "my-path",
    title: "Lộ trình TS",
    published: false,
  });
  await saveManagedLesson(input);
  expect(mocks.notifyNewLessonPublished).not.toHaveBeenCalled();
});
