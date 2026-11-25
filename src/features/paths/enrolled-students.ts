import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { computePagination, normalizePageSize } from "./pagination";

export const ENROLLED_STUDENTS_PAGE_SIZE = 10;

export type LearnerProgressStatus = "not_started" | "in_progress" | "completed";

export interface EnrolledStudentItem {
  userId: string;
  name: string;
  enrolledAt: Date;
  completedRooms: number;
  totalPublishedRooms: number;
  percent: number;
  status: LearnerProgressStatus;
}

export interface ManagedPathEnrolledStudentsPage {
  items: EnrolledStudentItem[];
  totalPublishedRooms: number;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Suy diễn tiến độ và trạng thái học tập từ số Room Published đã hoàn thành.
 * Chỉ dựa trên dữ liệu thực tế (`RoomProgress` trên các Room đã xuất bản).
 */
export function computeLearnerProgress(
  completedRooms: number,
  totalPublishedRooms: number,
): {
  completedRooms: number;
  percent: number;
  status: LearnerProgressStatus;
} {
  if (totalPublishedRooms <= 0) {
    return { completedRooms: 0, percent: 0, status: "not_started" };
  }
  const safeCompleted = Math.min(
    Math.max(0, Math.floor(completedRooms)),
    totalPublishedRooms,
  );
  const percent = Math.round((safeCompleted / totalPublishedRooms) * 100);
  const status: LearnerProgressStatus =
    safeCompleted >= totalPublishedRooms
      ? "completed"
      : safeCompleted > 0
        ? "in_progress"
        : "not_started";
  return { completedRooms: safeCompleted, percent, status };
}

/**
 * Lấy danh sách học viên đã đăng ký một Path (phân trang phía server, không N+1).
 * Chỉ Teacher sở hữu Path hoặc ADMIN được phép truy cập; chặn Path đã soft delete.
 */
export async function getManagedPathEnrolledStudents(
  slug: string,
  options?: { page?: unknown; pageSize?: number },
): Promise<ManagedPathEnrolledStudentsPage> {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);

  const path = await db.path.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      creatorId: true,
      rooms: {
        where: { published: true },
        select: { id: true },
      },
    },
  });

  if (!path) {
    throw new AppError(
      404,
      "PATH_NOT_FOUND",
      "Không tìm thấy lộ trình bạn được quản lý.",
    );
  }

  if (user.role.name !== RoleName.ADMIN && path.creatorId !== user.id) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Bạn không có quyền xem danh sách học viên của lộ trình này.",
    );
  }

  const pageSize = normalizePageSize(
    options?.pageSize,
    ENROLLED_STUDENTS_PAGE_SIZE,
  );
  const publishedRoomIds = path.rooms.map((room) => room.id);
  const totalPublishedRooms = publishedRoomIds.length;

  const totalItems = await db.enrollment.count({
    where: { pathId: path.id },
  });
  const pagination = computePagination(options?.page, totalItems, pageSize);

  if (totalItems === 0) {
    return {
      items: [],
      totalPublishedRooms,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
    };
  }

  const enrollments = await db.enrollment.findMany({
    where: { pathId: path.id },
    orderBy: [{ enrolledAt: "desc" }, { userId: "asc" }],
    skip: pagination.skip,
    take: pagination.pageSize,
    select: {
      userId: true,
      enrolledAt: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Gom nhóm tiến độ trong 1 truy vấn duy nhất (chỉ tính các Room Published), tránh N+1.
  const completedByUser = new Map<string, number>();
  if (enrollments.length > 0 && publishedRoomIds.length > 0) {
    const progressRows = await db.roomProgress.groupBy({
      by: ["userId"],
      where: {
        userId: { in: enrollments.map((row) => row.userId) },
        roomId: { in: publishedRoomIds },
      },
      _count: { roomId: true },
    });
    for (const row of progressRows) {
      completedByUser.set(row.userId, row._count.roomId);
    }
  }

  const items: EnrolledStudentItem[] = enrollments.map((row) => {
    const progress = computeLearnerProgress(
      completedByUser.get(row.userId) ?? 0,
      totalPublishedRooms,
    );
    return {
      userId: row.user.id,
      name: row.user.name,
      enrolledAt: row.enrolledAt,
      completedRooms: progress.completedRooms,
      totalPublishedRooms,
      percent: progress.percent,
      status: progress.status,
    };
  });

  return {
    items,
    totalPublishedRooms,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalItems: pagination.totalItems,
    totalPages: pagination.totalPages,
  };
}
