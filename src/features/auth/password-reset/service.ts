import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getMailer } from "@/lib/mailer";
import {
  allowResetRequest,
  consumeResetToken,
  discardResetToken,
  findResetToken,
  findResetUser,
  storeResetToken,
} from "./repository";
import {
  digest,
  forgotPasswordSchema,
  INVALID_RESET_MESSAGE,
  RESET_REQUEST_MESSAGE,
  RESET_TTL_MS,
  resetPasswordSchema,
  resetTokenSchema,
  tokenIsUsable,
} from "./rules";

export async function requestPasswordReset(input: { email: string }) {
  const { email } = forgotPasswordSchema.parse(input);
  let tokenHash: string | undefined;
  try {
    const now = new Date();
    if (!(await allowResetRequest(email, now)))
      return { message: RESET_REQUEST_MESSAGE };
    const token = randomBytes(32).toString("hex");
    const user = await findResetUser(email);
    if (user) {
      const base = new URL(process.env.AUTH_URL ?? "");
      if (
        !["http:", "https:"].includes(base.protocol) ||
        base.username ||
        base.password
      )
        throw new Error("Invalid AUTH_URL");
      const link = new URL("/reset-password", base.origin);
      link.searchParams.set("token", token);
      tokenHash = digest(token);
      await storeResetToken(
        user.id,
        tokenHash,
        digest(user.passwordHash),
        new Date(now.getTime() + RESET_TTL_MS),
      );
      await getMailer().send({
        to: email,
        subject: "Đặt lại mật khẩu Code Carf",
        text: `Bạn đã yêu cầu đặt lại mật khẩu. Liên kết chỉ dùng một lần và hết hạn sau 30 phút:\n${link.href}\nNếu không yêu cầu, bạn có thể bỏ qua email này.`,
      });
    }
  } catch {
    if (tokenHash) await discardResetToken(tokenHash).catch(() => undefined);
    logger.error("password_reset_request_failed", {
      reason: "REQUEST_UNAVAILABLE",
    });
  }
  return { message: RESET_REQUEST_MESSAGE };
}
export async function isResetLinkValid(value: unknown) {
  const parsed = resetTokenSchema.safeParse(value);
  if (!parsed.success) return false;
  return tokenIsUsable(await findResetToken(digest(parsed.data)), new Date());
}
export async function resetPassword(input: {
  token: string;
  password: string;
  confirmPassword: string;
}) {
  const parsed = resetPasswordSchema.parse(input);
  const tokenHash = digest(parsed.token);
  const token = await findResetToken(tokenHash);
  if (!tokenIsUsable(token, new Date()) || !token)
    throw new AppError(400, "INVALID_RESET_TOKEN", INVALID_RESET_MESSAGE);
  const passwordHash = await hash(parsed.password, 12);
  await consumeResetToken(
    token.userId,
    tokenHash,
    token.user.passwordHash,
    passwordHash,
  );
}
