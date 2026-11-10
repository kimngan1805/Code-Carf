import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({ submitPractice: vi.fn() }));
vi.mock("./practice-submit", () => ({ submitPractice: mocks.submitPractice }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
import { submitPracticeAction } from "./actions";

const body = { source: "print(1)", language: "python" };

beforeEach(() => vi.resetAllMocks());

describe("submitPracticeAction", () => {
  it("returns the graded result", async () => {
    mocks.submitPractice.mockResolvedValue({ submissionId: "s1" });
    await expect(submitPracticeAction("ex-1", body)).resolves.toEqual({
      ok: true,
      result: { submissionId: "s1" },
    });
    expect(mocks.submitPractice).toHaveBeenCalledWith("ex-1", body);
  });

  it("returns known errors as data with their message", async () => {
    mocks.submitPractice.mockRejectedValue(
      new AppError(429, "TOO_MANY_SUBMISSIONS", "Chỉ 10 lần mỗi phút"),
    );
    await expect(submitPracticeAction("ex-1", body)).resolves.toEqual({
      ok: false,
      code: "TOO_MANY_SUBMISSIONS",
      message: "Chỉ 10 lần mỗi phút",
    });
  });

  it("replaces English auth messages with Vietnamese ones", async () => {
    mocks.submitPractice.mockRejectedValue(
      new AppError(401, "UNAUTHORIZED", "Sign in required"),
    );
    const state = await submitPracticeAction("ex-1", body);
    expect(state).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
    expect(state.ok === false && state.message).toMatch(/đăng nhập/);
  });

  it("hides unexpected error details", async () => {
    mocks.submitPractice.mockRejectedValue(new Error("db password leaked"));
    const state = await submitPracticeAction("ex-1", body);
    expect(state).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
    expect(JSON.stringify(state)).not.toContain("leaked");
  });
});
