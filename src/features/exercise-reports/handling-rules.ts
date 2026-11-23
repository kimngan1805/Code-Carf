import { z } from "zod";

export const REPORT_STATUSES = ["NEW", "IN_PROGRESS", "RESOLVED"] as const;
export const REPORT_STATUS_LABELS = {
  NEW: "Mới",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã xử lý",
};
export const REPORT_PAGE_SIZE = 20;
export const reportUpdateSchema = z
  .object({
    status: z.enum(REPORT_STATUSES),
    version: z.number().int().min(0),
    resolution: z.string().trim().max(2000).default(""),
  })
  .refine(
    (value) => value.status !== "RESOLVED" || value.resolution.length > 0,
    {
      message: "Vui lòng nhập kết quả xử lý để thông báo cho học viên.",
      path: ["resolution"],
    },
  );

export function parseReportFilters(status: unknown, page: unknown) {
  const parsed = z.enum(REPORT_STATUSES).safeParse(status);
  const number =
    typeof page === "string" && /^\d+$/.test(page) ? Number(page) : 1;
  return {
    status: parsed.success ? parsed.data : undefined,
    page:
      Number.isSafeInteger(number) && number >= 1 && number <= 1000
        ? number
        : 1,
  };
}
