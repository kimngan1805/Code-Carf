import { Prisma, RoleName } from "@prisma/client";
import { db } from "@/lib/db";
import type { XpLeaderboardCandidate } from "./xp-ranking";

export function listTopUsers() {
  return db.user.findMany({
    select: { id: true, name: true, xp: true },
    orderBy: [{ xp: "desc" }, { id: "asc" }],
    take: 20,
  });
}

export interface PublishedPathOption {
  id: string;
  slug: string;
  title: string;
}

export function listPublishedPathsForLeaderboard(): Promise<
  PublishedPathOption[]
> {
  return db.path.findMany({
    where: { published: true },
    orderBy: [{ title: "asc" }, { id: "asc" }],
    select: { id: true, slug: true, title: true },
  });
}

export function findPublishedPathForLeaderboard(
  slug: string,
): Promise<PublishedPathOption | null> {
  return db.path.findFirst({
    where: { slug, published: true },
    select: { id: true, slug: true, title: true },
  });
}

export interface AggregateStudentXpFilters {
  pathId?: string | null;
  startsAt?: Date;
  endsAt?: Date;
}

/**
 * Sums `XpEvent.amount` per `STUDENT` user for the given path/week scope.
 * Only selects public fields (`id`, `name`) so email and private data are never read.
 */
export async function aggregateStudentXp(
  filters: AggregateStudentXpFilters,
): Promise<XpLeaderboardCandidate[]> {
  const where: Prisma.XpEventWhereInput = {
    user: { role: { name: RoleName.STUDENT } },
    ...(filters.startsAt && filters.endsAt
      ? { createdAt: { gte: filters.startsAt, lt: filters.endsAt } }
      : {}),
    ...(filters.pathId
      ? {
          OR: [
            { pathId: filters.pathId },
            { pathId: null, room: { pathId: filters.pathId } },
          ],
        }
      : {}),
  };

  const grouped = await db.xpEvent.groupBy({
    by: ["userId"],
    where,
    _sum: { amount: true },
  });

  const positiveRows = grouped.filter((row) => (row._sum.amount ?? 0) > 0);
  if (positiveRows.length === 0) return [];

  const users = await db.user.findMany({
    where: {
      id: { in: positiveRows.map((row) => row.userId) },
      role: { name: RoleName.STUDENT },
    },
    select: { id: true, name: true },
  });

  const nameById = new Map(users.map((user) => [user.id, user.name]));
  const candidates: XpLeaderboardCandidate[] = [];

  for (const row of positiveRows) {
    const name = nameById.get(row.userId);
    if (name === undefined) continue;
    candidates.push({
      userId: row.userId,
      name,
      xp: row._sum.amount ?? 0,
    });
  }

  return candidates;
}
