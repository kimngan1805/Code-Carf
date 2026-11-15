"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import {
  forgotPasswordAction,
  type ForgotState,
} from "../password-reset/actions";
import { FormAlert, SubmitButton } from "./login-form";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(
    forgotPasswordAction,
    {},
  );
  return (
    <div className="space-y-5">
      {state.message && (
        <div
          role="status"
          className="space-y-2 rounded-xl border bg-secondary/30 p-4"
        >
          <CheckCircle2 className="size-5 text-primary" aria-hidden />
          <p className="text-sm leading-6">{state.message}</p>
        </div>
      )}
      <form action={action} className="space-y-5" noValidate>
        {state.error && <FormAlert>{state.error}</FormAlert>}
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email tài khoản"
          icon={Mail}
          autoComplete="email"
          placeholder="ban@example.com"
          required
        />
        <SubmitButton pending={pending} pendingLabel="Đang gửi yêu cầu...">
          Gửi hướng dẫn đặt lại
        </SubmitButton>
      </form>
      <Link
        href="/login"
        className="block text-center text-sm font-semibold text-primary hover:underline"
      >
        Quay lại đăng nhập
      </Link>
    </div>
  );
}
