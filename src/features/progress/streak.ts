import { APP_TIME_ZONE, addDays, toDateKey } from "./week-activity";

export interface StreakSnapshot {
  currentStreak: number;
  longestStreak: number;
  lastActiveOn?: Date | null;
}

export interface StreakComputationResult {
  currentStreak: number;
  longestStreak: number;
  lastActiveOn: Date;
  changed: boolean;
}

export interface EffectiveStreak {
  current: number;
  longest: number;
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

/**
 * Returns the `YYYY-MM-DD` calendar date key of `now` in `Asia/Ho_Chi_Minh`.
 */
export function toActivityDateKey(now: Date = new Date()): string {
  if (Number.isNaN(now.getTime())) {
    throw new Error("Invalid activity timestamp");
  }
  return toDateKey(now, APP_TIME_ZONE);
}

/**
 * Converts a `YYYY-MM-DD` Vietnam calendar date key into UTC midnight (`00:00:00Z`)
 * so PostgreSQL `DATE` (`@db.Date`) stores the exact Vietnam calendar day without
 * shifting backwards under UTC+7 offsets.
 */
export function dateKeyToDbDate(dateKey: string): Date {
  if (!DATE_KEY_PATTERN.test(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== dateKey
  ) {
    throw new Error(`Invalid calendar date key: ${dateKey}`);
  }
  return parsed;
}

/**
 * Extracts the stored `YYYY-MM-DD` key from a PostgreSQL `@db.Date` value.
 */
export function dbDateToDateKey(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Computes the next streak state for a learning activity occurring at `now`
 * using `Asia/Ho_Chi_Minh` calendar days.
 */
export function computeNextStreak(
  snapshot: StreakSnapshot,
  now: Date = new Date(),
): StreakComputationResult {
  const todayKey = toActivityDateKey(now);
  const yesterdayKey = addDays(todayKey, -1);
  const todayDbDate = dateKeyToDbDate(todayKey);

  const current = toNonNegativeInt(snapshot.currentStreak);
  const longest = toNonNegativeInt(snapshot.longestStreak);
  const lastKey = dbDateToDateKey(snapshot.lastActiveOn);

  // Already recorded on today's (or a later) Vietnam calendar day: keep unchanged.
  if (lastKey !== null && lastKey >= todayKey) {
    return {
      currentStreak: current,
      longestStreak: Math.max(longest, current),
      lastActiveOn: dateKeyToDbDate(lastKey),
      changed: false,
    };
  }

  const nextCurrent = lastKey === yesterdayKey ? current + 1 : 1;
  const nextLongest = Math.max(longest, nextCurrent);

  return {
    currentStreak: nextCurrent,
    longestStreak: nextLongest,
    lastActiveOn: todayDbDate,
    changed: true,
  };
}

/**
 * Resolves the streak values to display at `now`. Returns `current = 0` when
 * the learner has missed at least one full `Asia/Ho_Chi_Minh` calendar day,
 * while always preserving `longest`.
 */
export function resolveEffectiveStreak(
  snapshot: StreakSnapshot,
  now: Date = new Date(),
): EffectiveStreak {
  const todayKey = toActivityDateKey(now);
  const yesterdayKey = addDays(todayKey, -1);

  const current = toNonNegativeInt(snapshot.currentStreak);
  const longest = toNonNegativeInt(snapshot.longestStreak);
  const lastKey = dbDateToDateKey(snapshot.lastActiveOn);

  const isActive = lastKey !== null && lastKey >= yesterdayKey;
  return {
    current: isActive ? current : 0,
    longest,
  };
}
