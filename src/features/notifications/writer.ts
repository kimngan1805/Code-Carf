import type { SubmissionStatus } from "@prisma/client";
import { formatContestDate } from "@/features/contests/time";
import { logger } from "@/lib/logger";
import {
  createNotification,
  createNotifications,
  findContestSubmissionNotificationContext,
  findEnrolledLearnerIdsForPath,
  findUpcomingContestsForReminders,
} from "./repository";
import { UPCOMING_CONTEST_REMINDER_LEAD_MS } from "./types";

const FINAL_SUBMISSION_STATUS_LABELS: Partial<
  Record<SubmissionStatus, string>
> = {
  ACCEPTED: "Đạt",
  REJECTED: "Chưa đạt",
  ERROR: "Lỗi chấm bài",
};

export interface NewLessonNotificationInput {
  pathId: string;
  pathTitle: string;
  roomId: string;
  roomTitle: string;
  actorUserId: string;
}

/**
 * Notifies enrolled learners when a brand-new lesson is added to a published path.
 * Never throws so lesson authoring never fails because of a notification error.
 */
export async function notifyNewLessonPublished(
  input: NewLessonNotificationInput,
): Promise<number> {
  try {
    const learnerIds = await findEnrolledLearnerIdsForPath(
      input.pathId,
      input.actorUserId,
    );
    if (learnerIds.length === 0) return 0;

    return await createNotifications(
      learnerIds.map((userId) => ({
        userId,
        type: "NEW_LESSON" as const,
        title: `Bài học mới: ${input.roomTitle}`,
        body: `Lộ trình "${input.pathTitle}" vừa thêm bài học "${input.roomTitle}".`,
        href: `/hv/rooms/${input.roomId}`,
        dedupeKey: `new-lesson:${input.roomId}`,
      })),
    );
  } catch (error) {
    logger.error("notification.new_lesson_failed", {
      pathId: input.pathId,
      roomId: input.roomId,
      message: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

export interface ContestSubmissionResultNotificationInput {
  userId: string;
  submissionId: string;
  contestId: string | null;
  exerciseId: string;
  status: SubmissionStatus;
  score: number;
  maxScore: number;
}

/**
 * Notifies the submission owner once a contest submission reaches a final grading result.
 * Ignores practice submissions (`contestId === null`) and intermediate statuses.
 * Never throws so grading completion stays reliable.
 */
export async function notifyContestSubmissionResult(
  input: ContestSubmissionResultNotificationInput,
): Promise<number> {
  if (!input.contestId) return 0;
  const statusLabel = FINAL_SUBMISSION_STATUS_LABELS[input.status];
  if (!statusLabel) return 0;

  try {
    const { contest, exercise } =
      await findContestSubmissionNotificationContext(
        input.contestId,
        input.exerciseId,
      );
    const contestTitle = contest?.title ?? "cuộc thi";
    const exerciseTitle = exercise?.title ?? "bài thi";
    const href = contest?.slug
      ? `/contests/${contest.slug}?tab=leaderboard`
      : "/contests";

    return await createNotification({
      userId: input.userId,
      type: "SUBMISSION_RESULT",
      title: `Kết quả bài thi: ${exerciseTitle}`,
      body: `Bài "${exerciseTitle}" trong cuộc thi "${contestTitle}": ${statusLabel} (${input.score}/${input.maxScore} điểm).`,
      href,
      dedupeKey: `submission-result:${input.submissionId}`,
    });
  } catch (error) {
    logger.error("notification.submission_result_failed", {
      submissionId: input.submissionId,
      contestId: input.contestId,
      message: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

export interface ContestReminderRunResult {
  contestsScanned: number;
  notificationsCreated: number;
}

/**
 * Sends a one-time 24h upcoming-contest reminder to registered `ContestParticipant`s
 * for published contests whose `examStartsAt` falls inside `(now, now + 24h]` and
 * that have not ended. Using the full 24h lookahead window + `(userId, dedupeKey)`
 * prevents missed reminders when a scheduled run arrives late, without duplicates.
 */
export async function sendUpcomingContestReminders(
  referenceNow = new Date(),
): Promise<ContestReminderRunResult> {
  const windowEnd = new Date(
    referenceNow.getTime() + UPCOMING_CONTEST_REMINDER_LEAD_MS,
  );
  const contests = await findUpcomingContestsForReminders(
    referenceNow,
    windowEnd,
  );

  const notifications = contests.flatMap((contest) => {
    if (!contest.examStartsAt) return [];
    if (
      contest.examStartsAt <= referenceNow ||
      contest.examStartsAt > windowEnd
    ) {
      return [];
    }
    if (contest.examEndsAt && contest.examEndsAt <= contest.examStartsAt) {
      return [];
    }

    const startsLabel = formatContestDate(contest.examStartsAt);
    return contest.participants.map((participant) => ({
      userId: participant.userId,
      type: "CONTEST_UPCOMING" as const,
      title: `Cuộc thi sắp diễn ra: ${contest.title}`,
      body: `Cuộc thi "${contest.title}" sẽ bắt đầu lúc ${startsLabel}.`,
      href: `/contests/${contest.slug}`,
      dedupeKey: `contest-upcoming:${contest.id}:24h`,
    }));
  });

  const notificationsCreated = await createNotifications(notifications);
  return {
    contestsScanned: contests.length,
    notificationsCreated,
  };
}

export interface HandwrittenGradedNotificationInput {
  userId: string;
  submissionId: string;
  /** Lần nộp ảnh đang được chấm; nộp ảnh mới rồi chấm lại thì báo lần nữa. */
  submittedAt: Date;
  exerciseId: string;
  exerciseTitle: string;
  /** Điểm thang 10 để hiển thị. */
  score10: number;
}

/**
 * Báo học viên khi giảng viên chấm xong bài tự luận luyện tập. Chấm lại cùng một
 * ảnh không gửi thêm. Không bao giờ ném lỗi để việc chấm luôn lưu được.
 */
export async function notifyHandwrittenGraded(
  input: HandwrittenGradedNotificationInput,
): Promise<number> {
  try {
    return await createNotification({
      userId: input.userId,
      type: "SUBMISSION_RESULT",
      title: `Đã chấm bài: ${input.exerciseTitle}`,
      body: `Bài "${input.exerciseTitle}" được ${input.score10.toLocaleString("vi-VN")}/10 điểm. Mở bài để xem nhận xét của giảng viên.`,
      href: `/hv/exercises/${input.exerciseId}`,
      dedupeKey: `handwritten-graded:${input.submissionId}:${input.submittedAt.getTime()}`,
    });
  } catch (error) {
    logger.error("notification.handwritten_graded_failed", {
      submissionId: input.submissionId,
      message: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}
