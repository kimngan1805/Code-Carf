import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { saveLessonSchema } from "./authoring-schema";

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
      return await db.$transaction(
        async (tx) => {
          const path = await tx.path.findFirst({
            where: {
              slug: input.pathSlug,
              ...(user.role.name === "ADMIN" ? {} : { creatorId: user.id }),
            },
            select: { id: true, slug: true },
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
            return { id: input.roomId, slug: path.slug };
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
            return { id, slug: path.slug };
          }
          const last = await tx.room.aggregate({
            where: { pathId: path.id },
            _max: { position: true },
          });
          const room = await tx.room.create({
            data: {
              id,
              pathId: path.id,
              ...fields,
              position: (last._max.position ?? 0) + 1,
            },
            select: { id: true },
          });
          return { id: room.id, slug: path.slug };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
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
