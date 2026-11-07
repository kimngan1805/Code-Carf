import { RoleName } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockListTopUsers = vi.hoisted(() => vi.fn());
const mockListPublishedPathsForLeaderboard = vi.hoisted(() => vi.fn());
const mockFindPublishedPathForLeaderboard = vi.hoisted(() => vi.fn());
const mockAggregateStudentXp = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/service", () => ({
  requireRole: mockRequireRole,
}));

vi.mock("./repository", () => ({
  listTopUsers: mockListTopUsers,
  listPublishedPathsForLeaderboard: mockListPublishedPathsForLeaderboard,
  findPublishedPathForLeaderboard: mockFindPublishedPathForLeaderboard,
  aggregateStudentXp: mockAggregateStudentXp,
}));

import {
  DEFAULT_XP_LEADERBOARD_LIMIT,
  getLeaderboard,
  getXpLeaderboard,
} from "./service";

const STUDENT_USER = {
  id: "student-1",
  email: "student@local.test",
  name: "Minh Thư",
  role: RoleName.STUDENT,
};

const PUBLISHED_PATHS = [
  { id: "path-1", slug: "nhap-mon-lap-trinh", title: "Nhập môn lập trình" },
  { id: "path-2", slug: "ctdl-giai-thuat", title: "CTDL & Giải thuật" },
];

describe("leaderboard service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(STUDENT_USER);
    mockListPublishedPathsForLeaderboard.mockResolvedValue(PUBLISHED_PATHS);
    mockFindPublishedPathForLeaderboard.mockResolvedValue(PUBLISHED_PATHS[0]);
    mockAggregateStudentXp.mockResolvedValue([]);
    mockListTopUsers.mockResolvedValue([]);
  });

  describe("getLeaderboard (existing /api/leaderboard contract)", () => {
    it("allows all RoleName roles and delegates to listTopUsers", async () => {
      const sample = [{ id: "u-1", name: "Alice", xp: 500, currentStreak: 3 }];
      mockListTopUsers.mockResolvedValue(sample);

      const result = await getLeaderboard();

      expect(mockRequireRole).toHaveBeenCalledWith(Object.values(RoleName));
      expect(mockListTopUsers).toHaveBeenCalledTimes(1);
      expect(result).toEqual(sample);
    });
  });

  describe("getXpLeaderboard", () => {
    it("requires RoleName.STUDENT and propagates auth errors before querying repository", async () => {
      mockRequireRole.mockRejectedValue(
        new AppError(403, "FORBIDDEN", "Bạn không có quyền truy cập."),
      );

      await expect(getXpLeaderboard()).rejects.toMatchObject({
        status: 403,
        code: "FORBIDDEN",
      });
      expect(mockRequireRole).toHaveBeenCalledWith([RoleName.STUDENT]);
      expect(mockAggregateStudentXp).not.toHaveBeenCalled();
      expect(mockListPublishedPathsForLeaderboard).not.toHaveBeenCalled();
    });

    it("throws 400 INVALID_LEADERBOARD_FILTER for invalid period or limit", async () => {
      await expect(getXpLeaderboard({ period: "month" })).rejects.toMatchObject(
        {
          status: 400,
          code: "INVALID_LEADERBOARD_FILTER",
        },
      );

      await expect(getXpLeaderboard({ limit: 0 })).rejects.toMatchObject({
        status: 400,
        code: "INVALID_LEADERBOARD_FILTER",
      });

      expect(mockAggregateStudentXp).not.toHaveBeenCalled();
    });

    it("throws 404 PATH_NOT_FOUND when pathSlug does not match a published path", async () => {
      mockFindPublishedPathForLeaderboard.mockResolvedValue(null);

      await expect(
        getXpLeaderboard({ pathSlug: "unpublished-or-missing" }),
      ).rejects.toMatchObject({
        status: 404,
        code: "PATH_NOT_FOUND",
      });
      expect(mockFindPublishedPathForLeaderboard).toHaveBeenCalledWith(
        "unpublished-or-missing",
      );
      expect(mockAggregateStudentXp).not.toHaveBeenCalled();
    });

    it("omits date window when period defaults to 'all' and exposes only public fields", async () => {
      mockAggregateStudentXp.mockResolvedValue([
        { userId: "u-2", name: "Trần Minh Anh", xp: 2100 },
        { userId: "student-1", name: "Minh Thư", xp: 1250 },
        { userId: "u-3", name: "Lê Quốc Bảo", xp: 1250 },
      ]);

      const view = await getXpLeaderboard();

      expect(mockAggregateStudentXp).toHaveBeenCalledWith({ pathId: null });
      expect(view.period).toBe("all");
      expect(view.selectedPath).toBeNull();
      expect(view.weekRange).toBeNull();
      expect(view.paths).toEqual(PUBLISHED_PATHS);
      expect(view.totalRankedLearners).toBe(3);
      expect(view.entries).toEqual([
        {
          rank: 1,
          userId: "u-2",
          name: "Trần Minh Anh",
          xp: 2100,
          isCurrentUser: false,
        },
        {
          rank: 2,
          userId: "student-1",
          name: "Minh Thư",
          xp: 1250,
          isCurrentUser: true,
        },
        {
          rank: 2,
          userId: "u-3",
          name: "Lê Quốc Bảo",
          xp: 1250,
          isCurrentUser: false,
        },
      ]);
      expect(view.myStanding).toEqual({
        userId: "student-1",
        name: "Minh Thư",
        xp: 1250,
        rank: 2,
        inTop: true,
      });

      for (const entry of view.entries) {
        expect(Object.keys(entry).sort()).toEqual([
          "isCurrentUser",
          "name",
          "rank",
          "userId",
          "xp",
        ]);
      }
      expect(Object.keys(view.myStanding).sort()).toEqual([
        "inTop",
        "name",
        "rank",
        "userId",
        "xp",
      ]);
    });

    it("passes VN week range and pathId to aggregateStudentXp when period='week' and pathSlug is given", async () => {
      const now = new Date("2026-04-08T10:00:00+07:00");
      mockAggregateStudentXp.mockResolvedValue([
        { userId: "u-2", name: "Trần Minh Anh", xp: 70 },
        { userId: "u-3", name: "Lê Quốc Bảo", xp: 50 },
      ]);

      const view = await getXpLeaderboard({
        period: "week",
        pathSlug: "  nhap-mon-lap-trinh  ",
        now,
      });

      expect(mockFindPublishedPathForLeaderboard).toHaveBeenCalledWith(
        "nhap-mon-lap-trinh",
      );
      expect(mockAggregateStudentXp).toHaveBeenCalledWith({
        pathId: "path-1",
        startsAt: new Date("2026-04-06T00:00:00+07:00"),
        endsAt: new Date("2026-04-13T00:00:00+07:00"),
      });
      expect(view.period).toBe("week");
      expect(view.selectedPath).toEqual(PUBLISHED_PATHS[0]);
      expect(view.weekRange).toEqual({
        startsAt: new Date("2026-04-06T00:00:00+07:00"),
        endsAt: new Date("2026-04-13T00:00:00+07:00"),
      });
      expect(view.myStanding).toEqual({
        userId: "student-1",
        name: "Minh Thư",
        xp: 0,
        rank: null,
        inTop: false,
      });
      expect(DEFAULT_XP_LEADERBOARD_LIMIT).toBe(50);
    });
  });
});
