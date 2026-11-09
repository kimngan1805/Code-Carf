import type { GradeStatus } from "./adapter";
import type { PracticeSubmissionView } from "./practice-submit";

export type Tone = "pass" | "fail" | "warn" | "neutral";

const TEST_STATUS: Record<GradeStatus, { label: string; tone: Tone }> = {
  ACCEPTED: { label: "Đúng", tone: "pass" },
  WRONG_ANSWER: { label: "Sai", tone: "fail" },
  TIME_LIMIT_EXCEEDED: { label: "Quá giờ", tone: "warn" },
  RUNTIME_ERROR: { label: "Lỗi chạy", tone: "warn" },
  COMPILE_ERROR: { label: "Lỗi biên dịch", tone: "warn" },
  ERROR: { label: "Lỗi chấm", tone: "warn" },
  MOCKED: { label: "Chưa chạy (mock)", tone: "neutral" },
};

/** Label and colour for one test: Đúng / Sai / Quá giờ / Lỗi. */
export function testStatusView(status: GradeStatus) {
  return TEST_STATUS[status];
}

const SUMMARY: Record<
  PracticeSubmissionView["status"],
  { title: string; tone: Tone }
> = {
  ACCEPTED: { title: "Đạt toàn bộ test", tone: "pass" },
  REJECTED: { title: "Chưa đạt", tone: "fail" },
  ERROR: { title: "Hệ thống chấm gặp lỗi", tone: "warn" },
};

export function summaryView(status: PracticeSubmissionView["status"]) {
  return SUMMARY[status];
}

/** Compiler output is the same for every test, so it is shown once, not per test. */
export function compileOutput(tests: PracticeSubmissionView["tests"]) {
  return (
    tests.find((test) => test.status === "COMPILE_ERROR")?.feedback ?? null
  );
}

export function passedCount(tests: PracticeSubmissionView["tests"]) {
  return tests.filter((test) => test.passed).length;
}
