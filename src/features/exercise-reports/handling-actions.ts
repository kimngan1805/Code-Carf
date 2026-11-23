"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  changeReportStatus,
  markMyReportNotificationsRead,
} from "./handling-service";

export type ReportHandlingState = { ok?: boolean; message?: string };
export async function changeReportAction(
  reportId: string,
  _previous: ReportHandlingState,
  form: FormData,
): Promise<ReportHandlingState> {
  try {
    const version = form.get("version");
    await changeReportStatus(reportId, {
      status: form.get("status"),
      resolution: form.get("resolution"),
      version:
        typeof version === "string" && /^\d+$/.test(version)
          ? Number(version)
          : -1,
    });
    revalidatePath("/gv/reports");
    revalidatePath("/hv/reports");
    return { ok: true, message: "Đã lưu trạng thái báo lỗi." };
  } catch (error) {
    if (error instanceof AppError)
      return {
        ok: false,
        message:
          error.status === 401 || error.status === 403
            ? "Bạn cần đăng nhập bằng tài khoản giáo viên có quyền."
            : error.message,
      };
    logger.error("report_handling_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, message: "Chưa thể lưu báo lỗi. Vui lòng thử lại." };
  }
}

export async function markReportNotificationsReadAction() {
  await markMyReportNotificationsRead();
  revalidatePath("/hv/reports");
}
