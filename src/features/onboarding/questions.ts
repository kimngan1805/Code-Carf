import { LearningGoal, SkillLevel } from "@prisma/client";
import { z } from "zod";

export interface Option<T extends string | number> {
  value: T;
  label: string;
  hint: string;
}

export const levelOptions: Option<SkillLevel>[] = [
  {
    value: SkillLevel.BEGINNER,
    label: "Mới bắt đầu",
    hint: "Chưa viết code hoặc mới làm quen vài buổi",
  },
  {
    value: SkillLevel.BASIC,
    label: "Biết cơ bản",
    hint: "Đã viết được biến, vòng lặp, hàm",
  },
  {
    value: SkillLevel.INTERMEDIATE,
    label: "Khá vững",
    hint: "Đã giải bài thuật toán hoặc làm dự án nhỏ",
  },
];

export const goalOptions: Option<LearningGoal>[] = [
  {
    value: LearningGoal.FUNDAMENTALS,
    label: "Nắm chắc nền tảng",
    hint: "Học bài bản từ cú pháp đến tư duy lập trình",
  },
  {
    value: LearningGoal.ALGORITHMS,
    label: "Ôn thuật toán",
    hint: "Chuẩn bị thi cuối kỳ hoặc phỏng vấn",
  },
  {
    value: LearningGoal.CONTESTS,
    label: "Thi lập trình",
    hint: "Luyện giải đề có tính giờ, leo bảng xếp hạng",
  },
  {
    value: LearningGoal.WEB,
    label: "Làm web",
    hint: "Tự dựng trang web với HTML, CSS, JavaScript",
  },
];

export const languageOptions: Option<string>[] = [
  { value: "python", label: "Python", hint: "Dễ đọc, hợp người mới" },
  { value: "cpp", label: "C/C++", hint: "Phổ biến khi thi thuật toán" },
  {
    value: "java",
    label: "Java",
    hint: "Hướng đối tượng, dùng nhiều ở trường",
  },
  { value: "javascript", label: "JavaScript", hint: "Ngôn ngữ của web" },
];

export const dailyOptions: Option<number>[] = [
  { value: 15, label: "15 phút", hint: "Nhẹ nhàng, giữ thói quen" },
  { value: 30, label: "30 phút", hint: "Đều đặn mỗi ngày" },
  { value: 60, label: "1 giờ", hint: "Tiến bộ nhanh" },
  { value: 90, label: "Hơn 1 giờ", hint: "Học nghiêm túc" },
];

export const studentOnboardingSchema = z.object({
  level: z.enum(SkillLevel, "Hãy chọn trình độ"),
  goal: z.enum(LearningGoal, "Hãy chọn mục tiêu"),
  languages: z
    .array(
      z.enum(
        languageOptions.map((option) => option.value) as [string, ...string[]],
      ),
    )
    .min(1, "Chọn ít nhất một ngôn ngữ"),
  dailyMinutes: z.coerce
    .number()
    .refine(
      (value) => dailyOptions.some((option) => option.value === value),
      "Hãy chọn thời gian",
    ),
});

export type StudentOnboarding = z.infer<typeof studentOnboardingSchema>;
