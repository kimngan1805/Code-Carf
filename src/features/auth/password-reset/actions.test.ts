import { beforeEach, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  reset: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("@/auth", () => ({ signOut: mocks.signOut }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("./service", () => ({
  requestPasswordReset: mocks.request,
  resetPassword: mocks.reset,
}));
import { forgotPasswordAction, resetPasswordAction } from "./actions";

function form(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    token: "a".repeat(64),
    password: "NewPassword123!",
    confirmPassword: "NewPassword123!",
    ...overrides,
  }))
    data.set(key, value as string);
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});
it("validates email before sending a recovery request", async () => {
  const data = new FormData();
  data.set("email", "bad");
  expect((await forgotPasswordAction({}, data)).error).toBeTruthy();
  expect(mocks.request).not.toHaveBeenCalled();
});
it("does not consume the token or sign out on password confirmation errors", async () => {
  expect(
    (await resetPasswordAction({}, form({ confirmPassword: "different" })))
      .error,
  ).toBeTruthy();
  expect(mocks.reset).not.toHaveBeenCalled();
  expect(mocks.signOut).not.toHaveBeenCalled();
});
it("keeps invalid-token feedback on the form", async () => {
  mocks.reset.mockRejectedValue(
    new AppError(400, "INVALID_RESET_TOKEN", "Invalid link"),
  );
  expect(await resetPasswordAction({}, form())).toEqual({
    error: "Invalid link",
  });
  expect(mocks.signOut).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
it("signs out then leaves the consumed-token URL before rendering success", async () => {
  await expect(resetPasswordAction({}, form())).rejects.toThrow(
    "NEXT_REDIRECT",
  );
  expect(mocks.signOut).toHaveBeenCalledWith({ redirect: false });
  expect(mocks.redirect).toHaveBeenCalledWith("/reset-password/success");
  expect(mocks.signOut.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.redirect.mock.invocationCallOrder[0],
  );
});
