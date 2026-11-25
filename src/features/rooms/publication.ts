import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { notifyNewLessonPublished } from "@/features/notifications/writer";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function setRoomPublication(roomId: string, published: boolean) {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  const where = {
    id: roomId,
    path: {
      deletedAt: null,
      ...(user.role.name === RoleName.ADMIN ? {} : { creatorId: user.id }),
    },
  };

  const room = await db.room.findFirst({
    where,
    select: {
      id: true,
      title: true,
      content: true,
      published: true,
      path: { select: { id: true, slug: true, title: true, published: true } },
    },
  });

  if (!room) {
    throw new AppError(
      404,
      "ROOM_NOT_FOUND",
      "Không tìm thấy bài học bạn được quản lý.",
    );
  }

  if (published && !room.content.trim()) {
    throw new AppError(
      400,
      "ROOM_NOT_READY",
      "Hãy điền nội dung lý thuyết cho bài học trước khi xuất bản.",
    );
  }

  const result = await db.room.updateMany({
    where: {
      ...where,
      ...(published ? { content: { not: "" } } : {}),
    },
    data: { published },
  });

  if (result.count === 0) {
    throw new AppError(
      409,
      "ROOM_CHANGED",
      "Bài học đã thay đổi. Vui lòng tải lại và thử lại.",
    );
  }

  // Chỉ gửi NEW_LESSON khi Room chuyển sang Published trong một Path đang Published (chưa soft delete).
  // Deduplication theo (userId, dedupeKey) trong Notifications đảm bảo unpublish rồi publish lại không tạo trùng.
  if (published && !room.published && room.path.published) {
    await notifyNewLessonPublished({
      pathId: room.path.id,
      pathTitle: room.path.title,
      roomId: room.id,
      roomTitle: room.title,
      actorUserId: user.id,
    });
  }

  return {
    id: room.id,
    pathSlug: room.path.slug,
    published,
  };
}
