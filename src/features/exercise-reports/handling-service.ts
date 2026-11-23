import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import { parseReportFilters, reportUpdateSchema } from "./handling-rules";
import {
  countReportNotifications,
  listReportPage,
  ownedReportsWhere,
  readReportNotifications,
  updateOwnedReport,
} from "./handling-repository";

export async function getManagedReports(status: unknown, page: unknown) {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  const filters = parseReportFilters(status, page);
  return {
    ...(await listReportPage(
      {
        ...ownedReportsWhere(user.id, user.role.name === RoleName.ADMIN),
        ...(filters.status ? { status: filters.status } : {}),
      },
      filters.page,
    )),
    filter: filters.status,
  };
}

export async function changeReportStatus(reportId: string, input: unknown) {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  const parsed = reportUpdateSchema.safeParse(input);
  if (
    !parsed.success ||
    typeof reportId !== "string" ||
    !reportId ||
    reportId.length > 200
  )
    throw new AppError(
      400,
      "INVALID_REPORT_UPDATE",
      parsed.error?.issues[0]?.message ?? "Dữ liệu xử lý báo lỗi không hợp lệ.",
    );
  return updateOwnedReport(
    user.id,
    user.role.name === RoleName.ADMIN,
    reportId,
    parsed.data,
  );
}

export async function getMyReports(page: unknown, reportId?: unknown) {
  const user = await requireRole([RoleName.STUDENT]);
  if (
    reportId !== undefined &&
    (typeof reportId !== "string" || !reportId || reportId.length > 200)
  )
    throw new AppError(400, "INVALID_REPORT_ID", "Mã báo lỗi không hợp lệ.");
  const [data, unread] = await Promise.all([
    listReportPage(
      {
        userId: user.id,
        ...(typeof reportId === "string" ? { id: reportId } : {}),
      },
      reportId ? 1 : parseReportFilters(undefined, page).page,
    ),
    countReportNotifications(user.id),
  ]);
  return { ...data, unread };
}

export async function markMyReportNotificationsRead() {
  const user = await requireRole([RoleName.STUDENT]);
  return readReportNotifications(user.id);
}
