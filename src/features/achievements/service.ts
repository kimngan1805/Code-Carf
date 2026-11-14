import { RoleName } from "@prisma/client";
import { requireRole } from "../auth/service";
import { getLevel, type LevelInfo } from "../progress/levels";
import { APP_TIME_ZONE } from "../progress/week-activity";
import { getAchievementRecords, type AchievementRecords } from "./repository";

const awardedDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatAwardedDate(
  date: Date,
  timeZone = APP_TIME_ZONE,
): string {
  if (timeZone === APP_TIME_ZONE) {
    return awardedDateFormatter.format(date);
  }
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export interface EarnedBadgeItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  awardedAt: Date;
}

export interface LockedBadgeItem {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface AchievementsSummary {
  earnedCount: number;
  lockedCount: number;
  totalCount: number;
  /** Completion percentage from 0 to 100. */
  completionPercent: number;
  /** Progress ratio from 0 to 1 for the Progress UI primitive. */
  progress: number;
}

export interface StudentAchievements {
  level: LevelInfo;
  summary: AchievementsSummary;
  nextGoal: LockedBadgeItem | null;
  earnedBadges: EarnedBadgeItem[];
  lockedBadges: LockedBadgeItem[];
}

export function buildStudentAchievements(
  records: AchievementRecords,
  xp = 0,
): StudentAchievements {
  const earnedIds = new Set<string>();
  const earnedBadges: EarnedBadgeItem[] = [];

  const sortedUserBadges = [...records.userBadges].sort(
    (a, b) =>
      b.awardedAt.getTime() - a.awardedAt.getTime() ||
      a.badge.slug.localeCompare(b.badge.slug),
  );

  for (const row of sortedUserBadges) {
    if (earnedIds.has(row.badge.id)) continue;
    earnedIds.add(row.badge.id);
    earnedBadges.push({
      id: row.badge.id,
      slug: row.badge.slug,
      name: row.badge.name,
      description: row.badge.description,
      awardedAt: row.awardedAt,
    });
  }

  const lockedBadges: LockedBadgeItem[] = records.badges
    .filter((badge) => !earnedIds.has(badge.id))
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((badge) => ({
      id: badge.id,
      slug: badge.slug,
      name: badge.name,
      description: badge.description,
    }));

  const earnedCount = earnedBadges.length;
  const lockedCount = lockedBadges.length;
  const totalCount = earnedCount + lockedCount;
  const progress = totalCount > 0 ? earnedCount / totalCount : 0;
  const completionPercent = Math.round(progress * 100);

  return {
    level: getLevel(xp),
    summary: {
      earnedCount,
      lockedCount,
      totalCount,
      completionPercent,
      progress,
    },
    nextGoal: lockedBadges[0] ?? null,
    earnedBadges,
    lockedBadges,
  };
}

export async function getAchievements(): Promise<StudentAchievements> {
  const user = await requireRole([RoleName.STUDENT]);
  const records = await getAchievementRecords(user.id);
  return buildStudentAchievements(records, user.xp ?? 0);
}
