export const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";

const LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export type DayStatus = "done" | "today" | "missed" | "upcoming";

export interface WeekDay {
  label: string;
  dateKey: string;
  dayOfMonth: number;
  status: DayStatus;
}

export interface WeekWindow {
  startsAt: Date;
  endsAt: Date;
}

const VN_UTC_OFFSET = "+07:00";

/** Converts a YYYY-MM-DD calendar date in Asia/Ho_Chi_Minh to midnight UTC instant. */
export function toVnMidnight(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00${VN_UTC_OFFSET}`);
}

/** Calendar date (YYYY-MM-DD) of an instant in the app time zone. */
export function toDateKey(date: Date, timeZone = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday-to-Sunday view of the week containing `todayKey`. */
export function getWeekActivity(
  activeDateKeys: Iterable<string>,
  todayKey: string,
): WeekDay[] {
  const active = new Set(activeDateKeys);
  const weekday = (new Date(`${todayKey}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monday = addDays(todayKey, -weekday);
  return LABELS.map((label, index) => {
    const dateKey = addDays(monday, index);
    let status: DayStatus;
    if (active.has(dateKey)) status = "done";
    else if (dateKey === todayKey) status = "today";
    else if (dateKey < todayKey) status = "missed";
    else status = "upcoming";
    return {
      label,
      dateKey,
      dayOfMonth: Number(dateKey.slice(8)),
      status,
    };
  });
}

/**
 * Returns the half-open `[startsAt, endsAt)` range from Monday 00:00 to the
 * next Monday 00:00 in `Asia/Ho_Chi_Minh` containing `referenceDate`.
 */
export function getCurrentWeekRange(
  referenceDate: Date = new Date(),
): WeekWindow {
  if (Number.isNaN(referenceDate.getTime())) {
    throw new Error("Invalid referenceDate");
  }
  const todayKey = toDateKey(referenceDate, APP_TIME_ZONE);
  const weekday = (new Date(`${todayKey}T00:00:00Z`).getUTCDay() + 6) % 7;
  const mondayKey = addDays(todayKey, -weekday);
  const nextMondayKey = addDays(mondayKey, 7);

  return {
    startsAt: toVnMidnight(mondayKey),
    endsAt: toVnMidnight(nextMondayKey),
  };
}
