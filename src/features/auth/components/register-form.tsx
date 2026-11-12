"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Mail, UserRound } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { PasswordField } from "@/components/ui/password-field";
import { cn } from "@/lib/utils";
import { registerAction, type RegisterState } from "../actions";
import { getPasswordStrength } from "../password-strength";
import { FormAlert, SubmitButton } from "./login-form";

const strengthBar = [
  "",
  "bg-destructive",
  "bg-warning",
  "bg-highlight",
  "bg-primary",
] as const;

function StrengthMeter({ password }: { password: string }) {
  const { score, label } = getPasswordStrength(password);
  if (!score) return null;
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="grid flex-1 grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              "h-1.5 rounded-full transition-colors",
              step <= score ? strengthBar[score] : "bg-muted",
            )}
          />
        ))}
      </div>
      <span className="w-20 text-right text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<RegisterState, FormData>(
    registerAction,
    {},
  );
  const [password, setPassword] = useState("");
  const errors = state.errors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.formError && <FormAlert>{state.formError}</FormAlert>}
      <FormField
        id="name"
        name="name"
        label="Họ và tên"
        icon={UserRound}
        autoComplete="name"
        placeholder="Nguyễn Văn A"
        defaultValue={state.values?.name}
        error={errors.name}
        required
      />
      <FormField
        id="email"
        name="email"
        type="email"
        label="Email"
        icon={Mail}
        autoComplete="email"
        placeholder="ban@example.com"
        defaultValue={state.values?.email}
        error={errors.email}
        required
      />
      <PasswordField
        id="password"
        name="password"
        label="Mật khẩu"
        autoComplete="new-password"
        placeholder="Ít nhất 8 ký tự"
        error={errors.password}
        onChange={(event) => setPassword(event.target.value)}
        footer={<StrengthMeter password={password} />}
        required
      />
      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label="Nhập lại mật khẩu"
        autoComplete="new-password"
        placeholder="Nhập lại mật khẩu"
        error={errors.confirmPassword}
        required
      />
      <SubmitButton pending={pending} pendingLabel="Đang tạo tài khoản...">
        Tạo tài khoản
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline"
        >
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
