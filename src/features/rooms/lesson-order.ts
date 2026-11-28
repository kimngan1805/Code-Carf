import { Prisma, RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage";
import { deleteLessonSchema, moveLessonSchema } from "./authoring-schema";

type Tx = Prisma.TransactionClient;

const PATH_NOT_FOUND = () =>
  new AppError(
    404,
    "PATH_NOT_FOUND",
    "Không tìm thấy lộ trình bạn được quản lý.",
  );
const ROOM_NOT_FOUND = () =>
  new AppError(
    404,
    "ROOM_NOT_FOUND",
    "Không tìm thấy bài học trong lộ trình này.",
  );

/**
 * Khóa lộ trình (của người quản lý) cho tới hết transaction, để xóa/đổi thứ tự bài
 * không chạy chồng với thêm bài hay xuất bản cùng lúc.
 */
async function lockManagedPath(
  tx: Tx,
  user: { id: string; role: { name: string } },
  slug: string,
) {
  const path = await tx.path.findFirst({
    where: {
      slug,
      deletedAt: null,
      ...(user.role.name === RoleName.ADMIN ? {} : { creatorId: user.id }),
    },
    select: { id: true, slug: true, published: true },
  });
  if (!path) throw PATH_NOT_FOUND();
  await tx.$queryRaw`SELECT "id" FROM "Path" WHERE "id" = ${path.id} FOR UPDATE`;
  return path;
}

/**
 * Đánh số lại 1..n theo thứ tự cho trước. Đi qua số âm trước vì (pathId, position)
 * là duy nhất: đổi thẳng hai bài cho nhau sẽ vướng ràng buộc giữa chừng.
 */
async function renumber(tx: Tx, ids: string[]) {
  for (const [index, id] of ids.entries())
    await tx.room.update({ where: { id }, data: { position: -(index + 1) } });
  for (const [index, id] of ids.entries())
    await tx.room.update({ where: { id }, data: { position: index + 1 } });
}

async function orderedRoomIds(tx: Tx, pathId: string) {
  const rooms = await tx.room.findMany({
    where: { pathId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  return rooms.map((room) => room.id);
}

/** Đưa bài học lên hoặc xuống một bậc trong lộ trình. */
export async function moveManagedLesson(body: unknown) {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  const parsed = moveLessonSchema.safeParse(body);
  if (!parsed.success)
    throw new AppError(400, "INVALID_MOVE", "Yêu cầu đổi thứ tự không hợp lệ.");
  const input = parsed.data;
  return db.$transaction(async (tx) => {
    const path = await lockManagedPath(tx, user, input.pathSlug);
    const ids = await orderedRoomIds(tx, path.id);
    const from = ids.indexOf(input.roomId);
    if (from < 0) throw ROOM_NOT_FOUND();
    const to = input.direction === "up" ? from - 1 : from + 1;
    if (to < 0 || to >= ids.length) return { slug: path.slug, moved: false };
    [ids[from], ids[to]] = [ids[to], ids[from]];
    await renumber(tx, ids);
    return { slug: path.slug, moved: true };
  });
}

/**
 * Xóa bài học khi chưa có học viên học hay nộp bài: để giữ lịch sử học tập, bài đã có
 * người hoàn thành hoặc có bài nộp (hay bài tập nằm trong cuộc thi) thì không xóa.
 * Xóa luôn bài tập (test case, câu hỏi theo cascade) chứ không để chúng rơi vào kho
 * tài liệu, xóa tài liệu đính kèm và file của chúng, rồi đánh số lại các bài còn lại.
 * Lộ trình đang xuất bản luôn giữ ít nhất một bài.
 */
export async function deleteManagedLesson(body: unknown) {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  const parsed = deleteLessonSchema.safeParse(body);
  if (!parsed.success)
    throw new AppError(400, "INVALID_DELETE", "Yêu cầu xóa không hợp lệ.");
  const input = parsed.data;
  const result = await db.$transaction(async (tx) => {
    const path = await lockManagedPath(tx, user, input.pathSlug);
    const room = await tx.room.findFirst({
      where: { id: input.roomId, pathId: path.id },
      select: {
        id: true,
        _count: { select: { progress: true } },
        attachments: { select: { storageKey: true } },
        exercises: {
          select: {
            id: true,
            _count: { select: { submissions: true, contests: true } },
          },
        },
      },
    });
    if (!room) throw ROOM_NOT_FOUND();
    const inUse =
      room._count.progress > 0 ||
      room.exercises.some(
        (exercise) => exercise._count.submissions || exercise._count.contests,
      );
    if (inUse)
      throw new AppError(
        409,
        "LESSON_IN_USE",
        "Bài học đã có học viên học hoặc nộp bài nên không xóa được, để giữ lịch sử học tập. Bạn vẫn sửa được nội dung bài.",
      );
    const ids = await orderedRoomIds(tx, path.id);
    if (path.published && ids.length === 1)
      throw new AppError(
        409,
        "LAST_PUBLISHED_LESSON",
        "Lộ trình đang xuất bản cần ít nhất một bài học. Ẩn lộ trình trước khi xóa bài cuối cùng.",
      );
    await tx.exercise.deleteMany({ where: { roomId: room.id } });
    await tx.room.delete({ where: { id: room.id } });
    await renumber(
      tx,
      ids.filter((id) => id !== room.id),
    );
    return {
      slug: path.slug,
      storageKeys: room.attachments.map((file) => file.storageKey),
    };
  });
  // Chỉ xóa file sau khi đã commit: xóa hỏng thì còn file thừa, không bao giờ mất dữ liệu.
  for (const key of result.storageKeys) {
    try {
      await getStorage().delete(key);
    } catch (error) {
      logger.error("lesson_attachment_delete_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { slug: result.slug };
}
