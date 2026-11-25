import { describe, expect, it } from "vitest";
import { LESSON_PART_COUNT, lessonSkeleton } from "./lesson-structure";

describe("lessonSkeleton", () => {
  it("starts with the lesson title and lists every part in order", () => {
    const content = lessonSkeleton("Biến và kiểu dữ liệu");
    const headings = content.match(/^## .+$/gm) ?? [];

    expect(content.startsWith("# Biến và kiểu dữ liệu")).toBe(true);
    expect(headings).toHaveLength(LESSON_PART_COUNT);
    expect(headings[0]).toBe("## Tổng quan");
    expect(headings.at(-1)).toBe("## Luyện tập");
  });
});
