import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function setRoomPublication(roomId: string, published: boolean) {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  const where = {
    id: roomId,
    ...(user.role.name === RoleName.ADMIN
      ? {}
      : { path: { creatorId: user.id } }),
  };

  const room = await db.room.findFirst({
    where,
    select: {
      id: true,
      content: true,
      path: { select: { slug: true } },
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

  return {
    id: room.id,
    pathSlug: room.path.slug,
    published,
  };
}
