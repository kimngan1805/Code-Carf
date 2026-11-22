import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function setPathPublication(pathId: string, published: boolean) {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const path = await db.path.findFirst({
    where: { id: pathId, deletedAt: null },
    select: {
      slug: true,
      creatorId: true,
      rooms: { select: { content: true } },
    },
  });
  if (!path)
    throw new AppError(404, "PATH_NOT_FOUND", "Không tìm thấy lộ trình.");
  if (user.role.name !== "ADMIN" && path.creatorId !== user.id)
    throw new AppError(
      403,
      "FORBIDDEN",
      "Bạn không có quyền thay đổi trạng thái xuất bản của lộ trình này.",
    );
  if (
    published &&
    (!path.rooms.length || path.rooms.some((room) => !room.content.trim()))
  )
    throw new AppError(
      400,
      "PATH_NOT_READY",
      "Hãy thêm ít nhất một bài học và điền nội dung cho tất cả bài trước khi xuất bản.",
    );
  const result = await db.path.updateMany({
    where: {
      id: pathId,
      deletedAt: null,
      ...(user.role.name === "ADMIN" ? {} : { creatorId: user.id }),
      ...(published ? { rooms: { some: {}, none: { content: "" } } } : {}),
    },
    data: published ? { published, publishedAt: new Date() } : { published },
  });
  if (!result.count)
    throw new AppError(
      409,
      "PATH_CHANGED",
      "Lộ trình đã thay đổi. Vui lòng tải lại và thử lại.",
    );
  return path.slug;
}
