export type ContestPhase = "upcoming" | "live" | "ended" | "unscheduled";
export type ContestSchedule = { startsAt: Date | null; endsAt: Date | null };

export const phaseLabels: Record<ContestPhase, string> = {
  upcoming: "Sắp diễn ra",
  live: "Đang diễn ra",
  ended: "Đã kết thúc",
  unscheduled: "Chưa có lịch",
};

export function getContestPhase(
  contest: ContestSchedule,
  now: number,
): ContestPhase {
  if (
    !contest.startsAt ||
    !contest.endsAt ||
    contest.endsAt <= contest.startsAt
  )
    return "unscheduled";
  if (now < contest.startsAt.getTime()) return "upcoming";
  if (now >= contest.endsAt.getTime()) return "ended";
  return "live";
}

export function formatContestDate(date: Date | null) {
  if (!date) return "Chưa công bố";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

export function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours, minutes, seconds % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}
