import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findUserWithRole } from "@/features/auth/repository";
import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard";
import { isTeacherRole } from "@/features/auth/permissions";

export const metadata = { title: "Làm quen · Code Carf" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/onboarding");
  const user = await findUserWithRole(session.user.id);
  if (!user) redirect("/login?callbackUrl=/onboarding");
  if (isTeacherRole(user.role.name)) redirect("/gv");
  if (user.role.name === "GUEST") redirect("/onboarding/teacher/submitted");
  if (user.onboardedAt) redirect("/hv/dashboard");
  const firstName = user.name.trim().split(/\s+/).at(-1) ?? user.name;
  return <OnboardingWizard firstName={firstName} />;
}
