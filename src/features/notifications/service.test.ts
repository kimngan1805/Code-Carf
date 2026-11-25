import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createMany: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  updateMany: vi.fn(),
  findFirst: vi.fn(),
  enrollmentFindMany: vi.fn(),
  contestFindUnique: vi.fn(),
  exerciseFindUnique: vi.fn(),
  contestFindMany: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/features/auth/service", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: mocks.loggerError,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    notification: {
      createMany: mocks.createMany,
      findMany: mocks.findMany,
      count: mocks.count,
      updateMany: mocks.updateMany,
      findFirst: mocks.findFirst,
    },
    enrollment: {
      findMany: mocks.enrollmentFindMany,
    },
    contest: {
      findUnique: mocks.contestFindUnique,
      findMany: mocks.contestFindMany,
    },
    exercise: {
      findUnique: mocks.exerciseFindUnique,
    },
  },
}));

import { createNotifications } from "./repository";
import {
  getMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
  notifyContestSubmissionResult,
  notifyNewLessonPublished,
  sendUpcomingContestReminders,
} from "./service";

describe("notifications service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      role: { name: "STUDENT" },
    });
    mocks.createMany.mockResolvedValue({ count: 1 });
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findFirst.mockResolvedValue(null);
    mocks.enrollmentFindMany.mockResolvedValue([]);
    mocks.contestFindUnique.mockResolvedValue({
      id: "contest-1",
      slug: "spring-cup",
      title: "Spring Cup",
    });
    mocks.exerciseFindUnique.mockResolvedValue({
      id: "ex-1",
      title: "Two Sum",
    });
    mocks.contestFindMany.mockResolvedValue([]);
  });

  it("deduplicates notifications in batch and uses skipDuplicates", async () => {
    mocks.createMany.mockResolvedValue({ count: 2 });

    const created = await createNotifications([
      {
        userId: "student-1",
        type: "NEW_LESSON",
        title: "Bài mới",
        body: "Nội dung",
        href: "/hv/rooms/r1",
        dedupeKey: "new-lesson:r1",
      },
      {
        userId: "student-1",
        type: "NEW_LESSON",
        title: "Bài mới (trùng)",
        body: "Nội dung",
        href: "/hv/rooms/r1",
        dedupeKey: "new-lesson:r1",
      },
      {
        userId: "student-2",
        type: "NEW_LESSON",
        title: "Bài mới",
        body: "Nội dung",
        href: "/hv/rooms/r1",
        dedupeKey: "new-lesson:r1",
      },
    ]);

    expect(created).toBe(2);
    expect(mocks.createMany).toHaveBeenCalledTimes(1);
    expect(mocks.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "student-1",
          dedupeKey: "new-lesson:r1",
        }),
        expect.objectContaining({
          userId: "student-2",
          dedupeKey: "new-lesson:r1",
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("lists only the signed-in user's notifications and unreadCount", async () => {
    const now = new Date("2026-11-16T08:00:00.000Z");
    mocks.findMany.mockResolvedValue([
      {
        id: "n-1",
        type: "NEW_LESSON",
        title: "Bài học mới",
        body: "Vừa thêm bài mới",
        href: "/hv/rooms/r-1",
        readAt: null,
        createdAt: now,
      },
      {
        id: "n-2",
        type: "REPORT_RESOLVED",
        title: "Báo lỗi đã xử lý: Two Sum",
        body: "Đã cập nhật bộ test.",
        href: "/hv/reports?report=rep-1#rep-1",
        readAt: null,
        createdAt: now,
      },
    ]);
    mocks.count.mockResolvedValue(3);

    const result = await getMyNotifications("10");

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 10,
      }),
    );
    expect(mocks.count).toHaveBeenCalledWith({
      where: { userId: "user-1", readAt: null },
    });
    expect(result).toEqual({
      notifications: [
        {
          id: "n-1",
          type: "NEW_LESSON",
          title: "Bài học mới",
          body: "Vừa thêm bài mới",
          href: "/hv/rooms/r-1",
          readAt: null,
          createdAt: now.toISOString(),
        },
        {
          id: "n-2",
          type: "REPORT_RESOLVED",
          title: "Báo lỗi đã xử lý: Two Sum",
          body: "Đã cập nhật bộ test.",
          href: "/hv/reports?report=rep-1#rep-1",
          readAt: null,
          createdAt: now.toISOString(),
        },
      ],
      unreadCount: 3,
    });
  });

  it("prevents reading or marking another user's notification as read", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.findFirst.mockResolvedValue(null);

    await expect(markMyNotificationRead("foreign-notif-id")).rejects.toEqual(
      expect.objectContaining<Partial<AppError>>({
        status: 404,
        code: "NOTIFICATION_NOT_FOUND",
      }),
    );

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "foreign-notif-id", userId: "user-1", readAt: null },
      }),
    );
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "foreign-notif-id", userId: "user-1" },
      }),
    );
  });

  it("marks one notification and all notifications read only for the current user", async () => {
    const one = await markMyNotificationRead("n-1");
    expect(one.id).toBe("n-1");
    expect(typeof one.readAt).toBe("string");
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "n-1", userId: "user-1", readAt: null },
      }),
    );

    mocks.updateMany.mockResolvedValueOnce({ count: 4 });
    const all = await markAllMyNotificationsRead();
    expect(all).toEqual({ updatedCount: 4 });
    expect(mocks.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", readAt: null },
      }),
    );
  });

  it("targets only enrolled learners (excluding actor) on new lesson and isolates DB errors", async () => {
    mocks.enrollmentFindMany.mockResolvedValue([
      { userId: "student-1" },
      { userId: "student-2" },
    ]);
    mocks.createMany.mockResolvedValue({ count: 2 });

    const count = await notifyNewLessonPublished({
      pathId: "path-1",
      pathTitle: "TS Basics",
      roomId: "room-9",
      roomTitle: "Generics",
      actorUserId: "teacher-1",
    });

    expect(count).toBe(2);
    expect(mocks.enrollmentFindMany).toHaveBeenCalledWith({
      where: { pathId: "path-1", userId: { not: "teacher-1" } },
      select: { userId: true },
    });
    expect(mocks.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "student-1",
          type: "NEW_LESSON",
          href: "/hv/rooms/room-9",
          dedupeKey: "new-lesson:room-9",
        }),
        expect.objectContaining({
          userId: "student-2",
          type: "NEW_LESSON",
          href: "/hv/rooms/room-9",
          dedupeKey: "new-lesson:room-9",
        }),
      ],
      skipDuplicates: true,
    });

    // Failures must be logged and swallowed so lesson authoring never fails.
    mocks.createMany.mockRejectedValueOnce(new Error("DB error"));
    await expect(
      notifyNewLessonPublished({
        pathId: "path-1",
        pathTitle: "TS Basics",
        roomId: "room-10",
        roomTitle: "Modules",
        actorUserId: "teacher-1",
      }),
    ).resolves.toBe(0);
    expect(mocks.loggerError).toHaveBeenCalledTimes(1);
  });

  it("notifies submission owner for final contest results and ignores practice or pending states", async () => {
    // Practice submission ignored
    await expect(
      notifyContestSubmissionResult({
        userId: "student-1",
        submissionId: "sub-practice",
        contestId: null,
        exerciseId: "ex-1",
        status: "ACCEPTED",
        score: 100,
        maxScore: 100,
      }),
    ).resolves.toBe(0);

    // Non-final status ignored
    await expect(
      notifyContestSubmissionResult({
        userId: "student-1",
        submissionId: "sub-pending",
        contestId: "contest-1",
        exerciseId: "ex-1",
        status: "NEEDS_REVIEW",
        score: 0,
        maxScore: 100,
      }),
    ).resolves.toBe(0);
    expect(mocks.createMany).not.toHaveBeenCalled();

    // Final contest submission creates notification with dedupeKey
    mocks.createMany.mockResolvedValue({ count: 1 });
    await expect(
      notifyContestSubmissionResult({
        userId: "student-1",
        submissionId: "sub-contest-1",
        contestId: "contest-1",
        exerciseId: "ex-1",
        status: "ACCEPTED",
        score: 100,
        maxScore: 100,
      }),
    ).resolves.toBe(1);

    expect(mocks.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "student-1",
          type: "SUBMISSION_RESULT",
          href: "/contests/spring-cup?tab=leaderboard",
          dedupeKey: "submission-result:sub-contest-1",
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("sends 24h upcoming contest reminders only to registered participants within the reminder window", async () => {
    const now = new Date("2026-11-16T08:00:00.000Z");
    const inFiveHours = new Date("2026-11-16T13:00:00.000Z"); // Late cron still catches within 24h window
    const examEnds = new Date("2026-11-16T15:00:00.000Z");

    mocks.contestFindMany.mockResolvedValue([
      {
        id: "contest-valid",
        slug: "autumn-cup",
        title: "Autumn Cup",
        examStartsAt: inFiveHours,
        examEndsAt: examEnds,
        participants: [{ userId: "student-1" }, { userId: "student-2" }],
      },
      {
        // Invalid schedule (ends before starts) should be skipped
        id: "contest-broken",
        slug: "broken",
        title: "Broken",
        examStartsAt: inFiveHours,
        examEndsAt: new Date("2026-11-16T12:00:00.000Z"),
        participants: [{ userId: "student-3" }],
      },
    ]);
    mocks.createMany.mockResolvedValue({ count: 2 });

    const result = await sendUpcomingContestReminders(now);

    expect(result).toEqual({ contestsScanned: 2, notificationsCreated: 2 });
    expect(mocks.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "student-1",
          type: "CONTEST_UPCOMING",
          href: "/contests/autumn-cup",
          dedupeKey: "contest-upcoming:contest-valid:24h",
        }),
        expect.objectContaining({
          userId: "student-2",
          type: "CONTEST_UPCOMING",
          href: "/contests/autumn-cup",
          dedupeKey: "contest-upcoming:contest-valid:24h",
        }),
      ],
      skipDuplicates: true,
    });
  });
});
