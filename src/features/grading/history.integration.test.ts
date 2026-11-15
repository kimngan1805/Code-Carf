import {
  ExerciseKind,
  RoleName,
  SubmissionStatus,
  type User,
} from "@prisma/client";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { canConnectToDatabase } from "@/test-utils/database";

// The signed-in user is chosen per test; everything else is the real code and database.
let currentUserId = "";
vi.mock("@/features/auth/service", () => ({
  requireRole: async () => ({ id: currentUserId }),
}));

import { getSubmissionDetail, getSubmissionHistory } from "./history";

const hasDatabase = await canConnectToDatabase();

describe.skipIf(!hasDatabase)(
  "submission history (PostgreSQL integration)",
  () => {
    const userIds: string[] = [];
    const pathIds: string[] = [];
    const contestIds: string[] = [];

    afterEach(async () => {
      await db.submission.deleteMany({ where: { userId: { in: userIds } } });
      await db.exercise.deleteMany({
        where: { room: { pathId: { in: pathIds } } },
      });
      await db.contest.deleteMany({ where: { id: { in: contestIds } } });
      await db.path.deleteMany({ where: { id: { in: pathIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
      userIds.length = pathIds.length = contestIds.length = 0;
    });

    afterAll(async () => {
      await db.$disconnect();
    });

    const unique = () =>
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    async function createStudent(label: string): Promise<User> {
      const role = await db.role.upsert({
        where: { name: RoleName.STUDENT },
        update: {},
        create: { name: RoleName.STUDENT },
      });
      const user = await db.user.create({
        data: {
          email: `history-${label}-${unique()}@local.test`,
          name: `History ${label}`,
          passwordHash: "not-used-in-test",
          roleId: role.id,
        },
      });
      userIds.push(user.id);
      return user;
    }

    async function setup() {
      const alice = await createStudent("alice");
      const bob = await createStudent("bob");
      const path = await db.path.create({
        data: {
          slug: `history-${unique()}`,
          title: "History path",
          published: true,
          creatorId: alice.id,
          rooms: { create: [{ title: "Room 1", position: 1 }] },
        },
        include: { rooms: true },
      });
      pathIds.push(path.id);
      const exercise = await db.exercise.create({
        data: {
          roomId: path.rooms[0].id,
          title: "Hello world",
          prompt: "Print it",
          kind: ExerciseKind.CODE,
          points: 100,
        },
      });
      return { alice, bob, exercise };
    }

    const submit = (
      userId: string,
      exerciseId: string,
      over: { source?: string; createdAt?: Date; contestId?: string } = {},
    ) =>
      db.submission.create({
        data: {
          userId,
          exerciseId,
          source: over.source ?? "print('hi')",
          language: "python",
          status: SubmissionStatus.ACCEPTED,
          score: 100,
          feedback: "Đạt 1/1 test case.",
          createdAt: over.createdAt,
          contestId: over.contestId,
        },
      });

    it("lets a learner open their own submission with the code they sent", async () => {
      const { alice, exercise } = await setup();
      const mine = await submit(alice.id, exercise.id, { source: "print(42)" });
      currentUserId = alice.id;

      const detail = await getSubmissionDetail(mine.id);

      expect(detail).toMatchObject({
        id: mine.id,
        source: "print(42)",
        status: "ACCEPTED",
        score: 100,
        maxScore: 100,
        exercise: { title: "Hello world" },
      });
    });

    it("answers 403 when one learner opens another learner's submission", async () => {
      const { alice, bob, exercise } = await setup();
      const secret = await submit(bob.id, exercise.id, {
        source: "print('bob only')",
      });
      currentUserId = alice.id;

      const attempt = getSubmissionDetail(secret.id);

      await expect(attempt).rejects.toMatchObject({
        status: 403,
        code: "SUBMISSION_FORBIDDEN",
      });
      await expect(attempt).rejects.not.toHaveProperty("source");
      // and the owner still can
      currentUserId = bob.id;
      expect(await getSubmissionDetail(secret.id)).toMatchObject({
        source: "print('bob only')",
      });
    });

    it("lists only the learner's own practice submissions, newest first", async () => {
      const { alice, bob, exercise } = await setup();
      const contest = await db.contest.create({
        data: { slug: `history-contest-${unique()}`, title: "Contest" },
      });
      contestIds.push(contest.id);
      const older = await submit(alice.id, exercise.id, {
        createdAt: new Date("2026-11-01T10:00:00Z"),
      });
      const newer = await submit(alice.id, exercise.id, {
        createdAt: new Date("2026-11-02T10:00:00Z"),
      });
      await submit(bob.id, exercise.id);
      await submit(alice.id, exercise.id, { contestId: contest.id });
      currentUserId = alice.id;

      const history = await getSubmissionHistory();

      expect(history.total).toBe(2);
      expect(history.items.map((item) => item.id)).toEqual([
        newer.id,
        older.id,
      ]);
    });

    it("answers 404 for the learner's own contest submission", async () => {
      const { alice, exercise } = await setup();
      const contest = await db.contest.create({
        data: { slug: `history-contest-${unique()}`, title: "Contest" },
      });
      contestIds.push(contest.id);
      const inContest = await submit(alice.id, exercise.id, {
        contestId: contest.id,
      });
      currentUserId = alice.id;

      await expect(getSubmissionDetail(inContest.id)).rejects.toMatchObject({
        status: 404,
      });
    });

    it("paginates without repeating or skipping rows", async () => {
      const { alice, exercise } = await setup();
      const base = new Date("2026-11-01T00:00:00Z").getTime();
      // 25 submissions, three of them sharing one timestamp to exercise the tie-break
      const created = [];
      for (let i = 0; i < 25; i++)
        created.push(
          await submit(alice.id, exercise.id, {
            createdAt: new Date(base + Math.min(i, 12) * 60_000),
          }),
        );
      currentUserId = alice.id;

      const pages = [
        await getSubmissionHistory("1"),
        await getSubmissionHistory("2"),
        await getSubmissionHistory("3"),
      ];

      expect(pages.map((p) => p.items.length)).toEqual([10, 10, 5]);
      expect(pages.every((p) => p.totalPages === 3 && p.total === 25)).toBe(
        true,
      );
      const ids = pages.flatMap((p) => p.items.map((item) => item.id));
      expect(new Set(ids).size).toBe(25);
      expect([...ids].sort()).toEqual(created.map((s) => s.id).sort());

      const beyond = await getSubmissionHistory("99");
      expect(beyond.page).toBe(3);
      expect(beyond.items).toHaveLength(5);
    });
  },
);
