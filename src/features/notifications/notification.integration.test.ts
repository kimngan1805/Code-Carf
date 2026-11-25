import { randomUUID } from "node:crypto";
import { ContestStatus, RoleName } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { canConnectToDatabase } from "@/test-utils/database";
import {
  countUnreadNotifications,
  createNotifications,
  listUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./repository";
import {
  notifyNewLessonPublished,
  sendUpcomingContestReminders,
} from "./writer";

const hasDatabase = await canConnectToDatabase();
const prefix = `it-notif-${randomUUID()}`;

describe.skipIf(!hasDatabase)("notifications (PostgreSQL integration)", () => {
  const userIds: string[] = [];
  const pathIds: string[] = [];
  const contestIds: string[] = [];
  let teacherId = "";
  let studentAId = "";
  let studentBId = "";

  beforeAll(async () => {
    const [studentRole, teacherRole] = await Promise.all([
      db.role.upsert({
        where: { name: RoleName.STUDENT },
        update: {},
        create: { name: RoleName.STUDENT },
      }),
      db.role.upsert({
        where: { name: RoleName.TEACHER },
        update: {},
        create: { name: RoleName.TEACHER },
      }),
    ]);

    const [teacher, studentA, studentB] = await Promise.all([
      db.user.create({
        data: {
          email: `${prefix}-teacher@local.test`,
          name: "Teacher Notif",
          passwordHash: "unused",
          roleId: teacherRole.id,
        },
      }),
      db.user.create({
        data: {
          email: `${prefix}-student-a@local.test`,
          name: "Student A",
          passwordHash: "unused",
          roleId: studentRole.id,
        },
      }),
      db.user.create({
        data: {
          email: `${prefix}-student-b@local.test`,
          name: "Student B",
          passwordHash: "unused",
          roleId: studentRole.id,
        },
      }),
    ]);

    teacherId = teacher.id;
    studentAId = studentA.id;
    studentBId = studentB.id;
    userIds.push(teacherId, studentAId, studentBId);
  });

  afterAll(async () => {
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

  it("deduplicates by (userId, dedupeKey), isolates users, and marks notifications read", async () => {
    const dedupeKey = `${prefix}:dedupe-room-1`;
    const firstInsert = await createNotifications([
      {
        userId: studentAId,
        type: "NEW_LESSON",
        title: "Bài mới 1",
        body: "Nội dung 1",
        href: "/hv/rooms/r1",
        dedupeKey,
      },
    ]);
    const secondInsert = await createNotifications([
      {
        userId: studentAId,
        type: "NEW_LESSON",
        title: "Bài mới 1 (lần 2)",
        body: "Nội dung 1",
        href: "/hv/rooms/r1",
        dedupeKey,
      },
      {
        userId: studentAId,
        type: "SUBMISSION_RESULT",
        title: "Kết quả bài thi",
        body: "Đạt 100/100 điểm",
        href: "/contests/c1?tab=leaderboard",
        dedupeKey: `${prefix}:sub-1`,
      },
    ]);

    expect(firstInsert).toBe(1);
    expect(secondInsert).toBe(1);
    expect(await countUnreadNotifications(studentAId)).toBe(2);
    expect(await countUnreadNotifications(studentBId)).toBe(0);

    const listA = await listUserNotifications(studentAId, 20);
    expect(listA).toHaveLength(2);

    // Student B cannot mark Student A's notification as read
    await expect(
      markNotificationAsRead(studentBId, listA[0].id),
    ).rejects.toMatchObject({ status: 404, code: "NOTIFICATION_NOT_FOUND" });
    expect(await countUnreadNotifications(studentAId)).toBe(2);

    // Student A marks one notification as read
    await markNotificationAsRead(studentAId, listA[0].id);
    expect(await countUnreadNotifications(studentAId)).toBe(1);

    // Student A marks remaining notifications as read
    const markAllResult = await markAllNotificationsAsRead(studentAId);
    expect(markAllResult.updatedCount).toBe(1);
    expect(await countUnreadNotifications(studentAId)).toBe(0);
  });

  it("targets only enrolled learners for new lessons and registered participants for upcoming contests", async () => {
    const path = await db.path.create({
      data: {
        slug: `${prefix}-path`,
        title: "Path Notif Test",
        published: true,
        creatorId: teacherId,
        enrollments: {
          create: [{ userId: studentAId }, { userId: teacherId }],
        },
        rooms: {
          create: {
            id: `${prefix}-room`,
            title: "Room 1",
            position: 1,
            content: "Hello",
          },
        },
      },
      include: { rooms: true },
    });
    pathIds.push(path.id);

    const lessonCount = await notifyNewLessonPublished({
      pathId: path.id,
      pathTitle: path.title,
      roomId: path.rooms[0].id,
      roomTitle: path.rooms[0].title,
      actorUserId: teacherId,
    });
    // Only studentA (not teacher, not unenrolled studentB)
    expect(lessonCount).toBe(1);

    const now = new Date();
    const inSixHours = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const inEightHours = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    const contest = await db.contest.create({
      data: {
        slug: `${prefix}-contest`,
        title: "Contest Upcoming Test",
        status: ContestStatus.PUBLISHED,
        examStartsAt: inSixHours,
        examEndsAt: inEightHours,
        participants: {
          create: [{ userId: studentAId }],
        },
      },
    });
    contestIds.push(contest.id);

    const firstRun = await sendUpcomingContestReminders(now);
    expect(firstRun.notificationsCreated).toBeGreaterThanOrEqual(1);

    const secondRun = await sendUpcomingContestReminders(now);
    expect(secondRun.notificationsCreated).toBe(0);

    const studentANotifications = await listUserNotifications(studentAId, 20);
    expect(studentANotifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "CONTEST_UPCOMING",
          href: `/contests/${contest.slug}`,
        }),
      ]),
    );

    const studentBNotifications = await listUserNotifications(studentBId, 20);
    expect(studentBNotifications).toHaveLength(0);
  });
});
