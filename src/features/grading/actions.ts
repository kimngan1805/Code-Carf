"use server";

import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import { submitPractice, type PracticeSubmissionView } from "./practice-submit";

export type PracticeSubmitState =
  | { ok: true; result: PracticeSubmissionView }
  | { ok: false; code: string; message: string };

const AUTH_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
  FORBIDDEN: "Bạn không có quyền nộp bài này.",
};

/** Expected failures (rate limit, locked room, ...) come back as data so the UI can show them. */
export async function submitPracticeAction(
  exerciseId: string,
  body: { source: string; language: string },
): Promise<PracticeSubmitState> {
  try {
    return { ok: true, result: await submitPractice(exerciseId, body) };
  } catch (error) {
    if (error instanceof AppError)
      return {
        ok: false,
        code: error.code,
        message: AUTH_MESSAGES[error.code] ?? error.message,
      };
    logger.error("practice_submit_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Không thể nộp bài lúc này, vui lòng thử lại.",
    };
  }
}
