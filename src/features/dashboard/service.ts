import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { getLevel } from "@/features/progress/levels";
import { resolveEffectiveStreak } from "@/features/progress/streak";
import { getWeekActivity, toDateKey } from "@/features/progress/week-activity";
import { getDashboardRecords } from "./repository";

export async function getDashboard() {
  const user = await requireRole(Object.values(RoleName));
  const now = new Date();
  // 8 days back covers the whole current week in any time zone offset.
  const since = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const records = await getDashboardRecords(user.id, user.xp, since);
  const week = getWeekActivity(
    records.activity.map((event) => toDateKey(event.createdAt)),
    toDateKey(now),
  );
  const effectiveStreak = resolveEffectiveStreak(
    {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      lastActiveOn: user.lastActiveOn,
    },
    now,
  );

  const paths = records.enrollments.map(({ path }) => {
    const completed = path.rooms.filter((room) =>
      records.completedRoomIds.has(room.id),
    ).length;
    const next = path.rooms.find(
      (room) => !records.completedRoomIds.has(room.id),
    );
    return {
      id: path.id,
      slug: path.slug,
      title: path.title,
      completed,
      total: path.rooms.length,
      nextRoom: next?.title ?? null,
    };
  });

  return {
    user: { name: user.name, role: user.role.name },
    level: getLevel(user.xp),
    rank: records.rank,
    streak: {
      current: effectiveStreak.current,
      longest: effectiveStreak.longest,
      week,
      daysThisWeek: week.filter((day) => day.status === "done").length,
    },
    badges: records.badges.map(({ badge }) => badge),
    paths,
    stats: {
      // Achievements count finished paths only; enrolling alone is not an achievement.
      paths: paths.filter(
        (path) => path.total > 0 && path.completed === path.total,
      ).length,
      roomsDone: records.completedRoomIds.size,
      badges: records.badges.length,
    },
    suggestedPaths: [
      ...(records.recommendedPath ? [records.recommendedPath] : []),
      ...records.suggestedPaths.filter(
        (path) => path.id !== records.recommendedPath?.id,
      ),
    ]
      .slice(0, 3)
      .map((path) => ({
        id: path.id,
        slug: path.slug,
        title: path.title,
        description: path.description,
        rooms: path._count.rooms,
        learners: path._count.enrollments,
        recommended: path.id === records.recommendedPath?.id,
      })),
    contests: records.contests,
    lockedBadges: records.lockedBadges,
    topLearners: records.topLearners.map((learner, index) => ({
      ...learner,
      position: index + 1,
      isMe: learner.id === user.id,
    })),
    me: { name: user.name, xp: user.xp },
  };
}

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
