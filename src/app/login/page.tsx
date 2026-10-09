import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { AFTER_LOGIN_PATH } from "@/features/auth/constants";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  if ((await auth())?.user) redirect(AFTER_LOGIN_PATH);
  const { callbackUrl } = await searchParams;
  return (
    <AuthShell
      mode="login"
      title="Chào mừng trở lại"
      subtitle="Đăng nhập để tiếp tục hành trình học lập trình."
    >
      <LoginForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}
