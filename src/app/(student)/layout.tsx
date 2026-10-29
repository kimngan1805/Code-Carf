import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RoleName } from "@prisma/client";
import { AppShell } from "@/components/app-shell/app-shell";
import { SIDEBAR_COOKIE } from "@/components/app-shell/constants";
import { getCurrentUser } from "@/features/auth/service";
import { isTeacherRole } from "@/features/auth/permissions";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // The session token can still carry the old role right after applying, so check the live role.
  if (user.role.name === RoleName.GUEST)
    redirect("/onboarding/teacher/submitted");
  if (!user.onboardedAt && !isTeacherRole(user.role.name))
    redirect("/onboarding");
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
