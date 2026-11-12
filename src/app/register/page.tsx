import { redirect } from "next/navigation";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";
import { AFTER_LOGIN_PATH } from "@/features/auth/constants";
import { getCurrentUser } from "@/features/auth/service";

export default async function RegisterPage() {
  // A stale session for a deleted account must still see the form.
  if (await getCurrentUser()) redirect(AFTER_LOGIN_PATH);
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
