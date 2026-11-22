import { RoleName, type SubmissionStatus } from "@prisma/client";
import { formatAwardedDate } from "@/features/achievements/service";
import { requireRole } from "@/features/auth/service";
import { languages } from "@/features/contests/languages";
import { getLevel } from "@/features/progress/levels";
import { resolveEffectiveStreak } from "@/features/progress/streak";
import { APP_TIME_ZONE } from "@/features/progress/week-activity";
import { AppError } from "@/lib/errors";
import {
  findOwnPrivateProfileExtras,
  findPublicStudentRecord,
  type OwnPrivateProfileExtras,
  type PublicStudentRecord,
} from "./repository";
import type {
  OwnStudentProfile,
  ProfileBadgeItem,
  ProfilePathProgress,
  ProfileSubmissionItem,
  PublicProfileView,
  PublicStudentProfile,
} from "./types";

const submissionDateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatProfileDate(date: Date): string {
  return formatAwardedDate(date, APP_TIME_ZONE);
}

export function formatSubmissionDateTime(date: Date): string {
  return submissionDateTimeFormatter.format(date);
}

export const SUBMISSION_STATUS_META: Record<
  SubmissionStatus,
  {
    label: string;
    tone: "success" | "destructive" | "warning" | "secondary";
  }
> = {
  ACCEPTED: { label: "Đạt", tone: "success" },
  REJECTED: { label: "Chưa đạt", tone: "destructive" },
  ERROR: { label: "Lỗi chấm", tone: "destructive" },
  NEEDS_REVIEW: { label: "Chờ duyệt", tone: "warning" },
  PENDING: { label: "Chờ chấm", tone: "secondary" },
  RUNNING: { label: "Đang chấm", tone: "secondary" },
};

export function getSubmissionLanguageLabel(language: string | null): string {
  if (!language) return "Viết tay";
  return languages.find((entry) => entry.id === language)?.label ?? language;
}

/**
 * Explicitly constructs the public student profile DTO by picking only allowed fields.
 * Never spreads raw records so sensitive fields cannot leak at runtime.
 */
export function buildPublicStudentProfile(
  record: PublicStudentRecord,
  now: Date = new Date(),
): PublicStudentProfile {
  const completedRoomIds = new Set(record.completedRoomIds);

  const paths: ProfilePathProgress[] = record.enrollments.map(({ path }) => {
    const completed = path.rooms.filter((room) =>
      completedRoomIds.has(room.id),
    ).length;
    const total = path.rooms.length;
    const nextRoom =
      path.rooms.find((room) => !completedRoomIds.has(room.id))?.title ?? null;
    return {
      id: path.id,
      slug: path.slug,
      title: path.title,
      completed,
      total,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      nextRoom,
    };
  });

  const badges: ProfileBadgeItem[] = record.userBadges
    .map(({ awardedAt, badge }) => ({
      id: badge.id,
      slug: badge.slug,
      name: badge.name,
      description: badge.description,
      awardedAt: new Date(awardedAt),
    }))
    .sort(
      (a, b) =>
        b.awardedAt.getTime() - a.awardedAt.getTime() ||
        a.slug.localeCompare(b.slug),
    );

  const completedPaths = paths.filter(
    (path) => path.total > 0 && path.completed === path.total,
  ).length;
  const streak = resolveEffectiveStreak(
    {
      currentStreak: record.user.currentStreak,
      longestStreak: record.user.longestStreak,
      lastActiveOn: record.user.lastActiveOn,
    },
    now,
  );

  return {
    id: record.user.id,
    name: record.user.name,
    joinedAt: new Date(record.user.createdAt),
    level: getLevel(record.user.xp),
    streak,
    stats: {
      enrolledPaths: paths.length,
      completedPaths,
      roomsDone: completedRoomIds.size,
      badgesCount: badges.length,
    },
    paths,
    badges,
  };
}

function presentSubmissionItem(
  row: OwnPrivateProfileExtras["submissions"][number],
): ProfileSubmissionItem {
  let contextLabel = "Luyện tập";
  let contextHref: string | null = null;

  if (row.contest) {
    contextLabel = `Cuộc thi: ${row.contest.title}`;
    contextHref = `/contests/${row.contest.slug}`;
  } else if (row.exercise.room?.path) {
    const path = row.exercise.room.path;
    contextLabel = `${path.title} · ${row.exercise.room.title}`;
    contextHref =
      path.published !== false && path.deletedAt == null
        ? `/hv/paths/${path.slug}`
        : null;
  } else if (row.exercise.room) {
    contextLabel = row.exercise.room.title;
  }

  return {
    id: row.id,
    exerciseId: row.exerciseId,
    exerciseTitle: row.exercise.title,
    exerciseKind: row.exercise.kind,
    maxPoints: row.exercise.points,
    contextLabel,
    contextHref,
    language: row.language,
    status: row.status,
    score: row.score,
    runtimeMs: row.runtimeMs,
    memoryKb: row.memoryKb,
    createdAt: new Date(row.createdAt),
  };
}

/** Loads the signed-in student's private profile (including email and submission history). */
export async function getOwnProfile(): Promise<OwnStudentProfile> {
  const user = await requireRole([RoleName.STUDENT]);

  const [record, extras] = await Promise.all([
    findPublicStudentRecord(user.id),
    findOwnPrivateProfileExtras(user.id),
  ]);

  if (!record || !extras) {
    throw new AppError(
      404,
      "PROFILE_NOT_FOUND",
      "Không tìm thấy hồ sơ học viên.",
    );
  }

  const publicProfile = buildPublicStudentProfile(record);

  return {
    id: publicProfile.id,
    name: publicProfile.name,
    joinedAt: publicProfile.joinedAt,
    level: publicProfile.level,
    streak: publicProfile.streak,
    stats: publicProfile.stats,
    paths: publicProfile.paths,
    badges: publicProfile.badges,
    email: extras.email,
    submissions: extras.submissions.map(presentSubmissionItem),
  };
}

/** Loads a student's public profile for any authenticated user; never exposes email or submissions. */
export async function getPublicProfile(
  rawTargetUserId: string,
): Promise<PublicProfileView> {
  const viewer = await requireRole(Object.values(RoleName));
  const targetUserId = rawTargetUserId.trim();

  if (!targetUserId || /\s/.test(targetUserId)) {
    throw new AppError(
      404,
      "PROFILE_NOT_FOUND",
      "Không tìm thấy hồ sơ học viên.",
    );
  }

  const record = await findPublicStudentRecord(targetUserId);
  if (!record) {
    throw new AppError(
      404,
      "PROFILE_NOT_FOUND",
      "Không tìm thấy hồ sơ học viên.",
    );
  }

  const profile = buildPublicStudentProfile(record);

  return {
    profile,
    isOwnProfile: viewer.id === profile.id,
  };
}
