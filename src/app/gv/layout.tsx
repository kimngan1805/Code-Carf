import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell/app-shell";
import { SIDEBAR_COOKIE } from "@/components/app-shell/constants";
import { routeRoles } from "@/features/auth/permissions";
import { findUserWithRole } from "@/features/auth/repository";

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/gv");
  // Verify the live user and role from PostgreSQL instead of trusting stale JWT claims.
  const user = await findUserWithRole(session.user.id);
  if (!user) redirect("/login?callbackUrl=/gv");
  if (!routeRoles["/gv"].includes(user.role.name)) redirect("/forbidden");

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
