import { describe, expect, it } from "vitest";
import type { GradeStatus } from "./adapter";
import type { PracticeTestView } from "./practice-submit";
import {
  compileOutput,
  passedCount,
  summaryView,
  testStatusView,
} from "./result-view";

const statuses: GradeStatus[] = [
  "ACCEPTED",
  "WRONG_ANSWER",
  "TIME_LIMIT_EXCEEDED",
  "RUNTIME_ERROR",
  "COMPILE_ERROR",
  "ERROR",
  "MOCKED",
];

const test = (
  index: number,
  status: GradeStatus,
  passed: boolean,
  feedback = "",
): PracticeTestView => ({
  index,
  hidden: true,
  passed,
  status,
  feedback,
  weight: 1,
});

describe("testStatusView", () => {
  it("labels correct, wrong, over time and error results", () => {
    expect(testStatusView("ACCEPTED")).toEqual({ label: "Đúng", tone: "pass" });
    expect(testStatusView("WRONG_ANSWER")).toEqual({
      label: "Sai",
      tone: "fail",
    });
    expect(testStatusView("TIME_LIMIT_EXCEEDED").label).toBe("Quá giờ");
    for (const status of ["RUNTIME_ERROR", "COMPILE_ERROR", "ERROR"] as const)
      expect(testStatusView(status).label).toMatch(/^Lỗi/);
  });

  it("covers every grade status with a non-empty label", () => {
    for (const status of statuses)
      expect(testStatusView(status).label.length).toBeGreaterThan(0);
  });
});

describe("summaryView", () => {
  it("maps each submission status", () => {
    expect(summaryView("ACCEPTED").tone).toBe("pass");
    expect(summaryView("REJECTED").tone).toBe("fail");
    expect(summaryView("ERROR").tone).toBe("warn");
  });
});

describe("compileOutput / passedCount", () => {
  it("returns the compiler message once, or null when there is none", () => {
    const tests = [
      test(1, "COMPILE_ERROR", false, "error: x"),
      test(2, "COMPILE_ERROR", false, "error: x"),
    ];
    expect(compileOutput(tests)).toBe("error: x");
    expect(compileOutput([test(1, "ACCEPTED", true)])).toBeNull();
  });

  it("counts passed tests", () => {
    expect(
      passedCount([
        test(1, "ACCEPTED", true),
        test(2, "WRONG_ANSWER", false),
        test(3, "ACCEPTED", true),
      ]),
    ).toBe(2);
  });
});
