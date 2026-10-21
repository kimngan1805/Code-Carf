import { db } from "../../lib/db";

export async function getAchievementRecords(userId: string) {
  const [badges, userBadges] = await Promise.all([
    db.badge.findMany({
      orderBy: { slug: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
      },
    }),
    db.userBadge.findMany({
      where: { userId },
      orderBy: [{ awardedAt: "desc" }, { badgeId: "asc" }],
      select: {
        badgeId: true,
        awardedAt: true,
        badge: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
          },
        },
      },
    }),
  ]);

  return { badges, userBadges };
}

export type AchievementRecords = Awaited<
  ReturnType<typeof getAchievementRecords>
>;
