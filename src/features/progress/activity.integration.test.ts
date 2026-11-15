import {
  ExerciseKind,
  RoleName,
  SubmissionStatus,
  XpSource,
} from "@prisma/client";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { db } from "../../lib/db";
import { canConnectToDatabase } from "../../test-utils/database";
import { recordLearningActivity, recordStreakActivity } from "./activity";
import { awardCompletedWeekTopBadge } from "./badge-awarding";
import { MILESTONE_BADGES } from "./badges";

const hasDatabase = await canConnectToDatabase();

describe.skipIf(!hasDatabase)(
  "recordLearningActivity & badge awarding (PostgreSQL integration)",
  () => {
    const createdUserIds: string[] = [];
    const createdPathIds: string[] = [];

    afterEach(async () => {
      if (createdPathIds.length > 0) {
        const rooms = await db.room.findMany({
          where: { pathId: { in: createdPathIds } },
          select: { id: true },
        });
        const roomIds = rooms.map((room) => room.id);
        if (roomIds.length > 0) {
          await db.submission.deleteMany({
            where: { exercise: { roomId: { in: roomIds } } },
          });
          await db.exercise.deleteMany({
            where: { roomId: { in: roomIds } },
          });
        }
        await db.path.deleteMany({
          where: { id: { in: createdPathIds } },
        });
        createdPathIds.length = 0;
      }

      if (createdUserIds.length > 0) {
        await db.submission.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await db.userBadge.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await db.xpEvent.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await db.roomProgress.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await db.enrollment.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await db.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
        createdUserIds.length = 0;
      }
    });

    afterAll(async () => {
      await db.$disconnect();
    });

    async function createStudentUser(overrides?: {
      currentStreak?: number;
      longestStreak?: number;
    }) {
      const role = await db.role.upsert({
        where: { name: RoleName.STUDENT },
        update: {},
        create: { name: RoleName.STUDENT },
      });

      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const user = await db.user.create({
        data: {
          email: `badge-int-${suffix}@local.test`,
          name: `Test Student ${suffix}`,
          passwordHash: "not-used-in-test",
          roleId: role.id,
          currentStreak: overrides?.currentStreak ?? 0,
          longestStreak: overrides?.longestStreak ?? 0,
        },
      });
      createdUserIds.push(user.id);
      return user;
    }

    async function ensureMilestoneAndLegacyBadges() {
      for (const badge of [
        ...MILESTONE_BADGES,
        {
          slug: "first-path-room",
          name: "Khởi động",
          description: "Hoàn thành 5 bài học",
        },
      ]) {
        await db.badge.upsert({
          where: { slug: badge.slug },
          update: {},
          create: badge,
        });
      }
    }

    async function createCompletedPathAndFiveExercises(
      creatorId: string,
      learnerId: string,
    ) {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const path = await db.path.create({
        data: {
          slug: `test-badge-path-${suffix}`,
          title: "Integration Path",
          published: true,
          creatorId,
          rooms: {
            create: [
              { title: "Room 1", position: 1 },
              { title: "Room 2", position: 2 },
            ],
          },
        },
        include: { rooms: true },
      });
      createdPathIds.push(path.id);

      await db.enrollment.create({
        data: { userId: learnerId, pathId: path.id },
      });

      await db.roomProgress.createMany({
        data: path.rooms.map((room) => ({
          userId: learnerId,
          roomId: room.id,
        })),
      });

      const exercises = await Promise.all(
        Array.from({ length: 5 }, (_, index) =>
          db.exercise.create({
            data: {
              roomId: path.rooms[0].id,
              title: `Exercise ${index + 1}`,
              prompt: "Solve task",
              kind: ExerciseKind.CODE,
            },
          }),
        ),
      );

      // Add 1 ACCEPTED per distinct exercise plus an extra ACCEPTED on exercise[0]
      await db.submission.createMany({
        data: [
          ...exercises.map((exercise) => ({
            userId: learnerId,
            exerciseId: exercise.id,
            status: SubmissionStatus.ACCEPTED,
            score: 100,
          })),
          {
            userId: learnerId,
            exerciseId: exercises[0].id,
            status: SubmissionStatus.ACCEPTED,
            score: 100,
          },
        ],
      });

      return { path, exercises };
    }

    it("handles concurrent recordLearningActivity calls cleanly without duplicate UserBadges or aborted XP transactions", async () => {
      await ensureMilestoneAndLegacyBadges();
      const user = await createStudentUser({
        currentStreak: 7,
        longestStreak: 7,
      });
      await createCompletedPathAndFiveExercises(user.id, user.id);

      const results = await Promise.all([
        recordLearningActivity({
          userId: user.id,
          xp: 10,
          source: XpSource.ROOM_COMPLETED,
        }),
        recordLearningActivity({
          userId: user.id,
          xp: 20,
          source: XpSource.ROOM_COMPLETED,
        }),
        recordLearningActivity({
          userId: user.id,
          xp: 30,
          source: XpSource.ROOM_COMPLETED,
        }),
        recordLearningActivity({
          userId: user.id,
          xp: 40,
          source: XpSource.ROOM_COMPLETED,
        }),
        recordLearningActivity({
          userId: user.id,
          xp: 50,
          source: XpSource.ROOM_COMPLETED,
        }),
      ]);

      expect(results).toHaveLength(5);

      const updatedUser = await db.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { xp: true },
      });
      expect(updatedUser.xp).toBe(150);

      const xpEvents = await db.xpEvent.findMany({
        where: { userId: user.id },
      });
      expect(xpEvents).toHaveLength(5);
      expect(xpEvents.some((event) => event.source === XpSource.BADGE)).toBe(
        false,
      );

      const awardedBadges = await db.userBadge.findMany({
        where: { userId: user.id },
        include: { badge: { select: { slug: true } } },
      });
      const slugs = awardedBadges.map((row) => row.badge.slug).sort();
      expect(slugs).toEqual(["five-exercises", "path-completed", "streak-7"]);
    });

    it("does not conflate first-path-room with five-exercises and preserves initial awardedAt on repeated calls", async () => {
      await ensureMilestoneAndLegacyBadges();
      const user = await createStudentUser({
        currentStreak: 2,
        longestStreak: 2,
      });
      const firstPathRoom = await db.badge.findUniqueOrThrow({
        where: { slug: "first-path-room" },
      });
      await db.userBadge.create({
        data: { userId: user.id, badgeId: firstPathRoom.id },
      });

      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const path = await db.path.create({
        data: {
          slug: `test-five-ex-${suffix}`,
          title: "Five Exercises Path",
          published: false,
          creatorId: user.id,
          rooms: { create: [{ title: "Room 1", position: 1 }] },
        },
        include: { rooms: true },
      });
      createdPathIds.push(path.id);

      const exercises = await Promise.all(
        Array.from({ length: 5 }, (_, index) =>
          db.exercise.create({
            data: {
              roomId: path.rooms[0].id,
              title: `Ex ${index + 1}`,
              prompt: "Prompt",
              kind: ExerciseKind.CODE,
            },
          }),
        ),
      );

      // 4 distinct ACCEPTED + repeated ACCEPTED on exercise 0 + REJECTED on exercise 4
      await db.submission.createMany({
        data: [
          ...exercises.slice(0, 4).map((exercise) => ({
            userId: user.id,
            exerciseId: exercise.id,
            status: SubmissionStatus.ACCEPTED,
            score: 100,
          })),
          {
            userId: user.id,
            exerciseId: exercises[0].id,
            status: SubmissionStatus.ACCEPTED,
            score: 100,
          },
          {
            userId: user.id,
            exerciseId: exercises[4].id,
            status: SubmissionStatus.REJECTED,
            score: 40,
          },
        ],
      });

      await recordLearningActivity({
        userId: user.id,
        xp: 25,
        source: XpSource.ROOM_COMPLETED,
      });

      const beforeFifth = await db.userBadge.findMany({
        where: { userId: user.id },
        include: { badge: { select: { slug: true } } },
      });
      expect(beforeFifth.map((row) => row.badge.slug)).toEqual([
        "first-path-room",
      ]);

      // Complete the 5th distinct exercise
      await db.submission.create({
        data: {
          userId: user.id,
          exerciseId: exercises[4].id,
          status: SubmissionStatus.ACCEPTED,
          score: 100,
        },
      });

      await recordLearningActivity({
        userId: user.id,
        xp: 25,
        source: XpSource.ROOM_COMPLETED,
      });

      const fiveExercisesBadge = await db.badge.findUniqueOrThrow({
        where: { slug: "five-exercises" },
      });
      const firstAward = await db.userBadge.findUniqueOrThrow({
        where: {
          userId_badgeId: { userId: user.id, badgeId: fiveExercisesBadge.id },
        },
      });

      await recordLearningActivity({
        userId: user.id,
        xp: 25,
        source: XpSource.ROOM_COMPLETED,
      });

      const secondAward = await db.userBadge.findUniqueOrThrow({
        where: {
          userId_badgeId: { userId: user.id, badgeId: fiveExercisesBadge.id },
        },
      });
      expect(secondAward.awardedAt.getTime()).toBe(
        firstAward.awardedAt.getTime(),
      );
    });

    it("awards weekly-top-1 idempotently under concurrent calls for tied winners of an ended Asia/Ho_Chi_Minh week", async () => {
      await ensureMilestoneAndLegacyBadges();
      const [tiedA, tiedB, runnerUpWithOngoingXp] = await Promise.all([
        createStudentUser(),
        createStudentUser(),
        createStudentUser(),
      ]);

      // Isolated closed week: Mon 2020-01-06 00:00+07:00 .. Mon 2020-01-13 00:00+07:00
      const referenceDate = new Date("2020-01-13T01:00:00+07:00");
      await db.xpEvent.createMany({
        data: [
          {
            userId: tiedA.id,
            amount: 120,
            source: XpSource.ROOM_COMPLETED,
            createdAt: new Date("2020-01-06T00:00:00+07:00"),
          },
          {
            userId: tiedA.id,
            amount: 80,
            source: XpSource.CONTEST_RESULT,
            createdAt: new Date("2020-01-12T23:59:59+07:00"),
          },
          {
            userId: tiedB.id,
            amount: 200,
            source: XpSource.ROOM_COMPLETED,
            createdAt: new Date("2020-01-10T12:00:00+07:00"),
          },
          {
            userId: runnerUpWithOngoingXp.id,
            amount: 150,
            source: XpSource.ROOM_COMPLETED,
            createdAt: new Date("2020-01-09T12:00:00+07:00"),
          },
          // Ongoing week XP (>= 2020-01-13 00:00+07:00) MUST NOT count toward closed week
          {
            userId: runnerUpWithOngoingXp.id,
            amount: 999,
            source: XpSource.ROOM_COMPLETED,
            createdAt: new Date("2020-01-13T00:00:00+07:00"),
          },
        ],
      });

      const runs = await Promise.all([
        awardCompletedWeekTopBadge(referenceDate),
        awardCompletedWeekTopBadge(referenceDate),
        awardCompletedWeekTopBadge(referenceDate),
      ]);

      for (const run of runs) {
        expect(run.winnerUserIds).toEqual(
          [tiedA.id, tiedB.id].sort((a, b) => a.localeCompare(b)),
        );
      }

      const weeklyBadge = await db.badge.findUniqueOrThrow({
        where: { slug: "weekly-top-1" },
      });
      const awardedRows = await db.userBadge.findMany({
        where: {
          badgeId: weeklyBadge.id,
          userId: { in: [tiedA.id, tiedB.id, runnerUpWithOngoingXp.id] },
        },
      });
      expect(awardedRows.map((row) => row.userId).sort()).toEqual(
        [tiedA.id, tiedB.id].sort(),
      );
    });

    it("stores lastActiveOn as the exact Vietnam @db.Date without UTC+7 shift across midnight boundaries", async () => {
      await ensureMilestoneAndLegacyBadges();
      const user = await createStudentUser();

      // Day 1: 2026-11-11 23:59:59 +07:00 (2026-11-11T16:59:59Z) -> streak = 1, lastActiveOn = 2026-11-11
      await recordStreakActivity({
        userId: user.id,
        occurredAt: new Date("2026-11-11T23:59:59+07:00"),
      });
      // Same VN day earlier: should keep streak = 1
      await recordStreakActivity({
        userId: user.id,
        occurredAt: new Date("2026-11-11T00:05:00+07:00"),
      });
      let snapshot = await db.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          currentStreak: true,
          longestStreak: true,
          lastActiveOn: true,
        },
      });
      expect(snapshot.currentStreak).toBe(1);
      expect(snapshot.longestStreak).toBe(1);
      expect(snapshot.lastActiveOn?.toISOString().slice(0, 10)).toBe(
        "2026-11-11",
      );

      // Day 2: 2026-11-12 00:00:00 +07:00 (2026-11-11T17:00:00Z) -> streak = 2, lastActiveOn = 2026-11-12
      await recordLearningActivity({
        userId: user.id,
        xp: 20,
        source: XpSource.ROOM_COMPLETED,
        occurredAt: new Date("2026-11-12T00:00:00+07:00"),
      });
      snapshot = await db.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          currentStreak: true,
          longestStreak: true,
          lastActiveOn: true,
        },
      });
      expect(snapshot.currentStreak).toBe(2);
      expect(snapshot.longestStreak).toBe(2);
      expect(snapshot.lastActiveOn?.toISOString().slice(0, 10)).toBe(
        "2026-11-12",
      );

      // Missed 2026-11-13 -> study on 2026-11-14 resets currentStreak to 1, keeps longestStreak = 2
      await recordStreakActivity({
        userId: user.id,
        occurredAt: new Date("2026-11-14T08:00:00+07:00"),
      });
      snapshot = await db.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          currentStreak: true,
          longestStreak: true,
          lastActiveOn: true,
        },
      });
      expect(snapshot.currentStreak).toBe(1);
      expect(snapshot.longestStreak).toBe(2);
      expect(snapshot.lastActiveOn?.toISOString().slice(0, 10)).toBe(
        "2026-11-14",
      );
    });

    it("awards streak-7 once when transitioning from 6 to 7 and serializes concurrent streak updates without double increment", async () => {
      await ensureMilestoneAndLegacyBadges();
      const user = await createStudentUser({
        currentStreak: 5,
        longestStreak: 5,
      });
      await db.user.update({
        where: { id: user.id },
        data: { lastActiveOn: new Date("2026-11-10T00:00:00.000Z") },
      });

      // Concurrent submissions on 2026-11-11 VN must advance streak from 5 -> 6 exactly once.
      const day6Timestamp = new Date("2026-11-11T10:00:00+07:00");
      await Promise.all([
        recordStreakActivity({ userId: user.id, occurredAt: day6Timestamp }),
        recordStreakActivity({ userId: user.id, occurredAt: day6Timestamp }),
        recordLearningActivity({
          userId: user.id,
          xp: 15,
          source: XpSource.ROOM_COMPLETED,
          occurredAt: day6Timestamp,
        }),
      ]);

      const afterDay6 = await db.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { currentStreak: true, longestStreak: true, xp: true },
      });
      expect(afterDay6).toEqual({
        currentStreak: 6,
        longestStreak: 6,
        xp: 15,
      });
      expect(
        await db.userBadge.findMany({
          where: { userId: user.id, badge: { slug: "streak-7" } },
        }),
      ).toHaveLength(0);

      // Concurrent activities on 2026-11-12 VN advance 6 -> 7 once and award streak-7 once.
      const day7Timestamp = new Date("2026-11-12T00:01:00+07:00");
      await Promise.all([
        recordStreakActivity({ userId: user.id, occurredAt: day7Timestamp }),
        recordLearningActivity({
          userId: user.id,
          xp: 25,
          source: XpSource.ROOM_COMPLETED,
          occurredAt: day7Timestamp,
        }),
      ]);

      const afterDay7 = await db.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { currentStreak: true, longestStreak: true, xp: true },
      });
      expect(afterDay7).toEqual({
        currentStreak: 7,
        longestStreak: 7,
        xp: 40,
      });
      const streakBadges = await db.userBadge.findMany({
        where: { userId: user.id, badge: { slug: "streak-7" } },
      });
      expect(streakBadges).toHaveLength(1);
    });
  },
);
