import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      mode="login"
      title="Quên mật khẩu?"
      subtitle="Nhập email tài khoản để nhận hướng dẫn đặt lại mật khẩu."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
