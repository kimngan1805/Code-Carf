import { getEnv } from "../../lib/env";
import type { GradeStatus, GradingAdapter } from "./adapter";

/** Judge0 1.13 status ids: https://ce.judge0.com/#statuses-and-languages */
const JUDGE0_STATUS: Record<number, GradeStatus> = {
  3: "ACCEPTED",
  4: "WRONG_ANSWER",
  5: "TIME_LIMIT_EXCEEDED",
  6: "COMPILE_ERROR",
  7: "RUNTIME_ERROR", // SIGSEGV
  8: "RUNTIME_ERROR", // SIGXFSZ
  9: "RUNTIME_ERROR", // SIGFPE
  10: "RUNTIME_ERROR", // SIGABRT
  11: "RUNTIME_ERROR", // NZEC
  12: "RUNTIME_ERROR", // Other
  14: "RUNTIME_ERROR", // Exec format error
};

const MAX_FEEDBACK_LENGTH = 2000;

interface Judge0Response {
  status?: { id?: number; description?: string };
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  /** CPU time in seconds, as a string such as "0.012". */
  time?: string | null;
  /** Peak memory in KB. */
  memory?: number | null;
}

function truncate(text: string) {
  return text.length > MAX_FEEDBACK_LENGTH
    ? `${text.slice(0, MAX_FEEDBACK_LENGTH)}…`
    : text;
}

export const judge0GradingAdapter: GradingAdapter = {
  async grade(request) {
    const response = await fetch(
      `${getEnv().JUDGE0_URL}/submissions?wait=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: request.source,
          language_id: request.languageId,
          stdin: request.input,
          expected_output: request.expected,
          cpu_time_limit: request.timeLimitMs / 1000,
          memory_limit: request.memoryLimitKb,
        }),
      },
    );
    if (!response.ok)
      return { status: "ERROR", feedback: `Judge0 HTTP ${response.status}` };

    const result = (await response.json()) as Judge0Response;
    const status = JUDGE0_STATUS[result.status?.id ?? -1] ?? "ERROR";
    const description = result.status?.description ?? "Unknown Judge0 status";
    const details =
      status === "COMPILE_ERROR"
        ? result.compile_output
        : status === "RUNTIME_ERROR"
          ? (result.stderr ?? result.message)
          : status === "ERROR"
            ? result.message
            : null;
    const time = result.time ? Number.parseFloat(result.time) : Number.NaN;

    return {
      status,
      feedback: truncate(details ? `${description}: ${details}` : description),
      ...(Number.isFinite(time) ? { runtimeMs: Math.round(time * 1000) } : {}),
      ...(typeof result.memory === "number" ? { memoryKb: result.memory } : {}),
    };
  },
};
