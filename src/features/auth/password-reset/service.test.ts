import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  allowResetRequest: vi.fn(),
  findResetUser: vi.fn(),
  storeResetToken: vi.fn(),
  discardResetToken: vi.fn(),
  findResetToken: vi.fn(),
  consumeResetToken: vi.fn(),
  send: vi.fn(),
  hash: vi.fn(),
  error: vi.fn(),
}));
vi.mock("./repository", () => mocks);
vi.mock("bcryptjs", () => ({ hash: mocks.hash }));
vi.mock("@/lib/mailer", () => ({ getMailer: () => ({ send: mocks.send }) }));
vi.mock("@/lib/logger", () => ({ logger: { error: mocks.error } }));
import {
  isResetLinkValid,
  requestPasswordReset,
  resetPassword,
} from "./service";
import { digest, RESET_REQUEST_MESSAGE, RESET_TTL_MS } from "./rules";

const raw = "a".repeat(64);
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-15T10:00:00Z"));
  vi.stubEnv("AUTH_URL", "https://app.example.test");
  mocks.allowResetRequest.mockResolvedValue(true);
  mocks.findResetUser.mockResolvedValue({
    id: "user-1",
    passwordHash: "old-hash",
  });
  mocks.hash.mockResolvedValue("new-hash");
  mocks.discardResetToken.mockResolvedValue({ count: 1 });
  mocks.findResetToken.mockResolvedValue({
    userId: "user-1",
    tokenHash: digest(raw),
    passwordDigest: digest("old-hash"),
    user: { passwordHash: "old-hash" },
    usedAt: null,
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

it("normalizes email, stores only a hash and sends a trusted-origin link expiring in 30 minutes", async () => {
  await expect(
    requestPasswordReset({ email: " USER@EXAMPLE.TEST " }),
  ).resolves.toEqual({ message: RESET_REQUEST_MESSAGE });
  expect(mocks.findResetUser).toHaveBeenCalledWith("user@example.test");
  const email = mocks.send.mock.calls[0][0];
  const link = new URL(email.text.match(/https:\/\/[^\s]+/)[0]);
  expect(link.origin).toBe("https://app.example.test");
  const token = link.searchParams.get("token")!;
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  expect(mocks.storeResetToken).toHaveBeenCalledWith(
    "user-1",
    digest(token),
    digest("old-hash"),
    new Date(Date.now() + RESET_TTL_MS),
  );
  expect(mocks.storeResetToken.mock.calls[0]).not.toContain(token);
});
it("returns the same message for known, unknown and rate-limited emails", async () => {
  const known = await requestPasswordReset({ email: "known@example.test" });
  mocks.findResetUser.mockResolvedValue(null);
  expect(await requestPasswordReset({ email: "unknown@example.test" })).toEqual(
    known,
  );
  mocks.allowResetRequest.mockResolvedValue(false);
  expect(await requestPasswordReset({ email: "limited@example.test" })).toEqual(
    known,
  );
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(mocks.allowResetRequest).toHaveBeenCalledTimes(3);
});
it("does not reveal mail delivery failure and removes the undelivered token", async () => {
  mocks.send.mockRejectedValue(new Error("Mailer down"));
  await expect(
    requestPasswordReset({ email: "user@example.test" }),
  ).resolves.toEqual({ message: RESET_REQUEST_MESSAGE });
  expect(mocks.discardResetToken).toHaveBeenCalledWith(
    mocks.storeResetToken.mock.calls[0][1],
  );
  expect(mocks.error).toHaveBeenCalledWith("password_reset_request_failed", {
    reason: "REQUEST_UNAVAILABLE",
  });
});
it("hashes the new password and delegates atomic consumption with the expected old credential", async () => {
  await resetPassword({
    token: raw,
    password: "NewPassword123!",
    confirmPassword: "NewPassword123!",
  });
  expect(mocks.hash).toHaveBeenCalledWith("NewPassword123!", 12);
  expect(mocks.consumeResetToken).toHaveBeenCalledWith(
    "user-1",
    digest(raw),
    "old-hash",
    "new-hash",
  );
});
it.each(["expired", "used", "changed-password", "missing"])(
  "rejects %s tokens before hashing or writing",
  async (state) => {
    const record = {
      userId: "user-1",
      passwordDigest: digest("old-hash"),
      user: {
        passwordHash:
          state === "changed-password" ? "changed-hash" : "old-hash",
      },
      usedAt: state === "used" ? new Date() : null,
      expiresAt: new Date(
        Date.now() + (state === "expired" ? 0 : RESET_TTL_MS),
      ),
    };
    mocks.findResetToken.mockResolvedValue(state === "missing" ? null : record);
    expect(await isResetLinkValid(raw)).toBe(false);
    await expect(
      resetPassword({
        token: raw,
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.consumeResetToken).not.toHaveBeenCalled();
  },
);
it("opening a valid link does not consume it", async () => {
  expect(await isResetLinkValid(raw)).toBe(true);
  expect(mocks.consumeResetToken).not.toHaveBeenCalled();
});
it("rejects malformed tokens and mismatched passwords", async () => {
  expect(await isResetLinkValid([raw])).toBe(false);
  await expect(
    resetPassword({
      token: raw,
      password: "NewPassword123!",
      confirmPassword: "different",
    }),
  ).rejects.toThrow();
  expect(mocks.consumeResetToken).not.toHaveBeenCalled();
});
