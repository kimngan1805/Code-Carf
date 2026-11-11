"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, CircleAlert, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { PasswordField } from "@/components/ui/password-field";
import { loginAction, type LoginState } from "../actions";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );
  return (
    <form action={action} className="space-y-5" noValidate>
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}
      {state.error && <FormAlert>{state.error}</FormAlert>}
      <FormField
        id="email"
        name="email"
        type="email"
        label="Email"
        icon={Mail}
        autoComplete="email"
        placeholder="ban@example.com"
        defaultValue={state.email}
        required
      />
      <PasswordField
        id="password"
        name="password"
        label="Mật khẩu"
        autoComplete="current-password"
        placeholder="Nhập mật khẩu"
        required
      />
      <div className="text-right">
        <Link
          href="/forgot-password"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Quên mật khẩu?
        </Link>
      </div>
      <SubmitButton pending={pending} pendingLabel="Đang đăng nhập...">
        Đăng nhập
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary hover:underline"
        >
          Tạo tài khoản miễn phí
        </Link>
      </p>
    </form>
  );
}

export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

export function SubmitButton({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="group w-full rounded-xl shadow-lg shadow-primary/25"
    >
      {pending ? (
        <>
          <span
            aria-hidden
            className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
          />
          {pendingLabel}
        </>
      ) : (
        <>
          {children}
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </>
      )}
    </Button>
  );
}
