import type { Prisma } from "@prisma/client";
import { stripLessonTemplate } from "@/features/paths/lesson-structure";

/**
 * Một bài học dùng được khi có ít nhất một thứ để học: phần chữ (Markdown, gồm cả
 * video), tài liệu đính kèm (PDF, PPTX...) hoặc bài tập. Giảng viên có thể chỉ đặt
 * tiêu đề rồi tải slide lên, khung 12 phần chỉ là mẫu gợi ý.
 */
export interface LessonMaterial {
  content: string;
  attachmentCount: number;
  exerciseCount: number;
}

export function lessonHasMaterial(lesson: LessonMaterial) {
  return (
    // Khung mẫu chưa ai điền không tính là nội dung.
    stripLessonTemplate(lesson.content) !== "" ||
    lesson.attachmentCount > 0 ||
    lesson.exerciseCount > 0
  );
}

/** Điều kiện Prisma cho bài học chưa có gì (nội dung trống được lưu thành ""). */
export const EMPTY_LESSON_WHERE = {
  content: "",
  attachments: { none: {} },
  exercises: { none: {} },
} satisfies Prisma.RoomWhereInput;

export const LESSON_NOT_READY_MESSAGE =
  "Mỗi bài học cần có nội dung, tài liệu đính kèm hoặc bài tập trước khi xuất bản lộ trình.";
