import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { updatePathSchema } from "./creation-schema";

/** Cập nhật thông tin hiển thị của lộ trình; không đổi slug, chủ sở hữu hay trạng thái xuất bản. */
export async function updateManagedPathDetails(body: unknown) {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const parsed = updatePathSchema.safeParse(body);
  if (!parsed.success)
    throw new AppError(
      400,
      "INVALID_PATH",
      parsed.error.issues[0]?.message ?? "Thông tin lộ trình không hợp lệ.",
    );
  const { pathId, ...data } = parsed.data;
  const where = {
    id: pathId,
    ...(user.role.name === "ADMIN" ? {} : { creatorId: user.id }),
  };
  const path = await db.path.findFirst({ where, select: { slug: true } });
  if (!path)
    throw new AppError(
      404,
      "PATH_NOT_FOUND",
      "Không tìm thấy lộ trình bạn được quản lý.",
    );
  const result = await db.path.updateMany({ where, data });
  if (!result.count)
    throw new AppError(
      409,
      "PATH_CHANGED",
      "Lộ trình đã thay đổi. Vui lòng tải lại và thử lại.",
    );
  return { slug: path.slug };
}
