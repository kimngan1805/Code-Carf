import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell/app-shell";
import { SIDEBAR_COOKIE } from "@/components/app-shell/constants";
import { findUserWithRole } from "@/features/auth/repository";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");
  // Read the name from the database so profile changes show without signing in again.
  const user = await findUserWithRole(session.user.id);
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const sidebarCollapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";
  return (
    <AppShell userName={user.name} sidebarCollapsed={sidebarCollapsed}>
      {children}
    </AppShell>
  );
}
