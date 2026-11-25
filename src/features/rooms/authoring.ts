import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { notifyNewLessonPublished } from "@/features/notifications/writer";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { addLessonVideoSchema, saveLessonSchema } from "./authoring-schema";
import { insertLessonVideo } from "./lesson-video";

export async function saveManagedLesson(body: unknown) {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const parsed = saveLessonSchema.safeParse(body);
  if (!parsed.success)
    throw new AppError(
      400,
      "INVALID_LESSON",
      parsed.error.issues[0]?.message ?? "Thông tin bài học không hợp lệ.",
    );
  const input = parsed.data;
  const fields = {
    title: input.title,
    description: input.description,
    content: input.content,
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const outcome = await db.$transaction(
        async (tx) => {
          const path = await tx.path.findFirst({
            where: {
              slug: input.pathSlug,
              deletedAt: null,
              ...(user.role.name === "ADMIN" ? {} : { creatorId: user.id }),
            },
            select: { id: true, slug: true, title: true, published: true },
          });
          if (!path)
            throw new AppError(
              404,
              "PATH_NOT_FOUND",
              "Không tìm thấy lộ trình bạn được quản lý.",
            );
          if ("roomId" in input) {
            const updated = await tx.room.updateMany({
              where: { id: input.roomId, pathId: path.id },
              data: fields,
            });
            if (!updated.count)
              throw new AppError(
                404,
                "ROOM_NOT_FOUND",
                "Không tìm thấy bài học trong lộ trình này.",
              );
            return {
              id: input.roomId,
              slug: path.slug,
              created: false as const,
            };
          }
          const id = `r_${createHash("sha256").update(user.id).update("\0").update(path.id).update("\0").update(input.requestId).digest("hex")}`;
          const existing = await tx.room.findUnique({ where: { id } });
          if (existing) {
            if (
              existing.pathId !== path.id ||
              existing.title !== fields.title ||
              existing.description !== fields.description ||
              existing.content !== fields.content
            )
              throw new AppError(
                409,
                "LESSON_REQUEST_REUSED",
                "Yêu cầu này đã lưu nội dung khác. Vui lòng thử lại.",
              );
            return { id, slug: path.slug, created: false as const };
          }
          const last = await tx.room.aggregate({
            where: { pathId: path.id },
            _max: { position: true },
          });
          // Bài học đi theo trạng thái lộ trình: thêm vào lộ trình đã xuất bản là hiện ngay.
          const room = await tx.room.create({
            data: {
              id,
              pathId: path.id,
              ...fields,
              published: path.published,
              position: (last._max.position ?? 0) + 1,
            },
            select: { id: true, title: true },
          });
          return {
            id: room.id,
            slug: path.slug,
            created: true as const,
            notify: path.published
              ? {
                  pathId: path.id,
                  pathTitle: path.title,
                  roomTitle: room.title,
                }
              : null,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      // Bài mới trong lộ trình đang mở: báo cho học viên đã đăng ký. Bài trong lộ trình
      // nháp sẽ được báo khi lộ trình được xuất bản (xem setPathPublication).
      if (outcome.created && outcome.notify)
        await notifyNewLessonPublished({
          ...outcome.notify,
          roomId: outcome.id,
          actorUserId: user.id,
        });
      return { id: outcome.id, slug: outcome.slug };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code)
      )
        continue;
      throw error;
    }
  }
  throw new AppError(
    409,
    "LESSON_BUSY",
    "Lộ trình đang được cập nhật. Vui lòng lưu lại.",
  );
}

const MAX_CONTENT = 100000;

/**
 * Thêm một video YouTube vào mục "Video bài giảng" của bài học.
 * Cùng quyền với sửa bài học: giảng viên tạo lộ trình hoặc admin. Chỉ ghi khi
 * nội dung chưa bị ai sửa từ lúc đọc, để không đè thay đổi của người khác.
 */
export async function addLessonVideo(body: unknown) {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const parsed = addLessonVideoSchema.safeParse(body);
  if (!parsed.success)
    throw new AppError(
      400,
      "INVALID_VIDEO",
      parsed.error.issues[0]?.message ?? "Thông tin video không hợp lệ.",
    );
  const input = parsed.data;
  for (let attempt = 0; attempt < 3; attempt++) {
    const room = await db.room.findFirst({
      where: {
        id: input.roomId,
        path: {
          slug: input.pathSlug,
          deletedAt: null,
          ...(user.role.name === "ADMIN" ? {} : { creatorId: user.id }),
        },
      },
      select: {
        id: true,
        pathId: true,
        content: true,
        path: { select: { slug: true } },
      },
    });
    if (!room)
      throw new AppError(
        404,
        "ROOM_NOT_FOUND",
        "Không tìm thấy bài học trong lộ trình bạn được quản lý.",
      );
    const result = insertLessonVideo(room.content, input.url, input.caption);
    if (!result.ok)
      throw result.reason === "DUPLICATE"
        ? new AppError(409, "VIDEO_EXISTS", "Video này đã có trong bài học.")
        : new AppError(
            400,
            "INVALID_VIDEO_URL",
            "Link không phải video YouTube hợp lệ. Hãy dán link dạng https://www.youtube.com/watch?v=... hoặc https://youtu.be/...",
          );
    if (result.content.length > MAX_CONTENT)
      throw new AppError(
        400,
        "LESSON_TOO_LONG",
        "Nội dung bài học đã chạm giới hạn 100.000 ký tự, không thêm được video.",
      );
    const updated = await db.room.updateMany({
      where: { id: room.id, pathId: room.pathId, content: room.content },
      data: { content: result.content },
    });
    if (updated.count) return { id: room.id, slug: room.path.slug };
  }
  throw new AppError(
    409,
    "LESSON_BUSY",
    "Bài học vừa được cập nhật ở nơi khác. Vui lòng thử lại.",
  );
}
