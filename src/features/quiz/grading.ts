/** Tỉ lệ câu đúng tối thiểu để bài trắc nghiệm được tính là đạt. */
export const QUIZ_PASS_RATIO = 0.7;

export interface GradableQuestion {
  answer: number;
  explanation: string;
}

export interface QuizGrade {
  correct: number;
  total: number;
  /** Điểm quy đổi theo tỉ lệ câu đúng, làm tròn xuống. */
  score: number;
  passed: boolean;
  results: {
    chosen: number;
    answer: number;
    correct: boolean;
    explanation: string;
  }[];
}

/** Chấm một lượt làm: `answers[i]` là đáp án đã chọn cho câu i, -1 khi bỏ trống. */
export function gradeQuiz(
  questions: readonly GradableQuestion[],
  answers: readonly number[],
  points: number,
): QuizGrade {
  const results = questions.map((question, index) => {
    const chosen = answers[index] ?? -1;
    return {
      chosen,
      answer: question.answer,
      correct: chosen === question.answer,
      explanation: question.explanation,
    };
  });
  const correct = results.filter((result) => result.correct).length;
  const total = questions.length;
  return {
    correct,
    total,
    score: total ? Math.floor((correct / total) * points) : 0,
    passed: total > 0 && correct / total >= QUIZ_PASS_RATIO,
    results,
  };
}
