import { Prisma } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { notifyNewLessonPublished } from "@/features/notifications/writer";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  EMPTY_LESSON_WHERE,
  LESSON_NOT_READY_MESSAGE,
  lessonHasMaterial,
} from "@/features/rooms/lesson-readiness";

export async function setPathPublication(pathId: string, published: boolean) {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const path = await db.path.findFirst({
    where: { id: pathId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      title: true,
      published: true,
      creatorId: true,
      rooms: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          content: true,
          published: true,
          _count: { select: { attachments: true, exercises: true } },
        },
      },
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
  const notReady = () =>
    new AppError(400, "PATH_NOT_READY", LESSON_NOT_READY_MESSAGE);
  if (published && !path.rooms.length)
    throw new AppError(
      400,
      "PATH_NOT_READY",
      "Hãy thêm ít nhất một bài học trước khi xuất bản lộ trình.",
    );
  if (
    published &&
    path.rooms.some(
      (room) =>
        !lessonHasMaterial({
          content: room.content,
          attachmentCount: room._count.attachments,
          exerciseCount: room._count.exercises,
        }),
    )
  )
    throw notReady();
  // Bài học không có trạng thái nháp riêng: xuất bản lộ trình là mở mọi bài của nó.
  // Ghi cùng một transaction để học viên không bao giờ thấy lộ trình đã mở mà bài còn ẩn.
  await db
    .$transaction(
      async (tx) => {
        // Kiểm tra lại trong transaction: bài có thể vừa bị xóa hết nội dung, tài liệu hay bài tập.
        if (
          published &&
          (await tx.room.count({ where: { pathId, ...EMPTY_LESSON_WHERE } }))
        )
          throw notReady();
        const result = await tx.path.updateMany({
          where: {
            id: pathId,
            deletedAt: null,
            ...(user.role.name === "ADMIN" ? {} : { creatorId: user.id }),
            ...(published ? { rooms: { some: {} } } : {}),
          },
          data: published
            ? { published, publishedAt: new Date() }
            : { published },
        });
        if (!result.count)
          throw new AppError(
            409,
            "PATH_CHANGED",
            "Lộ trình đã thay đổi. Vui lòng tải lại và thử lại.",
          );
        if (published)
          await tx.room.updateMany({
            where: { pathId, published: false },
            data: { published: true },
          });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    .catch((error: unknown) => {
      // Đụng độ với một thao tác thêm bài cùng lúc: báo thử lại thay vì lỗi chung.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      )
        throw new AppError(
          409,
          "PATH_BUSY",
          "Lộ trình đang được cập nhật. Vui lòng thử lại.",
        );
      throw error;
    });

  // Khi Path chuyển từ Draft sang Published, mọi bài vừa mở đều là bài mới với học viên.
  // Cơ chế dedupeKey ("new-lesson:<roomId>") ngăn gửi trùng khi unpublish rồi publish lại Path.
  if (published && !path.published) {
    for (const room of path.rooms) {
      await notifyNewLessonPublished({
        pathId: path.id ?? pathId,
        pathTitle: path.title,
        roomId: room.id,
        roomTitle: room.title,
        actorUserId: user.id,
      });
    }
  }

  return path.slug;
}
