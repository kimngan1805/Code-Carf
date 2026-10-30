export type ContestPhase = "upcoming" | "live" | "ended" | "unscheduled";
export type ContestSchedule = { startsAt: Date | null; endsAt: Date | null };
export type ExamSchedule = {
  examStartsAt: Date | null;
  examEndsAt: Date | null;
};

export function getExamPhase(contest: ExamSchedule, now: number): ContestPhase {
  return getContestPhase(
    { startsAt: contest.examStartsAt, endsAt: contest.examEndsAt },
    now,
  );
}

export const phaseLabels: Record<ContestPhase, string> = {
  upcoming: "Chưa mở đăng ký",
  live: "Đang mở đăng ký",
  ended: "Đã đóng đăng ký",
  unscheduled: "Chưa có lịch",
};

export const examPhaseLabels: Record<ContestPhase, string> = {
  upcoming: "Sắp diễn ra",
  live: "Đang thi",
  ended: "Đã đóng làm bài",
  unscheduled: "Chưa có lịch thi",
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
