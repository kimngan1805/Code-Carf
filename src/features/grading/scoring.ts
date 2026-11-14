import type { GradeStatus } from "./adapter";

const PASSING_STATUSES: ReadonlySet<GradeStatus> = new Set([
  "ACCEPTED",
  // Mock mode never runs code; treat it as a pass so dev flows can complete.
  "MOCKED",
]);

export function isPassing(status: GradeStatus) {
  return PASSING_STATUSES.has(status);
}

export interface ScoredTest {
  status: GradeStatus;
  weight: number;
  runtimeMs?: number;
  memoryKb?: number;
}

export interface Summary {
  status: "ACCEPTED" | "REJECTED" | "ERROR";
  score: number;
  passedCount: number;
  runtimeMs: number | null;
  memoryKb: number | null;
}

/**
 * Turns per-test results into the submission outcome.
 * - Any grader ERROR makes the whole submission ERROR (not the student's fault).
 * - Score is `maxScore * passedWeight / totalWeight`, rounded down.
 * - ACCEPTED only when every test passes.
 * - runtimeMs/memoryKb are the maximum across tests.
 */
export function summarizeTests(
  tests: readonly ScoredTest[],
  maxScore: number,
): Summary {
  const runtimes = tests.flatMap((test) =>
    test.runtimeMs === undefined ? [] : [test.runtimeMs],
  );
  const memories = tests.flatMap((test) =>
    test.memoryKb === undefined ? [] : [test.memoryKb],
  );
  const usage = {
    runtimeMs: runtimes.length ? Math.max(...runtimes) : null,
    memoryKb: memories.length ? Math.max(...memories) : null,
  };
  const passedCount = tests.filter((test) => isPassing(test.status)).length;

  if (tests.length === 0 || tests.some((test) => test.status === "ERROR")) {
    return { status: "ERROR", score: 0, passedCount, ...usage };
  }

  // Weights below 1 would let a test count for nothing; treat them as 1.
  const weightOf = (test: ScoredTest) => Math.max(1, Math.floor(test.weight));
  const totalWeight = tests.reduce((sum, test) => sum + weightOf(test), 0);
  const passedWeight = tests
    .filter((test) => isPassing(test.status))
    .reduce((sum, test) => sum + weightOf(test), 0);
  const accepted = passedCount === tests.length;

  return {
    status: accepted ? "ACCEPTED" : "REJECTED",
    score: accepted
      ? maxScore
      : Math.floor((maxScore * passedWeight) / totalWeight),
    passedCount,
    ...usage,
  };
}
