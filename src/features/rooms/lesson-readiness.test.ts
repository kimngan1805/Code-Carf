import { describe, expect, it } from "vitest";
import { lessonSkeleton } from "@/features/paths/lesson-structure";
import { lessonHasMaterial } from "./lesson-readiness";

describe("lessonHasMaterial", () => {
  const empty = { content: "", attachmentCount: 0, exerciseCount: 0 };

  it("treats a lesson with nothing to learn as empty", () => {
    expect(lessonHasMaterial(empty)).toBe(false);
    expect(lessonHasMaterial({ ...empty, content: " \n\t " })).toBe(false);
  });

  it("does not count an untouched 12-part template as content", () => {
    const content = lessonSkeleton("Con trỏ cơ bản");
    expect(lessonHasMaterial({ ...empty, content })).toBe(false);
    // Có PDF thì bài vẫn dùng được dù khung mẫu còn trống.
    expect(lessonHasMaterial({ ...empty, content, attachmentCount: 1 })).toBe(
      true,
    );
  });

  it.each([
    { content: "Con trỏ là biến lưu địa chỉ ô nhớ." },
    { attachmentCount: 1 },
    { exerciseCount: 1 },
  ])("accepts any one kind of material: %j", (material) => {
    expect(lessonHasMaterial({ ...empty, ...material })).toBe(true);
  });
});
