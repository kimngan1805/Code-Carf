import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell/app-shell";
import { SIDEBAR_COOKIE } from "@/components/app-shell/constants";
import { allowedRole } from "@/features/auth/permissions";
import { findUserWithRole } from "@/features/auth/repository";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/profile");
  const user = await findUserWithRole(session.user.id);
  if (!user) redirect("/login?callbackUrl=/profile");
  if (!allowedRole("/profile", user.role.name)) redirect("/forbidden");
  if (!user.onboardedAt) redirect("/onboarding");

  const sidebarCollapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <AppShell
      userName={user.name}
      role={user.role.name}
      sidebarCollapsed={sidebarCollapsed}
    >
      {children}
    </AppShell>
  );
}
