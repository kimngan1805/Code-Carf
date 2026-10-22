"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { PasswordField } from "@/components/ui/password-field";
import { FormAlert } from "@/features/auth/components/login-form";
import { getPasswordStrength } from "@/features/auth/password-strength";
import { cn } from "@/lib/utils";
import {
  changePasswordAction,
  updateDisplayNameAction,
  type ChangePasswordState,
  type UpdateProfileState,
} from "../actions";

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

function SuccessBanner({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-start gap-2 rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm font-medium text-success"
    >
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function ProfileSettingsForm({
  initialName,
  email,
  roleLabel,
}: {
  initialName: string;
  email: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<UpdateProfileState, FormData>(
    updateDisplayNameAction,
    { values: { name: initialName } },
  );

  useEffect(() => {
    if (state.updatedAt) {
      router.refresh();
    }
  }, [state.updatedAt, router]);

  const currentName = state.values?.name ?? initialName;

  return (
    <section
      aria-labelledby="profile-settings-heading"
      className="rounded-[1.75rem] border border-border/60 bg-background p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-secondary/60 text-primary">
            <UserRound className="size-5" aria-hidden />
          </span>
          <div>
            <h2
              id="profile-settings-heading"
              className="text-base font-semibold"
            >
              Thông tin cá nhân
            </h2>
            <p className="text-xs text-muted-foreground">
              Cập nhật tên hiển thị trên toàn hệ thống
            </p>
          </div>
        </div>
        <span className="rounded-full bg-secondary/50 px-3 py-1 text-xs font-semibold text-primary">
          {roleLabel}
        </span>
      </div>

      <form action={action} className="mt-5 space-y-4" noValidate>
        {state.formError && <FormAlert>{state.formError}</FormAlert>}
        {state.success && <SuccessBanner>{state.success}</SuccessBanner>}

        <FormField
          id="settings-email"
          name="email"
          type="email"
          label="Email đăng nhập"
          icon={Mail}
          value={email}
          disabled
          readOnly
          footer={
            <p className="text-xs text-muted-foreground">
              Email dùng để định danh tài khoản và không thể thay đổi.
            </p>
          }
        />

        <FormField
          key={state.updatedAt ?? initialName}
          id="settings-name"
          name="name"
          label="Tên hiển thị"
          icon={UserRound}
          autoComplete="name"
          placeholder="Nhập họ và tên của bạn"
          defaultValue={currentName}
          error={state.errors?.name}
          maxLength={60}
          required
          footer={
            <p className="text-xs text-muted-foreground">
              Từ 2 đến 60 ký tự. Tên mới sẽ hiển thị ngay trên thanh điều hướng.
            </p>
          }
        />

        <div className="pt-1">
          <Button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl sm:w-auto sm:px-6"
          >
            {pending ? (
              <>
                <span
                  aria-hidden
                  className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                />
                Đang lưu...
              </>
            ) : (
              "Lưu thay đổi"
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}

function PasswordFields({
  errors,
}: {
  errors: NonNullable<ChangePasswordState["errors"]>;
}) {
  const [newPassword, setNewPassword] = useState("");
  return (
    <>
      <PasswordField
        id="currentPassword"
        name="currentPassword"
        label="Mật khẩu hiện tại"
        autoComplete="current-password"
        placeholder="Nhập mật khẩu hiện tại"
        error={errors.currentPassword}
        required
      />

      <PasswordField
        id="newPassword"
        name="newPassword"
        label="Mật khẩu mới"
        autoComplete="new-password"
        placeholder="Ít nhất 8 ký tự"
        error={errors.newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        footer={<StrengthMeter password={newPassword} />}
        required
      />

      <PasswordField
        id="confirmNewPassword"
        name="confirmNewPassword"
        label="Nhập lại mật khẩu mới"
        autoComplete="new-password"
        placeholder="Nhập lại mật khẩu mới"
        error={errors.confirmNewPassword}
        required
      />
    </>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<
    ChangePasswordState,
    FormData
  >(changePasswordAction, {});
  const errors = state.errors ?? {};
  const formKey = state.updatedAt ?? "initial";

  return (
    <section
      aria-labelledby="password-settings-heading"
      className="rounded-[1.75rem] border border-border/60 bg-background p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-accent/15 text-accent-strong">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <div>
            <h2
              id="password-settings-heading"
              className="text-base font-semibold"
            >
              Đổi mật khẩu
            </h2>
            <p className="text-xs text-muted-foreground">
              Sử dụng mật khẩu mạnh từ 8 đến 72 ký tự để bảo vệ tài khoản
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" aria-hidden />
          Bảo mật
        </span>
      </div>

      <form action={action} className="mt-5 space-y-4" noValidate>
        {state.formError && <FormAlert>{state.formError}</FormAlert>}
        {state.success && <SuccessBanner>{state.success}</SuccessBanner>}

        <PasswordFields key={formKey} errors={errors} />

        <div className="pt-1">
          <Button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl sm:w-auto sm:px-6"
          >
            {pending ? (
              <>
                <span
                  aria-hidden
                  className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                />
                Đang cập nhật...
              </>
            ) : (
              "Cập nhật mật khẩu"
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}
