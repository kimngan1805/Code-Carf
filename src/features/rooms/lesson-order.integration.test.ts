import { ExerciseKind, RoleName, SubmissionStatus } from "@prisma/client";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const state = vi.hoisted(() => ({
  user: null as unknown,
  deleted: [] as string[],
}));
vi.mock("@/features/auth/service", () => ({
  requireRole: vi.fn(async () => state.user),
}));
vi.mock("@/lib/storage", () => ({
  getStorage: () => ({
    delete: async (key: string) => {
      state.deleted.push(key);
    },
  }),
}));

import { deleteManagedLesson, moveManagedLesson } from "./lesson-order";

async function canConnectToDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await db.$queryRawUnsafe("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

const hasDatabase = await canConnectToDatabase();

describe.skipIf(!hasDatabase)(
  "deleting and reordering lessons (PostgreSQL integration)",
  () => {
    const userIds: string[] = [];
    const pathIds: string[] = [];
    const contestIds: string[] = [];

    afterEach(async () => {
      await db.submission.deleteMany({ where: { userId: { in: userIds } } });
      await db.roomProgress.deleteMany({ where: { userId: { in: userIds } } });
      await db.exercise.deleteMany({
        where: { room: { pathId: { in: pathIds } } },
      });
      await db.contest.deleteMany({ where: { id: { in: contestIds } } });
      await db.path.deleteMany({ where: { id: { in: pathIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
      userIds.length = 0;
      pathIds.length = 0;
      contestIds.length = 0;
      state.deleted.length = 0;
    });

    afterAll(async () => {
      await db.$disconnect();
    });

    const unique = () =>
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    async function user(role: RoleName) {
      const roleRow = await db.role.upsert({
        where: { name: role },
        update: {},
        create: { name: role },
      });
      const created = await db.user.create({
        data: {
          email: `lesson-order-${unique()}@local.test`,
          name: role,
          passwordHash: "not-used-in-test",
          roleId: roleRow.id,
        },
        include: { role: true },
      });
      userIds.push(created.id);
      return created;
    }

    /** A teacher's path with lessons A, B, C; B has an exercise and an attachment. */
    async function setup(published = false) {
      const teacher = await user(RoleName.TEACHER);
      const path = await db.path.create({
        data: {
          slug: `lesson-order-${unique()}`,
          title: "Lộ trình",
          published,
          creatorId: teacher.id,
          rooms: {
            create: ["A", "B", "C"].map((title, index) => ({
              title,
              position: index + 1,
              published,
              content: "Nội dung",
            })),
          },
        },
        include: { rooms: { orderBy: { position: "asc" } } },
      });
      pathIds.push(path.id);
      const [a, b, c] = path.rooms;
      const exercise = await db.exercise.create({
        data: {
          roomId: b.id,
          creatorId: teacher.id,
          title: "Bài tập của B",
          prompt: "…",
          kind: ExerciseKind.CODE,
          testCases: { create: [{ input: "1", expected: "1" }] },
        },
      });
      await db.roomAttachment.create({
        data: {
          roomId: b.id,
          fileName: "b.pdf",
          contentType: "application/pdf",
          size: 10,
          storageKey: `room-attachments/${unique()}.pdf`,
          position: 1,
        },
      });
      state.user = teacher;
      return { teacher, path, a, b, c, exercise };
    }

    const order = async (pathId: string) =>
      (
        await db.room.findMany({
          where: { pathId },
          orderBy: { position: "asc" },
          select: { title: true, position: true },
        })
      ).map((room) => `${room.position}:${room.title}`);

    it("moves a lesson up and down and keeps positions 1..n", async () => {
      const { path, c, a } = await setup();
      await expect(
        moveManagedLesson({
          pathSlug: path.slug,
          roomId: c.id,
          direction: "up",
        }),
      ).resolves.toMatchObject({ moved: true });
      expect(await order(path.id)).toEqual(["1:A", "2:C", "3:B"]);
      await moveManagedLesson({
        pathSlug: path.slug,
        roomId: a.id,
        direction: "down",
      });
      expect(await order(path.id)).toEqual(["1:C", "2:A", "3:B"]);
      // Ở đầu thì không đi lên được nữa, thứ tự giữ nguyên.
      await expect(
        moveManagedLesson({
          pathSlug: path.slug,
          roomId: c.id,
          direction: "up",
        }),
      ).resolves.toMatchObject({ moved: false });
      expect(await order(path.id)).toEqual(["1:C", "2:A", "3:B"]);
    });

    it("deletes an unused lesson with its exercises and files, then closes the gap", async () => {
      const { path, b, exercise } = await setup();
      const attachment = await db.roomAttachment.findFirstOrThrow({
        where: { roomId: b.id },
      });
      await deleteManagedLesson({ pathSlug: path.slug, roomId: b.id });

      expect(await order(path.id)).toEqual(["1:A", "2:C"]);
      // Bài tập bị xóa hẳn, không rơi vào kho tài liệu (roomId null).
      expect(
        await db.exercise.findUnique({ where: { id: exercise.id } }),
      ).toBeNull();
      expect(
        await db.testCase.count({ where: { exerciseId: exercise.id } }),
      ).toBe(0);
      expect(state.deleted).toEqual([attachment.storageKey]);
    });

    it("refuses to delete a lesson learners have started, keeping everything", async () => {
      const { path, b, exercise } = await setup(true);
      const learner = await user(RoleName.STUDENT);
      await db.submission.create({
        data: {
          userId: learner.id,
          exerciseId: exercise.id,
          status: SubmissionStatus.REJECTED,
        },
      });
      await expect(
        deleteManagedLesson({ pathSlug: path.slug, roomId: b.id }),
      ).rejects.toMatchObject({ status: 409, code: "LESSON_IN_USE" });

      await db.submission.deleteMany({ where: { userId: learner.id } });
      await db.roomProgress.create({
        data: { userId: learner.id, roomId: b.id },
      });
      await expect(
        deleteManagedLesson({ pathSlug: path.slug, roomId: b.id }),
      ).rejects.toMatchObject({ code: "LESSON_IN_USE" });
      expect(await order(path.id)).toEqual(["1:A", "2:B", "3:C"]);
      expect(state.deleted).toEqual([]);
    });

    it("keeps at least one lesson in a published path", async () => {
      const { path, a, b, c } = await setup(true);
      await db.exercise.deleteMany({ where: { roomId: b.id } });
      await deleteManagedLesson({ pathSlug: path.slug, roomId: a.id });
      await deleteManagedLesson({ pathSlug: path.slug, roomId: b.id });
      await expect(
        deleteManagedLesson({ pathSlug: path.slug, roomId: c.id }),
      ).rejects.toMatchObject({ code: "LAST_PUBLISHED_LESSON" });
      expect(await order(path.id)).toEqual(["1:C"]);
    });

    it("only lets the path's teacher (or an admin) change its lessons", async () => {
      const { path, a } = await setup();
      state.user = await user(RoleName.TEACHER);
      await expect(
        deleteManagedLesson({ pathSlug: path.slug, roomId: a.id }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        moveManagedLesson({
          pathSlug: path.slug,
          roomId: a.id,
          direction: "down",
        }),
      ).rejects.toMatchObject({ status: 404 });
      state.user = await user(RoleName.ADMIN);
      await moveManagedLesson({
        pathSlug: path.slug,
        roomId: a.id,
        direction: "down",
      });
      expect(await order(path.id)).toEqual(["1:B", "2:A", "3:C"]);
    });
  },
);
