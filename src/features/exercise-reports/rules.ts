import { z } from "zod";

export const REPORT_COOLDOWN_MS = 5 * 60 * 1000;
export const REPORT_MAX_LENGTH = 2000;
export const REPORT_KINDS = [
  { value: "STATEMENT", label: "Đề bài sai" },
  { value: "TEST_CASE", label: "Test sai" },
  { value: "AMBIGUOUS", label: "Đề bài mơ hồ" },
] as const;

export const reportSchema = z.object({
  kind: z.enum(["STATEMENT", "TEST_CASE", "AMBIGUOUS"], {
    error: "Vui lòng chọn loại lỗi.",
  }),
  description: z
    .string({ error: "Vui lòng nhập mô tả lỗi." })
    .trim()
    .min(1, "Vui lòng nhập mô tả lỗi.")
    .max(REPORT_MAX_LENGTH, `Mô tả tối đa ${REPORT_MAX_LENGTH} ký tự.`),
});

export type ReportInput = z.infer<typeof reportSchema>;
