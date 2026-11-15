import {
  ExerciseKind,
  RoleName,
  SubmissionStatus,
  XpSource,
} from "@prisma/client";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { db } from "../../lib/db";
import { canAccessRoom } from "../rooms/access";

// Passes through to the real implementation; one test makes it fail to prove rollback.
vi.mock("../progress/badge-awarding", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../progress/badge-awarding")>();
  return {
    ...actual,
    awardActivityBadgesInTx: vi.fn(actual.awardActivityBadgesInTx),
  };
});

import { awardActivityBadgesInTx } from "../progress/badge-awarding";
import { completeRoomIfDone } from "./room-completion";

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
  "completeRoomIfDone (PostgreSQL integration)",
  () => {
    const userIds: string[] = [];
    const pathIds: string[] = [];
    const contestIds: string[] = [];

    afterEach(async () => {
      vi.mocked(awardActivityBadgesInTx).mockClear();
      await db.xpEvent.deleteMany({ where: { userId: { in: userIds } } });
      await db.submission.deleteMany({ where: { userId: { in: userIds } } });
      await db.userBadge.deleteMany({ where: { userId: { in: userIds } } });
      await db.roomProgress.deleteMany({ where: { userId: { in: userIds } } });
      await db.enrollment.deleteMany({ where: { userId: { in: userIds } } });
      await db.exercise.deleteMany({
        where: { room: { pathId: { in: pathIds } } },
      });
      await db.contest.deleteMany({ where: { id: { in: contestIds } } });
      await db.path.deleteMany({ where: { id: { in: pathIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
      userIds.length = 0;
      pathIds.length = 0;
      contestIds.length = 0;
    });

    afterAll(async () => {
      await db.$disconnect();
    });

    const unique = () =>
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    /** A learner enrolled in a published path of two rooms with two exercises each. */
    async function setup(options: { xp?: number; xpReward?: number } = {}) {
      const role = await db.role.upsert({
        where: { name: RoleName.STUDENT },
        update: {},
        create: { name: RoleName.STUDENT },
      });
      const user = await db.user.create({
        data: {
          email: `room-done-${unique()}@local.test`,
          name: "Room Done Learner",
          passwordHash: "not-used-in-test",
          roleId: role.id,
          xp: options.xp ?? 0,
        },
      });
      userIds.push(user.id);
      const path = await db.path.create({
        data: {
          slug: `room-done-${unique()}`,
          title: "Room completion path",
          published: true,
          creatorId: user.id,
          rooms: {
            create: [
              {
                title: "Room 1",
                position: 1,
                xpReward: options.xpReward ?? 50,
              },
              { title: "Room 2", position: 2 },
            ],
          },
        },
        include: { rooms: { orderBy: { position: "asc" } } },
      });
      pathIds.push(path.id);
      await db.enrollment.create({
        data: { userId: user.id, pathId: path.id },
      });
      const [first, second] = path.rooms;
      const exercises = await Promise.all(
        [1, 2].map((n) =>
          db.exercise.create({
            data: {
              roomId: first.id,
              title: `Exercise ${n}`,
              prompt: "Solve it",
              kind: ExerciseKind.CODE,
            },
          }),
        ),
      );
      return { user, path, first, second, exercises };
    }

    const submit = (
      userId: string,
      exerciseId: string,
      status: SubmissionStatus = SubmissionStatus.ACCEPTED,
      contestId: string | null = null,
    ) =>
      db.submission.create({
        data: { userId, exerciseId, status, score: 100, contestId },
      });

    const xpEvents = (userId: string) =>
      db.xpEvent.findMany({ where: { userId } });
    const userXp = async (userId: string) =>
      (await db.user.findUniqueOrThrow({ where: { id: userId } })).xp;

    it("does nothing until every exercise of the room is accepted", async () => {
      const { user, first, exercises } = await setup();
      await submit(user.id, exercises[0].id);

      expect(await completeRoomIfDone(user.id, first.id)).toBeNull();
      expect(await db.roomProgress.count({ where: { userId: user.id } })).toBe(
        0,
      );
      expect(await xpEvents(user.id)).toHaveLength(0);
      expect(await userXp(user.id)).toBe(0);
    });

    it("ignores rejected submissions", async () => {
      const { user, first, exercises } = await setup();
      await submit(user.id, exercises[0].id);
      await submit(user.id, exercises[1].id, SubmissionStatus.REJECTED);

      expect(await completeRoomIfDone(user.id, first.id)).toBeNull();
    });

    it("ignores accepted contest submissions", async () => {
      const { user, first, exercises } = await setup();
      const contest = await db.contest.create({
        data: { slug: `room-done-contest-${unique()}`, title: "Contest" },
      });
      contestIds.push(contest.id);
      await submit(user.id, exercises[0].id);
      await submit(
        user.id,
        exercises[1].id,
        SubmissionStatus.ACCEPTED,
        contest.id,
      );

      expect(await completeRoomIfDone(user.id, first.id)).toBeNull();
    });

    it("completes the room, awards XP once and opens the next room", async () => {
      const { user, first, second, exercises } = await setup({ xpReward: 60 });
      await submit(user.id, exercises[0].id);
      await submit(user.id, exercises[1].id);
      expect(await canAccessRoom(user.id, second.id)).toBe(false);

      const result = await completeRoomIfDone(user.id, first.id);

      expect(result).toMatchObject({
        roomId: first.id,
        xpAwarded: 60,
        totalXp: 60,
        level: 1,
        leveledUp: false,
        nextRoom: { id: second.id, title: "Room 2" },
      });
      expect(
        await db.roomProgress.count({
          where: { userId: user.id, roomId: first.id },
        }),
      ).toBe(1);
      const events = await xpEvents(user.id);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        amount: 60,
        source: XpSource.ROOM_COMPLETED,
        roomId: first.id,
        pathId: first.pathId,
      });
      expect(await userXp(user.id)).toBe(60);
      expect(await canAccessRoom(user.id, second.id)).toBe(true);
    });

    it("does not award XP again when the room is completed a second time", async () => {
      const { user, first, exercises } = await setup();
      await submit(user.id, exercises[0].id);
      await submit(user.id, exercises[1].id);

      expect(await completeRoomIfDone(user.id, first.id)).not.toBeNull();
      // learner resubmits an accepted solution and completion runs again
      await submit(user.id, exercises[0].id);
      expect(await completeRoomIfDone(user.id, first.id)).toBeNull();

      expect(await xpEvents(user.id)).toHaveLength(1);
      expect(await userXp(user.id)).toBe(50);
      expect(await db.roomProgress.count({ where: { userId: user.id } })).toBe(
        1,
      );
    });

    it("awards XP exactly once when completions race", async () => {
      const { user, first, exercises } = await setup();
      await submit(user.id, exercises[0].id);
      await submit(user.id, exercises[1].id);

      const results = await Promise.all(
        Array.from({ length: 5 }, () => completeRoomIfDone(user.id, first.id)),
      );

      expect(results.filter(Boolean)).toHaveLength(1);
      expect(await xpEvents(user.id)).toHaveLength(1);
      expect(await userXp(user.id)).toBe(50);
    });

    it("reports a level up when the XP crosses a level boundary", async () => {
      const { user, first, exercises } = await setup({ xp: 480 });
      await submit(user.id, exercises[0].id);
      await submit(user.id, exercises[1].id);

      const result = await completeRoomIfDone(user.id, first.id);

      expect(result).toMatchObject({
        totalXp: 530,
        previousLevel: 1,
        level: 2,
        leveledUp: true,
      });
      expect(await userXp(user.id)).toBe(530);
    });

    it("completes a room without XP when its reward is 0", async () => {
      const { user, first, second, exercises } = await setup({ xpReward: 0 });
      await submit(user.id, exercises[0].id);
      await submit(user.id, exercises[1].id);

      const result = await completeRoomIfDone(user.id, first.id);

      expect(result).toMatchObject({ xpAwarded: 0, totalXp: 0 });
      expect(await xpEvents(user.id)).toHaveLength(0);
      expect(await canAccessRoom(user.id, second.id)).toBe(true);
    });

    it("rolls back progress and XP together when a step fails mid-transaction", async () => {
      const { user, first, second, exercises } = await setup();
      await submit(user.id, exercises[0].id);
      await submit(user.id, exercises[1].id);
      // fails after RoomProgress, XpEvent and User.xp were already written
      vi.mocked(awardActivityBadgesInTx).mockRejectedValueOnce(
        new Error("badge step failed"),
      );

      await expect(completeRoomIfDone(user.id, first.id)).rejects.toThrow(
        "badge step failed",
      );

      expect(await db.roomProgress.count({ where: { userId: user.id } })).toBe(
        0,
      );
      expect(await xpEvents(user.id)).toHaveLength(0);
      expect(await userXp(user.id)).toBe(0);
      expect(await canAccessRoom(user.id, second.id)).toBe(false);

      // nothing was half-done, so the next attempt completes normally
      expect(await completeRoomIfDone(user.id, first.id)).toMatchObject({
        xpAwarded: 50,
      });
      expect(await userXp(user.id)).toBe(50);
    });

    it("returns null for a room that does not exist or has no exercises", async () => {
      const { user, second } = await setup();
      expect(await completeRoomIfDone(user.id, "no-such-room")).toBeNull();
      expect(await completeRoomIfDone(user.id, second.id)).toBeNull();
    });
  },
);
