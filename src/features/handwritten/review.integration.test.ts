import { ExerciseKind, RoleName, SubmissionStatus } from "@prisma/client";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const session = vi.hoisted(() => ({ user: null as unknown }));
vi.mock("@/features/auth/service", () => ({
  requireRole: vi.fn(async () => session.user),
}));

import {
  getHandwrittenReview,
  gradeHandwrittenSubmission,
  listHandwrittenReviews,
} from "./review";

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
  "teacher grading of handwritten answers (PostgreSQL integration)",
  () => {
    const userIds: string[] = [];
    const pathIds: string[] = [];
    const contestIds: string[] = [];

    afterEach(async () => {
      await db.notification.deleteMany({ where: { userId: { in: userIds } } });
      await db.submission.deleteMany({ where: { userId: { in: userIds } } });
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

    async function user(role: RoleName, name: string) {
      const roleRow = await db.role.upsert({
        where: { name: role },
        update: {},
        create: { name: role },
      });
      const created = await db.user.create({
        data: {
          email: `grading-${unique()}@local.test`,
          name,
          passwordHash: "not-used-in-test",
          roleId: roleRow.id,
        },
        include: { role: true },
      });
      userIds.push(created.id);
      return created;
    }

    /** A teacher's path with one essay and a learner who submitted an image. */
    async function setup() {
      const teacher = await user(RoleName.TEACHER, "Cô Lan");
      const learner = await user(RoleName.STUDENT, "Minh Thư");
      const path = await db.path.create({
        data: {
          slug: `grading-${unique()}`,
          title: "Lập trình C++",
          published: true,
          creatorId: teacher.id,
          rooms: {
            create: [{ title: "Con trỏ", position: 1, published: true }],
          },
        },
        include: { rooms: true },
      });
      pathIds.push(path.id);
      const exercise = await db.exercise.create({
        data: {
          roomId: path.rooms[0].id,
          title: "Tự luận: Con trỏ",
          prompt: "Giải thích con trỏ.",
          rubric: "Tổng 10 điểm.",
          kind: ExerciseKind.HANDWRITTEN,
        },
      });
      const submission = await db.submission.create({
        data: {
          userId: learner.id,
          exerciseId: exercise.id,
          imageUrl: `handwritten/${unique()}.png`,
          status: SubmissionStatus.PENDING,
        },
      });
      session.user = teacher;
      return { teacher, learner, path, exercise, submission };
    }

    const grade = (
      submission: { id: string; createdAt: Date },
      score: number,
      feedback = "",
    ) =>
      gradeHandwrittenSubmission({
        submissionId: submission.id,
        submittedAt: submission.createdAt.toISOString(),
        score,
        feedback,
      });

    it("lists the teacher's pending practice essays, oldest first", async () => {
      const { submission } = await setup();
      const list = await listHandwrittenReviews({});
      expect(list.filter).toBe("pending");
      expect(list.pendingCount).toBe(1);
      expect(list.items).toEqual([
        expect.objectContaining({
          id: submission.id,
          learner: "Minh Thư",
          exercise: "Tự luận: Con trỏ",
          lesson: "Con trỏ",
          path: "Lập trình C++",
        }),
      ]);
      const detail = await getHandwrittenReview(submission.id);
      expect(detail).toMatchObject({
        graded: false,
        exercise: { rubric: "Tổng 10 điểm." },
        nextId: null,
      });
    });

    it("saves the grade, marks it passed from 5/10 and notifies the learner once", async () => {
      const { teacher, learner, exercise, submission } = await setup();
      await grade(submission, 8.5, "Đúng ý chính.");

      const stored = await db.submission.findUniqueOrThrow({
        where: { id: submission.id },
      });
      expect(stored).toMatchObject({
        score: 85,
        feedback: "Đúng ý chính.",
        status: SubmissionStatus.ACCEPTED,
        reviewerId: teacher.id,
      });
      expect(stored.reviewedAt).toBeInstanceOf(Date);

      // Chấm lại cùng ảnh: cập nhật điểm, không gửi thông báo thứ hai.
      await grade(submission, 4.5);
      expect(
        await db.submission.findUniqueOrThrow({ where: { id: submission.id } }),
      ).toMatchObject({ score: 45, status: SubmissionStatus.REJECTED });
      const notifications = await db.notification.findMany({
        where: { userId: learner.id },
      });
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: "SUBMISSION_RESULT",
        href: `/hv/exercises/${exercise.id}`,
      });

      const graded = await listHandwrittenReviews({ filter: "graded" });
      expect(graded.items.map((item) => item.id)).toEqual([submission.id]);
      expect(graded.pendingCount).toBe(0);
    });

    it("refuses to save a grade for an image the learner has just replaced", async () => {
      const { submission } = await setup();
      const seenAt = submission.createdAt;
      await db.submission.update({
        where: { id: submission.id },
        data: { createdAt: new Date(seenAt.getTime() + 60_000) },
      });
      await expect(
        grade({ id: submission.id, createdAt: seenAt }, 9),
      ).rejects.toMatchObject({ status: 409, code: "SUBMISSION_REPLACED" });
      expect(
        await db.submission.findUniqueOrThrow({ where: { id: submission.id } }),
      ).toMatchObject({ score: null, status: SubmissionStatus.PENDING });
    });

    it("keeps other teachers and contest essays out of reach", async () => {
      const { teacher, submission, exercise, learner } = await setup();
      session.user = await user(RoleName.TEACHER, "Thầy khác");
      expect((await listHandwrittenReviews({})).items).toEqual([]);
      await expect(getHandwrittenReview(submission.id)).rejects.toMatchObject({
        status: 404,
      });
      await expect(grade(submission, 9)).rejects.toMatchObject({
        status: 404,
      });

      const contest = await db.contest.create({
        data: { slug: `grading-contest-${unique()}`, title: "Contest" },
      });
      contestIds.push(contest.id);
      const contestEssay = await db.submission.create({
        data: {
          userId: learner.id,
          exerciseId: exercise.id,
          contestId: contest.id,
          imageUrl: `handwritten/${unique()}.png`,
        },
      });
      session.user = teacher;
      const list = await listHandwrittenReviews({});
      expect(list.items.map((item) => item.id)).not.toContain(contestEssay.id);
    });

    it("rejects scores outside 0-10 or off the 0.5 step", async () => {
      const { submission } = await setup();
      for (const score of [-1, 10.5, 7.25])
        await expect(grade(submission, score)).rejects.toMatchObject({
          status: 400,
        });
    });
  },
);
