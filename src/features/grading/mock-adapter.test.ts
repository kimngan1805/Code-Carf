import { expect, it } from "vitest";
import { mockGradingAdapter } from "./mock-adapter";

it("marks mock results without claiming code was executed", async () => {
  const result = await mockGradingAdapter.grade({
    source: "",
    languageId: 63,
    input: "",
    expected: "",
    timeLimitMs: 2000,
    memoryLimitKb: 262144,
  });
  expect(result.status).toBe("MOCKED");
});
