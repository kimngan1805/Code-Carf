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
    // Không bắt buộc: bài học có thể chỉ có tài liệu đính kèm hoặc bài tập.
    // Nội dung chỉ toàn khoảng trắng được lưu thành "" để truy vấn "bài trống" chính xác.
    content: z
      .string()
      .max(100000, "Nội dung tối đa 100.000 ký tự.")
      .default("")
      .transform((value) => (value.trim() ? value : "")),
  })
  .strict();
const scope = lessonFieldsSchema.extend({
  pathSlug: z.string().min(1).max(200),
});
export const saveLessonSchema = z.union([
  scope.extend({ requestId: z.uuid() }).strict(),
  scope.extend({ roomId: z.string().min(1).max(200) }).strict(),
]);

export const addLessonVideoSchema = z
  .object({
    pathSlug: z.string().min(1).max(200),
    roomId: z.string().min(1).max(200),
    url: z.string().trim().min(1, "Vui lòng dán link video YouTube.").max(500),
    caption: z.string().max(500).default(""),
  })
  .strict();

const roomScope = {
  pathSlug: z.string().min(1).max(200),
  roomId: z.string().min(1).max(200),
};

export const deleteLessonSchema = z.object(roomScope).strict();

export const moveLessonSchema = z
  .object({ ...roomScope, direction: z.enum(["up", "down"]) })
  .strict();
