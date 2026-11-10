import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/components/auth-shell";

export default function ResetSuccessPage() {
  return (
    <AuthShell
      mode="login"
      title="Đã đặt lại mật khẩu"
      subtitle="Bạn có thể đăng nhập bằng mật khẩu mới."
    >
      <div className="space-y-5">
        <CheckCircle2 className="size-10 text-primary" aria-hidden />
        <Button asChild className="w-full">
          <Link href="/login">Đăng nhập</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
