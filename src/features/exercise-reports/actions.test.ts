import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({ report: vi.fn(), log: vi.fn() }));
vi.mock("./service", () => ({ reportExercise: mocks.report }));
vi.mock("@/lib/logger", () => ({ logger: { error: mocks.log } }));
import { reportExerciseAction } from "./actions";

function form() {
  const value = new FormData();
  value.set("kind", "TEST_CASE");
  value.set("description", "Test mẫu không đúng.");
  value.set("roomId", "fake-room");
  value.set("userId", "fake-user");
  return value;
}
beforeEach(() => vi.resetAllMocks());

describe("report action", () => {
  it("only forwards permitted form fields and confirms a successful write", async () => {
    const result = await reportExerciseAction("exercise", {}, form());
    expect(result.ok).toBe(true);
    expect(mocks.report).toHaveBeenCalledWith("exercise", {
      kind: "TEST_CASE",
      description: "Test mẫu không đúng.",
    });
  });
  it.each([400, 404, 429])(
    "returns expected failures (%s) as form state",
    async (status) => {
      mocks.report.mockRejectedValue(
        new AppError(status, "EXPECTED", "Try again later"),
      );
      expect(await reportExerciseAction("exercise", {}, form())).toEqual({
        ok: false,
        message: "Try again later",
      });
    },
  );
  it.each(["UNAUTHORIZED", "FORBIDDEN"])(
    "shows a readable message for %s",
    async (code) => {
      mocks.report.mockRejectedValue(
        new AppError(403, code, "English internal message"),
      );
      const result = await reportExerciseAction("exercise", {}, form());
      expect(result.ok).toBe(false);
      expect(result.message).not.toContain("English");
    },
  );
  it("hides unexpected server details and logs the failure", async () => {
    mocks.report.mockRejectedValue(new Error("internal database details"));
    const result = await reportExerciseAction("exercise", {}, form());
    expect(result.ok).toBe(false);
    expect(result.message).not.toContain("database");
    expect(mocks.log).toHaveBeenCalledOnce();
  });
});
