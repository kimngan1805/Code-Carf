import { z } from "zod";

export const MAX_TEST_CASES = 50;
const MAX_IO_LENGTH = 10000;

export const testCaseSchema = z
  .object({
    input: z
      .string()
      .max(MAX_IO_LENGTH, "Đầu vào tối đa 10.000 ký tự.")
      .default(""),
    expected: z
      .string()
      .max(MAX_IO_LENGTH, "Đáp án tối đa 10.000 ký tự.")
      .refine((value) => value.trim().length > 0, "Vui lòng nhập đáp án."),
    isHidden: z.boolean().default(true),
    weight: z
      .number("Điểm của test phải là số.")
      .int("Điểm của test phải là số nguyên.")
      .min(1, "Điểm của test tối thiểu là 1.")
      .max(100, "Điểm của test tối đa là 100.")
      .default(1),
  })
  .strict();

export const exerciseFieldsSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập tên bài tập.")
      .max(100, "Tên bài tập tối đa 100 ký tự."),
    prompt: z
      .string()
      .max(100000, "Đề bài tối đa 100.000 ký tự.")
      .refine((value) => value.trim().length > 0, "Vui lòng nhập đề bài."),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"], "Vui lòng chọn độ khó."),
    points: z
      .number("Điểm (XP) phải là số.")
      .int("Điểm (XP) phải là số nguyên.")
      .min(1, "Điểm (XP) phải lớn hơn 0.")
      .max(10000, "Điểm (XP) tối đa 10.000."),
    timeLimitMs: z
      .number("Giới hạn thời gian phải là số.")
      .int("Giới hạn thời gian phải là số nguyên.")
      .min(100, "Giới hạn thời gian tối thiểu 100 ms.")
      .max(10000, "Giới hạn thời gian tối đa 10.000 ms."),
    memoryMb: z
      .number("Giới hạn bộ nhớ phải là số.")
      .int("Giới hạn bộ nhớ phải là số nguyên.")
      .min(16, "Giới hạn bộ nhớ tối thiểu 16 MB.")
      .max(512, "Giới hạn bộ nhớ tối đa 512 MB."),
    testCases: z
      .array(testCaseSchema)
      .min(1, "Bài tập cần ít nhất một test case.")
      .max(MAX_TEST_CASES, `Tối đa ${MAX_TEST_CASES} test case.`),
  })
  .strict();

export type ExerciseFields = z.infer<typeof exerciseFieldsSchema>;

const scope = exerciseFieldsSchema.extend({
  pathSlug: z.string().min(1).max(200),
  roomId: z.string().min(1).max(200),
});
export const saveExerciseSchema = z.union([
  scope.extend({ requestId: z.uuid() }).strict(),
  scope.extend({ exerciseId: z.string().min(1).max(200) }).strict(),
]);

export const deleteExerciseSchema = z
  .object({
    pathSlug: z.string().min(1).max(200),
    roomId: z.string().min(1).max(200),
    exerciseId: z.string().min(1).max(200),
  })
  .strict();
