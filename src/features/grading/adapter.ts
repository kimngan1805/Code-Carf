export interface GradeRequest {
  source: string;
  languageId: number;
  input: string;
  expected: string;
  /** CPU time limit for one run, from `Exercise.timeLimitMs`. */
  timeLimitMs: number;
  /** Memory limit for one run, from `Exercise.memoryLimitKb`. */
  memoryLimitKb: number;
}

/**
 * Outcome of running the source against one test case.
 * MOCKED: mock adapter, code was not executed.
 * ERROR: the grader itself failed (not the student's code).
 */
export type GradeStatus =
  | "MOCKED"
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  // Judge0 reports memory overruns as runtime errors, so there is no MLE status.
  | "RUNTIME_ERROR"
  | "COMPILE_ERROR"
  | "ERROR";

export interface GradeResult {
  status: GradeStatus;
  feedback: string;
  runtimeMs?: number;
  memoryKb?: number;
}

export interface GradingAdapter {
  grade(request: GradeRequest): Promise<GradeResult>;
}
