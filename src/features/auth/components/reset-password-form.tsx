"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PasswordField } from "@/components/ui/password-field";
import {
  resetPasswordAction,
  type ResetState,
} from "../password-reset/actions";
import { FormAlert, SubmitButton } from "./login-form";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(
    resetPasswordAction,
    {},
  );
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.error && <FormAlert>{state.error}</FormAlert>}
      <PasswordField
        id="password"
        name="password"
        label="Mật khẩu mới"
        autoComplete="new-password"
        required
      />
      <p className="text-xs text-muted-foreground">
        Ít nhất 8 ký tự, tối đa 72 byte.
      </p>
      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label="Nhập lại mật khẩu mới"
        autoComplete="new-password"
        required
      />
      <SubmitButton pending={pending} pendingLabel="Đang lưu mật khẩu...">
        Đặt lại mật khẩu
      </SubmitButton>
      <Link
        href="/forgot-password"
        className="block text-center text-sm font-semibold text-primary hover:underline"
      >
        Yêu cầu liên kết mới
      </Link>
    </form>
  );
}
