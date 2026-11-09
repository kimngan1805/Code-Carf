import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  PracticeSubmissionView,
  PracticeTestView,
} from "../practice-submit";
import { SubmissionResult } from "./submission-result";

const test = (over: Partial<PracticeTestView>): PracticeTestView => ({
  index: 1,
  hidden: true,
  passed: false,
  status: "WRONG_ANSWER",
  feedback: "Sai kết quả",
  weight: 1,
  ...over,
});

const result = (
  tests: PracticeTestView[],
  over: Partial<PracticeSubmissionView> = {},
): PracticeSubmissionView => ({
  submissionId: "s1",
  status: "REJECTED",
  score: 25,
  maxScore: 100,
  feedback: "Đạt 1/4 test case.",
  runtimeMs: null,
  memoryKb: null,
  tests,
  ...over,
});

describe("SubmissionResult", () => {
  it("shows correct, wrong, over-time and error labels per test", () => {
    const html = renderToStaticMarkup(
      <SubmissionResult
        result={result([
          test({ index: 1, status: "ACCEPTED", passed: true, feedback: "" }),
          test({ index: 2, status: "WRONG_ANSWER" }),
          test({ index: 3, status: "TIME_LIMIT_EXCEEDED" }),
          test({ index: 4, status: "RUNTIME_ERROR" }),
        ])}
      />,
    );
    for (const label of ["Đúng", "Sai", "Quá giờ", "Lỗi chạy"])
      expect(html).toContain(label);
    expect(html).toContain("25/100 điểm");
    expect(html).toContain("1/4 test");
    expect(html).toContain("Chưa đạt");
  });

  it("shows input and expected for a failed visible test", () => {
    const html = renderToStaticMarkup(
      <SubmissionResult
        result={result([
          test({
            hidden: false,
            input: "1 2",
            expected: "3",
            feedback: "got 4",
          }),
        ])}
      />,
    );
    expect(html).toContain("1 2");
    expect(html).toContain("got 4");
    expect(html).toContain("Đầu ra mong đợi");
  });

  it("marks hidden tests and shows no detail for them", () => {
    const html = renderToStaticMarkup(
      <SubmissionResult
        result={result([test({ hidden: true, feedback: "Sai kết quả" })])}
      />,
    );
    expect(html).toContain("(ẩn)");
    expect(html).not.toContain("Đầu vào");
    expect(html).not.toContain("Đầu ra mong đợi");
    expect(html).not.toContain("Sai kết quả");
    expect(html).toContain("Sai");
  });

  it("shows compiler output once, not once per test", () => {
    const html = renderToStaticMarkup(
      <SubmissionResult
        result={result([
          test({ index: 1, status: "COMPILE_ERROR", feedback: "error: oops" }),
          test({ index: 2, status: "COMPILE_ERROR", feedback: "error: oops" }),
        ])}
      />,
    );
    expect(html.match(/error: oops/g)).toHaveLength(1);
    expect(html.match(/Lỗi biên dịch/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("shows the grader error summary", () => {
    const html = renderToStaticMarkup(
      <SubmissionResult
        result={result([], {
          status: "ERROR",
          score: 0,
          feedback: "Hệ thống chấm gặp lỗi, vui lòng thử lại sau",
        })}
      />,
    );
    expect(html).toContain("Hệ thống chấm gặp lỗi");
    expect(html).toContain("0/100 điểm");
  });
});
