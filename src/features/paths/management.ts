import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function getManagedPaths() {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  return db.path.findMany({
    where: user.role.name === RoleName.ADMIN ? {} : { creatorId: user.id },
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
  const result = await db.path.updateMany({
    where: {
      id: pathId,
      ...(user.role.name === RoleName.ADMIN ? {} : { creatorId: user.id }),
    },
    data: { sequentialUnlock: enabled },
  });
  if (result.count === 0)
    throw new AppError(
      403,
      "FORBIDDEN",
      "Bạn không có quyền chỉnh lộ trình này.",
    );
}
