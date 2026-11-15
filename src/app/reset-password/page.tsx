import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { Button } from "@/components/ui/button";
import { isResetLinkValid } from "@/features/auth/password-reset/service";
import { INVALID_RESET_MESSAGE } from "@/features/auth/password-reset/rules";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu · Code Carf",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const valid = await isResetLinkValid(token);
  return (
    <AuthShell
      mode="login"
      title="Đặt lại mật khẩu"
      subtitle="Chọn mật khẩu mới cho tài khoản của bạn."
    >
      {valid && typeof token === "string" ? (
        <ResetPasswordForm token={token} />
      ) : (
        <section role="alert" className="space-y-5">
          <h2 className="text-lg font-semibold">Liên kết không còn hiệu lực</h2>
          <p className="text-sm text-muted-foreground">
            {INVALID_RESET_MESSAGE}
          </p>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Yêu cầu liên kết mới</Link>
          </Button>
        </section>
      )}
    </AuthShell>
  );
}
