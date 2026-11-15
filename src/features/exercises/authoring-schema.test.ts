import { describe, expect, it } from "vitest";
import { exerciseFieldsSchema, MAX_TEST_CASES } from "./authoring-schema";

const valid = {
  title: " Tổng từ 1 đến n ",
  prompt: "In ra tổng 1 + ... + n.",
  difficulty: "EASY",
  points: 100,
  timeLimitMs: 1000,
  memoryMb: 256,
  testCases: [{ input: "5", expected: "15", isHidden: false, weight: 1 }],
};
const message = (value: unknown) => {
  const result = exerciseFieldsSchema.safeParse(value);
  return result.success ? null : result.error.issues[0]?.message;
};

describe("exerciseFieldsSchema", () => {
  it("accepts a code exercise and trims the title", () => {
    const result = exerciseFieldsSchema.parse(valid);
    expect(result.title).toBe("Tổng từ 1 đến n");
  });

  it("rejects an exercise with no test case", () => {
    expect(message({ ...valid, testCases: [] })).toBe(
      "Bài tập cần ít nhất một test case.",
    );
  });

  it("rejects too many test cases", () => {
    const many = Array.from({ length: MAX_TEST_CASES + 1 }, () => ({
      input: "1",
      expected: "1",
    }));
    expect(message({ ...valid, testCases: many })).toBe(
      `Tối đa ${MAX_TEST_CASES} test case.`,
    );
  });

  it("requires an expected output but allows empty input", () => {
    expect(
      exerciseFieldsSchema.safeParse({
        ...valid,
        testCases: [{ input: "", expected: "Hello world" }],
      }).success,
    ).toBe(true);
    expect(
      message({ ...valid, testCases: [{ input: "1", expected: "  " }] }),
    ).toBe("Vui lòng nhập đáp án.");
  });

  it("defaults a test to hidden with weight 1", () => {
    const [test] = exerciseFieldsSchema.parse({
      ...valid,
      testCases: [{ input: "1", expected: "1" }],
    }).testCases;
    expect(test).toMatchObject({ isHidden: true, weight: 1 });
  });

  it("requires a positive integer for points", () => {
    expect(message({ ...valid, points: 0 })).toBe("Điểm (XP) phải lớn hơn 0.");
    expect(message({ ...valid, points: -5 })).toBe("Điểm (XP) phải lớn hơn 0.");
    expect(message({ ...valid, points: 1.5 })).toBe(
      "Điểm (XP) phải là số nguyên.",
    );
    expect(message({ ...valid, points: NaN })).toBeTruthy();
  });

  it("requires a difficulty", () => {
    expect(message({ ...valid, difficulty: "EXTREME" })).toBe(
      "Vui lòng chọn độ khó.",
    );
    expect(message({ ...valid, difficulty: undefined })).toBe(
      "Vui lòng chọn độ khó.",
    );
  });

  it("limits time and memory", () => {
    expect(message({ ...valid, timeLimitMs: 50 })).toBe(
      "Giới hạn thời gian tối thiểu 100 ms.",
    );
    expect(message({ ...valid, timeLimitMs: 60000 })).toBe(
      "Giới hạn thời gian tối đa 10.000 ms.",
    );
    expect(message({ ...valid, memoryMb: 1024 })).toBe(
      "Giới hạn bộ nhớ tối đa 512 MB.",
    );
  });

  it("rejects blank title and prompt", () => {
    expect(message({ ...valid, title: "  " })).toBe(
      "Vui lòng nhập tên bài tập.",
    );
    expect(message({ ...valid, prompt: "  " })).toBe("Vui lòng nhập đề bài.");
  });
});
