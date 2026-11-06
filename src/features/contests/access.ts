import { AppError } from "@/lib/errors";
import {
  getContestPhase,
  getExamPhase,
  type ContestSchedule,
  type ExamSchedule,
} from "./time";

export function assertRegistrationOpen(
  contest: ContestSchedule & ExamSchedule,
  now: number,
) {
  const phase = getContestPhase(contest, now);
  if (phase !== "live") {
    throw new AppError(
      409,
      "REGISTRATION_CLOSED",
      phase === "upcoming"
        ? "Chưa đến giờ mở đăng ký."
        : "Đăng ký đã đóng hoặc chưa có lịch.",
    );
  }
  if (
    !contest.examStartsAt ||
    !contest.examEndsAt ||
    !contest.endsAt ||
    contest.endsAt > contest.examStartsAt ||
    contest.examEndsAt <= contest.examStartsAt
  ) {
    throw new AppError(
      409,
      "INVALID_SCHEDULE",
      "Lịch đăng ký phải đóng trước giờ thi.",
    );
  }
}

export function assertExamOpen(contest: ExamSchedule, now: number) {
  const phase = getExamPhase(contest, now);
  if (phase !== "live")
    throw new AppError(
      403,
      phase === "upcoming" ? "EXAM_NOT_STARTED" : "CONTEST_NOT_OPEN",
      phase === "upcoming"
        ? "Chưa đến giờ thi. Bạn đã đăng ký và cần chờ giờ bắt đầu."
        : "Cuộc thi đã đóng làm bài hoặc chưa có lịch thi.",
    );
}

export function getAttemptDeadline(
  contest: { examEndsAt: Date | null },
  participant: { deadlineAt: Date | null } | null,
) {
  if (!participant?.deadlineAt) return null;
  return new Date(
    Math.min(
      +participant.deadlineAt,
      contest.examEndsAt ? +contest.examEndsAt : Infinity,
    ),
  );
}

export type AttemptParticipant = {
  startedAt: Date | null;
  deadlineAt: Date | null;
  finishedAt: Date | null;
  faceVerifiedAt: Date | null;
};

export function assertCanStart(
  contest: { requireFaceCheck: boolean },
  participant: AttemptParticipant | null,
): asserts participant is AttemptParticipant {
  if (!participant)
    throw new AppError(
      403,
      "NOT_REGISTERED",
      "Bạn cần đăng ký trước khi bắt đầu làm bài.",
    );
  if (participant.finishedAt)
    throw new AppError(403, "CONTEST_FINISHED", "Bạn đã kết thúc lượt thi.");
  if (contest.requireFaceCheck && !participant.faceVerifiedAt)
    throw new AppError(
      403,
      "FACE_CHECK_REQUIRED",
      "Bạn cần xác minh khuôn mặt trước khi làm bài.",
    );
}

export function assertParticipantCanEnter(
  contest: ExamSchedule & { requireFaceCheck: boolean },
  participant: AttemptParticipant | null,
  now: number,
): asserts participant is AttemptParticipant & {
  startedAt: Date;
  deadlineAt: Date;
} {
  assertCanStart(contest, participant);
  if (!participant.startedAt || !participant.deadlineAt)
    throw new AppError(
      409,
      "ATTEMPT_NOT_STARTED",
      "Bấm Bắt đầu làm bài để bắt đầu lượt thi.",
    );
  assertExamOpen(contest, now);
  if (
    now < +participant.startedAt ||
    now >= +getAttemptDeadline(contest, participant)!
  )
    throw new AppError(
      403,
      "CONTEST_NOT_OPEN",
      "Lượt làm bài của bạn đã hết giờ.",
    );
}
