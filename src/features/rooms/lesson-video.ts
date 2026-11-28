import { youtubeVideoId } from "./youtube";

export const VIDEO_SECTION_TITLE = "Video bài giảng";
const MAX_CAPTION = 200;

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const FENCE = /^\s*(`{3,}|~{3,})/;

/** Chú thích một dòng, bỏ ký tự Markdown có thể làm vỡ dòng in nghiêng. */
export function cleanCaption(caption: string) {
  return caption
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CAPTION)
    .replace(/([\\_*`[\]<>])/g, "\\$1");
}

/** Vị trí các dòng tiêu đề thật (bỏ qua dòng bắt đầu bằng # nằm trong khối code). */
function headings(lines: string[]) {
  const found: { index: number; level: number; text: string }[] = [];
  let fence: string | null = null;
  lines.forEach((line, index) => {
    const marker = FENCE.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = marker[0];
      else if (marker[0] === fence) fence = null;
      return;
    }
    if (fence) return;
    const match = HEADING.exec(line);
    if (match)
      found.push({ index, level: match[1].length, text: match[2].trim() });
  });
  return found;
}

/**
 * Chèn `block` vào cuối mục bắt đầu ở tiêu đề `section`: trước tiêu đề kế tiếp
 * cùng cấp hoặc cao hơn (mục con vẫn thuộc mục này), hoặc cuối bài.
 */
function appendToSection(
  lines: string[],
  all: ReturnType<typeof headings>,
  section: { index: number; level: number },
  block: string,
) {
  const next = all.find(
    (heading) =>
      heading.index > section.index && heading.level <= section.level,
  );
  const end = next ? next.index : lines.length;
  const before = lines.slice(0, end).join("\n").replace(/\s+$/, "");
  const rest = lines.slice(end).join("\n");
  return rest ? `${before}\n\n${block}\n\n${rest}` : `${before}\n\n${block}\n`;
}

export type InsertVideoResult =
  | { ok: true; content: string; videoId: string }
  | { ok: false; reason: "INVALID_URL" | "DUPLICATE" };

/**
 * Thêm một video YouTube vào nội dung bài học.
 *
 * - Bài đã có mục "Video bài giảng": video mới nằm cuối mục đó.
 * - Chưa có nhưng có mục "Tổng quan" (khung 12 phần): tạo mục video ngay sau Tổng quan.
 * - Còn lại: tạo mục video ở cuối bài.
 *
 * Link luôn được ghi lại ở dạng chuẩn, trên một dòng riêng, để trình hiển thị
 * Markdown nhận ra và nhúng thành khung phát. Video đã có trong bài thì không thêm lần nữa.
 */
export function insertLessonVideo(
  content: string,
  url: string,
  caption = "",
): InsertVideoResult {
  const videoId = youtubeVideoId(url.trim());
  if (!videoId) return { ok: false, reason: "INVALID_URL" };

  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const existing = lines.some((line) => {
    const href = line.trim();
    return href !== "" && youtubeVideoId(href) === videoId;
  });
  if (existing) return { ok: false, reason: "DUPLICATE" };

  const note = cleanCaption(caption);
  const block = `https://www.youtube.com/watch?v=${videoId}${note ? `\n\n_${note}_` : ""}`;
  const all = headings(lines);
  const sectionHeading = (name: string) =>
    all.find((heading) => heading.text.toLowerCase() === name.toLowerCase());

  const section = sectionHeading(VIDEO_SECTION_TITLE);
  if (section)
    return {
      ok: true,
      videoId,
      content: appendToSection(lines, all, section, block),
    };

  const overview = sectionHeading("Tổng quan");
  const level = overview ? Math.min(overview.level + 1, 6) : 2;
  const newSection = `${"#".repeat(level)} ${VIDEO_SECTION_TITLE}\n\n${block}`;
  if (overview)
    return {
      ok: true,
      videoId,
      content: appendToSection(lines, all, overview, newSection),
    };

  const trimmed = content.replace(/\s+$/, "");
  return {
    ok: true,
    videoId,
    content: trimmed ? `${trimmed}\n\n${newSection}\n` : `${newSection}\n`,
  };
}
