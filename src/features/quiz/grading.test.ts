import { describe, expect, it } from "vitest";
import { gradeQuiz } from "./grading";

const questions = [0, 1, 2, 3, 0].map((answer) => ({
  answer,
  explanation: "",
}));

describe("gradeQuiz", () => {
  it("passes at 70% and scores in proportion", () => {
    const grade = gradeQuiz(questions, [0, 1, 2, 3, 1], 100);
    expect(grade).toMatchObject({
      correct: 4,
      total: 5,
      score: 80,
      passed: true,
    });
  });

  it("fails below 70% and treats missing answers as blank", () => {
    const grade = gradeQuiz(questions, [0, 1, 2], 100);
    expect(grade).toMatchObject({ correct: 3, score: 60, passed: false });
    expect(grade.results[4]).toMatchObject({ chosen: -1, correct: false });
  });
});
