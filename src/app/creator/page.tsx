import { redirect } from "next/navigation";
import { routeRoles } from "@/features/auth/permissions";
import { requireRole } from "@/features/auth/service";
import { TeacherDashboardView } from "@/features/teacher-dashboard/components/teacher-dashboard-view";
import { MOCK_TEACHER_DASHBOARD } from "@/features/teacher-dashboard/mock-data";
import { AppError } from "@/lib/errors";

export const metadata = {
  title: "Tổng quan giảng dạy · Code Carf",
};

export default async function CreatorPage() {
  await requireRole(routeRoles["/creator"]).catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 401) redirect("/login?callbackUrl=/creator");
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  });

  return <TeacherDashboardView data={MOCK_TEACHER_DASHBOARD} />;
}
