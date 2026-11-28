import { stripLessonTemplate } from "@/features/paths/lesson-structure";
import { youtubeVideoId } from "./youtube";

export interface LessonVideo {
  id: string;
  /** Dòng chú thích in nghiêng ngay dưới link (cách chèn video của app), nếu có. */
  caption: string;
}

/** Các video YouTube trong nội dung bài, theo thứ tự xuất hiện, không trùng. */
export function listLessonVideos(content: string): LessonVideo[] {
  const lines = content.split("\n").map((line) => line.trim());
  const seen = new Set<string>();
  const videos: LessonVideo[] = [];
  lines.forEach((line, index) => {
    const id = youtubeVideoId(line);
    if (!id || seen.has(id)) return;
    seen.add(id);
    const next = lines.slice(index + 1).find(Boolean) ?? "";
    const caption = /^_(.+)_$/.exec(next)?.[1]?.replace(/\\(.)/g, "$1") ?? "";
    videos.push({ id, caption });
  });
  return videos;
}

/** Một dòng tóm tắt phần chữ, ví dụ "12 mục · 1 video · 580 ký tự". */
export function summarizeContent(raw: string) {
  if (!raw.trim()) return "Chưa có nội dung chữ";
  // Chỉ đếm phần giảng viên đã viết, không đếm khung mẫu còn trống.
  const content = stripLessonTemplate(raw);
  if (!content) return "Mới có khung mẫu, chưa nhập nội dung";
  const lines = content.split("\n").map((line) => line.trim());
  const sections = lines.filter((line) => /^#{2,3}\s/.test(line)).length;
  const videos = listLessonVideos(content).length;
  return [
    sections ? `${sections} mục` : null,
    videos ? `${videos} video` : null,
    `${content.trim().length.toLocaleString("vi-VN")} ký tự`,
  ]
    .filter(Boolean)
    .join(" · ");
}
