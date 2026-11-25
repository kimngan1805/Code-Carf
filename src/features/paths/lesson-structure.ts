import {
  BookmarkCheck,
  Bug,
  Code,
  Cog,
  Compass,
  Dumbbell,
  Lightbulb,
  ListChecks,
  MonitorPlay,
  Rocket,
  Scale,
  Shapes,
  type LucideIcon,
} from "lucide-react";

export type LessonPart = {
  name: string;
  english: string;
  question: string;
  icon: LucideIcon;
};

/**
 * Khung chuẩn của một bài học, chia 4 chặng để người học thấy được hành trình.
 * Hiện là khung giao diện cố định; chưa lưu theo từng bài trong cơ sở dữ liệu.
 */
export const LESSON_PHASES: {
  title: string;
  summary: string;
  tone: string;
  parts: LessonPart[];
}[] = [
  {
    title: "Hiểu",
    summary: "Nắm chủ đề là gì",
    tone: "bg-brand-sky-light/60",
    parts: [
      {
        name: "Tổng quan",
        english: "Overview",
        question: "Giới thiệu chủ đề và mục tiêu học tập",
        icon: Compass,
      },
      {
        name: "Khái niệm",
        english: "Concept",
        question: "Kiến thức này là gì?",
        icon: Lightbulb,
      },
      {
        name: "Đặc điểm",
        english: "Characteristics",
        question: "Có những đặc điểm gì?",
        icon: ListChecks,
      },
      {
        name: "Phân loại",
        english: "Classification",
        question: "Bao gồm những loại nào?",
        icon: Shapes,
      },
    ],
  },
  {
    title: "Nắm cách làm",
    summary: "Đọc và viết được code",
    tone: "bg-brand-sky/20",
    parts: [
      {
        name: "Cách thức hoạt động",
        english: "Mechanism",
        question: "Hoạt động như thế nào?",
        icon: Cog,
      },
      {
        name: "Cú pháp",
        english: "Syntax",
        question: "Cách khai báo và sử dụng trong code",
        icon: Code,
      },
      {
        name: "Ví dụ minh họa",
        english: "Example",
        question: "Ví dụ code kèm giải thích",
        icon: MonitorPlay,
      },
    ],
  },
  {
    title: "Vận dụng",
    summary: "Dùng đúng chỗ, tránh lỗi",
    tone: "bg-brand-orange/15",
    parts: [
      {
        name: "Ứng dụng thực tế",
        english: "Application",
        question: "Khi nào và tại sao cần sử dụng?",
        icon: Rocket,
      },
      {
        name: "Ưu và nhược điểm",
        english: "Pros & Cons",
        question: "Điểm mạnh và hạn chế",
        icon: Scale,
      },
      {
        name: "Lỗi thường gặp",
        english: "Common Errors",
        question: "Các lỗi và cách khắc phục",
        icon: Bug,
      },
    ],
  },
  {
    title: "Củng cố",
    summary: "Nhớ lâu, làm được",
    tone: "bg-brand-blue/10",
    parts: [
      {
        name: "Ghi nhớ",
        english: "Key Takeaways",
        question: "Tổng hợp kiến thức trọng tâm",
        icon: BookmarkCheck,
      },
      {
        name: "Luyện tập",
        english: "Practice",
        question: "Trắc nghiệm và bài tập lập trình",
        icon: Dumbbell,
      },
    ],
  },
];

export const LESSON_PART_COUNT = LESSON_PHASES.reduce(
  (sum, phase) => sum + phase.parts.length,
  0,
);

/** Số thứ tự 01-12 liên tục qua các chặng. */
export const PHASE_OFFSETS = LESSON_PHASES.map((_, index) =>
  LESSON_PHASES.slice(0, index).reduce(
    (sum, phase) => sum + phase.parts.length,
    0,
  ),
);

/** Nội dung Markdown khởi tạo cho một bài mới: đủ 12 phần để giảng viên điền tiếp. */
export function lessonSkeleton(title: string) {
  const sections = LESSON_PHASES.flatMap((phase) =>
    phase.parts.map((part) => `## ${part.name}\n\n_${part.question}_`),
  );
  return [`# ${title}`, ...sections].join("\n\n");
}

const TEMPLATE_PROMPTS = new Set(
  LESSON_PHASES.flatMap((phase) =>
    phase.parts.map((part) => `_${part.question}_`),
  ),
);
const TEMPLATE_HEADINGS = new Set(
  LESSON_PHASES.flatMap((phase) => phase.parts.map((part) => part.name)),
);
const HEADING = /^(#{1,6})\s+(.*?)\s*$/;
const FENCE = /^\s*(`{3,}|~{3,})/;

/**
 * Bỏ phần khung mẫu chưa ai điền: câu gợi ý in nghiêng còn nguyên và tiêu đề mục
 * mẫu không có nội dung bên dưới. Còn lại mỗi tiêu đề bài (# ...) thì coi như trống.
 * Dùng để đếm, kiểm tra xuất bản và hiển thị cho học viên; ô soạn vẫn giữ nguyên.
 */
export function stripLessonTemplate(content: string): string {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  let fence: string | null = null;
  const kept: { text: string; heading?: { level: number; name: string } }[] =
    [];
  for (const line of lines) {
    const marker = FENCE.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = marker[0];
      else if (marker[0] === fence) fence = null;
      kept.push({ text: line });
      continue;
    }
    if (fence) {
      kept.push({ text: line });
      continue;
    }
    if (TEMPLATE_PROMPTS.has(line.trim())) continue;
    const match = HEADING.exec(line);
    kept.push(
      match
        ? { text: line, heading: { level: match[1].length, name: match[2] } }
        : { text: line },
    );
  }
  // Bỏ tiêu đề mục mẫu không còn gì bên dưới (tới tiêu đề kế tiếp cùng cấp hoặc cao hơn).
  const result = kept.filter((entry, index) => {
    const heading = entry.heading;
    if (!heading || heading.level < 2 || !TEMPLATE_HEADINGS.has(heading.name))
      return true;
    for (const next of kept.slice(index + 1)) {
      if (next.heading && next.heading.level <= heading.level) return false;
      if (next.text.trim()) return true;
    }
    return false;
  });
  const text = result
    .map((entry) => entry.text)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // Chỉ còn mỗi tiêu đề bài thì chưa có nội dung.
  const meaningful = result.some(
    (entry) =>
      entry.text.trim() && !(entry.heading && entry.heading.level === 1),
  );
  return meaningful ? text : "";
}
