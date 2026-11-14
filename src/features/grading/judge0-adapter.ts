import { getEnv } from "../../lib/env";
import type { GradingAdapter } from "./adapter";

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
        }),
      },
    );
    if (!response.ok)
      return { status: "ERROR", feedback: `Judge0 HTTP ${response.status}` };
    const result = (await response.json()) as {
      status?: { id?: number; description?: string };
      stderr?: string;
      compile_output?: string;
    };
    if (result.status?.id === 3)
      return {
        status: "ACCEPTED",
        feedback: result.status.description ?? "Accepted",
      };
    return {
      status: "REJECTED",
      feedback:
        result.compile_output ??
        result.stderr ??
        result.status?.description ??
        "Judge0 rejected the submission",
    };
  },
};
