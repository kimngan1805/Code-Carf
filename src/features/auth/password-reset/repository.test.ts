import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rate: vi.fn(),
  cleanup: vi.fn(),
  user: vi.fn(),
  token: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    passwordResetRateLimit: { upsert: mocks.rate, deleteMany: mocks.cleanup },
    $transaction: async (callback: (tx: unknown) => unknown) =>
      callback({
        user: { updateMany: mocks.user },
        passwordResetToken: { updateMany: mocks.token },
      }),
  },
}));
import { allowResetRequest, consumeResetToken } from "./repository";
import { digest } from "./rules";
beforeEach(() => vi.resetAllMocks());
it("uses a persisted atomic counter keyed by hashed email and a 15-minute window", async () => {
  mocks.rate
    .mockResolvedValueOnce({ count: 3 })
    .mockResolvedValueOnce({ count: 4 });
  const now = new Date("2026-11-15T10:07:00Z");
  expect(await allowResetRequest("user@example.test", now)).toBe(true);
  expect(await allowResetRequest("user@example.test", now)).toBe(false);
  expect(mocks.rate.mock.calls[0][0]).toMatchObject({
    where: {
      key_windowStart: {
        key: digest("user@example.test"),
        windowStart: new Date("2026-11-15T10:00:00Z"),
      },
    },
    update: { count: { increment: 1 } },
  });
});
it("guards the old credential and rechecks token expiry/usage inside the transaction", async () => {
  mocks.user.mockResolvedValue({ count: 1 });
  mocks.token.mockResolvedValue({ count: 1 });
  await consumeResetToken("user-1", "token-hash", "old-hash", "new-hash");
  expect(mocks.user).toHaveBeenCalledWith({
    where: { id: "user-1", passwordHash: "old-hash" },
    data: { passwordHash: "new-hash" },
  });
  expect(mocks.token.mock.calls[0][0].where).toMatchObject({
    userId: "user-1",
    tokenHash: "token-hash",
    usedAt: null,
    passwordDigest: digest("old-hash"),
    expiresAt: { gt: expect.any(Date) },
  });
});
it("fails the transaction if a concurrent reset already changed the credential", async () => {
  mocks.user.mockResolvedValue({ count: 0 });
  await expect(consumeResetToken("u", "t", "old", "new")).rejects.toMatchObject(
    { code: "INVALID_RESET_TOKEN" },
  );
  expect(mocks.token).not.toHaveBeenCalled();
});
it("fails the transaction if the token expires or is replaced before claim", async () => {
  mocks.user.mockResolvedValue({ count: 1 });
  mocks.token.mockResolvedValue({ count: 0 });
  await expect(consumeResetToken("u", "t", "old", "new")).rejects.toMatchObject(
    { code: "INVALID_RESET_TOKEN" },
  );
});
