import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ContestStatus,
  ExerciseKind,
  RoleName,
  SubmissionStatus,
} from "@prisma/client";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { db } from "@/lib/db";
import { canConnectToDatabase } from "@/test-utils/database";

// The signed-in user is chosen per test; the database, storage and rules are real.
let currentUserId = "";
vi.mock("@/features/auth/service", () => ({
  requireRole: async () => ({ id: currentUserId, role: { name: "STUDENT" } }),
}));

import { saveHandwrittenImage } from "./repository";
import {
  getOwnHandwrittenUpload,
  readHandwrittenImage,
  uploadHandwrittenImage,
} from "./service";

const hasDatabase = await canConnectToDatabase();

const png = (marker: number) => {
  const bytes = new Uint8Array(128);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes[100] = marker;
  return { name: "bai-lam.png", bytes };
};

describe.skipIf(!hasDatabase)(
  "handwritten image upload (PostgreSQL integration)",
  () => {
    let storageDir = "";
    const previousEnv = {
      driver: process.env.STORAGE_DRIVER,
      dir: process.env.STORAGE_DIR,
    };
    const userIds: string[] = [];
    const pathIds: string[] = [];
    const contestIds: string[] = [];

    beforeAll(async () => {
      storageDir = await mkdtemp(join(tmpdir(), "handwritten-"));
      process.env.STORAGE_DRIVER = "local";
      process.env.STORAGE_DIR = storageDir;
    });

    afterEach(async () => {
      // Each test counts its own files, so start every test with empty storage.
      await rm(join(storageDir, "handwritten"), {
        recursive: true,
        force: true,
      });
      await db.submission.deleteMany({ where: { userId: { in: userIds } } });
      await db.contest.deleteMany({ where: { id: { in: contestIds } } });
      await db.exercise.deleteMany({
        where: { room: { pathId: { in: pathIds } } },
      });
      await db.path.deleteMany({ where: { id: { in: pathIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
      userIds.length = pathIds.length = contestIds.length = 0;
    });

    afterAll(async () => {
      await db.$disconnect();
      await rm(storageDir, { recursive: true, force: true });
      for (const [name, value] of [
        ["STORAGE_DRIVER", previousEnv.driver],
        ["STORAGE_DIR", previousEnv.dir],
      ] as const) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    });

    const unique = () =>
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const storedFiles = async () =>
      (await readdir(join(storageDir, "handwritten")).catch(() => [])).length;

    async function setup() {
      const role = await db.role.upsert({
        where: { name: RoleName.STUDENT },
        update: {},
        create: { name: RoleName.STUDENT },
      });
      const [alice, bob] = await Promise.all(
        ["alice", "bob"].map((label) =>
          db.user.create({
            data: {
              email: `hw-${label}-${unique()}@local.test`,
              name: `Handwritten ${label}`,
              passwordHash: "not-used-in-test",
              roleId: role.id,
            },
          }),
        ),
      );
      userIds.push(alice.id, bob.id);
      const path = await db.path.create({
        data: {
          slug: `hw-${unique()}`,
          title: "Handwritten path",
          published: true,
          creatorId: alice.id,
          rooms: {
            create: [{ title: "Room 1", position: 1, published: true }],
          },
          enrollments: { create: [{ userId: alice.id }, { userId: bob.id }] },
        },
        include: { rooms: true },
      });
      pathIds.push(path.id);
      const exercise = await db.exercise.create({
        data: {
          roomId: path.rooms[0].id,
          title: "Chứng minh",
          prompt: "Viết lời giải ra giấy",
          kind: ExerciseKind.HANDWRITTEN,
        },
      });
      return { alice, bob, exercise };
    }

    async function setupContest(
      exerciseId: string,
      userId: string,
      deadlineAt: Date,
    ) {
      const now = Date.now();
      const contest = await db.contest.create({
        data: {
          slug: `hw-contest-${unique()}`,
          title: "Handwritten contest",
          status: ContestStatus.PUBLISHED,
          startsAt: new Date(now - 3 * 3600_000),
          endsAt: new Date(now - 2 * 3600_000),
          examStartsAt: new Date(now - 3600_000),
          examEndsAt: new Date(now + 3600_000),
          exercises: { create: [{ exerciseId, position: 1 }] },
          participants: {
            create: [
              { userId, startedAt: new Date(now - 1800_000), deadlineAt },
            ],
          },
        },
      });
      contestIds.push(contest.id);
      return contest;
    }

    it("stores a private image and shows it only to its owner", async () => {
      const { alice, bob, exercise } = await setup();
      currentUserId = alice.id;
      const upload = await uploadHandwrittenImage({
        exerciseId: exercise.id,
        file: png(1),
      });

      const row = await db.submission.findUniqueOrThrow({
        where: { id: upload.id },
      });
      expect(row).toMatchObject({
        userId: alice.id,
        exerciseId: exercise.id,
        contestId: null,
        status: SubmissionStatus.PENDING,
      });
      expect(row.imageUrl).toMatch(/^handwritten\/[0-9a-f-]{36}\.png$/);

      const own = await readHandwrittenImage(upload.id);
      expect(own.mime).toBe("image/png");
      expect(own.bytes[100]).toBe(1);
      expect(
        await getOwnHandwrittenUpload(alice.id, exercise.id),
      ).toMatchObject({ id: upload.id, status: SubmissionStatus.PENDING });

      // Cross access: Bob cannot read Alice's image, and sees nothing as his own.
      currentUserId = bob.id;
      await expect(readHandwrittenImage(upload.id)).rejects.toMatchObject({
        status: 404,
      });
      expect(await getOwnHandwrittenUpload(bob.id, exercise.id)).toBeNull();
    });

    it("replaces the old image: same submission, old file deleted, grading reset", async () => {
      const { alice, exercise } = await setup();
      currentUserId = alice.id;
      const first = await uploadHandwrittenImage({
        exerciseId: exercise.id,
        file: png(1),
      });
      const before = await db.submission.findUniqueOrThrow({
        where: { id: first.id },
      });
      // The AI already looked at the first image.
      await db.submission.update({
        where: { id: first.id },
        data: {
          status: SubmissionStatus.NEEDS_REVIEW,
          aiScore: 80,
          aiFeedback: "ok",
        },
      });

      const second = await uploadHandwrittenImage({
        exerciseId: exercise.id,
        file: png(2),
      });

      expect(second).toMatchObject({ id: first.id, replaced: true });
      expect(
        await db.submission.count({
          where: { userId: alice.id, exerciseId: exercise.id },
        }),
      ).toBe(1);
      const after = await db.submission.findUniqueOrThrow({
        where: { id: first.id },
      });
      expect(after.imageUrl).not.toBe(before.imageUrl);
      expect(after).toMatchObject({
        status: SubmissionStatus.PENDING,
        aiScore: null,
        aiFeedback: null,
      });
      expect((await readHandwrittenImage(first.id)).bytes[100]).toBe(2);
      expect(await storedFiles()).toBe(1);
    });

    it("keeps one submission when two uploads arrive at the same time", async () => {
      const { alice, exercise } = await setup();
      currentUserId = alice.id;
      await Promise.all(
        [1, 2, 3].map((marker) =>
          uploadHandwrittenImage({
            exerciseId: exercise.id,
            file: png(marker),
          }),
        ),
      );
      expect(
        await db.submission.count({
          where: { userId: alice.id, exerciseId: exercise.id },
        }),
      ).toBe(1);
      expect(await storedFiles()).toBe(1);
    });

    it("refuses to replace an image that has already been graded", async () => {
      const { alice, exercise } = await setup();
      currentUserId = alice.id;
      const first = await uploadHandwrittenImage({
        exerciseId: exercise.id,
        file: png(1),
      });
      await db.submission.update({
        where: { id: first.id },
        data: { status: SubmissionStatus.ACCEPTED, score: 100 },
      });

      await expect(
        uploadHandwrittenImage({ exerciseId: exercise.id, file: png(2) }),
      ).rejects.toMatchObject({ status: 409, code: "SUBMISSION_FINALIZED" });

      expect((await readHandwrittenImage(first.id)).bytes[100]).toBe(1);
      expect(await storedFiles()).toBe(1);
    });

    it("replaces an image in a contest before the deadline", async () => {
      const { alice, exercise } = await setup();
      currentUserId = alice.id;
      const contest = await setupContest(
        exercise.id,
        alice.id,
        new Date(Date.now() + 1800_000),
      );
      const first = await uploadHandwrittenImage({
        exerciseId: exercise.id,
        contestSlug: contest.slug,
        file: png(1),
      });
      const second = await uploadHandwrittenImage({
        exerciseId: exercise.id,
        contestSlug: contest.slug,
        file: png(2),
      });
      expect(second).toMatchObject({ id: first.id, replaced: true });
      const row = await db.submission.findUniqueOrThrow({
        where: { id: first.id },
      });
      expect(row.contestId).toBe(contest.id);
      expect(await storedFiles()).toBe(1);
    });

    it("rejects a contest upload after the deadline and keeps the old image", async () => {
      const { alice, exercise } = await setup();
      currentUserId = alice.id;
      const deadlineAt = new Date(Date.now() + 1800_000);
      const contest = await setupContest(exercise.id, alice.id, deadlineAt);
      const first = await uploadHandwrittenImage({
        exerciseId: exercise.id,
        contestSlug: contest.slug,
        file: png(1),
      });

      await db.contestParticipant.update({
        where: {
          contestId_userId: { contestId: contest.id, userId: alice.id },
        },
        data: { deadlineAt: new Date(Date.now() - 1000) },
      });

      await expect(
        uploadHandwrittenImage({
          exerciseId: exercise.id,
          contestSlug: contest.slug,
          file: png(2),
        }),
      ).rejects.toMatchObject({ code: "CONTEST_NOT_OPEN" });
      // The check inside the transaction holds on its own, not only the one before it.
      await expect(
        saveHandwrittenImage({
          userId: alice.id,
          exerciseId: exercise.id,
          contestId: contest.id,
          storageKey: "handwritten/late.png",
        }),
      ).rejects.toMatchObject({ code: "CONTEST_NOT_OPEN" });

      const row = await db.submission.findUniqueOrThrow({
        where: { id: first.id },
      });
      expect(row.imageUrl).not.toBe("handwritten/late.png");
      expect((await readHandwrittenImage(first.id)).bytes[100]).toBe(1);
      expect(await storedFiles()).toBe(1);
    });
  },
);
