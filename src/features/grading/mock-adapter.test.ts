import { expect, it } from "vitest";
import { mockGradingAdapter } from "./mock-adapter";

it("marks mock results without claiming code was executed", async () => {
  const result = await mockGradingAdapter.grade({
    source: "",
    languageId: 63,
    input: "",
    expected: "",
  });
  expect(result.status).toBe("MOCKED");
});
