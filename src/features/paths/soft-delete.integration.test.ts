import { randomUUID } from "node:crypto";
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

import { getDashboardRecords } from "@/features/dashboard/repository";
import { reportExercise } from "@/features/exercise-reports/service";
import {
  deleteManagedExercise,
  saveManagedExercise,
} from "@/features/exercises/authoring";
import { getExercisePage } from "@/features/grading/exercise-page";
import { submitSolution } from "@/features/grading/submit";
import { getXpLeaderboard } from "@/features/leaderboard/service";
import { getOwnProfile, getPublicProfile } from "@/features/profile/service";
import { recordStreakActivity } from "@/features/progress/activity";
import { awardCompletedWeekTopBadge } from "@/features/progress/badge-awarding";
import { canAccessRoom } from "@/features/rooms/access";
import { saveManagedLesson } from "@/features/rooms/authoring";
import { getRoom, getRoomPage } from "@/features/rooms/service";
import { findPublishedSearchResults } from "@/features/search/repository";
import { updateManagedPathDetails } from "./details";
import {
  deleteManagedPath,
  getManagedPath,
  getManagedPaths,
  setPathSequentialUnlock,
} from "./management";
import { setPathPublication } from "./publication";
import { findPublishedPath, listPaths } from "./repository";
import { getPath, registerForPath } from "./service";

const hasDatabase = await canConnectToDatabase();
const prefix = `it-path-sd-${randomUUID().slice(0, 8)}`;

describe.skipIf(!hasDatabase)(
  "path soft delete access protection & data preservation (PostgreSQL)",
  () => {
    const userIds: string[] = [];
    const pathIds: string[] = [];
    const exerciseIds: string[] = [];
    const contestIds: string[] = [];
    let ownerTeacher = { id: "", name: "", role: { name: RoleName.TEACHER } };
    let otherTeacher = { id: "", name: "", role: { name: RoleName.TEACHER } };
    let student = { id: "", name: "", role: { name: RoleName.STUDENT } };
    let otherStudent = { id: "", name: "", role: { name: RoleName.STUDENT } };

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

      const [t1, t2, s1, s2] = await Promise.all([
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
            name: "Enrolled Learner",
            passwordHash: "unused",
            roleId: studentRole.id,
          },
        }),
        db.user.create({
          data: {
            email: `${prefix}-s2@local.test`,
            name: "New Learner",
            passwordHash: "unused",
            roleId: studentRole.id,
          },
        }),
      ]);

      ownerTeacher = {
        id: t1.id,
        name: t1.name,
        role: { name: RoleName.TEACHER },
      };
      otherTeacher = {
        id: t2.id,
        name: t2.name,
        role: { name: RoleName.TEACHER },
      };
      student = { id: s1.id, name: s1.name, role: { name: RoleName.STUDENT } };
      otherStudent = {
        id: s2.id,
        name: s2.name,
        role: { name: RoleName.STUDENT },
      };
      userIds.push(t1.id, t2.id, s1.id, s2.id);
    });

    afterAll(async () => {
      if (userIds.length > 0) {
        await db.submission.deleteMany({ where: { userId: { in: userIds } } });
      }
      if (exerciseIds.length > 0) {
        await db.exercise.deleteMany({ where: { id: { in: exerciseIds } } });
      }
      if (contestIds.length > 0) {
        await db.contest.deleteMany({ where: { id: { in: contestIds } } });
      }
      if (pathIds.length > 0) {
        await db.path.deleteMany({ where: { id: { in: pathIds } } });
      }
      if (userIds.length > 0) {
        await db.user.deleteMany({ where: { id: { in: userIds } } });
      }
      await db.$disconnect();
    });

    it("hides a soft-deleted path across catalog, search, rooms, exercises and authoring while preserving learner history and contests", async () => {
      const path = await db.path.create({
        data: {
          slug: `${prefix}-path`,
          title: `${prefix} Soft Delete Path`,
          published: true,
          sequentialUnlock: true,
          creatorId: ownerTeacher.id,
          rooms: {
            create: [
              {
                title: `${prefix} Room One`,
                content: "# Lý thuyết 1",
                position: 1,
                xpReward: 50,
              },
              {
                title: `${prefix} Room Two`,
                content: "# Lý thuyết 2",
                position: 2,
                xpReward: 50,
              },
            ],
          },
        },
        include: { rooms: { orderBy: { position: "asc" } } },
      });
      pathIds.push(path.id);
      const [room1, room2] = path.rooms;

      const exercise = await db.exercise.create({
        data: {
          roomId: room1.id,
          title: `${prefix} Exercise`,
          prompt: "In OK",
          kind: ExerciseKind.CODE,
          points: 100,
          testCases: {
            create: { input: "", expected: "OK", isHidden: false, weight: 1 },
          },
        },
      });
      exerciseIds.push(exercise.id);

      const contest = await db.contest.create({
        data: {
          slug: `${prefix}-contest`,
          title: `${prefix} Contest`,
          status: ContestStatus.PUBLISHED,
          exercises: { create: { exerciseId: exercise.id, position: 1 } },
        },
      });
      contestIds.push(contest.id);

      // 1. Enrolled learner completes Room 1, earning XP and unlocking Room 2.
      mocks.requireRole.mockResolvedValue(student);
      await registerForPath(path.slug);
      expect(await canAccessRoom(student.id, room1.id)).toBe(true);
      expect(await canAccessRoom(student.id, room2.id)).toBe(false);

      const practiceBefore = await submitSolution({
        userId: student.id,
        exerciseId: exercise.id,
        source: "print('OK')",
        language: "python",
      });
      expect(practiceBefore.status).toBe(SubmissionStatus.ACCEPTED);
      expect(practiceBefore.roomCompletion?.roomId).toBe(room1.id);
      expect(await canAccessRoom(student.id, room2.id)).toBe(true);

      const searchBefore = await findPublishedSearchResults(prefix);
      expect(searchBefore.paths.some((item) => item.id === path.id)).toBe(true);
      expect(searchBefore.rooms.some((item) => item.id === room1.id)).toBe(
        true,
      );

      // 2. Non-owner teacher receives 403 on delete/edit/publish/unlock.
      mocks.requireRole.mockResolvedValue(otherTeacher);
      await expect(deleteManagedPath(path.id)).rejects.toMatchObject({
        status: 403,
        code: "FORBIDDEN",
      });

      // 3. Owner soft-deletes the path.
      mocks.requireRole.mockResolvedValue(ownerTeacher);
      const deleted = await deleteManagedPath(path.id);
      expect(deleted.id).toBe(path.id);

      const storedPath = await db.path.findUniqueOrThrow({
        where: { id: path.id },
        select: { deletedAt: true, published: true },
      });
      expect(storedPath.deletedAt).not.toBeNull();
      expect(storedPath.published).toBe(false);

      // 4. Hidden from Student Catalog, Search, and new Enrollment.
      mocks.requireRole.mockResolvedValue(otherStudent);
      expect(
        (await listPaths(otherStudent.id)).some((item) => item.id === path.id),
      ).toBe(false);
      expect(await findPublishedPath(path.slug, otherStudent.id)).toBeNull();
      await expect(getPath(path.slug)).rejects.toMatchObject({ status: 404 });
      await expect(registerForPath(path.slug)).rejects.toMatchObject({
        status: 404,
      });

      const searchAfter = await findPublishedSearchResults(prefix);
      expect(searchAfter.paths.some((item) => item.id === path.id)).toBe(false);
      expect(searchAfter.rooms.some((item) => item.id === room1.id)).toBe(
        false,
      );

      // 5. Blocked for Student Room/Exercise access, practice submission, and reports.
      mocks.requireRole.mockResolvedValue(student);
      expect(await canAccessRoom(student.id, room1.id)).toBe(false);
      expect(await canAccessRoom(student.id, room2.id)).toBe(false);
      await expect(getRoom(room1.id)).rejects.toMatchObject({ status: 404 });
      await expect(getRoomPage(room1.id)).rejects.toMatchObject({
        status: 404,
      });
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
          description: "Report on soft-deleted path",
        }),
      ).rejects.toMatchObject({ status: 404 });

      // 6. Contest sharing the same exercise still works normally.
      await expect(
        submitSolution({
          userId: student.id,
          exerciseId: exercise.id,
          contestId: contest.id,
          source: "print('OK')",
          language: "python",
        }),
      ).resolves.toMatchObject({ status: SubmissionStatus.ACCEPTED });

      // 7. Teacher authoring & management operations are blocked on the soft-deleted path.
      mocks.requireRole.mockResolvedValue(ownerTeacher);
      expect(
        (await getManagedPaths()).some((item) => item.id === path.id),
      ).toBe(false);
      await expect(getManagedPath(path.slug)).rejects.toMatchObject({
        status: 404,
      });
      await expect(deleteManagedPath(path.id)).rejects.toMatchObject({
        status: 404,
      });
      await expect(
        updateManagedPathDetails({ pathId: path.id, title: "Updated" }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(setPathPublication(path.id, true)).rejects.toMatchObject({
        status: 404,
      });
      await expect(
        setPathSequentialUnlock(path.id, false),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        saveManagedLesson({
          pathSlug: path.slug,
          title: "New Room",
          description: "",
          content: "# Blocked",
          requestId: randomUUID(),
        }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        saveManagedLesson({
          pathSlug: path.slug,
          roomId: room1.id,
          title: "Edited Room",
          description: "",
          content: "# Blocked",
        }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        saveManagedExercise({
          pathSlug: path.slug,
          roomId: room1.id,
          title: "New Ex",
          prompt: "Prompt",
          difficulty: "EASY",
          points: 100,
          timeLimitMs: 1000,
          memoryMb: 128,
          testCases: [
            { input: "1", expected: "1", isHidden: false, weight: 1 },
          ],
          requestId: randomUUID(),
        }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        deleteManagedExercise({
          pathSlug: path.slug,
          roomId: room1.id,
          exerciseId: exercise.id,
        }),
      ).rejects.toMatchObject({ status: 404 });

      // 8. Historical learner records remain completely intact.
      expect(
        await db.enrollment.count({
          where: { userId: student.id, pathId: path.id },
        }),
      ).toBe(1);
      expect(
        await db.roomProgress.count({
          where: { userId: student.id, roomId: room1.id },
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
          where: { userId: student.id, pathId: path.id, roomId: room1.id },
        }),
      ).toBe(1);
      const learnerAfter = await db.user.findUniqueOrThrow({
        where: { id: student.id },
        select: { xp: true },
      });
      expect(learnerAfter.xp).toBe(50);
    });

    it("excludes soft-deleted paths from dashboard, leaderboard, public profile and new path-completed badges while keeping historical XP, submissions and earned badges", async () => {
      const studentRole = await db.role.findUniqueOrThrow({
        where: { name: RoleName.STUDENT },
      });
      const [completedLearnerRow, lateLearnerRow] = await Promise.all([
        db.user.create({
          data: {
            email: `${prefix}-p2b-s1@local.test`,
            name: "Completed Learner",
            passwordHash: "unused",
            roleId: studentRole.id,
          },
        }),
        db.user.create({
          data: {
            email: `${prefix}-p2b-s2@local.test`,
            name: "Late Learner",
            passwordHash: "unused",
            roleId: studentRole.id,
          },
        }),
      ]);
      userIds.push(completedLearnerRow.id, lateLearnerRow.id);

      const completedLearner = {
        id: completedLearnerRow.id,
        name: completedLearnerRow.name,
        role: { name: RoleName.STUDENT },
      };

      const completedPath = await db.path.create({
        data: {
          slug: `${prefix}-p2b-done`,
          title: `${prefix} Completed Path`,
          published: true,
          creatorId: ownerTeacher.id,
          rooms: {
            create: [
              {
                title: `${prefix} Only Room`,
                content: "# Only lesson",
                position: 1,
                xpReward: 75,
              },
            ],
          },
        },
        include: { rooms: true },
      });
      pathIds.push(completedPath.id);
      const [onlyRoom] = completedPath.rooms;

      const completedExercise = await db.exercise.create({
        data: {
          roomId: onlyRoom.id,
          title: `${prefix} Final Exercise`,
          prompt: "Print OK",
          kind: ExerciseKind.CODE,
          points: 100,
          testCases: {
            create: { input: "", expected: "OK", isHidden: false, weight: 1 },
          },
        },
      });
      exerciseIds.push(completedExercise.id);

      // 1. completedLearner finishes the 1-room path -> earns 75 XP and path-completed badge.
      mocks.requireRole.mockResolvedValue(completedLearner);
      await registerForPath(completedPath.slug);
      const subResult = await submitSolution({
        userId: completedLearner.id,
        exerciseId: completedExercise.id,
        source: "print('OK')",
        language: "python",
      });
      expect(subResult.status).toBe(SubmissionStatus.ACCEPTED);

      // lateLearner has roomProgress on a path that gets soft-deleted before badge evaluation.
      await db.enrollment.create({
        data: { userId: lateLearnerRow.id, pathId: completedPath.id },
      });
      await db.roomProgress.create({
        data: { userId: lateLearnerRow.id, roomId: onlyRoom.id },
      });

      // Seed a historical closed-week XP event tied to completedPath to verify weekly-top-1 stays intact.
      await db.xpEvent.create({
        data: {
          userId: completedLearner.id,
          amount: 500,
          source: "ROOM_COMPLETED",
          pathId: completedPath.id,
          roomId: onlyRoom.id,
          createdAt: new Date("2019-01-09T10:00:00+07:00"),
        },
      });

      // 2. Owner soft-deletes the path.
      mocks.requireRole.mockResolvedValue(ownerTeacher);
      await deleteManagedPath(completedPath.id);

      // 3. Dashboard hides the soft-deleted path while keeping completedRoomIds, badges, and activity.
      const dashboard = await getDashboardRecords(
        completedLearner.id,
        75,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      );
      expect(
        dashboard.enrollments.some((e) => e.path.id === completedPath.id),
      ).toBe(false);
      expect(
        dashboard.suggestedPaths.some((p) => p.id === completedPath.id),
      ).toBe(false);
      expect(dashboard.completedRoomIds.has(onlyRoom.id)).toBe(true);
      expect(
        dashboard.badges.some((b) => b.badge.slug === "path-completed"),
      ).toBe(true);
      expect(dashboard.activity.length).toBeGreaterThanOrEqual(1);

      // 4. Leaderboard hides the soft-deleted path but preserves all-time XP.
      mocks.requireRole.mockResolvedValue(completedLearner);
      const allTimeBoard = await getXpLeaderboard({ period: "all" });
      expect(allTimeBoard.paths.some((p) => p.id === completedPath.id)).toBe(
        false,
      );
      expect(allTimeBoard.myStanding.xp).toBe(575);
      await expect(
        getXpLeaderboard({ pathSlug: completedPath.slug }),
      ).rejects.toMatchObject({ status: 404, code: "PATH_NOT_FOUND" });

      // 5. Public Profile excludes the soft-deleted path while preserving XP, roomsDone, and badges.
      const publicView = await getPublicProfile(completedLearner.id);
      expect(
        publicView.profile.paths.some((p) => p.id === completedPath.id),
      ).toBe(false);
      expect(publicView.profile.level.xp).toBe(75);
      expect(publicView.profile.stats.roomsDone).toBe(1);
      expect(
        publicView.profile.badges.some((b) => b.slug === "path-completed"),
      ).toBe(true);

      // 6. Private Profile preserves submission history (with null href) and earned badges.
      const ownProfile = await getOwnProfile();
      expect(ownProfile.paths.some((p) => p.id === completedPath.id)).toBe(
        false,
      );
      expect(ownProfile.badges.some((b) => b.slug === "path-completed")).toBe(
        true,
      );
      const historicSub = ownProfile.submissions.find(
        (s) => s.exerciseId === completedExercise.id,
      );
      expect(historicSub).toMatchObject({
        exerciseTitle: `${prefix} Final Exercise`,
        contextLabel: `${prefix} Completed Path · ${prefix} Only Room`,
        contextHref: null,
        status: SubmissionStatus.ACCEPTED,
      });

      // 7. Badges: previously earned badge stays; lateLearner does not gain path-completed from soft-deleted path; weekly-top-1 preserved.
      await recordStreakActivity({ userId: completedLearner.id });
      const completedLearnerBadges = await db.userBadge.findMany({
        where: { userId: completedLearner.id },
        include: { badge: { select: { slug: true } } },
      });
      expect(
        completedLearnerBadges.some((b) => b.badge.slug === "path-completed"),
      ).toBe(true);

      await recordStreakActivity({ userId: lateLearnerRow.id });
      const lateLearnerBadges = await db.userBadge.findMany({
        where: { userId: lateLearnerRow.id },
        include: { badge: { select: { slug: true } } },
      });
      expect(
        lateLearnerBadges.some((b) => b.badge.slug === "path-completed"),
      ).toBe(false);

      const weeklyResult = await awardCompletedWeekTopBadge(
        new Date("2019-01-14T01:00:00+07:00"),
      );
      expect(weeklyResult.winnerUserIds).toContain(completedLearner.id);
    });
  },
);
