import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import { HISTORY_PAGE_SIZE, paginate, parsePage } from "./history-view";
import {
  countPracticeSubmissions,
  findPracticeSubmissions,
  findSubmissionForHistory,
} from "./repository";

/**
 * The signed-in learner's practice submissions, newest first.
 * The user comes from the session, never from the request, so a learner can
 * only ever list their own submissions.
 */
export async function getSubmissionHistory(rawPage?: unknown) {
  const user = await requireRole([RoleName.STUDENT]);
  const total = await countPracticeSubmissions(user.id);
  const { page, totalPages, skip } = paginate(parsePage(rawPage), total);
  const rows = await findPracticeSubmissions(user.id, skip, HISTORY_PAGE_SIZE);
  return {
    items: rows.map((row) => ({
      id: row.id,
      status: row.status,
      score: row.score,
      maxScore: row.exercise.points,
      language: row.language,
      createdAt: row.createdAt,
      exercise: { id: row.exercise.id, title: row.exercise.title },
    })),
    page,
    totalPages,
    total,
  };
}

/**
 * One of the learner's own submissions with its code and result.
 * Someone else's submission is 403 and its code is never returned. Contest
 * submissions are not part of practice history and answer 404, but only after
 * the ownership check so the answer never reveals another learner's data.
 */
export async function getSubmissionDetail(id: string) {
  const user = await requireRole([RoleName.STUDENT]);
  const row = await findSubmissionForHistory(id);
  if (!row)
    throw new AppError(404, "SUBMISSION_NOT_FOUND", "Không tìm thấy bài nộp.");
  if (row.userId !== user.id)
    throw new AppError(
      403,
      "SUBMISSION_FORBIDDEN",
      "Bạn không có quyền xem bài nộp này.",
    );
  if (row.contestId)
    throw new AppError(404, "SUBMISSION_NOT_FOUND", "Không tìm thấy bài nộp.");
  return {
    id: row.id,
    status: row.status,
    score: row.score,
    maxScore: row.exercise.points,
    feedback: row.feedback,
    runtimeMs: row.runtimeMs,
    memoryKb: row.memoryKb,
    language: row.language,
    source: row.source ?? "",
    createdAt: row.createdAt,
    exercise: { id: row.exercise.id, title: row.exercise.title },
    room: row.exercise.room,
  };
}

export type SubmissionHistory = Awaited<
  ReturnType<typeof getSubmissionHistory>
>;
export type SubmissionDetail = Awaited<ReturnType<typeof getSubmissionDetail>>;
