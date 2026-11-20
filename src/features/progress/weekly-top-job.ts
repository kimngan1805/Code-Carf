import { createHash, timingSafeEqual } from "node:crypto";
import { AppError } from "../../lib/errors";
import {
  awardCompletedWeekTopBadge,
  type WeeklyTopBadgeAwardResult,
} from "./badge-awarding";
import { getLastCompletedWeekRange, type CompletedWeekWindow } from "./badges";
import {
  APP_TIME_ZONE,
  addDays,
  toDateKey,
  toVnMidnight,
} from "./week-activity";

export const DEFAULT_WEEKLY_BADGE_CATCHUP_WEEKS = 4;
const MAX_WEEKLY_BADGE_CATCHUP_WEEKS = 52;
const MIN_CRON_SECRET_LENGTH = 16;

export interface WeeklyTopBadgeJobResult {
  referenceDate: Date;
  checkedWeeks: CompletedWeekWindow[];
  awards: WeeklyTopBadgeAwardResult[];
  totalAwardedCount: number;
}

function sha256Digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Verifies a Bearer `CRON_SECRET` header using constant-time digest
 * comparison so unauthenticated users and students cannot invoke cron jobs.
 */
export function authorizeCronRequest(
  request: Request,
  configuredSecret: string | undefined = process.env.CRON_SECRET,
): void {
  const secret = configuredSecret?.trim() ?? "";
  if (secret.length < MIN_CRON_SECRET_LENGTH) {
    throw new AppError(
      503,
      "CRON_NOT_CONFIGURED",
      "Cron secret is not configured",
    );
  }

  const header = request.headers.get("authorization");
  if (!header) {
    throw new AppError(401, "UNAUTHORIZED", "Missing authorization header");
  }

  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  const token = match?.[1] ?? "";
  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid authorization scheme");
  }

  const expectedDigest = sha256Digest(secret);
  const providedDigest = sha256Digest(token);
  if (!timingSafeEqual(providedDigest, expectedDigest)) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid cron secret");
  }
}

/**
 * Returns the last `weeksCount` closed Monday-to-Sunday `Asia/Ho_Chi_Minh`
 * windows ending at or before `referenceDate`, ordered oldest to newest.
 */
export function getRecentCompletedWeekRanges(
  referenceDate: Date = new Date(),
  weeksCount: number = DEFAULT_WEEKLY_BADGE_CATCHUP_WEEKS,
): CompletedWeekWindow[] {
  const safeCount = Number.isFinite(weeksCount)
    ? Math.max(
        1,
        Math.min(MAX_WEEKLY_BADGE_CATCHUP_WEEKS, Math.trunc(weeksCount)),
      )
    : DEFAULT_WEEKLY_BADGE_CATCHUP_WEEKS;

  const latest = getLastCompletedWeekRange(referenceDate);
  const latestEndKey = toDateKey(latest.endsAt, APP_TIME_ZONE);

  const windows: CompletedWeekWindow[] = [];
  for (let offset = safeCount - 1; offset >= 0; offset -= 1) {
    const endsAtKey = addDays(latestEndKey, -offset * 7);
    const startsAtKey = addDays(endsAtKey, -7);
    windows.push({
      startsAt: toVnMidnight(startsAtKey),
      endsAt: toVnMidnight(endsAtKey),
    });
  }
  return windows;
}

/**
 * Evaluates recent closed weeks (handling late runs and missed weeks) and
 * awards `weekly-top-1` idempotently via `awardCompletedWeekTopBadge`.
 */
export async function runWeeklyTopBadgeJob(
  referenceDate: Date = new Date(),
  options?: { catchUpWeeks?: number },
): Promise<WeeklyTopBadgeJobResult> {
  const checkedWeeks = getRecentCompletedWeekRanges(
    referenceDate,
    options?.catchUpWeeks,
  );
  const awards: WeeklyTopBadgeAwardResult[] = [];
  let totalAwardedCount = 0;

  for (const week of checkedWeeks) {
    const result = await awardCompletedWeekTopBadge(referenceDate, { week });
    awards.push(result);
    totalAwardedCount += result.awardedUserIds.length;
  }

  return {
    referenceDate,
    checkedWeeks,
    awards,
    totalAwardedCount,
  };
}
