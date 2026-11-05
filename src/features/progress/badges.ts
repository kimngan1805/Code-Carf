import { addDays, APP_TIME_ZONE, toDateKey } from "./week-activity";

export const FIVE_EXERCISES_TARGET = 5;
export const STREAK_SEVEN_TARGET = 7;

export const MILESTONE_BADGE_SLUGS = [
  "path-completed",
  "five-exercises",
  "streak-7",
  "weekly-top-1",
] as const;

export type MilestoneBadgeSlug = (typeof MILESTONE_BADGE_SLUGS)[number];

export interface MilestoneBadgeDefinition {
  slug: MilestoneBadgeSlug;
  name: string;
  description: string;
}

export const MILESTONE_BADGES: readonly MilestoneBadgeDefinition[] = [
  {
    slug: "path-completed",
    name: "Chinh phục lộ trình",
    description: "Hoàn thành một lộ trình học",
  },
  {
    slug: "five-exercises",
    name: "Năm bài tập",
    description: "Hoàn thành 5 bài tập khác nhau",
  },
  {
    slug: "streak-7",
    name: "Chuỗi 7 ngày",
    description: "Học 7 ngày liên tiếp",
  },
  {
    slug: "weekly-top-1",
    name: "Dẫn đầu tuần",
    description: "Đứng đầu bảng xếp hạng XP tuần",
  },
];

export const MILESTONE_BADGE_BY_SLUG: Record<
  MilestoneBadgeSlug,
  MilestoneBadgeDefinition
> = {
  "path-completed": MILESTONE_BADGES[0],
  "five-exercises": MILESTONE_BADGES[1],
  "streak-7": MILESTONE_BADGES[2],
  "weekly-top-1": MILESTONE_BADGES[3],
};

export interface PathCompletionProgress {
  pathId: string;
  totalRooms: number;
  completedRooms: number;
}

export interface SubmissionExerciseSnapshot {
  exerciseId: string;
  status: string;
}

export interface CompletedWeekWindow {
  startsAt: Date;
  endsAt: Date;
}

export interface WeeklyXpEventInput {
  userId: string;
  amount: number;
  createdAt: Date;
}

export interface WeeklyXpStanding {
  userId: string;
  weeklyXp: number;
}

export interface BadgeEvaluationInput {
  userId: string;
  earnedBadgeSlugs: Iterable<string>;
  paths: readonly PathCompletionProgress[];
  acceptedExerciseCount: number;
  currentStreak: number;
  longestStreak?: number;
  /**
   * Optional completed-week leaderboard data. When omitted or when the week
   * window has not ended by `referenceDate`, `weekly-top-1` is not awarded.
   */
  completedWeek?: {
    week: CompletedWeekWindow;
    standings: readonly WeeklyXpStanding[];
    referenceDate: Date;
  };
}

const VN_UTC_OFFSET = "+07:00";

function toVnMidnight(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00${VN_UTC_OFFSET}`);
}

/** Returns true when at least one non-empty path has all rooms completed. */
export function hasCompletedPath(
  paths: readonly PathCompletionProgress[],
): boolean {
  return paths.some(
    (path) => path.totalRooms > 0 && path.completedRooms >= path.totalRooms,
  );
}

/** Counts distinct `exerciseId` values that have at least one `ACCEPTED` submission. */
export function countDistinctAcceptedExercises(
  submissions: readonly SubmissionExerciseSnapshot[],
): number {
  const acceptedExerciseIds = new Set<string>();
  for (const submission of submissions) {
    if (submission.status === "ACCEPTED") {
      acceptedExerciseIds.add(submission.exerciseId);
    }
  }
  return acceptedExerciseIds.size;
}

/** Returns true when the learner has completed at least 5 distinct accepted exercises. */
export function hasCompletedFiveExercises(
  acceptedExerciseCountOrSubmissions:
    number | readonly SubmissionExerciseSnapshot[],
): boolean {
  const count =
    typeof acceptedExerciseCountOrSubmissions === "number"
      ? acceptedExerciseCountOrSubmissions
      : countDistinctAcceptedExercises(acceptedExerciseCountOrSubmissions);
  return Number.isFinite(count) && count >= FIVE_EXERCISES_TARGET;
}

/** Returns true when either `currentStreak` or `longestStreak` reaches 7 days. */
export function hasReachedSevenDayStreak(
  currentStreak: number,
  longestStreak = 0,
): boolean {
  const safeCurrent = Number.isFinite(currentStreak) ? currentStreak : 0;
  const safeLongest = Number.isFinite(longestStreak) ? longestStreak : 0;
  return Math.max(safeCurrent, safeLongest) >= STREAK_SEVEN_TARGET;
}

/**
 * Returns the half-open `[startsAt, endsAt)` range of the most recently ended
 * Monday-to-Sunday calendar week in `Asia/Ho_Chi_Minh`.
 */
export function getLastCompletedWeekRange(
  referenceDate: Date,
): CompletedWeekWindow {
  if (Number.isNaN(referenceDate.getTime())) {
    throw new Error("Invalid referenceDate");
  }
  const todayKey = toDateKey(referenceDate, APP_TIME_ZONE);
  const weekday = (new Date(`${todayKey}T00:00:00Z`).getUTCDay() + 6) % 7;
  const currentWeekMondayKey = addDays(todayKey, -weekday);
  const previousWeekMondayKey = addDays(currentWeekMondayKey, -7);

  return {
    startsAt: toVnMidnight(previousWeekMondayKey),
    endsAt: toVnMidnight(currentWeekMondayKey),
  };
}

/** Returns true only when `week` is a valid non-empty window whose `endsAt` is at or before `referenceDate`. */
export function isWeekCompleted(
  week: CompletedWeekWindow,
  referenceDate: Date,
): boolean {
  const startMs = week.startsAt.getTime();
  const endMs = week.endsAt.getTime();
  const refMs = referenceDate.getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || Number.isNaN(refMs)) {
    return false;
  }
  return startMs < endMs && endMs <= refMs;
}

/**
 * Aggregates XP gained inside a completed `[startsAt, endsAt)` week.
 * Returns an empty array if the week has not ended yet.
 */
export function aggregateCompletedWeekXp(
  events: readonly WeeklyXpEventInput[],
  week: CompletedWeekWindow,
  referenceDate: Date,
): WeeklyXpStanding[] {
  if (!isWeekCompleted(week, referenceDate)) {
    return [];
  }

  const startMs = week.startsAt.getTime();
  const endMs = week.endsAt.getTime();
  const totals = new Map<string, number>();

  for (const event of events) {
    const createdMs = event.createdAt.getTime();
    if (
      Number.isNaN(createdMs) ||
      createdMs < startMs ||
      createdMs >= endMs ||
      !Number.isFinite(event.amount)
    ) {
      continue;
    }
    totals.set(event.userId, (totals.get(event.userId) ?? 0) + event.amount);
  }

  return [...totals.entries()]
    .filter(([, weeklyXp]) => weeklyXp > 0)
    .sort(([aId, aXp], [bId, bXp]) => bXp - aXp || aId.localeCompare(bId))
    .map(([userId, weeklyXp]) => ({ userId, weeklyXp }));
}

/**
 * Returns all `userId`s tied for #1 XP in a completed week (`weeklyXp > 0`).
 * Never returns winners if the week is still ongoing or highest XP is `<= 0`.
 */
export function getCompletedWeekWinners(
  standings: readonly WeeklyXpStanding[],
  week: CompletedWeekWindow,
  referenceDate: Date,
): string[] {
  if (!isWeekCompleted(week, referenceDate)) {
    return [];
  }

  const totals = new Map<string, number>();
  for (const entry of standings) {
    if (!Number.isFinite(entry.weeklyXp)) continue;
    totals.set(
      entry.userId,
      (totals.get(entry.userId) ?? 0) + Math.max(0, entry.weeklyXp),
    );
  }

  let maxXp = 0;
  for (const weeklyXp of totals.values()) {
    if (weeklyXp > maxXp) {
      maxXp = weeklyXp;
    }
  }
  if (maxXp <= 0) {
    return [];
  }

  return [...totals.entries()]
    .filter(([, weeklyXp]) => weeklyXp === maxXp)
    .map(([userId]) => userId)
    .sort((a, b) => a.localeCompare(b));
}

/** Returns true if `userId` holds or ties for #1 XP in the completed week. */
export function isWeeklyTopWinner(
  userId: string,
  standings: readonly WeeklyXpStanding[],
  week: CompletedWeekWindow,
  referenceDate: Date,
): boolean {
  return getCompletedWeekWinners(standings, week, referenceDate).includes(
    userId,
  );
}

/**
 * Pure milestone badge evaluator. Evaluates eligible badges and filters out
 * any slug the learner has already earned.
 */
export function evaluateEligibleBadges(
  input: BadgeEvaluationInput,
): MilestoneBadgeSlug[] {
  const alreadyEarned = new Set(input.earnedBadgeSlugs);
  const eligible: MilestoneBadgeSlug[] = [];

  const maybeAward = (slug: MilestoneBadgeSlug, condition: boolean) => {
    if (condition && !alreadyEarned.has(slug)) {
      eligible.push(slug);
      alreadyEarned.add(slug);
    }
  };

  maybeAward("path-completed", hasCompletedPath(input.paths));
  maybeAward(
    "five-exercises",
    hasCompletedFiveExercises(input.acceptedExerciseCount),
  );
  maybeAward(
    "streak-7",
    hasReachedSevenDayStreak(input.currentStreak, input.longestStreak),
  );
  maybeAward(
    "weekly-top-1",
    input.completedWeek !== undefined &&
      isWeeklyTopWinner(
        input.userId,
        input.completedWeek.standings,
        input.completedWeek.week,
        input.completedWeek.referenceDate,
      ),
  );

  return eligible;
}
