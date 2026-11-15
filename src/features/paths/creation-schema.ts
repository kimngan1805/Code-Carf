import { z } from "zod";

export const pathFieldsSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập tên lộ trình.")
      .max(100, "Tên lộ trình tối đa 100 ký tự."),
    description: z
      .string()
      .trim()
      .max(5000, "Mô tả tối đa 5.000 ký tự.")
      .default(""),
    sequentialUnlock: z.boolean().default(true),
  })
  .strict();

export const createPathSchema = pathFieldsSchema
  .extend({ requestId: z.uuid("Yêu cầu tạo lộ trình không hợp lệ.") })
  .strict();
