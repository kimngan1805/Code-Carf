import { getEnv } from "../../lib/env";
import { judge0GradingAdapter } from "./judge0-adapter";
import { mockGradingAdapter } from "./mock-adapter";

export function getGradingAdapter() {
  return getEnv().GRADER_ADAPTER === "judge0"
    ? judge0GradingAdapter
    : mockGradingAdapter;
}
