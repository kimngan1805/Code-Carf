import { describe, expect, it } from "vitest";
import { createPathSchema, pathFieldsSchema } from "./creation-schema";

const message = (value: unknown) => {
  const result = pathFieldsSchema.safeParse(value);
  return result.success ? null : result.error.issues[0]?.message;
};

describe("pathFieldsSchema metadata", () => {
  it("defaults metadata so old callers keep working", () => {
    expect(pathFieldsSchema.parse({ title: "C++" })).toMatchObject({
      difficulty: "EASY",
      tags: [],
      estimatedMinutes: null,
      coverTheme: "blue",
    });
  });

  it("trims tags and drops case-insensitive duplicates", () => {
    const { tags } = pathFieldsSchema.parse({
      title: "C++",
      tags: [" C++ ", "c++", "Nhập môn", "nhập MÔN"],
    });
    expect(tags).toEqual(["C++", "Nhập môn"]);
  });

  it("limits the number and length of tags", () => {
    const base = { title: "C++" };
    expect(message({ ...base, tags: ["a", "b", "c", "d", "e", "f"] })).toBe(
      "Tối đa 5 thẻ chủ đề.",
    );
    expect(message({ ...base, tags: ["x".repeat(25)] })).toBe(
      "Mỗi thẻ chủ đề tối đa 24 ký tự.",
    );
    expect(message({ ...base, tags: ["  "] })).toBe(
      "Thẻ chủ đề không được để trống.",
    );
  });

  it("validates the estimated duration in minutes", () => {
    const base = { title: "C++" };
    expect(message({ ...base, estimatedMinutes: 720 })).toBeNull();
    expect(message({ ...base, estimatedMinutes: 1 })).toBe(
      "Thời lượng tối thiểu 5 phút.",
    );
    expect(message({ ...base, estimatedMinutes: 7000 })).toBe(
      "Thời lượng tối đa 6.000 phút (100 giờ).",
    );
    expect(message({ ...base, estimatedMinutes: 1.5 })).toBe(
      "Thời lượng phải là số nguyên (phút).",
    );
  });

  it("rejects an unknown difficulty or cover theme", () => {
    expect(message({ title: "C++", difficulty: "EXTREME" })).toBe(
      "Vui lòng chọn độ khó.",
    );
    expect(message({ title: "C++", coverTheme: "<script>" })).toBe(
      "Ảnh bìa không hợp lệ.",
    );
  });

  it("does not allow forging the publication date through creation", () => {
    const result = createPathSchema.safeParse({
      title: "C++",
      requestId: "a6932f74-856d-41a1-8182-a3f4d6dccae0",
      publishedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});
