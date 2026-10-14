import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GradeRequest } from "./adapter";

vi.mock("../../lib/env", () => ({
  getEnv: () => ({ JUDGE0_URL: "http://judge0.test" }),
}));

import { judge0GradingAdapter } from "./judge0-adapter";

const request: GradeRequest = {
  source: "print(input())",
  languageId: 71,
  input: "hi",
  expected: "hi",
  timeLimitMs: 1500,
  memoryLimitKb: 131072,
};

const fetchMock = vi.fn();

function judge0Responds(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("judge0GradingAdapter", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends the exercise time limit in seconds and memory limit in KB", async () => {
    judge0Responds({ status: { id: 3, description: "Accepted" } });

    await judge0GradingAdapter.grade(request);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://judge0.test/submissions?wait=true");
    expect(JSON.parse(init.body as string)).toEqual({
      source_code: "print(input())",
      language_id: 71,
      stdin: "hi",
      expected_output: "hi",
      cpu_time_limit: 1.5,
      memory_limit: 131072,
    });
  });

  it.each([
    [3, "ACCEPTED"],
    [4, "WRONG_ANSWER"],
    [5, "TIME_LIMIT_EXCEEDED"],
    [6, "COMPILE_ERROR"],
    [7, "RUNTIME_ERROR"],
    [11, "RUNTIME_ERROR"],
    [12, "RUNTIME_ERROR"],
    [13, "ERROR"],
    [2, "ERROR"],
  ])("maps Judge0 status %i to %s", async (id, expected) => {
    judge0Responds({ status: { id, description: "x" } });
    const result = await judge0GradingAdapter.grade(request);
    expect(result.status).toBe(expected);
  });

  it("reports runtime in ms and memory in KB", async () => {
    judge0Responds({
      status: { id: 3, description: "Accepted" },
      time: "0.042",
      memory: 7340,
    });
    expect(await judge0GradingAdapter.grade(request)).toEqual({
      status: "ACCEPTED",
      feedback: "Accepted",
      runtimeMs: 42,
      memoryKb: 7340,
    });
  });

  it("includes compiler output and stderr in feedback", async () => {
    judge0Responds({
      status: { id: 6, description: "Compilation Error" },
      compile_output: "SyntaxError: invalid syntax",
    });
    expect((await judge0GradingAdapter.grade(request)).feedback).toBe(
      "Compilation Error: SyntaxError: invalid syntax",
    );

    judge0Responds({
      status: { id: 11, description: "Runtime Error (NZEC)" },
      stderr: "ZeroDivisionError",
    });
    expect((await judge0GradingAdapter.grade(request)).feedback).toBe(
      "Runtime Error (NZEC): ZeroDivisionError",
    );
  });

  it("truncates very long feedback", async () => {
    judge0Responds({
      status: { id: 11, description: "Runtime Error (NZEC)" },
      stderr: "x".repeat(5000),
    });
    const { feedback } = await judge0GradingAdapter.grade(request);
    expect(feedback.length).toBeLessThanOrEqual(2001);
  });

  it("returns ERROR when Judge0 answers with an HTTP error", async () => {
    judge0Responds({}, 503);
    expect(await judge0GradingAdapter.grade(request)).toEqual({
      status: "ERROR",
      feedback: "Judge0 HTTP 503",
    });
  });
});
