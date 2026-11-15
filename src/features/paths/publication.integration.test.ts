import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
const mocks = vi.hoisted(() => ({ role: vi.fn() }));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.role }));
import { setPathPublication } from "./publication";
import { findPublishedPath, listPaths } from "./repository";

let connected = false;
if (process.env.DATABASE_URL) {
  try {
    await db.$queryRaw`SELECT 1`;
    connected = true;
  } catch {
    /* Optional local database. */
  }
}
describe.skipIf(!connected)("path publication (PostgreSQL)", () => {
  const users: string[] = [],
    paths: string[] = [];
  afterAll(async () => {
    await db.enrollment.deleteMany({ where: { pathId: { in: paths } } });
    await db.path.deleteMany({ where: { id: { in: paths } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  });
  it("shows a draft only after publication and hides it without deleting lessons or enrollment", async () => {
    const role = await db.role.findUniqueOrThrow({
      where: { name: "TEACHER" },
    });
    const teacher = await db.user.create({
      data: {
        email: `publish-check-${randomUUID()}@local.test`,
        name: "Publication check",
        passwordHash: "unused-test-account",
        roleId: role.id,
      },
    });
    users.push(teacher.id);
    mocks.role.mockResolvedValue({ id: teacher.id, role: { name: "TEACHER" } });
    const path = await db.path.create({
      data: {
        slug: `publish-check-${randomUUID()}`,
        title: "Publication check",
        creatorId: teacher.id,
        rooms: {
          create: { title: "Theory", content: "## Lesson", position: 1 },
        },
      },
      include: { rooms: true },
    });
    paths.push(path.id);
    expect(
      (await listPaths(teacher.id)).some((item) => item.id === path.id),
    ).toBe(false);
    expect(await findPublishedPath(path.slug, teacher.id)).toBeNull();
    await setPathPublication(path.id, true);
    expect(
      (await listPaths(teacher.id)).some((item) => item.id === path.id),
    ).toBe(true);
    expect(await findPublishedPath(path.slug, teacher.id)).toMatchObject({
      id: path.id,
    });
    await db.enrollment.create({
      data: { userId: teacher.id, pathId: path.id },
    });
    await setPathPublication(path.id, false);
    expect(await findPublishedPath(path.slug, teacher.id)).toBeNull();
    expect(await db.enrollment.count({ where: { pathId: path.id } })).toBe(1);
    expect(await db.room.count({ where: { pathId: path.id } })).toBe(1);
  });
});
