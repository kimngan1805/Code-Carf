import { createHash } from "node:crypto";
import { z } from "zod";
import { passwordRule } from "../schemas";

export const RESET_TTL_MS = 30 * 60 * 1000;
export const RESET_RATE_WINDOW_MS = 15 * 60 * 1000;
export const RESET_RATE_LIMIT = 3;
export const RESET_REQUEST_MESSAGE =
  "Nếu email có tài khoản và yêu cầu hợp lệ, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư; nếu vừa yêu cầu nhiều lần, hãy thử lại sau 15 phút.";
export const INVALID_RESET_MESSAGE =
  "Liên kết không hợp lệ, đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu liên kết mới.";
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email("Email không hợp lệ")),
});
export const resetTokenSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i)
  .toLowerCase();
export const resetPasswordSchema = z
  .object({
    token: resetTokenSchema,
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu nhập lại không khớp",
  });
export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function tokenIsUsable(
  token: {
    usedAt: Date | null;
    expiresAt: Date;
    passwordDigest: string;
    user: { passwordHash: string };
  } | null,
  now: Date,
) {
  return (
    token !== null &&
    token.usedAt === null &&
    token.expiresAt > now &&
    token.passwordDigest === digest(token.user.passwordHash)
  );
}
