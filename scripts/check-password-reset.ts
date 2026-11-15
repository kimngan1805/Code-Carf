import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { db } from "../src/lib/db";
import {
  requestPasswordReset,
  resetPassword,
  isResetLinkValid,
} from "../src/features/auth/password-reset/service";
import {
  allowResetRequest,
  consumeResetToken,
  storeResetToken,
} from "../src/features/auth/password-reset/repository";
import {
  digest,
  RESET_TTL_MS,
} from "../src/features/auth/password-reset/rules";

async function main() {
  process.loadEnvFile(".env");
  assert.ok(
    ["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(process.env.DATABASE_URL!).hostname,
    ),
    "Use a local test database only",
  );
  const run = randomUUID();
  const email = `password-reset-${run}@local.test`;
  const unknown = `missing-reset-${run}@local.test`;
  const parallelEmail = `parallel-reset-${run}@local.test`;
  const messages: { to: string; text: string }[] = [];
  const originalInfo = console.info;
  let userId: string | undefined;
  // Capture fixture emails in memory; never print a reset bearer token.
  console.info = (value: unknown) => {
    try {
      const message = JSON.parse(String(value));
      if (message.to === email && typeof message.text === "string") {
        messages.push(message);
        return;
      }
    } catch {}
    originalInfo(value);
  };
  const latestToken = () =>
    new URL(
      messages.at(-1)!.text.match(/https?:\/\/[^\s]+/)![0],
    ).searchParams.get("token")!;
  try {
    const role = await db.role.findUniqueOrThrow({
      where: { name: "STUDENT" },
    });
    const user = await db.user.create({
      data: {
        email,
        name: "Reset check",
        roleId: role.id,
        passwordHash: await hash("BeforeReset123!", 4),
        onboardedAt: new Date(),
      },
    });
    userId = user.id;
    const known = await requestPasswordReset({ email: email.toUpperCase() });
    assert.deepEqual(await requestPasswordReset({ email: unknown }), known);
    assert.equal(messages.length, 1);
    const firstToken = latestToken();
    const firstRecord = await db.passwordResetToken.findUniqueOrThrow({
      where: { userId },
    });
    assert.equal(firstRecord.tokenHash, digest(firstToken));
    assert.notEqual(firstRecord.tokenHash, firstToken);
    assert.ok(
      Math.abs(firstRecord.expiresAt.getTime() - Date.now() - RESET_TTL_MS) <
        5000,
    );
    assert.equal(await isResetLinkValid(firstToken), true);
    assert.equal(
      (await db.passwordResetToken.findUniqueOrThrow({ where: { userId } }))
        .usedAt,
      null,
    );
    console.log(
      "PASS generic response, normalized email, hashed token, 30-minute expiry and GET does not consume token",
    );

    await requestPasswordReset({ email });
    assert.equal(await isResetLinkValid(firstToken), false);
    await requestPasswordReset({ email });
    const active = latestToken();
    assert.deepEqual(await requestPasswordReset({ email }), known);
    assert.equal(messages.length, 3);
    assert.equal(await isResetLinkValid(active), true);
    console.log(
      "PASS newest link replaces older links; fourth request suppressed without revealing account state",
    );

    const input = {
      token: active,
      password: "AfterReset123!",
      confirmPassword: "AfterReset123!",
    };
    const concurrent = await Promise.allSettled([
      resetPassword(input),
      resetPassword(input),
    ]);
    assert.equal(
      concurrent.filter((result) => result.status === "fulfilled").length,
      1,
    );
    assert.equal(
      concurrent.filter((result) => result.status === "rejected").length,
      1,
    );
    const current = await db.user.findUniqueOrThrow({ where: { id: userId } });
    assert.equal(await compare(input.password, current.passwordHash), true);
    assert.equal(await compare("BeforeReset123!", current.passwordHash), false);
    await assert.rejects(resetPassword(input), { code: "INVALID_RESET_TOKEN" });
    console.log(
      "PASS one winner for concurrent use, old password rejected, replay rejected",
    );

    const expired = randomBytes(32).toString("hex");
    await storeResetToken(
      userId,
      digest(expired),
      digest(current.passwordHash),
      new Date(Date.now() - 1000),
    );
    assert.equal(await isResetLinkValid(expired), false);
    await assert.rejects(resetPassword({ ...input, token: expired }), {
      code: "INVALID_RESET_TOKEN",
    });
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: userId } })).passwordHash,
      current.passwordHash,
    );
    // Simulate expiry after the initial read/bcrypt work but before the atomic claim.
    await assert.rejects(
      consumeResetToken(
        userId,
        digest(expired),
        current.passwordHash,
        "must-not-persist",
      ),
      { code: "INVALID_RESET_TOKEN" },
    );
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: userId } })).passwordHash,
      current.passwordHash,
    );
    console.log(
      "PASS expired token cannot change credentials and failed claim rolls the password write back",
    );

    const changed = randomBytes(32).toString("hex");
    await storeResetToken(
      userId,
      digest(changed),
      digest(current.passwordHash),
      new Date(Date.now() + RESET_TTL_MS),
    );
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: await hash("ChangedElsewhere123!", 4) },
    });
    assert.equal(await isResetLinkValid(changed), false);
    await assert.rejects(resetPassword({ ...input, token: changed }), {
      code: "INVALID_RESET_TOKEN",
    });
    console.log(
      "PASS changing password elsewhere invalidates outstanding reset links",
    );

    const now = new Date();
    const limits = await Promise.all(
      Array.from({ length: 10 }, () => allowResetRequest(parallelEmail, now)),
    );
    assert.equal(limits.filter(Boolean).length, 3);
    console.log(
      "PASS persisted rate limit permits exactly three concurrent requests per window",
    );
  } finally {
    console.info = originalInfo;
    if (userId) await db.user.deleteMany({ where: { id: userId } });
    await db.passwordResetRateLimit.deleteMany({
      where: { key: { in: [email, unknown, parallelEmail].map(digest) } },
    });
    await db.$disconnect();
    console.log("Removed password-reset test fixtures.");
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
