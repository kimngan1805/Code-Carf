import { RoleName } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell/app-shell";
import { SIDEBAR_COOKIE } from "@/components/app-shell/constants";
import { allowedRole } from "@/features/auth/permissions";
import { findUserWithRole } from "@/features/auth/repository";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/settings");
  const user = await findUserWithRole(session.user.id);
  if (!user) redirect("/login?callbackUrl=/settings");
  if (!allowedRole("/settings", user.role.name)) redirect("/forbidden");
  if (user.role.name === RoleName.STUDENT && !user.onboardedAt) {
    redirect("/onboarding");
  }
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
