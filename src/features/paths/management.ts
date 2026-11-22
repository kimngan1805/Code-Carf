import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function getManagedPaths() {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  return db.path.findMany({
    where: {
      deletedAt: null,
      ...(user.role.name === RoleName.ADMIN ? {} : { creatorId: user.id }),
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      published: true,
      sequentialUnlock: true,
      _count: { select: { rooms: true } },
    },
  });
}

export async function setPathSequentialUnlock(
  pathId: string,
  enabled: boolean,
) {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  const path = await db.path.findFirst({
    where: { id: pathId, deletedAt: null },
    select: { creatorId: true },
  });
  if (!path)
    throw new AppError(404, "PATH_NOT_FOUND", "Không tìm thấy lộ trình.");
  if (user.role.name !== RoleName.ADMIN && path.creatorId !== user.id)
    throw new AppError(
      403,
      "FORBIDDEN",
      "Bạn không có quyền chỉnh lộ trình này.",
    );
  const result = await db.path.updateMany({
    where: {
      id: pathId,
      deletedAt: null,
      ...(user.role.name === RoleName.ADMIN ? {} : { creatorId: user.id }),
    },
    data: { sequentialUnlock: enabled },
  });
  if (result.count === 0)
    throw new AppError(
      409,
      "PATH_CHANGED",
      "Lộ trình đã thay đổi. Vui lòng tải lại và thử lại.",
    );
}

/** Xóa mềm lộ trình (đánh dấu deletedAt và gỡ xuất bản) để bảo toàn toàn bộ dữ liệu học tập của học viên. */
export async function deleteManagedPath(pathId: string) {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  const normalizedId = typeof pathId === "string" ? pathId.trim() : "";
  if (!normalizedId || normalizedId.length > 200)
    throw new AppError(400, "INVALID_PATH", "Lộ trình không hợp lệ.");
  const path = await db.path.findFirst({
    where: { id: normalizedId, deletedAt: null },
    select: { id: true, slug: true, creatorId: true },
  });
  if (!path)
    throw new AppError(404, "PATH_NOT_FOUND", "Không tìm thấy lộ trình.");
  if (user.role.name !== RoleName.ADMIN && path.creatorId !== user.id)
    throw new AppError(
      403,
      "FORBIDDEN",
      "Bạn không có quyền xóa lộ trình này.",
    );
  const deletedAt = new Date();
  const result = await db.path.updateMany({
    where: {
      id: normalizedId,
      deletedAt: null,
      ...(user.role.name === RoleName.ADMIN ? {} : { creatorId: user.id }),
    },
    data: { deletedAt, published: false },
  });
  if (result.count === 0)
    throw new AppError(
      409,
      "PATH_CHANGED",
      "Lộ trình đã thay đổi. Vui lòng tải lại và thử lại.",
    );
  return { id: path.id, slug: path.slug, deletedAt };
}

export async function getManagedPath(slug: string) {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  const path = await db.path.findFirst({
    where: {
      slug,
      deletedAt: null,
      ...(user.role.name === RoleName.ADMIN ? {} : { creatorId: user.id }),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      published: true,
      sequentialUnlock: true,
      difficulty: true,
      tags: true,
      estimatedMinutes: true,
      coverTheme: true,
      publishedAt: true,
      rooms: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          position: true,
          _count: { select: { exercises: true } },
        },
      },
    },
  });
  if (!path)
    throw new AppError(
      404,
      "PATH_NOT_FOUND",
      "Không tìm thấy lộ trình bạn được quản lý.",
    );
  return path;
}

export async function getManagedRoom(slug: string, roomId: string) {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  const room = await db.room.findFirst({
    where: {
      id: roomId,
      path: {
        slug,
        deletedAt: null,
        ...(user.role.name === RoleName.ADMIN ? {} : { creatorId: user.id }),
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      content: true,
      path: { select: { title: true, slug: true } },
      exercises: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          title: true,
          difficulty: true,
          points: true,
          _count: { select: { testCases: true } },
        },
      },
    },
  });
  if (!room)
    throw new AppError(
      404,
      "ROOM_NOT_FOUND",
      "Không tìm thấy bài học bạn được quản lý.",
    );
  return room;
}

export async function getManagedExercise(
  slug: string,
  roomId: string,
  exerciseId: string,
) {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  const exercise = await db.exercise.findFirst({
    where: {
      id: exerciseId,
      roomId,
      room: {
        path: {
          slug,
          deletedAt: null,
          ...(user.role.name === RoleName.ADMIN ? {} : { creatorId: user.id }),
        },
      },
    },
    select: {
      id: true,
      title: true,
      prompt: true,
      difficulty: true,
      points: true,
      timeLimitMs: true,
      memoryLimitKb: true,
      testCases: {
        orderBy: { id: "asc" },
        select: { input: true, expected: true, isHidden: true, weight: true },
      },
      room: {
        select: { id: true, title: true, path: { select: { slug: true } } },
      },
    },
  });
  if (!exercise?.room)
    throw new AppError(
      404,
      "EXERCISE_NOT_FOUND",
      "Không tìm thấy bài tập bạn được quản lý.",
    );
  return { ...exercise, room: exercise.room };
}
