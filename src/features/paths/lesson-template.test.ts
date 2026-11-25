import { describe, expect, it } from "vitest";
import { lessonSkeleton, stripLessonTemplate } from "./lesson-structure";

describe("stripLessonTemplate", () => {
  it("treats an untouched 12-part template as empty", () => {
    expect(stripLessonTemplate(lessonSkeleton("Con trỏ cơ bản"))).toBe("");
  });

  it("keeps only the sections the teacher filled in", () => {
    const content = lessonSkeleton("Con trỏ").replace(
      "_Kiến thức này là gì?_",
      "Con trỏ là biến lưu **địa chỉ** ô nhớ.",
    );
    expect(stripLessonTemplate(content)).toBe(
      "# Con trỏ\n\n## Khái niệm\n\nCon trỏ là biến lưu **địa chỉ** ô nhớ.",
    );
  });

  it("keeps a template section that has a video or sub-heading content", () => {
    const content = lessonSkeleton("Bài").replace(
      "## Tổng quan\n\n_Giới thiệu chủ đề và mục tiêu học tập_",
      "## Tổng quan\n\n### Video bài giảng\n\nhttps://youtu.be/ubPxYhz1wvU",
    );
    expect(stripLessonTemplate(content)).toBe(
      "# Bài\n\n## Tổng quan\n\n### Video bài giảng\n\nhttps://youtu.be/ubPxYhz1wvU",
    );
  });

  it("leaves content written without the template untouched", () => {
    const content =
      "# Bài\n\n## Phần riêng\n\n_Ghi chú in nghiêng của giảng viên_";
    expect(stripLessonTemplate(content)).toBe(content);
  });

  it("does not touch lines inside code blocks", () => {
    const content = "```md\n## Khái niệm\n\n_Kiến thức này là gì?_\n```";
    expect(stripLessonTemplate(content)).toBe(content);
  });

  it("returns empty for blank content or a lone title", () => {
    expect(stripLessonTemplate("")).toBe("");
    expect(stripLessonTemplate("# Chỉ có tiêu đề\n\n")).toBe("");
  });
});
