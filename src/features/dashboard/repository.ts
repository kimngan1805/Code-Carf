import { ContestStatus, RoleName } from "@prisma/client";
import { recommendPathSlug } from "@/features/onboarding/recommend";
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
    profile,
  ] = await Promise.all([
    db.enrollment.findMany({
      where: { userId, path: { published: true, deletedAt: null } },
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
      where: {
        published: true,
        deletedAt: null,
        enrollments: { none: { userId } },
      },
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
        OR: [{ examEndsAt: null }, { examEndsAt: { gte: new Date() } }],
      },
      orderBy: { examStartsAt: "asc" },
      take: 3,
      select: { id: true, slug: true, title: true, examStartsAt: true },
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
    db.learnerProfile.findUnique({
      where: { userId },
      select: { level: true, goal: true },
    }),
  ]);

  // Path matching the onboarding answers, if the learner has not joined it yet.
  const recommendedPath = profile
    ? await db.path.findFirst({
        where: {
          slug: recommendPathSlug(profile),
          published: true,
          deletedAt: null,
          enrollments: { none: { userId } },
        },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          _count: { select: { rooms: true, enrollments: true } },
        },
      })
    : null;
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
    recommendedPath,
  };
}
