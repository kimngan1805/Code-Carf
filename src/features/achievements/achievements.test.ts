import { RoleName, type Badge } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../lib/errors";

const { requireRoleMock, getAchievementRecordsMock } = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  getAchievementRecordsMock: vi.fn(),
}));

vi.mock("../auth/service", () => ({
  requireRole: requireRoleMock,
}));

vi.mock("./repository", () => ({
  getAchievementRecords: getAchievementRecordsMock,
}));

import {
  buildStudentAchievements,
  formatAwardedDate,
  getAchievements,
} from "./service";

const sampleBadges: Badge[] = [
  {
    id: "badge-fast-solver",
    slug: "fast-solver",
    name: "Giải nhanh",
    description: "Giải đúng một bài trong 10 phút đầu.",
  },
  {
    id: "badge-first-path-room",
    slug: "first-path-room",
    name: "Chinh phục phòng đầu",
    description: "Hoàn thành một phòng học hoàn chỉnh.",
  },
  {
    id: "badge-first-step",
    slug: "first-step",
    name: "Bước đầu tiên",
    description: "Hoàn thành bài tập đầu tiên.",
  },
  {
    id: "badge-night-owl",
    slug: "night-owl",
    name: "Cú đêm chăm chỉ",
    description: "Hoàn thành bài tập sau 22:00.",
  },
  {
    id: "badge-streak-7",
    slug: "streak-7",
    name: "Chuỗi 7 ngày",
    description: "Duy trì học tập 7 ngày liên tiếp.",
  },
];

describe("buildStudentAchievements", () => {
  it("groups earned and locked badges, picks next goal, and computes summary + level", () => {
    const firstStep = sampleBadges[2];
    const streak7 = sampleBadges[4];

    const result = buildStudentAchievements(
      {
        badges: sampleBadges,
        userBadges: [
          {
            badgeId: firstStep.id,
            awardedAt: new Date("2026-04-10T08:00:00.000Z"),
            badge: firstStep,
          },
          {
            badgeId: streak7.id,
            awardedAt: new Date("2026-04-12T09:30:00.000Z"),
            badge: streak7,
          },
        ],
      },
      1250,
    );

    expect(result.level).toEqual({
      level: 3,
      title: "Lập trình viên",
      xp: 1250,
      nextXp: 2000,
      progress: 0.25,
    });

    expect(result.summary).toEqual({
      earnedCount: 2,
      lockedCount: 3,
      totalCount: 5,
      completionPercent: 40,
      progress: 0.4,
    });

    expect(result.nextGoal).toEqual({
      id: "badge-fast-solver",
      slug: "fast-solver",
      name: "Giải nhanh",
      description: "Giải đúng một bài trong 10 phút đầu.",
    });

    expect(result.earnedBadges.map((badge) => badge.slug)).toEqual([
      "streak-7",
      "first-step",
    ]);
    expect(result.lockedBadges.map((badge) => badge.slug)).toEqual([
      "fast-solver",
      "first-path-room",
      "night-owl",
    ]);
    expect(result.lockedBadges[0]?.description).toBe(
      "Giải đúng một bài trong 10 phút đầu.",
    );
  });

  it("handles empty state for a learner with no earned badges (0/5) and highlights first locked goal", () => {
    const result = buildStudentAchievements(
      {
        badges: sampleBadges,
        userBadges: [],
      },
      0,
    );

    expect(result.level).toEqual({
      level: 1,
      title: "Người mới",
      xp: 0,
      nextXp: 500,
      progress: 0,
    });
    expect(result.summary).toEqual({
      earnedCount: 0,
      lockedCount: 5,
      totalCount: 5,
      completionPercent: 0,
      progress: 0,
    });
    expect(result.nextGoal?.slug).toBe("fast-solver");
    expect(result.earnedBadges).toEqual([]);
    expect(result.lockedBadges).toHaveLength(5);
  });

  it("handles full completion state when all badges are unlocked (5/5) and clears nextGoal", () => {
    const result = buildStudentAchievements(
      {
        badges: sampleBadges,
        userBadges: sampleBadges.map((badge, index) => ({
          badgeId: badge.id,
          awardedAt: new Date(Date.UTC(2026, 3, index + 1, 10, 0, 0)),
          badge,
        })),
      },
      2500,
    );

    expect(result.level).toMatchObject({
      level: 4,
      title: "Cao thủ",
      xp: 2500,
      nextXp: null,
      progress: 1,
    });
    expect(result.summary).toEqual({
      earnedCount: 5,
      lockedCount: 0,
      totalCount: 5,
      completionPercent: 100,
      progress: 1,
    });
    expect(result.nextGoal).toBeNull();
    expect(result.earnedBadges).toHaveLength(5);
    expect(result.lockedBadges).toEqual([]);
  });

  it("handles empty badge catalog safely without division by zero", () => {
    const result = buildStudentAchievements({
      badges: [],
      userBadges: [],
    });

    expect(result.summary).toEqual({
      earnedCount: 0,
      lockedCount: 0,
      totalCount: 0,
      completionPercent: 0,
      progress: 0,
    });
    expect(result.nextGoal).toBeNull();
    expect(result.earnedBadges).toEqual([]);
    expect(result.lockedBadges).toEqual([]);
  });
});

describe("formatAwardedDate", () => {
  it("formats awarded date in Asia/Ho_Chi_Minh timezone", () => {
    // 2026-04-10T18:30:00Z is 2026-04-11 01:30:00 in Asia/Ho_Chi_Minh (UTC+7)
    const instant = new Date("2026-04-10T18:30:00.000Z");
    expect(formatAwardedDate(instant)).toBe("11/04/2026");
  });
});

describe("getAchievements authorization and isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces STUDENT role, computes level from user XP, and queries only the signed-in user's own badges", async () => {
    requireRoleMock.mockResolvedValue({
      id: "student-own-id",
      email: "student@local.test",
      name: "Minh Thư",
      xp: 750,
      role: RoleName.STUDENT,
    });
    getAchievementRecordsMock.mockResolvedValue({
      badges: sampleBadges,
      userBadges: [
        {
          badgeId: sampleBadges[2].id,
          awardedAt: new Date("2026-04-11T03:00:00.000Z"),
          badge: sampleBadges[2],
        },
      ],
    });

    const achievements = await getAchievements();

    expect(requireRoleMock).toHaveBeenCalledTimes(1);
    expect(requireRoleMock).toHaveBeenCalledWith([RoleName.STUDENT]);
    expect(getAchievementRecordsMock).toHaveBeenCalledTimes(1);
    expect(getAchievementRecordsMock).toHaveBeenCalledWith("student-own-id");
    expect(achievements.level).toEqual({
      level: 2,
      title: "Người học việc",
      xp: 750,
      nextXp: 1000,
      progress: 0.5,
    });
    expect(achievements.summary.earnedCount).toBe(1);
    expect(achievements.summary.lockedCount).toBe(4);
    expect(achievements.nextGoal?.slug).toBe("fast-solver");
  });

  it("rejects non-student or unauthenticated callers before querying repository", async () => {
    requireRoleMock.mockRejectedValue(
      new AppError(403, "FORBIDDEN", "Bạn không có quyền truy cập."),
    );

    await expect(getAchievements()).rejects.toMatchObject({
      status: 403,
    });
    expect(getAchievementRecordsMock).not.toHaveBeenCalled();
  });
});
