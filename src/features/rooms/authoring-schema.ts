import { z } from "zod";

export const lessonFieldsSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập tên bài học.")
      .max(100, "Tên bài học tối đa 100 ký tự."),
    description: z
      .string()
      .trim()
      .max(5000, "Mô tả tối đa 5.000 ký tự.")
      .default(""),
    content: z
      .string()
      .max(100000, "Nội dung tối đa 100.000 ký tự.")
      .refine(
        (value) => value.trim().length > 0,
        "Vui lòng nhập nội dung bài học.",
      ),
  })
  .strict();
const scope = lessonFieldsSchema.extend({
  pathSlug: z.string().min(1).max(200),
});
export const saveLessonSchema = z.union([
  scope.extend({ requestId: z.uuid() }).strict(),
  scope.extend({ roomId: z.string().min(1).max(200) }).strict(),
]);
