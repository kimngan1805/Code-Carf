import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { db } from "@/lib/db";

const mocks = vi.hoisted(() => ({ role: vi.fn() }));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.role }));
import { saveManagedLesson } from "./authoring";

let connected = false;
if (process.env.DATABASE_URL) {
  try {
    await db.$queryRaw`SELECT 1`;
    connected = true;
  } catch {
    /* Optional local database. */
  }
}
describe.skipIf(!connected)("teacher lesson authoring (PostgreSQL)", () => {
  const userIds: string[] = [];
  const pathIds: string[] = [];
  let owner: string;
  let other: string;
  beforeAll(async () => {
    const role = await db.role.findUniqueOrThrow({
      where: { name: "TEACHER" },
    });
    for (let index = 0; index < 2; index++) {
      const user = await db.user.create({
        data: {
          email: `lesson-check-${randomUUID()}@local.test`,
          name: "Lesson check",
          passwordHash: "unused-test-account",
          roleId: role.id,
        },
      });
      userIds.push(user.id);
    }
    [owner, other] = userIds;
  });
  beforeEach(() =>
    mocks.role.mockResolvedValue({ id: owner, role: { name: "TEACHER" } }),
  );
  afterAll(async () => {
    await db.path.deleteMany({ where: { id: { in: pathIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  });
  async function path() {
    const saved = await db.path.create({
      data: {
        creatorId: owner,
        slug: `lesson-check-${randomUUID()}`,
        title: "Lesson check",
      },
    });
    pathIds.push(saved.id);
    return saved;
  }
  const fields = {
    title: "Biến và kiểu dữ liệu",
    description: "Bài mở đầu",
    content: "## Lý thuyết\n\n```ts\nconst answer = 42;\n```",
  };
  it("persists Markdown and deduplicates concurrent retries without changing positions", async () => {
    const parent = await path();
    const input = { ...fields, pathSlug: parent.slug, requestId: randomUUID() };
    const saved = await Promise.all(
      Array.from({ length: 3 }, () => saveManagedLesson(input)),
    );
    expect(new Set(saved.map((room) => room.id)).size).toBe(1);
    expect(await db.room.count({ where: { pathId: parent.id } })).toBe(1);
    expect(
      await db.room.findUniqueOrThrow({ where: { id: saved[0].id } }),
    ).toMatchObject({ ...fields, position: 1 });
    await Promise.all([
      saveManagedLesson({ ...input, requestId: randomUUID() }),
      saveManagedLesson({ ...input, requestId: randomUUID() }),
    ]);
    const rooms = await db.room.findMany({
      where: { pathId: parent.id },
      orderBy: { position: "asc" },
    });
    expect(rooms.map((room) => room.position)).toEqual([1, 2, 3]);
  });
  it("updates content without changing lesson identity or position", async () => {
    const parent = await path();
    const saved = await saveManagedLesson({
      ...fields,
      pathSlug: parent.slug,
      requestId: randomUUID(),
    });
    await saveManagedLesson({
      ...fields,
      title: "Updated title",
      content: "## Updated\n\nNew theory",
      pathSlug: parent.slug,
      roomId: saved.id,
    });
    expect(
      await db.room.findUniqueOrThrow({ where: { id: saved.id } }),
    ).toMatchObject({
      title: "Updated title",
      content: "## Updated\n\nNew theory",
      position: 1,
      pathId: parent.id,
    });
    expect(await db.room.count({ where: { pathId: parent.id } })).toBe(1);
  });
  it("denies foreign ownership and cross-path edits while allowing admins", async () => {
    const parent = await path();
    const second = await path();
    const saved = await saveManagedLesson({
      ...fields,
      pathSlug: parent.slug,
      requestId: randomUUID(),
    });
    await expect(
      saveManagedLesson({ ...fields, pathSlug: second.slug, roomId: saved.id }),
    ).rejects.toMatchObject({ status: 404 });
    mocks.role.mockResolvedValue({ id: other, role: { name: "TEACHER" } });
    await expect(
      saveManagedLesson({
        ...fields,
        pathSlug: parent.slug,
        requestId: randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      saveManagedLesson({ ...fields, pathSlug: parent.slug, roomId: saved.id }),
    ).rejects.toMatchObject({ status: 404 });
    mocks.role.mockResolvedValue({ id: other, role: { name: "ADMIN" } });
    await saveManagedLesson({
      ...fields,
      pathSlug: parent.slug,
      roomId: saved.id,
      content: "Admin update",
    });
    expect(
      (await db.room.findUniqueOrThrow({ where: { id: saved.id } })).content,
    ).toBe("Admin update");
  });
});
