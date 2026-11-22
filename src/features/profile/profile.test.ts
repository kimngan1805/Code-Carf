import { ExerciseKind, RoleName, SubmissionStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const {
  requireRoleMock,
  userFindFirstMock,
  userFindUniqueMock,
  enrollmentFindManyMock,
  roomProgressFindManyMock,
  userBadgeFindManyMock,
  submissionFindManyMock,
} = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  userFindFirstMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  enrollmentFindManyMock: vi.fn(),
  roomProgressFindManyMock: vi.fn(),
  userBadgeFindManyMock: vi.fn(),
  submissionFindManyMock: vi.fn(),
}));

vi.mock("@/features/auth/service", () => ({
  requireRole: requireRoleMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findFirst: userFindFirstMock,
      findUnique: userFindUniqueMock,
    },
    enrollment: {
      findMany: enrollmentFindManyMock,
    },
    roomProgress: {
      findMany: roomProgressFindManyMock,
    },
    userBadge: {
      findMany: userBadgeFindManyMock,
    },
    submission: {
      findMany: submissionFindManyMock,
    },
  },
}));

import {
  OWN_SUBMISSION_HISTORY_LIMIT,
  publicStudentSelect,
} from "./repository";
import {
  buildPublicStudentProfile,
  formatProfileDate,
  formatSubmissionDateTime,
  getOwnProfile,
  getPublicProfile,
} from "./service";

function mockPublicDbStudent(overrides?: {
  id?: string;
  name?: string;
  xp?: number;
  currentStreak?: number;
  longestStreak?: number;
  lastActiveOn?: Date | null;
}) {
  userFindFirstMock.mockResolvedValue({
    id: overrides?.id ?? "student-1",
    name: overrides?.name ?? "Minh Thư",
    xp: overrides?.xp ?? 1250,
    currentStreak: overrides?.currentStreak ?? 7,
    longestStreak: overrides?.longestStreak ?? 12,
    lastActiveOn:
      overrides?.lastActiveOn === undefined
        ? new Date()
        : overrides.lastActiveOn,
    createdAt: new Date("2026-01-15T18:00:00.000Z"),
  });

  enrollmentFindManyMock.mockResolvedValue([
    {
      path: {
        id: "path-1",
        slug: "nhap-mon-lap-trinh",
        title: "Nhập môn lập trình",
        rooms: [
          { id: "r1", title: "Bài 1" },
          { id: "r2", title: "Bài 2" },
          { id: "r3", title: "Bài 3" },
        ],
      },
    },
    {
      path: {
        id: "path-2",
        slug: "empty-path",
        title: "Lộ trình mới",
        rooms: [],
      },
    },
  ]);

  roomProgressFindManyMock.mockResolvedValue([
    { roomId: "r1" },
    { roomId: "r2" },
  ]);

  userBadgeFindManyMock.mockResolvedValue([
    {
      awardedAt: new Date("2026-04-10T18:30:00.000Z"),
      badge: {
        id: "b1",
        slug: "first-step",
        name: "Bước đầu tiên",
        description: "Hoàn thành bài tập đầu tiên",
      },
    },
    {
      awardedAt: new Date("2026-04-12T08:00:00.000Z"),
      badge: {
        id: "b2",
        slug: "streak-7",
        name: "Chuỗi 7 ngày",
        description: "Học 7 ngày liên tiếp",
      },
    },
  ]);
}

describe("publicStudentSelect whitelist", () => {
  it("excludes email, passwordHash, and private fields", () => {
    expect(publicStudentSelect).toEqual({
      id: true,
      name: true,
      xp: true,
      currentStreak: true,
      longestStreak: true,
      lastActiveOn: true,
      createdAt: true,
    });
    expect("email" in publicStudentSelect).toBe(false);
    expect("passwordHash" in publicStudentSelect).toBe(false);
    expect("submissions" in publicStudentSelect).toBe(false);
  });
});

describe("buildPublicStudentProfile", () => {
  it("computes level, path progress, badges and strips unexpected private fields at runtime", () => {
    const now = new Date("2026-04-12T10:00:00+07:00");
    const pollutedRecord = {
      user: {
        id: "student-1",
        name: "Minh Thư",
        xp: 1250,
        currentStreak: 7,
        longestStreak: 12,
        lastActiveOn: new Date("2026-04-11T00:00:00.000Z"),
        createdAt: new Date("2026-01-15T18:00:00.000Z"),
        email: "secret-leak@local.test",
        passwordHash: "$2b$12$secret",
        submissions: [{ id: "sub-secret" }],
      },
      enrollments: [
        {
          path: {
            id: "path-1",
            slug: "nhap-mon-lap-trinh",
            title: "Nhập môn lập trình",
            rooms: [
              { id: "r1", title: "Bài 1" },
              { id: "r2", title: "Bài 2" },
            ],
          },
        },
      ],
      completedRoomIds: ["r1", "r2"],
      userBadges: [
        {
          awardedAt: new Date("2026-04-10T18:30:00.000Z"),
          badge: {
            id: "b1",
            slug: "first-step",
            name: "Bước đầu tiên",
            description: "Hoàn thành bài tập đầu tiên",
          },
        },
      ],
    };

    const dto = buildPublicStudentProfile(
      pollutedRecord as unknown as Parameters<
        typeof buildPublicStudentProfile
      >[0],
      now,
    );

    expect(dto.streak).toEqual({ current: 7, longest: 12 });
    expect(dto.level).toEqual({
      level: 3,
      title: "Lập trình viên",
      xp: 1250,
      nextXp: 2000,
      progress: 0.25,
    });
    expect(dto.stats).toEqual({
      enrolledPaths: 1,
      completedPaths: 1,
      roomsDone: 2,
      badgesCount: 1,
    });
    expect(dto.paths[0]).toMatchObject({
      completed: 2,
      total: 2,
      percent: 100,
      nextRoom: null,
    });
    expect("email" in dto).toBe(false);
    expect("passwordHash" in dto).toBe(false);
    expect("lastActiveOn" in dto).toBe(false);
    expect("submissions" in dto).toBe(false);
    expect(JSON.stringify(dto)).not.toContain("secret-leak@local.test");
    expect(JSON.stringify(dto)).not.toContain("$2b$12$secret");
    expect(JSON.stringify(dto)).not.toContain("sub-secret");
  });

  it("displays current streak as 0 when a full Vietnam day was missed while preserving longestStreak", () => {
    const dto = buildPublicStudentProfile(
      {
        user: {
          id: "student-expired",
          name: "Học viên cũ",
          xp: 500,
          currentStreak: 9,
          longestStreak: 15,
          lastActiveOn: new Date("2026-04-10T00:00:00.000Z"),
          createdAt: new Date("2026-01-15T18:00:00.000Z"),
        },
        enrollments: [],
        completedRoomIds: [],
        userBadges: [],
      },
      new Date("2026-04-12T00:00:00+07:00"),
    );

    expect(dto.streak).toEqual({ current: 0, longest: 15 });
  });

  it("handles completely empty student progress safely", () => {
    const dto = buildPublicStudentProfile({
      user: {
        id: "student-new",
        name: "Học viên mới",
        xp: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveOn: null,
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
      },
      enrollments: [],
      completedRoomIds: [],
      userBadges: [],
    });

    expect(dto.streak).toEqual({ current: 0, longest: 0 });

    expect(dto.level).toEqual({
      level: 1,
      title: "Người mới",
      xp: 0,
      nextXp: 500,
      progress: 0,
    });
    expect(dto.stats).toEqual({
      enrolledPaths: 0,
      completedPaths: 0,
      roomsDone: 0,
      badgesCount: 0,
    });
    expect(dto.paths).toEqual([]);
    expect(dto.badges).toEqual([]);
  });
});

describe("date formatting", () => {
  it("formats profile and submission dates in Asia/Ho_Chi_Minh timezone", () => {
    const instant = new Date("2026-04-10T18:30:00.000Z");
    expect(formatProfileDate(instant)).toBe("11/04/2026");
    expect(formatSubmissionDateTime(instant)).toContain("11/04/2026");
    expect(formatSubmissionDateTime(instant)).toContain("01:30");
  });
});

describe("getOwnProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires STUDENT role, uses session user id, and includes email and submission history", async () => {
    requireRoleMock.mockResolvedValue({
      id: "student-1",
      role: { name: RoleName.STUDENT },
    });
    mockPublicDbStudent();
    userFindUniqueMock.mockResolvedValue({
      email: "student@local.test",
    });
    submissionFindManyMock.mockResolvedValue([
      {
        id: "sub-1",
        exerciseId: "ex-1",
        language: "python",
        status: SubmissionStatus.ACCEPTED,
        score: 100,
        runtimeMs: 42,
        memoryKb: 1024,
        createdAt: new Date("2026-05-10T10:15:00.000Z"),
        exercise: {
          title: "Sum two numbers",
          kind: ExerciseKind.CODE,
          points: 100,
          room: null,
        },
        contest: {
          slug: "sample-contest",
          title: "Sample Contest",
        },
      },
      {
        id: "sub-2",
        exerciseId: "ex-2",
        language: null,
        status: SubmissionStatus.NEEDS_REVIEW,
        score: null,
        runtimeMs: null,
        memoryKb: null,
        createdAt: new Date("2026-05-09T09:00:00.000Z"),
        exercise: {
          title: "Hello world",
          kind: ExerciseKind.HANDWRITTEN,
          points: 50,
          room: {
            title: "Bài 1",
            path: {
              slug: "nhap-mon-lap-trinh",
              title: "Nhập môn lập trình",
              published: true,
              deletedAt: null,
            },
          },
        },
        contest: null,
      },
    ]);

    const profile = await getOwnProfile();

    expect(requireRoleMock).toHaveBeenCalledWith([RoleName.STUDENT]);
    expect(userFindFirstMock).toHaveBeenCalledWith({
      where: { id: "student-1", role: { name: RoleName.STUDENT } },
      select: publicStudentSelect,
    });
    expect(submissionFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "student-1" },
        take: OWN_SUBMISSION_HISTORY_LIMIT,
      }),
    );

    expect(profile.email).toBe("student@local.test");
    expect(profile.paths).toHaveLength(2);
    expect(profile.paths[0]).toMatchObject({
      completed: 2,
      total: 3,
      percent: 67,
      nextRoom: "Bài 3",
    });
    expect(profile.paths[1]).toMatchObject({
      completed: 0,
      total: 0,
      percent: 0,
      nextRoom: null,
    });
    expect(profile.badges[0]?.slug).toBe("streak-7");
    expect(profile.submissions).toHaveLength(2);
    expect(profile.submissions[0]).toMatchObject({
      id: "sub-1",
      contextLabel: "Cuộc thi: Sample Contest",
      contextHref: "/contests/sample-contest",
      status: SubmissionStatus.ACCEPTED,
      score: 100,
    });
    expect(profile.submissions[1]).toMatchObject({
      id: "sub-2",
      contextLabel: "Nhập môn lập trình · Bài 1",
      contextHref: "/hv/paths/nhap-mon-lap-trinh",
      language: null,
      status: SubmissionStatus.NEEDS_REVIEW,
    });
  });

  it("preserves historical submissions and earned badges when their path was soft-deleted while clearing dead path links", async () => {
    requireRoleMock.mockResolvedValue({
      id: "student-1",
      role: { name: RoleName.STUDENT },
    });
    mockPublicDbStudent();
    enrollmentFindManyMock.mockResolvedValue([]);
    userFindUniqueMock.mockResolvedValue({ email: "student@local.test" });
    submissionFindManyMock.mockResolvedValue([
      {
        id: "sub-deleted-path",
        exerciseId: "ex-old",
        language: "python",
        status: SubmissionStatus.ACCEPTED,
        score: 100,
        runtimeMs: 25,
        memoryKb: 512,
        createdAt: new Date("2026-05-09T09:00:00.000Z"),
        exercise: {
          title: "Old Path Exercise",
          kind: ExerciseKind.CODE,
          points: 100,
          room: {
            title: "Bài cũ",
            path: {
              slug: "archived-path",
              title: "Lộ trình đã xóa",
              published: false,
              deletedAt: new Date("2026-05-10T00:00:00.000Z"),
            },
          },
        },
        contest: null,
      },
    ]);

    const profile = await getOwnProfile();

    expect(enrollmentFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "student-1",
          path: { published: true, deletedAt: null },
        },
      }),
    );
    expect(profile.paths).toEqual([]);
    expect(profile.badges).toHaveLength(2);
    expect(profile.stats.roomsDone).toBe(2);
    expect(profile.submissions).toHaveLength(1);
    expect(profile.submissions[0]).toMatchObject({
      id: "sub-deleted-path",
      exerciseTitle: "Old Path Exercise",
      contextLabel: "Lộ trình đã xóa · Bài cũ",
      contextHref: null,
      status: SubmissionStatus.ACCEPTED,
      score: 100,
    });
  });

  it("preserves stats.completedPaths for soft-deleted completed paths without double counting or exposing links", async () => {
    requireRoleMock.mockResolvedValue({
      id: "student-1",
      role: { name: RoleName.STUDENT },
    });
    mockPublicDbStudent();
    enrollmentFindManyMock.mockImplementation(async (args) => {
      if (args?.where?.path?.deletedAt === null) {
        return [
          {
            path: {
              id: "active-done",
              slug: "active-done",
              title: "Lộ trình đang mở (đã xong)",
              rooms: [{ id: "r1", title: "Bài 1" }],
            },
          },
          {
            path: {
              id: "active-in-progress",
              slug: "active-in-progress",
              title: "Lộ trình đang học",
              rooms: [
                { id: "r2", title: "Bài 2" },
                { id: "r3", title: "Bài 3" },
              ],
            },
          },
        ];
      }
      return [
        // Soft-deleted and completed -> MUST be preserved in stats.completedPaths.
        {
          path: {
            id: "deleted-done",
            rooms: [{ id: "r1" }, { id: "r2" }],
          },
        },
        // Duplicate active path id -> MUST NOT be double-counted.
        {
          path: {
            id: "active-done",
            rooms: [{ id: "r1" }],
          },
        },
        // Soft-deleted but incomplete -> MUST NOT be counted.
        {
          path: {
            id: "deleted-incomplete",
            rooms: [{ id: "r1" }, { id: "r-missing" }],
          },
        },
        // Soft-deleted empty path -> MUST NOT be counted.
        {
          path: {
            id: "deleted-empty",
            rooms: [],
          },
        },
      ];
    });
    roomProgressFindManyMock.mockResolvedValue([
      { roomId: "r1" },
      { roomId: "r2" },
    ]);
    userFindUniqueMock.mockResolvedValue({ email: "student@local.test" });
    submissionFindManyMock.mockResolvedValue([]);

    const profile = await getOwnProfile();

    expect(enrollmentFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "student-1",
          path: { published: true, deletedAt: null },
        },
      }),
    );
    expect(enrollmentFindManyMock).toHaveBeenCalledWith({
      where: {
        userId: "student-1",
        path: { deletedAt: { not: null } },
      },
      select: {
        path: {
          select: {
            id: true,
            rooms: { select: { id: true } },
          },
        },
      },
    });
    expect(profile.paths.map((p) => p.id)).toEqual([
      "active-done",
      "active-in-progress",
    ]);
    expect(profile.stats).toEqual({
      enrolledPaths: 2,
      completedPaths: 2,
      roomsDone: 2,
      badgesCount: 2,
    });
  });

  it("handles empty submission history cleanly", async () => {
    requireRoleMock.mockResolvedValue({
      id: "student-1",
      role: { name: RoleName.STUDENT },
    });
    mockPublicDbStudent({ xp: 0, currentStreak: 0, longestStreak: 0 });
    enrollmentFindManyMock.mockResolvedValue([]);
    roomProgressFindManyMock.mockResolvedValue([]);
    userBadgeFindManyMock.mockResolvedValue([]);
    userFindUniqueMock.mockResolvedValue({ email: "student@local.test" });
    submissionFindManyMock.mockResolvedValue([]);

    const profile = await getOwnProfile();
    expect(profile.submissions).toEqual([]);
    expect(profile.paths).toEqual([]);
    expect(profile.badges).toEqual([]);
  });

  it("rejects non-student callers with 403 before querying repository", async () => {
    requireRoleMock.mockRejectedValue(
      new AppError(403, "FORBIDDEN", "Insufficient permission"),
    );

    await expect(getOwnProfile()).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    expect(userFindFirstMock).not.toHaveBeenCalled();
    expect(submissionFindManyMock).not.toHaveBeenCalled();
  });
});

describe("getPublicProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows authenticated users of any role to view a student profile without querying or exposing email or submissions", async () => {
    requireRoleMock.mockResolvedValue({
      id: "teacher-1",
      role: { name: RoleName.TEACHER },
    });
    mockPublicDbStudent({ id: "student-2", name: "Trần Minh Anh", xp: 2100 });

    const view = await getPublicProfile("student-2");

    expect(requireRoleMock).toHaveBeenCalledWith(Object.values(RoleName));
    expect(userFindFirstMock).toHaveBeenCalledWith({
      where: { id: "student-2", role: { name: RoleName.STUDENT } },
      select: publicStudentSelect,
    });
    expect(enrollmentFindManyMock).toHaveBeenCalledTimes(1);
    expect(enrollmentFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "student-2",
          path: { published: true, deletedAt: null },
        },
      }),
    );
    expect(userFindUniqueMock).not.toHaveBeenCalled();
    expect(submissionFindManyMock).not.toHaveBeenCalled();

    expect(view.isOwnProfile).toBe(false);
    expect(view.profile.id).toBe("student-2");
    expect(view.profile.name).toBe("Trần Minh Anh");
    expect(view.profile.level.level).toBe(4);
    expect("email" in view.profile).toBe(false);
    expect("submissions" in view.profile).toBe(false);
  });

  it("keeps public view (no email, no submissions) even when viewing own /u/[id]", async () => {
    requireRoleMock.mockResolvedValue({
      id: "student-1",
      role: { name: RoleName.STUDENT },
    });
    mockPublicDbStudent({ id: "student-1" });

    const view = await getPublicProfile("student-1");

    expect(view.isOwnProfile).toBe(true);
    expect(userFindUniqueMock).not.toHaveBeenCalled();
    expect(submissionFindManyMock).not.toHaveBeenCalled();
    expect("email" in view.profile).toBe(false);
    expect("submissions" in view.profile).toBe(false);
  });

  it("rejects unauthenticated viewers with 401", async () => {
    requireRoleMock.mockRejectedValue(
      new AppError(401, "UNAUTHORIZED", "Sign in required"),
    );

    await expect(getPublicProfile("student-1")).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
    });
    expect(userFindFirstMock).not.toHaveBeenCalled();
  });

  it("throws 404 for invalid ids without hitting the database", async () => {
    requireRoleMock.mockResolvedValue({
      id: "student-1",
      role: { name: RoleName.STUDENT },
    });

    await expect(getPublicProfile("   ")).rejects.toMatchObject({
      status: 404,
      code: "PROFILE_NOT_FOUND",
    });
    await expect(getPublicProfile("bad id")).rejects.toMatchObject({
      status: 404,
      code: "PROFILE_NOT_FOUND",
    });
    expect(userFindFirstMock).not.toHaveBeenCalled();
  });

  it("throws 404 when target user does not exist or is not a STUDENT", async () => {
    requireRoleMock.mockResolvedValue({
      id: "student-1",
      role: { name: RoleName.STUDENT },
    });
    userFindFirstMock.mockResolvedValue(null);

    await expect(getPublicProfile("teacher-id")).rejects.toMatchObject({
      status: 404,
      code: "PROFILE_NOT_FOUND",
    });
    expect(enrollmentFindManyMock).not.toHaveBeenCalled();
    expect(submissionFindManyMock).not.toHaveBeenCalled();
  });
});
