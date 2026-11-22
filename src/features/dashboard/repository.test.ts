import { LearningGoal, SkillLevel } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enrollmentFindMany: vi.fn(),
  roomProgressFindMany: vi.fn(),
  userBadgeFindMany: vi.fn(),
  xpEventFindMany: vi.fn(),
  pathFindMany: vi.fn(),
  pathFindFirst: vi.fn(),
  contestFindMany: vi.fn(),
  userCount: vi.fn(),
  userFindMany: vi.fn(),
  badgeFindMany: vi.fn(),
  learnerProfileFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    enrollment: { findMany: mocks.enrollmentFindMany },
    roomProgress: { findMany: mocks.roomProgressFindMany },
    userBadge: { findMany: mocks.userBadgeFindMany },
    xpEvent: { findMany: mocks.xpEventFindMany },
    path: { findMany: mocks.pathFindMany, findFirst: mocks.pathFindFirst },
    contest: { findMany: mocks.contestFindMany },
    user: { count: mocks.userCount, findMany: mocks.userFindMany },
    badge: { findMany: mocks.badgeFindMany },
    learnerProfile: { findUnique: mocks.learnerProfileFindUnique },
  },
}));

import { getDashboardRecords } from "./repository";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.enrollmentFindMany.mockResolvedValue([]);
  mocks.roomProgressFindMany.mockResolvedValue([]);
  mocks.userBadgeFindMany.mockResolvedValue([]);
  mocks.xpEventFindMany.mockResolvedValue([]);
  mocks.pathFindMany.mockResolvedValue([]);
  mocks.pathFindFirst.mockResolvedValue(null);
  mocks.contestFindMany.mockResolvedValue([]);
  mocks.userCount.mockResolvedValue(0);
  mocks.userFindMany.mockResolvedValue([]);
  mocks.badgeFindMany.mockResolvedValue([]);
  mocks.learnerProfileFindUnique.mockResolvedValue({
    level: SkillLevel.BEGINNER,
    goal: LearningGoal.FUNDAMENTALS,
  });
});

describe("getDashboardRecords soft-delete filtering", () => {
  it("excludes soft-deleted paths from enrollments, suggested paths, and recommended path while preserving historical progress, badges, and activity", async () => {
    const since = new Date("2026-11-15T00:00:00.000Z");

    await getDashboardRecords("student-1", 350, since);

    expect(mocks.enrollmentFindMany.mock.calls[0][0].where).toEqual({
      userId: "student-1",
      path: { published: true, deletedAt: null },
    });
    expect(mocks.pathFindMany.mock.calls[0][0].where).toEqual({
      published: true,
      deletedAt: null,
      enrollments: { none: { userId: "student-1" } },
    });
    expect(mocks.pathFindFirst.mock.calls[0][0].where).toMatchObject({
      published: true,
      deletedAt: null,
      enrollments: { none: { userId: "student-1" } },
    });

    // Historical learner progress, earned badges, XP activity, and rank remain unfiltered by path.deletedAt.
    expect(mocks.roomProgressFindMany).toHaveBeenCalledWith({
      where: { userId: "student-1" },
      select: { roomId: true },
    });
    expect(mocks.userBadgeFindMany.mock.calls[0][0].where).toEqual({
      userId: "student-1",
    });
    expect(mocks.xpEventFindMany.mock.calls[0][0].where).toEqual({
      userId: "student-1",
      createdAt: { gte: since },
    });
    expect(mocks.userCount).toHaveBeenCalledWith({
      where: { xp: { gt: 350 } },
    });
  });
});
