import { RoleName } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requireRoleMock, getDashboardRecordsMock } = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  getDashboardRecordsMock: vi.fn(),
}));

vi.mock("@/features/auth/service", () => ({
  requireRole: requireRoleMock,
}));

vi.mock("./repository", () => ({
  getDashboardRecords: getDashboardRecordsMock,
}));

import { getDashboard } from "./service";

function setupDashboardRecords() {
  getDashboardRecordsMock.mockResolvedValue({
    enrollments: [],
    completedRoomIds: new Set<string>(),
    badges: [],
    activity: [],
    suggestedPaths: [],
    contests: [],
    rank: 1,
    lockedBadges: [],
    topLearners: [],
    recommendedPath: null,
  });
}

describe("getDashboard streak freshness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setupDashboardRecords();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows active currentStreak when lastActiveOn is yesterday in Asia/Ho_Chi_Minh", async () => {
    vi.setSystemTime(new Date("2026-11-15T23:30:00+07:00"));
    requireRoleMock.mockResolvedValue({
      id: "student-1",
      name: "Minh Thư",
      xp: 1250,
      currentStreak: 7,
      longestStreak: 12,
      lastActiveOn: new Date("2026-11-14T00:00:00.000Z"),
      role: { name: RoleName.STUDENT },
    });

    const dashboard = await getDashboard();

    expect(dashboard.streak.current).toBe(7);
    expect(dashboard.streak.longest).toBe(12);
  });

  it("shows currentStreak = 0 when a full day was missed while keeping longestStreak", async () => {
    // 00:00:00+07:00 on Nov 16 means Nov 15 was missed completely if lastActiveOn was Nov 14
    vi.setSystemTime(new Date("2026-11-16T00:00:00+07:00"));
    requireRoleMock.mockResolvedValue({
      id: "student-1",
      name: "Minh Thư",
      xp: 1250,
      currentStreak: 7,
      longestStreak: 12,
      lastActiveOn: new Date("2026-11-14T00:00:00.000Z"),
      role: { name: RoleName.STUDENT },
    });

    const dashboard = await getDashboard();

    expect(dashboard.streak.current).toBe(0);
    expect(dashboard.streak.longest).toBe(12);
  });
});
