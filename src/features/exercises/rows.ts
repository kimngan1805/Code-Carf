import type { ExerciseFields } from "./authoring-schema";

/** Chuyển nội dung bài tập đã kiểm tra thành dữ liệu ghi vào bảng Exercise, TestCase, QuizQuestion. */
export function exerciseRows(input: ExerciseFields) {
  const fields = {
    title: input.title,
    prompt: input.prompt,
    kind: input.kind,
    difficulty: input.difficulty,
    points: input.points,
    ...(input.kind === "CODE"
      ? {
          timeLimitMs: input.timeLimitMs,
          memoryLimitKb: input.memoryMb * 1024,
          rubric: null,
        }
      : { rubric: input.kind === "HANDWRITTEN" ? input.rubric : null }),
  };
  const testCases =
    input.kind === "CODE"
      ? input.testCases.map((test) => ({
          input: test.input,
          expected: test.expected,
          isHidden: test.isHidden,
          weight: test.weight,
        }))
      : [];
  const questions =
    input.kind === "QUIZ"
      ? input.questions.map((question, position) => ({
          position,
          prompt: question.prompt,
          options: question.options,
          answer: question.answer,
          explanation: question.explanation,
        }))
      : [];
  return { fields, testCases, questions };
}

/** Bộ chọn đủ dữ liệu để chép nguyên một bài tập (đề, giới hạn, test, câu hỏi). */
export const exerciseCopySelect = {
  title: true,
  prompt: true,
  kind: true,
  difficulty: true,
  points: true,
  timeLimitMs: true,
  memoryLimitKb: true,
  rubric: true,
  testCases: {
    orderBy: { id: "asc" as const },
    select: { input: true, expected: true, isHidden: true, weight: true },
  },
  quizQuestions: {
    orderBy: { position: "asc" as const },
    select: {
      position: true,
      prompt: true,
      options: true,
      answer: true,
      explanation: true,
    },
  },
};

export type ExerciseCopySource = {
  title: string;
  prompt: string;
  kind: "CODE" | "HANDWRITTEN" | "QUIZ";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  points: number;
  timeLimitMs: number;
  memoryLimitKb: number;
  rubric: string | null;
  testCases: {
    input: string;
    expected: string;
    isHidden: boolean;
    weight: number;
  }[];
  quizQuestions: {
    position: number;
    prompt: string;
    options: string[];
    answer: number;
    explanation: string;
  }[];
};

/** Dữ liệu `create` cho một bản chép của bài tập nguồn. */
export function copyData(source: ExerciseCopySource) {
  const { testCases, quizQuestions, ...fields } = source;
  return {
    ...fields,
    testCases: { create: testCases },
    quizQuestions: { create: quizQuestions },
  };
}
