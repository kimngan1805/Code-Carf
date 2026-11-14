import { RoleName } from "@prisma/client";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ChangePasswordForm,
  ProfileSettingsForm,
} from "@/features/account/components/account-settings-forms";
import { getAccountSettings } from "@/features/account/service";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = {
  title: "Cài đặt tài khoản · Code Carf",
};

const roleLabels: Record<RoleName, string> = {
  [RoleName.STUDENT]: "Học viên",
  [RoleName.TEACHER]: "Giảng viên",
  [RoleName.GRADER]: "Giám khảo",
  [RoleName.ADMIN]: "Quản trị viên",
};

function initials(name: string) {
  return (name.trim().split(/\s+/).at(-1)?.[0] ?? "?").toUpperCase();
}

export default async function SettingsPage() {
  const account = await getAccountSettings().catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 401) redirect("/login?callbackUrl=/settings");
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  });

  const roleLabel = roleLabels[account.role];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Cài đặt tài khoản
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý thông tin hiển thị và bảo mật đăng nhập cho tài khoản của
            bạn.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background px-4 py-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary/60 text-sm font-semibold text-primary">
            {initials(account.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{account.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {account.email}
            </p>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ProfileSettingsForm
          initialName={account.name}
          email={account.email}
          roleLabel={roleLabel}
        />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
