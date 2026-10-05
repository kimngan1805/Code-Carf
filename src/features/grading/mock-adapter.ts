import type { GradingAdapter } from "./adapter";

export const mockGradingAdapter: GradingAdapter = {
  async grade() {
    return { status: "MOCKED", feedback: "Mock mode: code was not executed." };
  },
};
