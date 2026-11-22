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
  const path = await db.path.findFirst({
    where: { id: pathId, deletedAt: null },
    select: { slug: true, creatorId: true },
  });
  if (!path)
    throw new AppError(404, "PATH_NOT_FOUND", "Không tìm thấy lộ trình.");
  if (user.role.name !== "ADMIN" && path.creatorId !== user.id)
    throw new AppError(
      403,
      "FORBIDDEN",
      "Bạn không có quyền chỉnh sửa lộ trình này.",
    );
  const result = await db.path.updateMany({
    where: {
      id: pathId,
      deletedAt: null,
      ...(user.role.name === "ADMIN" ? {} : { creatorId: user.id }),
    },
    data,
  });
  if (!result.count)
    throw new AppError(
      409,
      "PATH_CHANGED",
      "Lộ trình đã thay đổi. Vui lòng tải lại và thử lại.",
    );
  return { slug: path.slug };
}
