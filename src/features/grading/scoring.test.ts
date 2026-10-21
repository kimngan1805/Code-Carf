import { describe, expect, it } from "vitest";
import { summarizeTests } from "./scoring";

describe("summarizeTests", () => {
  it("gives full points when every test passes", () => {
    expect(
      summarizeTests(
        [
          { status: "ACCEPTED", weight: 1 },
          { status: "MOCKED", weight: 2 },
        ],
        100,
      ),
    ).toMatchObject({ status: "ACCEPTED", score: 100, passedCount: 2 });
  });

  it("scores by weight and rounds down", () => {
    const summary = summarizeTests(
      [
        { status: "ACCEPTED", weight: 1 },
        { status: "ACCEPTED", weight: 1 },
        { status: "WRONG_ANSWER", weight: 1 },
      ],
      100,
    );
    expect(summary).toMatchObject({ status: "REJECTED", score: 66 });
  });

  it("weights heavier tests more", () => {
    const summary = summarizeTests(
      [
        { status: "TIME_LIMIT_EXCEEDED", weight: 1 },
        { status: "ACCEPTED", weight: 4 },
      ],
      50,
    );
    expect(summary).toMatchObject({ status: "REJECTED", score: 40 });
  });

  it("treats weights below 1 as 1", () => {
    const summary = summarizeTests(
      [
        { status: "ACCEPTED", weight: 0 },
        { status: "RUNTIME_ERROR", weight: -3 },
      ],
      100,
    );
    expect(summary.score).toBe(50);
  });

  it("returns ERROR when the grader failed on any test", () => {
    expect(
      summarizeTests(
        [
          { status: "ACCEPTED", weight: 5 },
          { status: "ERROR", weight: 1 },
        ],
        100,
      ),
    ).toMatchObject({ status: "ERROR", score: 0 });
  });

  it("returns ERROR when there are no tests", () => {
    expect(summarizeTests([], 100)).toMatchObject({ status: "ERROR" });
  });

  it("uses the highest runtime and memory, or null when unknown", () => {
    expect(
      summarizeTests(
        [
          { status: "ACCEPTED", weight: 1, runtimeMs: 15, memoryKb: 900 },
          { status: "ACCEPTED", weight: 1, runtimeMs: 40, memoryKb: 300 },
        ],
        10,
      ),
    ).toMatchObject({ runtimeMs: 40, memoryKb: 900 });
    expect(summarizeTests([{ status: "MOCKED", weight: 1 }], 10)).toMatchObject(
      { runtimeMs: null, memoryKb: null },
    );
  });
});
