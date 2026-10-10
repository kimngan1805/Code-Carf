import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findUserWithRole } from "@/features/auth/repository";
import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard";

export const metadata = { title: "Làm quen · Code Carf" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/onboarding");
  const user = await findUserWithRole(session.user.id);
  if (!user) redirect("/login?callbackUrl=/onboarding");
  if (user.onboardedAt) redirect("/dashboard");
  const firstName = user.name.trim().split(/\s+/).at(-1) ?? user.name;
  return <OnboardingWizard firstName={firstName} />;
}
