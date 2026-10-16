import { AppError } from "@/lib/errors";
import { getContestPhase, type ContestSchedule } from "./time";

export function assertRegistrationOpen(contest: ContestSchedule, now: number) {
  const phase = getContestPhase(contest, now);
  if (phase === "unscheduled" || phase === "ended") {
    throw new AppError(
      409,
      "REGISTRATION_CLOSED",
      "Cuộc thi chưa có lịch hoặc đã kết thúc.",
    );
  }
}

export function assertContestOpen(contest: ContestSchedule, now: number) {
  const phase = getContestPhase(contest, now);
  if (phase !== "live") {
    throw new AppError(
      403,
      "CONTEST_NOT_OPEN",
      phase === "upcoming"
        ? "Chưa đến giờ bắt đầu cuộc thi."
        : "Cuộc thi không trong thời gian làm bài.",
    );
  }
}

export function assertParticipantCanEnter(
  contest: ContestSchedule & { requireFaceCheck: boolean },
  participant: { finishedAt: Date | null; faceVerifiedAt: Date | null } | null,
  now: number,
) {
  assertContestOpen(contest, now);
  if (!participant)
    throw new AppError(
      403,
      "NOT_REGISTERED",
      "Bạn cần đăng ký trước khi vào thi.",
    );
  if (participant.finishedAt)
    throw new AppError(403, "CONTEST_FINISHED", "Bạn đã kết thúc lượt thi.");
  if (contest.requireFaceCheck && !participant.faceVerifiedAt) {
    throw new AppError(
      403,
      "FACE_CHECK_REQUIRED",
      "Bạn cần xác minh khuôn mặt trước khi vào cuộc thi này.",
    );
  }
}
