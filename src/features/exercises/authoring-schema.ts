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

export const MAX_QUIZ_QUESTIONS = 50;
export const MAX_QUIZ_OPTIONS = 6;

const baseFields = {
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
};

const codeExerciseSchema = z
  .object({
    kind: z.literal("CODE"),
    ...baseFields,
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

/** Tự luận: học viên nộp ảnh bài viết tay, chấm theo đáp án mẫu (AI gợi ý, giảng viên duyệt). */
const handwrittenExerciseSchema = z
  .object({
    kind: z.literal("HANDWRITTEN"),
    ...baseFields,
    rubric: z
      .string()
      .trim()
      .max(20000, "Đáp án mẫu tối đa 20.000 ký tự.")
      .refine(
        (value) => value.length > 0,
        "Vui lòng nhập đáp án mẫu hoặc tiêu chí chấm.",
      ),
  })
  .strict();

export const quizQuestionSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập nội dung câu hỏi.")
      .max(2000, "Câu hỏi tối đa 2.000 ký tự."),
    options: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Đáp án không được để trống.")
          .max(500, "Mỗi đáp án tối đa 500 ký tự."),
      )
      .min(2, "Mỗi câu cần ít nhất 2 đáp án.")
      .max(MAX_QUIZ_OPTIONS, `Mỗi câu tối đa ${MAX_QUIZ_OPTIONS} đáp án.`),
    answer: z
      .number("Vui lòng chọn đáp án đúng.")
      .int("Vui lòng chọn đáp án đúng.")
      .min(0, "Vui lòng chọn đáp án đúng."),
    explanation: z
      .string()
      .trim()
      .max(2000, "Giải thích tối đa 2.000 ký tự.")
      .default(""),
  })
  .strict()
  .refine((question) => question.answer < question.options.length, {
    message: "Vui lòng chọn đáp án đúng.",
    path: ["answer"],
  });

const quizExerciseSchema = z
  .object({
    kind: z.literal("QUIZ"),
    ...baseFields,
    questions: z
      .array(quizQuestionSchema)
      .min(1, "Bài trắc nghiệm cần ít nhất một câu hỏi.")
      .max(MAX_QUIZ_QUESTIONS, `Tối đa ${MAX_QUIZ_QUESTIONS} câu hỏi.`),
  })
  .strict();

/** Bài tập không ghi `kind` được hiểu là bài code, như trước khi có thêm loại khác. */
export const exerciseFieldsSchema = z.preprocess(
  (value) =>
    value && typeof value === "object" && !("kind" in value)
      ? { ...value, kind: "CODE" }
      : value,
  z.discriminatedUnion("kind", [
    codeExerciseSchema,
    handwrittenExerciseSchema,
    quizExerciseSchema,
  ]),
);

export type ExerciseFields = z.infer<typeof exerciseFieldsSchema>;
export type ExerciseKindKey = ExerciseFields["kind"];

const scopeSchema = z.union([
  z
    .object({
      pathSlug: z.string().min(1).max(200),
      roomId: z.string().min(1).max(200),
      requestId: z.uuid(),
    })
    .strict(),
  z
    .object({
      pathSlug: z.string().min(1).max(200),
      roomId: z.string().min(1).max(200),
      exerciseId: z.string().min(1).max(200),
    })
    .strict(),
]);

const SCOPE_KEYS = ["pathSlug", "roomId", "requestId", "exerciseId"] as const;

/** Tách phần định danh (lộ trình, bài học, yêu cầu) khỏi nội dung bài tập rồi kiểm tra từng phần. */
export function parseSaveExercise(body: unknown) {
  if (!body || typeof body !== "object")
    return {
      success: false as const,
      message: "Thông tin bài tập không hợp lệ.",
    };
  const record = body as Record<string, unknown>;
  const scope = Object.fromEntries(
    SCOPE_KEYS.filter((key) => key in record).map((key) => [key, record[key]]),
  );
  const rest = Object.fromEntries(
    Object.entries(record).filter(
      ([key]) => !(SCOPE_KEYS as readonly string[]).includes(key),
    ),
  );
  const parsedScope = scopeSchema.safeParse(scope);
  if (!parsedScope.success)
    return {
      success: false as const,
      message: "Thông tin bài tập không hợp lệ.",
    };
  const fields = exerciseFieldsSchema.safeParse(rest);
  if (!fields.success)
    return {
      success: false as const,
      message:
        fields.error.issues[0]?.message ?? "Thông tin bài tập không hợp lệ.",
    };
  return {
    success: true as const,
    data: { ...parsedScope.data, ...fields.data },
  };
}

export const deleteExerciseSchema = z
  .object({
    pathSlug: z.string().min(1).max(200),
    roomId: z.string().min(1).max(200),
    exerciseId: z.string().min(1).max(200),
  })
  .strict();
