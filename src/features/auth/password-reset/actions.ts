"use server";

import { signOut } from "@/auth";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import {
  forgotPasswordSchema,
  INVALID_RESET_MESSAGE,
  resetPasswordSchema,
} from "./rules";
import { requestPasswordReset, resetPassword } from "./service";
export interface ForgotState {
  message?: string;
  error?: string;
}
export interface ResetState {
  error?: string;
}
export async function forgotPasswordAction(
  _previous: ForgotState,
  form: FormData,
): Promise<ForgotState> {
  const parsed = forgotPasswordSchema.safeParse({ email: form.get("email") });
  if (!parsed.success) return { error: "Vui lòng nhập email hợp lệ." };
  return requestPasswordReset(parsed.data);
}
export async function resetPasswordAction(
  _previous: ResetState,
  form: FormData,
): Promise<ResetState> {
  const parsed = resetPasswordSchema.safeParse({
    token: form.get("token"),
    password: form.get("password"),
    confirmPassword: form.get("confirmPassword"),
  });
  if (!parsed.success)
    return {
      error:
        parsed.error.issues[0]?.path[0] === "token"
          ? INVALID_RESET_MESSAGE
          : (parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ."),
    };
  try {
    await resetPassword(parsed.data);
  } catch (error) {
    return {
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể đặt lại mật khẩu. Vui lòng thử lại.",
    };
  }
  await signOut({ redirect: false });
  redirect("/reset-password/success");
}
