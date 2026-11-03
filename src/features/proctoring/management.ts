import { z } from "zod";
import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export const thresholdSchema = z
  .object({ threshold: z.number().int().min(1).max(100) })
  .strict();

export async function getManagedContestWarnings() {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  return db.contest.findMany({
    where: user.role.name === "ADMIN" ? {} : { creatorId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      slug: true,
      title: true,
      violationThreshold: true,
      participants: {
        where: { flaggedAt: { not: null } },
        orderBy: { flaggedAt: "desc" },
        take: 20,
        select: {
          userId: true,
          violationCount: true,
          flaggedAt: true,
          user: { select: { name: true } },
        },
      },
      _count: {
        select: { participants: { where: { flaggedAt: { not: null } } } },
      },
    },
  });
}

export async function changeViolationThreshold(slug: string, body: unknown) {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const parsed = thresholdSchema.safeParse(body);
  if (!parsed.success)
    throw new AppError(
      400,
      "INVALID_THRESHOLD",
      "Ngưỡng phải là số nguyên từ 1 đến 100.",
    );
  const threshold = parsed.data.threshold;
  return db.$transaction(async (tx) => {
    // Exclusive contest lock orders settings changes before event/participant updates.
    await tx.$queryRaw`SELECT "id" FROM "Contest" WHERE "slug" = ${slug} FOR UPDATE`;
    const contest = await tx.contest.findUnique({
      where: { slug },
      select: { id: true, creatorId: true },
    });
    if (
      !contest ||
      (user.role.name !== "ADMIN" && contest.creatorId !== user.id)
    )
      throw new AppError(
        403,
        "FORBIDDEN",
        "Bạn không có quyền cấu hình cuộc thi này.",
      );
    await tx.contest.update({
      where: { id: contest.id },
      data: { violationThreshold: threshold },
    });
    // Lowering the threshold also flags existing counts. Raising it never silently clears review flags.
    await tx.contestParticipant.updateMany({
      where: {
        contestId: contest.id,
        violationCount: { gt: threshold },
        flaggedAt: null,
      },
      data: { flaggedAt: new Date() },
    });
    await tx.submission.updateMany({
      where: {
        contestId: contest.id,
        user: {
          contestEntries: {
            some: { contestId: contest.id, flaggedAt: { not: null } },
          },
        },
      },
      data: { flaggedForReview: true },
    });
    return { threshold };
  });
}
