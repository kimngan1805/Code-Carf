import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="mx-auto flex w-full max-w-3xl justify-end px-4 pt-3 sm:px-6">
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Đăng xuất để đổi tài khoản
          </Button>
        </form>
      </div>
      {children}
    </>
  );
}
