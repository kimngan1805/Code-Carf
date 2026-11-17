import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ContestStatus,
  ExerciseKind,
  RoleName,
  SubmissionStatus,
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { canConnectToDatabase } from "@/test-utils/database";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
}));

vi.mock("@/features/auth/service", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("@/features/grading/service", () => ({
  getGradingAdapter: () => ({
    grade: async () => ({ status: "ACCEPTED", feedback: "ok" }),
  }),
}));

import { reportExercise } from "@/features/exercise-reports/service";
import { getExercisePage } from "@/features/grading/exercise-page";
import { submitSolution } from "@/features/grading/submit";
import { getManagedRoomPreview } from "@/features/paths/management";
import { getPath } from "@/features/paths/service";
import { awardActivityBadgesInTx } from "@/features/progress/badge-awarding";
import { canAccessRoom } from "./access";
import { saveManagedLesson } from "./authoring";
import { setRoomPublication } from "./publication";
import { getRoom, getRoomPage } from "./service";

const hasDatabase = await canConnectToDatabase();
const prefix = `it-room-pub-${randomUUID()}`;

describe.skipIf(!hasDatabase)(
  "room preview & draft/published (PostgreSQL integration)",
  () => {
    const userIds: string[] = [];
    const pathIds: string[] = [];
    const contestIds: string[] = [];
    let ownerTeacher = { id: "", role: { name: RoleName.TEACHER } };
    let otherTeacher = { id: "", role: { name: RoleName.TEACHER } };
    let student = { id: "", role: { name: RoleName.STUDENT } };

    beforeAll(async () => {
      const [teacherRole, studentRole] = await Promise.all([
        db.role.upsert({
          where: { name: RoleName.TEACHER },
          update: {},
          create: { name: RoleName.TEACHER },
        }),
        db.role.upsert({
          where: { name: RoleName.STUDENT },
          update: {},
          create: { name: RoleName.STUDENT },
        }),
      ]);

      const [t1, t2, s1] = await Promise.all([
        db.user.create({
          data: {
            email: `${prefix}-t1@local.test`,
            name: "Owner Teacher",
            passwordHash: "unused",
            roleId: teacherRole.id,
          },
        }),
        db.user.create({
          data: {
            email: `${prefix}-t2@local.test`,
            name: "Other Teacher",
            passwordHash: "unused",
            roleId: teacherRole.id,
          },
        }),
        db.user.create({
          data: {
            email: `${prefix}-s1@local.test`,
            name: "Learner",
            passwordHash: "unused",
            roleId: studentRole.id,
          },
        }),
      ]);

      ownerTeacher = { id: t1.id, role: { name: RoleName.TEACHER } };
      otherTeacher = { id: t2.id, role: { name: RoleName.TEACHER } };
      student = { id: s1.id, role: { name: RoleName.STUDENT } };
      userIds.push(t1.id, t2.id, s1.id);
    });

    afterAll(async () => {
      if (contestIds.length > 0) {
        await db.contest.deleteMany({ where: { id: { in: contestIds } } });
      }
      if (pathIds.length > 0) {
        await db.submission.deleteMany({
          where: { exercise: { room: { pathId: { in: pathIds } } } },
        });
        await db.path.deleteMany({ where: { id: { in: pathIds } } });
      }
      if (userIds.length > 0) {
        await db.user.deleteMany({ where: { id: { in: userIds } } });
      }
      await db.$disconnect();
    });

    it("keeps new rooms as Draft by default, protects student routes/APIs, supports Teacher Preview, and preserves progress across unpublish", async () => {
      const path = await db.path.create({
        data: {
          slug: `${prefix}-path`,
          title: "Room Draft Path",
          published: true,
          sequentialUnlock: true,
          creatorId: ownerTeacher.id,
        },
      });
      pathIds.push(path.id);

      await db.enrollment.create({
        data: { userId: student.id, pathId: path.id },
      });

      // 1. New room defaults to Draft
      mocks.requireRole.mockResolvedValue(ownerTeacher);
      const created = await saveManagedLesson({
        pathSlug: path.slug,
        title: "Bài nháp 1",
        description: "Mô tả nháp",
        content: "# Lý thuyết Markdown\n\nNội dung chi tiết.",
        requestId: randomUUID(),
      });

      const dbRoom = await db.room.findUniqueOrThrow({
        where: { id: created.id },
        select: { published: true },
      });
      expect(dbRoom.published).toBe(false);

      const exercise = await db.exercise.create({
        data: {
          roomId: created.id,
          title: "Bài tập Draft",
          prompt: "In OK",
          kind: ExerciseKind.CODE,
          testCases: {
            create: { input: "", expected: "OK", isHidden: false },
          },
        },
      });

      // 2. Owner Teacher can preview Draft; foreign Teacher cannot preview or publish
      const preview = await getManagedRoomPreview(path.slug, created.id);
      expect(preview).toMatchObject({
        accessible: true,
        id: created.id,
        published: false,
        content: "# Lý thuyết Markdown\n\nNội dung chi tiết.",
        passedExercises: 0,
      });
      expect(preview.exercises).toHaveLength(1);

      mocks.requireRole.mockResolvedValue(otherTeacher);
      await expect(
        getManagedRoomPreview(path.slug, created.id),
      ).rejects.toMatchObject({ status: 404 });
      await expect(setRoomPublication(created.id, true)).rejects.toMatchObject({
        status: 404,
      });

      // 3. Student is blocked from Draft room, exercise, practice submission, report, and path listing
      mocks.requireRole.mockResolvedValue(student);
      await expect(canAccessRoom(student.id, created.id)).resolves.toBe(false);
      await expect(getRoomPage(created.id)).rejects.toMatchObject({
        status: 404,
      });
      await expect(getRoom(created.id)).rejects.toMatchObject({ status: 404 });
      await expect(getExercisePage(exercise.id)).rejects.toMatchObject({
        status: 404,
      });
      await expect(
        submitSolution({
          userId: student.id,
          exerciseId: exercise.id,
          source: "print('OK')",
          language: "python",
        }),
      ).rejects.toMatchObject({ status: 403, code: "ROOM_LOCKED" });
      await expect(
        reportExercise(exercise.id, {
          kind: "STATEMENT",
          description: "Test report on draft",
        }),
      ).rejects.toMatchObject({ status: 404 });

      const studentPathBefore = await getPath(path.slug);
      expect(studentPathBefore.total).toBe(0);
      expect(studentPathBefore.rooms).toEqual([]);

      // Reusable exercise inside a Contest remains submittable even if its practice Room is Draft
      const contest = await db.contest.create({
        data: {
          slug: `${prefix}-contest`,
          title: "Contest Draft Exercise",
          status: ContestStatus.PUBLISHED,
          exercises: {
            create: { exerciseId: exercise.id, position: 1 },
          },
        },
      });
      contestIds.push(contest.id);
      await expect(
        submitSolution({
          userId: student.id,
          exerciseId: exercise.id,
          contestId: contest.id,
          source: "print('OK')",
          language: "python",
        }),
      ).resolves.toMatchObject({ status: SubmissionStatus.ACCEPTED });

      // 4. Publish immediately unlocks for Student & completes room on accepted practice submission
      mocks.requireRole.mockResolvedValue(ownerTeacher);
      await setRoomPublication(created.id, true);

      mocks.requireRole.mockResolvedValue(student);
      await expect(canAccessRoom(student.id, created.id)).resolves.toBe(true);
      await expect(getRoom(created.id)).resolves.toMatchObject({
        id: created.id,
        content: "# Lý thuyết Markdown\n\nNội dung chi tiết.",
      });
      await expect(getExercisePage(exercise.id)).resolves.toMatchObject({
        accessible: true,
        id: exercise.id,
      });

      const practiceResult = await submitSolution({
        userId: student.id,
        exerciseId: exercise.id,
        source: "print('OK')",
        language: "python",
      });
      expect(practiceResult.status).toBe(SubmissionStatus.ACCEPTED);
      expect(practiceResult.roomCompletion?.roomId).toBe(created.id);

      // 5. Unpublish immediately blocks Student again without deleting RoomProgress, Submission, or XP
      mocks.requireRole.mockResolvedValue(ownerTeacher);
      await setRoomPublication(created.id, false);

      mocks.requireRole.mockResolvedValue(student);
      await expect(canAccessRoom(student.id, created.id)).resolves.toBe(false);
      await expect(getRoomPage(created.id)).rejects.toMatchObject({
        status: 404,
      });
      await expect(getRoom(created.id)).rejects.toMatchObject({ status: 404 });
      await expect(getExercisePage(exercise.id)).rejects.toMatchObject({
        status: 404,
      });
      await expect(
        submitSolution({
          userId: student.id,
          exerciseId: exercise.id,
          source: "print('OK')",
          language: "python",
        }),
      ).rejects.toMatchObject({ status: 403, code: "ROOM_LOCKED" });

      expect(
        await db.roomProgress.count({
          where: { userId: student.id, roomId: created.id },
        }),
      ).toBe(1);
      expect(
        await db.submission.count({
          where: {
            userId: student.id,
            exerciseId: exercise.id,
            contestId: null,
          },
        }),
      ).toBe(1);
      expect(
        await db.xpEvent.count({
          where: { userId: student.id, roomId: created.id },
        }),
      ).toBe(1);
    });

    it("excludes middle Draft rooms from sequentialUnlock, path progress, and path-completed badge", async () => {
      const studentRole = await db.role.findUniqueOrThrow({
        where: { name: RoleName.STUDENT },
      });
      const createdSeqStudent = await db.user.create({
        data: {
          email: `${prefix}-s2-${randomUUID()}@local.test`,
          name: "Sequential Learner",
          passwordHash: "unused",
          roleId: studentRole.id,
        },
      });
      userIds.push(createdSeqStudent.id);
      const seqStudent = {
        id: createdSeqStudent.id,
        role: { name: RoleName.STUDENT },
      };

      const path = await db.path.create({
        data: {
          slug: `${prefix}-seq`,
          title: "Sequential Draft Path",
          published: true,
          sequentialUnlock: true,
          creatorId: ownerTeacher.id,
          rooms: {
            create: [
              { title: "Pub 1", position: 1, published: true, content: "1" },
              { title: "Draft 2", position: 2, published: false, content: "2" },
              { title: "Pub 3", position: 3, published: true, content: "3" },
            ],
          },
        },
        include: { rooms: { orderBy: { position: "asc" } } },
      });
      pathIds.push(path.id);

      const [pub1, draft2, pub3] = path.rooms;
      await db.enrollment.create({
        data: { userId: seqStudent.id, pathId: path.id },
      });

      // Before finishing pub1, pub3 is locked; draft2 is never accessible.
      expect(await canAccessRoom(seqStudent.id, pub1.id)).toBe(true);
      expect(await canAccessRoom(seqStudent.id, draft2.id)).toBe(false);
      expect(await canAccessRoom(seqStudent.id, pub3.id)).toBe(false);

      // Completing pub1 unlocks pub3 directly without needing draft2.
      await db.roomProgress.create({
        data: { userId: seqStudent.id, roomId: pub1.id },
      });
      expect(await canAccessRoom(seqStudent.id, pub3.id)).toBe(true);

      mocks.requireRole.mockResolvedValue(seqStudent);
      const pathView = await getPath(path.slug);
      expect(pathView.total).toBe(2);
      expect(pathView.completed).toBe(1);
      expect(pathView.percent).toBe(50);
      expect(pathView.rooms.map((r) => r.id)).toEqual([pub1.id, pub3.id]);

      // Completing pub3 reaches 100% and awards path-completed badge even while draft2 remains unpublished.
      await db.roomProgress.create({
        data: { userId: seqStudent.id, roomId: pub3.id },
      });
      const awarded = await db.$transaction((tx) =>
        awardActivityBadgesInTx(tx, seqStudent.id),
      );
      expect(awarded).toContain("path-completed");
    });

    it("includes room_publication migration SQL that backfills rooms on published paths", () => {
      const migrationSql = readFileSync(
        join(
          process.cwd(),
          "prisma/migrations/20261117140000_room_publication/migration.sql",
        ),
        "utf8",
      );
      expect(migrationSql).toContain(
        'ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false',
      );
      expect(migrationSql).toContain('UPDATE "Room"');
      expect(migrationSql).toContain('WHERE "published" = true');
    });
  },
);
