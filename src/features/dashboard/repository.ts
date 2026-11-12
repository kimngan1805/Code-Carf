import { ContestStatus, RoleName } from "@prisma/client";
import { db } from "@/lib/db";

export async function getDashboardRecords(
  userId: string,
  xp: number,
  since: Date,
) {
  const [
    enrollments,
    completedRooms,
    badges,
    activity,
    suggestedPaths,
    contests,
    usersAhead,
    lockedBadges,
    topLearners,
  ] = await Promise.all([
    db.enrollment.findMany({
      where: { userId },
      orderBy: { enrolledAt: "asc" },
      select: {
        path: {
          select: {
            id: true,
            slug: true,
            title: true,
            rooms: {
              orderBy: { position: "asc" },
              select: { id: true, title: true },
            },
          },
        },
      },
    }),
    db.roomProgress.findMany({
      where: { userId },
      select: { roomId: true },
    }),
    db.userBadge.findMany({
      where: { userId },
      orderBy: { awardedAt: "desc" },
      take: 6,
      select: { badge: { select: { slug: true, name: true } } },
    }),
    db.xpEvent.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    db.path.findMany({
      where: { enrollments: { none: { userId } } },
      orderBy: { enrollments: { _count: "desc" } },
      take: 3,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        _count: { select: { rooms: true, enrollments: true } },
      },
    }),
    db.contest.findMany({
      where: {
        status: ContestStatus.PUBLISHED,
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
      orderBy: { startsAt: "asc" },
      take: 3,
      select: { id: true, slug: true, title: true, startsAt: true },
    }),
    db.user.count({ where: { xp: { gt: xp } } }),
    db.badge.findMany({
      where: { users: { none: { userId } } },
      orderBy: { slug: "asc" },
      take: 3,
      select: { slug: true, name: true, description: true },
    }),
    db.user.findMany({
      where: { role: { name: RoleName.STUDENT } },
      orderBy: [{ xp: "desc" }, { id: "asc" }],
      take: 5,
      select: { id: true, name: true, xp: true },
    }),
  ]);
  return {
    enrollments,
    completedRoomIds: new Set(completedRooms.map((row) => row.roomId)),
    badges,
    activity,
    suggestedPaths,
    contests,
    rank: usersAhead + 1,
    lockedBadges,
    topLearners,
  };
}
