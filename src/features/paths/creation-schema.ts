import { z } from "zod";
import { COVER_THEME_KEYS } from "./cover-themes";

export const MAX_PATH_TAGS = 5;

/** Bỏ thẻ trùng không phân biệt hoa thường, giữ cách viết của thẻ xuất hiện đầu tiên. */
function uniqueTags(tags: string[]) {
  const seen = new Set<string>();
  return tags.filter((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
    difficulty: z
      .enum(["EASY", "MEDIUM", "HARD"], "Vui lòng chọn độ khó.")
      .default("EASY"),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Thẻ chủ đề không được để trống.")
          .max(24, "Mỗi thẻ chủ đề tối đa 24 ký tự."),
      )
      .max(MAX_PATH_TAGS, `Tối đa ${MAX_PATH_TAGS} thẻ chủ đề.`)
      .default([])
      .transform(uniqueTags),
    estimatedMinutes: z
      .number("Thời lượng phải là số.")
      .int("Thời lượng phải là số nguyên (phút).")
      .min(5, "Thời lượng tối thiểu 5 phút.")
      .max(6000, "Thời lượng tối đa 6.000 phút (100 giờ).")
      .nullable()
      .default(null),
    coverTheme: z
      .enum(COVER_THEME_KEYS, "Ảnh bìa không hợp lệ.")
      .default("blue"),
  })
  .strict();

export const createPathSchema = pathFieldsSchema
  .extend({ requestId: z.uuid("Yêu cầu tạo lộ trình không hợp lệ.") })
  .strict();

export const updatePathSchema = pathFieldsSchema
  .omit({ sequentialUnlock: true })
  .extend({ pathId: z.string().min(1).max(200) })
  .strict();
