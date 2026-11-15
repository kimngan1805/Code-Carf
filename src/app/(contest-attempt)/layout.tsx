import { ContestFocusFrame } from "@/features/contests/components/contest-focus-frame";
import { getCurrentUser } from "@/features/auth/service";
import { isTeacherRole } from "@/features/auth/permissions";
import { RoleName } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function ContestAttemptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role.name === RoleName.GUEST)
    redirect("/onboarding/teacher/submitted");
  if (!user.onboardedAt && !isTeacherRole(user.role.name))
    redirect("/onboarding");
  return <ContestFocusFrame>{children}</ContestFocusFrame>;
}
