import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createPathSchema } from "./creation-schema";
import { pathSlug } from "./slug";

const selection = {
  id: true,
  slug: true,
  title: true,
  description: true,
  creatorId: true,
  published: true,
  sequentialUnlock: true,
  difficulty: true,
  tags: true,
  estimatedMinutes: true,
  coverTheme: true,
} as const;

export async function createManagedPath(body: unknown) {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const parsed = createPathSchema.safeParse(body);
  if (!parsed.success)
    throw new AppError(
      400,
      "INVALID_PATH",
      parsed.error.issues[0]?.message ?? "Thông tin lộ trình không hợp lệ.",
    );
  const {
    requestId,
    title,
    description,
    sequentialUnlock,
    difficulty,
    tags,
    estimatedMinutes,
    coverTheme,
  } = parsed.data;
  // Scope retry identity to the authenticated creator without adding a database column.
  const id = `p_${createHash("sha256").update(user.id).update("\0").update(requestId).digest("hex")}`;
  function replay(saved: Prisma.PathGetPayload<{ select: typeof selection }>) {
    if (
      saved.creatorId !== user.id ||
      saved.title !== title ||
      saved.description !== description ||
      saved.sequentialUnlock !== sequentialUnlock ||
      saved.difficulty !== difficulty ||
      saved.estimatedMinutes !== estimatedMinutes ||
      saved.coverTheme !== coverTheme ||
      saved.tags.join("\0") !== tags.join("\0")
    )
      throw new AppError(
        409,
        "CREATION_REQUEST_REUSED",
        "Yêu cầu này đã tạo một lộ trình khác. Hãy gửi lại với thông tin mới.",
      );
    return saved;
  }
  const existing = await db.path.findUnique({
    where: { id },
    select: selection,
  });
  if (existing) return replay(existing);
  const base = pathSlug(title);
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomUUID().slice(0, 8)}`;
    try {
      return await db.path.create({
        data: {
          id,
          slug,
          title,
          description,
          sequentialUnlock,
          difficulty,
          tags,
          estimatedMinutes,
          coverTheme,
          creatorId: user.id,
          published: false,
        },
        select: selection,
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      )
        throw error;
      // A concurrent retry can win the insert; return its result instead of creating a second path.
      const saved = await db.path.findUnique({
        where: { id },
        select: selection,
      });
      if (saved) return replay(saved);
    }
  }
  throw new AppError(
    409,
    "PATH_SLUG_CONFLICT",
    "Chưa thể tạo đường dẫn cho lộ trình. Vui lòng thử lại.",
  );
}
