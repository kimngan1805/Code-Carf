import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { gradePendingSubmission } from "@/features/grading/submit";
import { AppError } from "@/lib/errors";
import { findContestParticipant } from "./repository";
import { getContestEntry } from "./service";
import { contestDraftSchema } from "./draft-schema";
import { getAttemptDeadline } from "./access";
import {
  finalizeSavedDraft,
  findDeadlineContest,
  findFinalSubmission,
  saveActiveDraft,
  startContestAttempt,
} from "./deadline-repository";
import { closeExpiredStages, findStageDeadline } from "./stage-repository";

export async function saveContestDraft(slug: string, body: unknown) {
  const parsed = contestDraftSchema.safeParse(body);
  if (!parsed.success)
    throw new AppError(
      400,
      "INVALID_DRAFT",
      "Bản nháp không hợp lệ hoặc vượt quá 64 KB.",
    );
  const entry = await getContestEntry(slug);
  const result = await saveActiveDraft(
    entry.contest.id,
    entry.userId,
    parsed.data,
  );
  return { savedAt: result.savedAt.toISOString() };
}

export async function finalizeContest(slug: string) {
  const user = await requireRole([RoleName.STUDENT]);
  const contest = await findDeadlineContest(slug);
  if (!contest)
    throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
  const participant = await findContestParticipant(contest.id, user.id);
  const attemptDeadline = getAttemptDeadline(contest, participant);
  const attemptOver =
    !!participant?.finishedAt ||
    (!!attemptDeadline && Date.now() >= +attemptDeadline);
  // Cuộc thi theo chặng: hết giờ chặng thì tự nộp bài đang làm dở của chặng đó.
  const staged = attemptOver
    ? null
    : await closeExpiredStages(contest.id, user.id);
  const result = staged ?? (await finalizeSavedDraft(contest.id, user.id));
  if (!result.submissionId)
    return { state: "skipped" as const, submission: null };
  await gradePendingSubmission(result.submissionId);
  const submission = await findFinalSubmission(
    result.submissionId,
    contest.id,
    user.id,
  );
  return {
    state: "submitted" as const,
    submission: {
      ...submission,
      createdAt: submission.createdAt.toISOString(),
    },
  };
}

export type ContestFinalization = Awaited<ReturnType<typeof finalizeContest>>;

/** A returning student may recover the deadline result, without reopening statements or editing. */
export async function getExpiredContest(slug: string) {
  const user = await requireRole([RoleName.STUDENT]);
  const contest = await findDeadlineContest(slug);
  if (!contest) return null;
  const participant = await findContestParticipant(contest.id, user.id);
  const deadlineAt = getAttemptDeadline(contest, participant);
  if (!deadlineAt || (!participant?.finishedAt && Date.now() < +deadlineAt))
    return null;
  return {
    slug,
    title: contest.title,
    completed:
      !!participant?.finishedAt && +participant.finishedAt < +deadlineAt,
    deadlineAt: new Date(
      Math.min(
        +deadlineAt,
        participant?.finishedAt ? +participant.finishedAt : Infinity,
      ),
    ).toISOString(),
  };
}

export async function getContestClock(slug: string, stage?: number) {
  try {
    const entry = await getContestEntry(slug);
    // Phòng thi theo chặng đếm ngược tới hạn của chặng đang làm.
    const stageDeadline = stage
      ? await findStageDeadline(entry.contest.id, entry.userId, stage)
      : null;
    const deadlineAt = new Date(
      Math.min(+entry.deadlineAt, stageDeadline ? +stageDeadline : Infinity),
    );
    return {
      serverNow: entry.serverNow,
      deadlineAt: deadlineAt.toISOString(),
    };
  } catch (error) {
    if (
      error instanceof AppError &&
      ["CONTEST_NOT_OPEN", "CONTEST_FINISHED", "CONTEST_NOT_FOUND"].includes(
        error.code,
      )
    ) {
      const expired = await getExpiredContest(slug);
      if (expired)
        return { serverNow: Date.now(), deadlineAt: expired.deadlineAt };
    }
    throw error;
  }
}

export async function startContest(slug: string) {
  const user = await requireRole([RoleName.STUDENT]);
  const contest = await findDeadlineContest(slug);
  if (!contest)
    throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
  const result = await startContestAttempt(contest.id, user.id);
  return {
    startedAt: result.startedAt!.toISOString(),
    deadlineAt: result.deadlineAt!.toISOString(),
  };
}
