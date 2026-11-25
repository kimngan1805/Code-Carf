import { RoleName } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  pathFindFirst: vi.fn(),
  enrollmentCount: vi.fn(),
  enrollmentFindMany: vi.fn(),
  roomProgressGroupBy: vi.fn(),
}));

vi.mock("@/features/auth/service", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("@/lib/db", () => ({
  db: {
    path: { findFirst: mocks.pathFindFirst },
    enrollment: {
      count: mocks.enrollmentCount,
      findMany: mocks.enrollmentFindMany,
    },
    roomProgress: { groupBy: mocks.roomProgressGroupBy },
  },
}));

import {
  computeLearnerProgress,
  ENROLLED_STUDENTS_PAGE_SIZE,
  getManagedPathEnrolledStudents,
} from "./enrolled-students";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({
    id: "teacher-1",
    role: { name: RoleName.TEACHER },
  });
  mocks.pathFindFirst.mockResolvedValue({
    id: "path-1",
    creatorId: "teacher-1",
    rooms: [{ id: "room-pub-1" }, { id: "room-pub-2" }],
  });
  mocks.enrollmentCount.mockResolvedValue(2);
  mocks.enrollmentFindMany.mockResolvedValue([
    {
      userId: "student-1",
      enrolledAt: new Date("2026-11-24T08:00:00.000Z"),
      user: { id: "student-1", name: "Nguyễn Minh Anh" },
    },
    {
      userId: "student-2",
      enrolledAt: new Date("2026-11-23T08:00:00.000Z"),
      user: { id: "student-2", name: "Trần Quốc Bảo" },
    },
  ]);
  mocks.roomProgressGroupBy.mockResolvedValue([
    { userId: "student-1", _count: { roomId: 2 } },
    { userId: "student-2", _count: { roomId: 1 } },
  ]);
});

describe("computeLearnerProgress", () => {
  it("computes completed, in_progress, not_started and handles zero published rooms", () => {
    expect(computeLearnerProgress(0, 0)).toEqual({
      completedRooms: 0,
      percent: 0,
      status: "not_started",
    });
    expect(computeLearnerProgress(0, 3)).toEqual({
      completedRooms: 0,
      percent: 0,
      status: "not_started",
    });
    expect(computeLearnerProgress(1, 3)).toEqual({
      completedRooms: 1,
      percent: 33,
      status: "in_progress",
    });
    expect(computeLearnerProgress(3, 3)).toEqual({
      completedRooms: 3,
      percent: 100,
      status: "completed",
    });
  });
});

describe("getManagedPathEnrolledStudents", () => {
  it("allows the owner teacher to view enrolled students with published-room progress and no N+1 queries", async () => {
    const result = await getManagedPathEnrolledStudents("ts-basics", {
      page: "1",
    });

    expect(mocks.requireRole).toHaveBeenCalledWith([
      RoleName.TEACHER,
      RoleName.ADMIN,
    ]);
    expect(mocks.pathFindFirst).toHaveBeenCalledWith({
      where: { slug: "ts-basics", deletedAt: null },
      select: {
        id: true,
        creatorId: true,
        rooms: { where: { published: true }, select: { id: true } },
      },
    });
    expect(mocks.enrollmentCount).toHaveBeenCalledWith({
      where: { pathId: "path-1" },
    });
    expect(mocks.enrollmentFindMany).toHaveBeenCalledWith({
      where: { pathId: "path-1" },
      orderBy: [{ enrolledAt: "desc" }, { userId: "asc" }],
      skip: 0,
      take: ENROLLED_STUDENTS_PAGE_SIZE,
      select: {
        userId: true,
        enrolledAt: true,
        user: { select: { id: true, name: true } },
      },
    });
    // Single batched groupBy restricted strictly to published rooms (excludes Draft rooms).
    expect(mocks.roomProgressGroupBy).toHaveBeenCalledTimes(1);
    expect(mocks.roomProgressGroupBy).toHaveBeenCalledWith({
      by: ["userId"],
      where: {
        userId: { in: ["student-1", "student-2"] },
        roomId: { in: ["room-pub-1", "room-pub-2"] },
      },
      _count: { roomId: true },
    });

    expect(result).toEqual({
      totalPublishedRooms: 2,
      page: 1,
      pageSize: 10,
      totalItems: 2,
      totalPages: 1,
      items: [
        {
          userId: "student-1",
          name: "Nguyễn Minh Anh",
          enrolledAt: new Date("2026-11-24T08:00:00.000Z"),
          completedRooms: 2,
          totalPublishedRooms: 2,
          percent: 100,
          status: "completed",
        },
        {
          userId: "student-2",
          name: "Trần Quốc Bảo",
          enrolledAt: new Date("2026-11-23T08:00:00.000Z"),
          completedRooms: 1,
          totalPublishedRooms: 2,
          percent: 50,
          status: "in_progress",
        },
      ],
    });
  });

  it("allows admins to view enrolled students of another teacher's active path", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "admin-1",
      role: { name: RoleName.ADMIN },
    });
    mocks.pathFindFirst.mockResolvedValue({
      id: "path-1",
      creatorId: "teacher-2",
      rooms: [{ id: "room-pub-1" }],
    });

    const result = await getManagedPathEnrolledStudents("other-path");
    expect(result.totalItems).toBe(2);
    expect(mocks.enrollmentFindMany).toHaveBeenCalledTimes(1);
  });

  it("rejects another teacher with 403 FORBIDDEN without querying enrollments", async () => {
    mocks.pathFindFirst.mockResolvedValue({
      id: "path-1",
      creatorId: "teacher-2",
      rooms: [],
    });

    await expect(
      getManagedPathEnrolledStudents("foreign-path"),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(mocks.enrollmentCount).not.toHaveBeenCalled();
    expect(mocks.enrollmentFindMany).not.toHaveBeenCalled();
    expect(mocks.roomProgressGroupBy).not.toHaveBeenCalled();
  });

  it("rejects students and unauthenticated callers before touching the database", async () => {
    mocks.requireRole.mockRejectedValue(
      new AppError(403, "FORBIDDEN", "Insufficient permission"),
    );

    await expect(
      getManagedPathEnrolledStudents("ts-basics"),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.pathFindFirst).not.toHaveBeenCalled();
    expect(mocks.enrollmentCount).not.toHaveBeenCalled();
  });

  it("returns 404 for missing or soft-deleted paths", async () => {
    mocks.pathFindFirst.mockResolvedValue(null);

    await expect(
      getManagedPathEnrolledStudents("deleted-path"),
    ).rejects.toMatchObject({ status: 404, code: "PATH_NOT_FOUND" });
    expect(mocks.enrollmentCount).not.toHaveBeenCalled();
  });

  it("paginates deterministically (10 per page), clamps out-of-range pages, and skips queries when empty", async () => {
    mocks.enrollmentCount.mockResolvedValueOnce(25);
    mocks.enrollmentFindMany.mockResolvedValueOnce([
      {
        userId: "student-11",
        enrolledAt: new Date("2026-11-10T00:00:00.000Z"),
        user: { id: "student-11", name: "Học viên 11" },
      },
    ]);
    mocks.roomProgressGroupBy.mockResolvedValueOnce([]);

    const page2 = await getManagedPathEnrolledStudents("ts-basics", {
      page: "2",
    });
    expect(page2).toMatchObject({
      page: 2,
      pageSize: 10,
      totalItems: 25,
      totalPages: 3,
    });
    expect(mocks.enrollmentFindMany.mock.calls[0][0]).toMatchObject({
      skip: 10,
      take: 10,
    });
    expect(page2.items[0]).toMatchObject({
      completedRooms: 0,
      percent: 0,
      status: "not_started",
    });

    // Out-of-range page clamps to totalPages.
    mocks.enrollmentCount.mockResolvedValueOnce(12);
    mocks.enrollmentFindMany.mockResolvedValueOnce([]);
    const clamped = await getManagedPathEnrolledStudents("ts-basics", {
      page: "99",
    });
    expect(clamped).toMatchObject({ page: 2, totalPages: 2 });
    expect(mocks.enrollmentFindMany.mock.calls[1][0]).toMatchObject({
      skip: 10,
      take: 10,
    });

    // Empty enrollment list skips findMany and groupBy.
    mocks.enrollmentCount.mockResolvedValueOnce(0);
    const empty = await getManagedPathEnrolledStudents("ts-basics", {
      page: "2",
    });
    expect(empty).toEqual({
      items: [],
      totalPublishedRooms: 2,
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 1,
    });
    expect(mocks.enrollmentFindMany).toHaveBeenCalledTimes(2);
  });

  it("skips roomProgress query when a path only contains draft rooms", async () => {
    mocks.pathFindFirst.mockResolvedValue({
      id: "path-1",
      creatorId: "teacher-1",
      rooms: [],
    });

    const result = await getManagedPathEnrolledStudents("draft-rooms-only");
    expect(result.totalPublishedRooms).toBe(0);
    expect(mocks.roomProgressGroupBy).not.toHaveBeenCalled();
    expect(result.items.every((item) => item.percent === 0)).toBe(true);
    expect(result.items.every((item) => item.status === "not_started")).toBe(
      true,
    );
  });
});
