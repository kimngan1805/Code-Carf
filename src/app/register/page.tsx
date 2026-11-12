import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";
import { AFTER_LOGIN_PATH } from "@/features/auth/constants";

export default async function RegisterPage() {
  if ((await auth())?.user) redirect(AFTER_LOGIN_PATH);
  return (
    <AuthShell
      mode="register"
      title="Tạo tài khoản"
      subtitle="Miễn phí và chỉ mất chưa đến một phút."
    >
      <RegisterForm />
    </AuthShell>
  );
}
