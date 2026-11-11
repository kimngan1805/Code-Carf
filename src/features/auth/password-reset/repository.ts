import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  digest,
  INVALID_RESET_MESSAGE,
  RESET_RATE_LIMIT,
  RESET_RATE_WINDOW_MS,
} from "./rules";

export async function allowResetRequest(email: string, now: Date) {
  const windowStart = new Date(
    Math.floor(now.getTime() / RESET_RATE_WINDOW_MS) * RESET_RATE_WINDOW_MS,
  );
  const record = await db.passwordResetRateLimit.upsert({
    where: { key_windowStart: { key: digest(email), windowStart } },
    create: { key: digest(email), windowStart },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  await db.passwordResetRateLimit.deleteMany({
    where: {
      windowStart: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
  });
  return record.count <= RESET_RATE_LIMIT;
}
export function findResetUser(email: string) {
  return db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
}
export function storeResetToken(
  userId: string,
  tokenHash: string,
  passwordDigest: string,
  expiresAt: Date,
) {
  const data = {
    tokenHash,
    passwordDigest,
    expiresAt,
    usedAt: null,
    createdAt: new Date(),
  };
  return db.passwordResetToken.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
    select: { userId: true },
  });
}
export function discardResetToken(tokenHash: string) {
  return db.passwordResetToken.deleteMany({ where: { tokenHash } });
}
export function findResetToken(tokenHash: string) {
  return db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { passwordHash: true } } },
  });
}
/** Compare-and-set on User serializes concurrent resets; both writes commit together. */
export function consumeResetToken(
  userId: string,
  tokenHash: string,
  expectedPasswordHash: string,
  passwordHash: string,
) {
  return db.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: userId, passwordHash: expectedPasswordHash },
      data: { passwordHash },
    });
    if (updated.count !== 1)
      throw new AppError(400, "INVALID_RESET_TOKEN", INVALID_RESET_MESSAGE);
    const now = new Date();
    const claimed = await tx.passwordResetToken.updateMany({
      where: {
        userId,
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
        passwordDigest: digest(expectedPasswordHash),
      },
      data: { usedAt: now },
    });
    if (claimed.count !== 1)
      throw new AppError(400, "INVALID_RESET_TOKEN", INVALID_RESET_MESSAGE);
  });
}
