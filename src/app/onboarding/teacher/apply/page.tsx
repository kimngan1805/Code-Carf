import { redirect } from "next/navigation";
import { RoleName } from "@prisma/client";
import { getCurrentUser } from "@/features/auth/service";
import { ReapplyForm } from "@/features/teacher-application/components/reapply-form";
import { findOpenApplication } from "@/features/teacher-application/repository";

export const metadata = { title: "Nộp lại hồ sơ giảng viên · Code Carf" };

/** Rejected applicants (still guests) file a new application here. */
export default async function TeacherReapplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/onboarding/teacher/apply");
  if (user.role.name !== RoleName.GUEST || (await findOpenApplication(user.id)))
    redirect("/onboarding/teacher/submitted");
  return <ReapplyForm />;
}
