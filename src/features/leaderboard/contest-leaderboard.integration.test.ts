import { ContestStatus, ExerciseKind, RoleName } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as gradingRepository from "@/features/grading/repository";
import * as gradingService from "@/features/grading/service";
import { submitSolution } from "@/features/grading/submit";
import { db } from "@/lib/db";
import {
  getContestLeaderboardVersion,
  resetContestLeaderboardBusForTests,
} from "./contest-events";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const prefix = `it-clb-${Date.now()}`;

describe.skipIf(!hasDatabase)(
  "contest leaderboard grading & DB synchronization integration",
  () => {
    let studentRoleId = "";
    let teacherRoleId = "";
    let userId = "";
    let teacherId = "";
    let contestId = "";
    let ex1Id = "";
    let ex2Id = "";

    beforeAll(async () => {
      const studentRole = await db.role.upsert({
        where: { name: RoleName.STUDENT },
        update: {},
        create: { name: RoleName.STUDENT },
      });
      const teacherRole = await db.role.upsert({
        where: { name: RoleName.TEACHER },
        update: {},
        create: { name: RoleName.TEACHER },
      });
      studentRoleId = studentRole.id;
      teacherRoleId = teacherRole.id;

      const teacher = await db.user.create({
        data: {
          email: `${prefix}-teacher@local.test`,
          name: "Teacher IT",
          passwordHash: "hash",
          roleId: teacherRoleId,
        },
      });
      teacherId = teacher.id;

      const student = await db.user.create({
        data: {
          email: `${prefix}-student@local.test`,
          name: "Student IT",
          passwordHash: "hash",
          roleId: studentRoleId,
        },
      });
      userId = student.id;

      const contest = await db.contest.create({
        data: {
          slug: `${prefix}-contest`,
          title: "IT Contest",
          status: ContestStatus.PUBLISHED,
          creatorId: teacherId,
          startsAt: new Date(Date.now() - 60_000),
          endsAt: new Date(Date.now() + 3_600_000),
          durationMinutes: 60,
          penaltyMinutes: 20,
        },
      });
      contestId = contest.id;

      const ex1 = await db.exercise.create({
        data: {
          title: "Ex 1",
          prompt: "Add",
          kind: ExerciseKind.CODE,
          points: 100,
          testCases: { create: [{ input: "1 2", expected: "3" }] },
        },
      });
      ex1Id = ex1.id;

      const ex2 = await db.exercise.create({
        data: {
          title: "Ex 2",
          prompt: "Mul",
          kind: ExerciseKind.CODE,
          points: 100,
          testCases: {
            create: [
              { input: "2 3", expected: "6" },
              { input: "3 4", expected: "12" },
            ],
          },
        },
      });
      ex2Id = ex2.id;

      await db.contestExercise.createMany({
        data: [
          { contestId, exerciseId: ex1Id, position: 1, points: 150 },
          { contestId, exerciseId: ex2Id, position: 2, points: 100 },
        ],
      });

      const startedAt = new Date();
      await db.contestParticipant.create({
        data: {
          contestId,
          userId,
          startedAt,
          deadlineAt: new Date(startedAt.getTime() + 3_600_000),
        },
      });
    });

    afterAll(async () => {
      vi.restoreAllMocks();
      if (!hasDatabase) return;
      if (contestId) {
        await db.submission.deleteMany({ where: { contestId } });
        await db.contestParticipant.deleteMany({ where: { contestId } });
        await db.contestExercise.deleteMany({ where: { contestId } });
        await db.contest.deleteMany({ where: { id: contestId } });
      }
      if (ex1Id || ex2Id) {
        await db.exercise.deleteMany({
          where: { id: { in: [ex1Id, ex2Id].filter(Boolean) } },
        });
      }
      if (userId || teacherId) {
        await db.user.deleteMany({
          where: { id: { in: [userId, teacherId].filter(Boolean) } },
        });
      }
      await db.$disconnect();
    });

    it("synchronizes ContestParticipant score and penalty atomically across concurrent submissions", async () => {
      resetContestLeaderboardBusForTests();

      vi.spyOn(gradingService, "getGradingAdapter").mockReturnValue({
        grade: async ({ expected }) => {
          if (expected === "3") {
            return { status: "ACCEPTED", feedback: "OK", runtimeMs: 10 };
          }
          if (expected === "6") {
            return { status: "ACCEPTED", feedback: "OK", runtimeMs: 10 };
          }
          return { status: "WRONG_ANSWER", feedback: "WA", runtimeMs: 10 };
        },
      });

      await Promise.all([
        submitSolution({
          userId,
          exerciseId: ex1Id,
          contestId,
          source: "print(3)",
          language: "python",
        }),
        submitSolution({
          userId,
          exerciseId: ex2Id,
          contestId,
          source: "print(6)",
          language: "python",
        }),
      ]);

      const participant = await db.contestParticipant.findUniqueOrThrow({
        where: { contestId_userId: { contestId, userId } },
      });

      // ex1 override 150 ACCEPTED + ex2 1/2 partial score 50 REJECTED (20 penalty)
      expect(participant.score).toBe(200);
      expect(participant.penaltyMinutes).toBe(20);
      expect(getContestLeaderboardVersion(contestId)).toBe(2);
    });

    it("rolls back submission transaction and does not emit when persistence fails", async () => {
      resetContestLeaderboardBusForTests();
      const before = await db.contestParticipant.findUniqueOrThrow({
        where: { contestId_userId: { contestId, userId } },
      });

      await expect(
        gradingRepository.finishSubmission(
          "non-existent-submission-id",
          {
            status: "ACCEPTED",
            score: 150,
            feedback: "OK",
            runtimeMs: 5,
            memoryKb: null,
          },
          { contestId, userId },
        ),
      ).rejects.toThrow();

      const afterParticipant = await db.contestParticipant.findUniqueOrThrow({
        where: { contestId_userId: { contestId, userId } },
      });

      expect(afterParticipant.score).toBe(before.score);
      expect(afterParticipant.penaltyMinutes).toBe(before.penaltyMinutes);
      expect(getContestLeaderboardVersion(contestId)).toBe(0);
    });
  },
);
