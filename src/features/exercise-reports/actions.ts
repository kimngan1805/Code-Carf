"use server";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { reportExercise } from "./service";

export type ReportState = { ok?: boolean; message?: string };

export async function reportExerciseAction(
  exerciseId: string,
  _previous: ReportState,
  form: FormData,
): Promise<ReportState> {
  try {
    await reportExercise(exerciseId, {
      kind: form.get("kind"),
      description: form.get("description"),
    });
    return {
      ok: true,
      message: "Đã ghi nhận báo lỗi của bạn. Cảm ơn bạn đã góp ý!",
    };
  } catch (error) {
    if (error instanceof AppError)
      return {
        ok: false,
        message:
          error.code === "UNAUTHORIZED"
            ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            : error.code === "FORBIDDEN"
              ? "Chỉ học viên mới có thể báo lỗi đề."
              : error.message,
      };
    logger.error("exercise_report_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, message: "Chưa thể gửi báo lỗi. Vui lòng thử lại." };
  }
}
