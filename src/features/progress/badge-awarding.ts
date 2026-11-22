import { Prisma, RoleName, SubmissionStatus } from "@prisma/client";
import { db } from "../../lib/db";
import {
  evaluateEligibleBadges,
  getCompletedWeekWinners,
  getLastCompletedWeekRange,
  MILESTONE_BADGE_BY_SLUG,
  type CompletedWeekWindow,
  type MilestoneBadgeSlug,
  type WeeklyXpStanding,
} from "./badges";

export type BadgeAwardingTx = Prisma.TransactionClient;

export interface WeeklyTopBadgeAwardResult {
  week: CompletedWeekWindow;
  winnerUserIds: string[];
  awardedUserIds: string[];
}

async function ensureBadgesBySlugInTx(
  tx: BadgeAwardingTx,
  slugs: readonly MilestoneBadgeSlug[],
): Promise<Array<{ id: string; slug: MilestoneBadgeSlug }>> {
  if (slugs.length === 0) return [];

  const uniqueSlugs = [...new Set(slugs)];
  const existing = await tx.badge.findMany({
    where: { slug: { in: uniqueSlugs } },
    select: { id: true, slug: true },
  });

  const existingSlugs = new Set(existing.map((row) => row.slug));
  const missingSlugs = uniqueSlugs.filter((slug) => !existingSlugs.has(slug));

  if (missingSlugs.length === 0) {
    return existing as Array<{ id: string; slug: MilestoneBadgeSlug }>;
  }

  await tx.badge.createMany({
    data: missingSlugs.map((slug) => MILESTONE_BADGE_BY_SLUG[slug]),
    skipDuplicates: true,
  });

  const resolved = await tx.badge.findMany({
    where: { slug: { in: uniqueSlugs } },
    select: { id: true, slug: true },
  });
  return resolved as Array<{ id: string; slug: MilestoneBadgeSlug }>;
}

/**
 * Evaluates and awards activity-based milestone badges (`path-completed`,
 * `five-exercises`, `streak-7`) inside the caller's Prisma transaction.
 * Does not award `weekly-top-1` and does not create `XpEvent` records.
 */
export async function awardActivityBadgesInTx(
  tx: BadgeAwardingTx,
  userId: string,
): Promise<MilestoneBadgeSlug[]> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, longestStreak: true },
  });
  if (!user) return [];

  const [earnedBadges, acceptedExercises, enrolledOrAttemptedPaths] =
    await Promise.all([
      tx.userBadge.findMany({
        where: { userId },
        select: { badge: { select: { slug: true } } },
      }),
      tx.submission.findMany({
        where: { userId, status: SubmissionStatus.ACCEPTED },
        distinct: ["exerciseId"],
        select: { exerciseId: true },
      }),
      tx.path.findMany({
        where: {
          published: true,
          deletedAt: null,
          OR: [
            { enrollments: { some: { userId } } },
            { rooms: { some: { progress: { some: { userId } } } } },
          ],
        },
        select: {
          id: true,
          rooms: {
            select: {
              id: true,
              progress: {
                where: { userId },
                select: { roomId: true },
              },
            },
          },
        },
      }),
    ]);

  const earnedBadgeSlugs = earnedBadges.map((row) => row.badge.slug);
  const paths = enrolledOrAttemptedPaths.map((path) => ({
    pathId: path.id,
    totalRooms: path.rooms.length,
    completedRooms: path.rooms.filter((room) => room.progress.length > 0)
      .length,
  }));

  const eligibleSlugs = evaluateEligibleBadges({
    userId,
    earnedBadgeSlugs,
    paths,
    acceptedExerciseCount: acceptedExercises.length,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
  });

  if (eligibleSlugs.length === 0) return [];

  const badgeRows = await ensureBadgesBySlugInTx(tx, eligibleSlugs);
  if (badgeRows.length === 0) return [];

  await tx.userBadge.createMany({
    data: badgeRows.map((badge) => ({ userId, badgeId: badge.id })),
    skipDuplicates: true,
  });

  return badgeRows.map((badge) => badge.slug);
}

/**
 * Awards `weekly-top-1` for the most recently ended `Asia/Ho_Chi_Minh`
 * calendar week. Designed to run after a week closes rather than during
 * ongoing XP recording; idempotent and safe under concurrent invocations.
 */
export async function awardCompletedWeekTopBadge(
  referenceDate = new Date(),
): Promise<WeeklyTopBadgeAwardResult> {
  const week = getLastCompletedWeekRange(referenceDate);

  return db.$transaction(async (tx) => {
    const grouped = await tx.xpEvent.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: week.startsAt, lt: week.endsAt },
        user: { role: { name: RoleName.STUDENT } },
      },
      _sum: { amount: true },
    });

    const standings: WeeklyXpStanding[] = grouped.map((row) => ({
      userId: row.userId,
      weeklyXp: row._sum.amount ?? 0,
    }));

    const winnerUserIds = getCompletedWeekWinners(
      standings,
      week,
      referenceDate,
    );
    if (winnerUserIds.length === 0) {
      return { week, winnerUserIds: [], awardedUserIds: [] };
    }

    const [badge] = await ensureBadgesBySlugInTx(tx, ["weekly-top-1"]);
    if (!badge) {
      return { week, winnerUserIds, awardedUserIds: [] };
    }

    const existingAwards = await tx.userBadge.findMany({
      where: {
        badgeId: badge.id,
        userId: { in: winnerUserIds },
      },
      select: { userId: true },
    });
    const alreadyEarned = new Set(existingAwards.map((row) => row.userId));
    const awardedUserIds = winnerUserIds.filter((id) => !alreadyEarned.has(id));

    if (awardedUserIds.length > 0) {
      await tx.userBadge.createMany({
        data: awardedUserIds.map((userId) => ({ userId, badgeId: badge.id })),
        skipDuplicates: true,
      });
    }

    return { week, winnerUserIds, awardedUserIds };
  });
}
